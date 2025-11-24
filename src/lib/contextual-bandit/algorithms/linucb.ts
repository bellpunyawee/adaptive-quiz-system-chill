/**
 * Linear Upper Confidence Bound (LinUCB) Algorithm
 *
 * Core contextual bandit algorithm that learns personalized question selection
 * based on user context features.
 *
 * Reference: Li et al. (2010) "A Contextual-Bandit Approach to Personalized News Article Recommendation"
 */

import {
  shermanMorrisonUpdate,
  matrixVectorMultiply,
  dotProduct,
  outerProduct,
  identityMatrix,
  zeroVector,
  validateMatrix,
  validateVector,
} from './sherman-morrison';

export interface LinUCBPrediction {
  mu: number;         // Expected reward (exploitation)
  sigma: number;      // Uncertainty (exploration)
  ucb: number;        // Upper confidence bound (mu + alpha * sigma)
}

export interface LinUCBModelState {
  A: number[][];      // Design matrix (d×d)
  b: number[];        // Reward vector (d×1)
  A_inv: number[][];  // Inverse matrix (cached for efficiency)
  theta_hat: number[]; // Weight estimate (d×1)
  observationCount: number;
}

export class LinUCBModel {
  private d: number;  // Context dimension
  private A: number[][];
  private b: number[];
  private A_inv: number[][];
  private theta_hat: number[];
  private observationCount: number;
  private questionId: string;

  /**
   * Create a new LinUCB model for a question
   * @param questionId - Question identifier
   * @param d - Context dimension (default 15)
   * @param regularization - Ridge regression regularization parameter (default 1.0)
   */
  constructor(questionId: string, d: number = 15, regularization: number = 1.0) {
    this.questionId = questionId;
    this.d = d;

    // Initialize with identity matrix (ridge regression prior)
    // A = λ * I_d where λ is regularization parameter
    this.A = identityMatrix(d);
    if (regularization !== 1.0) {
      for (let i = 0; i < d; i++) {
        this.A[i][i] = regularization;
      }
    }

    // Initialize inverse (same as A for identity)
    this.A_inv = identityMatrix(d);
    if (regularization !== 1.0) {
      for (let i = 0; i < d; i++) {
        this.A_inv[i][i] = 1 / regularization;
      }
    }

    // Initialize reward vector as zeros
    this.b = zeroVector(d);

    // Initialize weight estimate as zeros (no prior knowledge)
    this.theta_hat = zeroVector(d);

    this.observationCount = 0;
  }

  /**
   * Predict expected reward and uncertainty for a given context
   *
   * @param context - Context vector (d×1)
   * @param alpha - Exploration parameter (default 1.5)
   * @returns Prediction with mu, sigma, and ucb
   */
  predict(context: number[], alpha: number = 1.5): LinUCBPrediction {
    // Validate input
    if (context.length !== this.d) {
      throw new Error(
        `Context dimension mismatch: expected ${this.d}, got ${context.length}`
      );
    }

    if (!validateVector(context)) {
      throw new Error('Invalid context vector (contains NaN or Inf)');
    }

    // Expected reward: μ = x^T θ̂
    const mu = dotProduct(context, this.theta_hat);

    // Uncertainty: σ = √(x^T A^(-1) x)
    const A_inv_x = matrixVectorMultiply(this.A_inv, context);
    const variance = dotProduct(context, A_inv_x);

    // Ensure variance is non-negative (numerical errors can cause small negative values)
    const sigma = Math.sqrt(Math.max(0, variance));

    // Upper confidence bound: UCB = μ + α σ
    const ucb = mu + alpha * sigma;

    return { mu, sigma, ucb };
  }

  /**
   * Update model with observed reward
   *
   * Performs online ridge regression update:
   * A ← A + x x^T
   * b ← b + r x
   * θ̂ ← A^(-1) b
   *
   * @param context - Context vector (d×1)
   * @param reward - Observed reward (scalar, typically [0, 1])
   */
  update(context: number[], reward: number): void {
    // Validate input
    if (context.length !== this.d) {
      throw new Error(
        `Context dimension mismatch: expected ${this.d}, got ${context.length}`
      );
    }

    if (!validateVector(context)) {
      throw new Error('Invalid context vector (contains NaN or Inf)');
    }

    if (!isFinite(reward)) {
      throw new Error(`Invalid reward: ${reward}`);
    }

    // Update design matrix: A ← A + x x^T
    const xxT = outerProduct(context, context);

    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        this.A[i][j] += xxT[i][j];
      }
    }

    // Update reward vector: b ← b + r x
    for (let i = 0; i < this.d; i++) {
      this.b[i] += reward * context[i];
    }

    // Update inverse using Sherman-Morrison (efficient O(d²))
    this.A_inv = shermanMorrisonUpdate(this.A_inv, context);

    // Recompute weight estimate: θ̂ ← A^(-1) b
    this.theta_hat = matrixVectorMultiply(this.A_inv, this.b);

    // Increment observation count
    this.observationCount++;

    // Validate updated state
    if (!validateMatrix(this.A_inv) || !validateVector(this.theta_hat)) {
      console.error('[LinUCB] Model update resulted in invalid state!');
      throw new Error('Model update failed: numerical instability detected');
    }
  }

  /**
   * Get current model state (for persistence)
   */
  getState(): LinUCBModelState {
    return {
      A: this.A.map(row => [...row]), // Deep copy
      b: [...this.b],
      A_inv: this.A_inv.map(row => [...row]),
      theta_hat: [...this.theta_hat],
      observationCount: this.observationCount,
    };
  }

  /**
   * Set model state (for loading from database)
   */
  setState(state: LinUCBModelState): void {
    if (state.A.length !== this.d || state.A[0].length !== this.d) {
      throw new Error(`State dimension mismatch: expected ${this.d}×${this.d}`);
    }

    this.A = state.A.map(row => [...row]);
    this.b = [...state.b];
    this.A_inv = state.A_inv.map(row => [...row]);
    this.theta_hat = [...state.theta_hat];
    this.observationCount = state.observationCount;

    // Validate loaded state
    if (!validateMatrix(this.A) || !validateMatrix(this.A_inv) || !validateVector(this.b)) {
      throw new Error('Loaded state is invalid');
    }
  }

  /**
   * Serialize model state to bytes (for database storage)
   */
  serializeState(): Buffer {
    // Calculate total size needed
    // A: d×d floats, b: d floats, A_inv: d×d floats, theta_hat: d floats, count: 1 int
    const numFloats = this.d * this.d + this.d + this.d * this.d + this.d;
    const bufferSize = numFloats * 8 + 4; // 8 bytes per float64, 4 bytes for int32

    const buffer = Buffer.allocUnsafe(bufferSize);
    let offset = 0;

    // Write A matrix
    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        buffer.writeDoubleLE(this.A[i][j], offset);
        offset += 8;
      }
    }

    // Write b vector
    for (let i = 0; i < this.d; i++) {
      buffer.writeDoubleLE(this.b[i], offset);
      offset += 8;
    }

    // Write A_inv matrix
    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        buffer.writeDoubleLE(this.A_inv[i][j], offset);
        offset += 8;
      }
    }

    // Write theta_hat vector
    for (let i = 0; i < this.d; i++) {
      buffer.writeDoubleLE(this.theta_hat[i], offset);
      offset += 8;
    }

    // Write observation count
    buffer.writeInt32LE(this.observationCount, offset);

    return buffer;
  }

  /**
   * Deserialize model state from bytes
   */
  static deserializeState(buffer: Buffer, questionId: string, d: number = 15): LinUCBModel {
    const model = new LinUCBModel(questionId, d);

    const numFloats = d * d + d + d * d + d;
    const expectedSize = numFloats * 8 + 4;

    if (buffer.length !== expectedSize) {
      throw new Error(
        `Buffer size mismatch: expected ${expectedSize} bytes, got ${buffer.length}`
      );
    }

    let offset = 0;

    // Read A matrix
    const A: number[][] = [];
    for (let i = 0; i < d; i++) {
      A[i] = [];
      for (let j = 0; j < d; j++) {
        A[i][j] = buffer.readDoubleLE(offset);
        offset += 8;
      }
    }

    // Read b vector
    const b: number[] = [];
    for (let i = 0; i < d; i++) {
      b[i] = buffer.readDoubleLE(offset);
      offset += 8;
    }

    // Read A_inv matrix
    const A_inv: number[][] = [];
    for (let i = 0; i < d; i++) {
      A_inv[i] = [];
      for (let j = 0; j < d; j++) {
        A_inv[i][j] = buffer.readDoubleLE(offset);
        offset += 8;
      }
    }

    // Read theta_hat vector
    const theta_hat: number[] = [];
    for (let i = 0; i < d; i++) {
      theta_hat[i] = buffer.readDoubleLE(offset);
      offset += 8;
    }

    // Read observation count
    const observationCount = buffer.readInt32LE(offset);

    // Set state
    model.setState({ A, b, A_inv, theta_hat, observationCount });

    return model;
  }

  /**
   * Get question ID
   */
  getQuestionId(): string {
    return this.questionId;
  }

  /**
   * Get dimension
   */
  getDimension(): number {
    return this.d;
  }

  /**
   * Get observation count
   */
  getObservationCount(): number {
    return this.observationCount;
  }

  /**
   * Get weight vector (for analysis/debugging)
   */
  getWeights(): number[] {
    return [...this.theta_hat];
  }
}

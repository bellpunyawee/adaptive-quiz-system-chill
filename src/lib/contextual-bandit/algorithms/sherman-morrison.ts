/**
 * Sherman-Morrison formula for rank-1 matrix inverse updates
 *
 * Given: A_old^(-1) and a rank-1 update x
 * Compute: (A_old + x x^T)^(-1) efficiently
 *
 * Formula: A_new^(-1) = A_old^(-1) - (A_old^(-1) x x^T A_old^(-1)) / (1 + x^T A_old^(-1) x)
 *
 * Complexity: O(d²) instead of O(d³) for full matrix inversion
 */

/**
 * Update matrix inverse using Sherman-Morrison formula
 *
 * @param A_inv_old - Current inverse matrix (d×d)
 * @param x - Context vector (d×1)
 * @returns Updated inverse matrix A_new^(-1)
 */
export function shermanMorrisonUpdate(
  A_inv_old: number[][],
  x: number[]
): number[][] {
  const d = A_inv_old.length;

  // Validate dimensions
  if (x.length !== d) {
    throw new Error(`Dimension mismatch: A_inv is ${d}×${d}, x is ${x.length}×1`);
  }

  // Step 1: Compute A_inv @ x (d×1 vector)
  const A_inv_x = matrixVectorMultiply(A_inv_old, x);

  // Step 2: Compute denominator: 1 + x^T @ A_inv @ x (scalar)
  const denom = 1 + dotProduct(x, A_inv_x);

  // Check for numerical stability
  if (Math.abs(denom) < 1e-10) {
    console.warn('[Sherman-Morrison] Denominator near zero, matrix may be singular');
    // Return old inverse (no update)
    return A_inv_old.map(row => [...row]);
  }

  // Step 3: Compute outer product: A_inv_x @ A_inv_x^T (d×d matrix)
  const outer = outerProduct(A_inv_x, A_inv_x);

  // Step 4: Compute update: A_inv_old - outer / denom
  const A_inv_new: number[][] = [];

  for (let i = 0; i < d; i++) {
    A_inv_new[i] = [];
    for (let j = 0; j < d; j++) {
      A_inv_new[i][j] = A_inv_old[i][j] - outer[i][j] / denom;
    }
  }

  return A_inv_new;
}

/**
 * Matrix-vector multiplication: A @ x
 * @param A - Matrix (m×n)
 * @param x - Vector (n×1)
 * @returns Result vector (m×1)
 */
export function matrixVectorMultiply(A: number[][], x: number[]): number[] {
  const m = A.length;
  const n = A[0].length;

  if (x.length !== n) {
    throw new Error(`Dimension mismatch: A is ${m}×${n}, x is ${x.length}×1`);
  }

  const result: number[] = [];

  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    result[i] = sum;
  }

  return result;
}

/**
 * Dot product of two vectors: x^T @ y
 * @param x - Vector (n×1)
 * @param y - Vector (n×1)
 * @returns Scalar result
 */
export function dotProduct(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error(`Dimension mismatch: x is ${x.length}×1, y is ${y.length}×1`);
  }

  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += x[i] * y[i];
  }

  return sum;
}

/**
 * Outer product of two vectors: x @ y^T
 * @param x - Vector (m×1)
 * @param y - Vector (n×1)
 * @returns Matrix (m×n)
 */
export function outerProduct(x: number[], y: number[]): number[][] {
  const m = x.length;
  const n = y.length;

  const result: number[][] = [];

  for (let i = 0; i < m; i++) {
    result[i] = [];
    for (let j = 0; j < n; j++) {
      result[i][j] = x[i] * y[j];
    }
  }

  return result;
}

/**
 * Create identity matrix (d×d)
 * @param d - Dimension
 * @returns Identity matrix
 */
export function identityMatrix(d: number): number[][] {
  const I: number[][] = [];

  for (let i = 0; i < d; i++) {
    I[i] = [];
    for (let j = 0; j < d; j++) {
      I[i][j] = i === j ? 1 : 0;
    }
  }

  return I;
}

/**
 * Create zero vector (d×1)
 * @param d - Dimension
 * @returns Zero vector
 */
export function zeroVector(d: number): number[] {
  return new Array(d).fill(0);
}

/**
 * Create zero matrix (m×n)
 * @param m - Rows
 * @param n - Columns
 * @returns Zero matrix
 */
export function zeroMatrix(m: number, n: number): number[][] {
  const matrix: number[][] = [];

  for (let i = 0; i < m; i++) {
    matrix[i] = new Array(n).fill(0);
  }

  return matrix;
}

/**
 * Matrix addition: A + B
 * @param A - Matrix (m×n)
 * @param B - Matrix (m×n)
 * @returns Sum matrix (m×n)
 */
export function matrixAdd(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = A[0].length;

  if (B.length !== m || B[0].length !== n) {
    throw new Error(`Dimension mismatch: A is ${m}×${n}, B is ${B.length}×${B[0].length}`);
  }

  const result: number[][] = [];

  for (let i = 0; i < m; i++) {
    result[i] = [];
    for (let j = 0; j < n; j++) {
      result[i][j] = A[i][j] + B[i][j];
    }
  }

  return result;
}

/**
 * Validate matrix is well-formed
 * @param matrix - Matrix to validate
 * @returns true if valid, false otherwise
 */
export function validateMatrix(matrix: number[][]): boolean {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return false;
  }

  const numCols = matrix[0].length;

  for (let i = 0; i < matrix.length; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== numCols) {
      return false;
    }

    for (let j = 0; j < numCols; j++) {
      if (!isFinite(matrix[i][j])) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate vector is well-formed
 * @param vector - Vector to validate
 * @returns true if valid, false otherwise
 */
export function validateVector(vector: number[]): boolean {
  if (!Array.isArray(vector) || vector.length === 0) {
    return false;
  }

  for (let i = 0; i < vector.length; i++) {
    if (!isFinite(vector[i])) {
      return false;
    }
  }

  return true;
}

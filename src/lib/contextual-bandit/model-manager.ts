/**
 * Model Manager - Handles LinUCB model persistence and caching
 *
 * Responsibilities:
 * - Load models from database
 * - Cache frequently used models in memory
 * - Save models back to database
 * - Initialize new models for new questions
 */

import { PrismaClient } from '@prisma/client';
import { LinUCBModel } from './algorithms/linucb';
import { CONTEXT_DIMENSION } from './features/context-builder';

const prisma = new PrismaClient();

export class ModelManager {
  private cache: Map<string, LinUCBModel>; // questionId -> model
  private dimension: number;
  private maxCacheSize: number;
  private cacheHits: number;
  private cacheMisses: number;

  constructor(dimension: number = CONTEXT_DIMENSION, maxCacheSize: number = 1000) {
    this.cache = new Map();
    this.dimension = dimension;
    this.maxCacheSize = maxCacheSize;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get model for a question (from cache or database)
   * Creates new model if doesn't exist
   */
  async getModel(questionId: string): Promise<LinUCBModel> {
    // Check cache first
    if (this.cache.has(questionId)) {
      this.cacheHits++;
      return this.cache.get(questionId)!;
    }

    this.cacheMisses++;

    // Try to load from database
    const record = await prisma.contextualModel.findUnique({
      where: { id: questionId },
    });

    let model: LinUCBModel;

    if (record) {
      // Deserialize existing model
      try {
        model = LinUCBModel.deserializeState(
          record.A_matrix,
          questionId,
          this.dimension
        );
      } catch (error) {
        console.error(`[Model Manager] Failed to deserialize model for ${questionId}:`, error);
        // Fall back to creating new model
        model = new LinUCBModel(questionId, this.dimension);
      }
    } else {
      // Create new model
      model = new LinUCBModel(questionId, this.dimension);
    }

    // Add to cache
    this.addToCache(questionId, model);

    return model;
  }

  /**
   * Save model to database
   */
  async saveModel(questionId: string, model: LinUCBModel): Promise<void> {
    try {
      const serialized = model.serializeState();

      await prisma.contextualModel.upsert({
        where: { id: questionId },
        create: {
          id: questionId,
          A_matrix: serialized,
          b_vector: serialized, // Same buffer contains all data
          A_inv_matrix: serialized,
          theta_hat: serialized,
          observationCount: model.getObservationCount(),
        },
        update: {
          A_matrix: serialized,
          b_vector: serialized,
          A_inv_matrix: serialized,
          theta_hat: serialized,
          observationCount: model.getObservationCount(),
          lastUpdated: new Date(),
        },
      });

      // Update cache
      this.cache.set(questionId, model);
    } catch (error) {
      console.error(`[Model Manager] Failed to save model for ${questionId}:`, error);
      throw error;
    }
  }

  /**
   * Batch save multiple models (more efficient)
   */
  async saveModels(models: Map<string, LinUCBModel>): Promise<void> {
    const operations = [];

    for (const [questionId, model] of models.entries()) {
      const serialized = model.serializeState();

      operations.push(
        prisma.contextualModel.upsert({
          where: { id: questionId },
          create: {
            id: questionId,
            A_matrix: serialized,
            b_vector: serialized,
            A_inv_matrix: serialized,
            theta_hat: serialized,
            observationCount: model.getObservationCount(),
          },
          update: {
            A_matrix: serialized,
            b_vector: serialized,
            A_inv_matrix: serialized,
            theta_hat: serialized,
            observationCount: model.getObservationCount(),
            lastUpdated: new Date(),
          },
        })
      );
    }

    try {
      await prisma.$transaction(operations);

      // Update cache
      for (const [questionId, model] of models.entries()) {
        this.cache.set(questionId, model);
      }
    } catch (error) {
      console.error('[Model Manager] Batch save failed:', error);
      throw error;
    }
  }

  /**
   * Preload models for a set of questions (optimization)
   */
  async preloadModels(questionIds: string[]): Promise<void> {
    // Filter out already cached models
    const uncached = questionIds.filter(id => !this.cache.has(id));

    if (uncached.length === 0) {
      return;
    }

    // Batch load from database
    const records = await prisma.contextualModel.findMany({
      where: {
        id: { in: uncached },
      },
    });

    const recordMap = new Map(records.map(r => [r.id, r]));

    // Deserialize and cache
    for (const questionId of uncached) {
      const record = recordMap.get(questionId);
      let model: LinUCBModel;

      if (record) {
        try {
          model = LinUCBModel.deserializeState(
            record.A_matrix,
            questionId,
            this.dimension
          );
        } catch (error) {
          console.error(`[Model Manager] Failed to deserialize ${questionId}:`, error);
          model = new LinUCBModel(questionId, this.dimension);
        }
      } else {
        model = new LinUCBModel(questionId, this.dimension);
      }

      this.addToCache(questionId, model);
    }
  }

  /**
   * Add model to cache with LRU eviction
   */
  private addToCache(questionId: string, model: LinUCBModel): void {
    // If cache is full, remove oldest entry (simple FIFO, not true LRU)
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(questionId, model);
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate,
    };
  }

  /**
   * Delete model from database and cache
   */
  async deleteModel(questionId: string): Promise<void> {
    await prisma.contextualModel.delete({
      where: { id: questionId },
    });

    this.cache.delete(questionId);
  }

  /**
   * Get all model metadata (for analysis)
   */
  async getAllModels(): Promise<Array<{
    questionId: string;
    observationCount: number;
    lastUpdated: Date;
  }>> {
    const records = await prisma.contextualModel.findMany({
      select: {
        id: true,
        observationCount: true,
        lastUpdated: true,
      },
      orderBy: {
        observationCount: 'desc',
      },
    });

    return records.map(r => ({
      questionId: r.id,
      observationCount: r.observationCount,
      lastUpdated: r.lastUpdated,
    }));
  }

  /**
   * Get model observation count without loading full model
   */
  async getObservationCount(questionId: string): Promise<number> {
    const record = await prisma.contextualModel.findUnique({
      where: { id: questionId },
      select: { observationCount: true },
    });

    return record?.observationCount ?? 0;
  }
}

// Singleton instance for global use
let globalModelManager: ModelManager | null = null;

/**
 * Get global model manager instance (singleton)
 */
export function getModelManager(): ModelManager {
  if (!globalModelManager) {
    globalModelManager = new ModelManager();
  }
  return globalModelManager;
}

/**
 * Reset global model manager (useful for testing)
 */
export function resetModelManager(): void {
  globalModelManager = null;
}

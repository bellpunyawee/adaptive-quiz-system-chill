// src/lib/adaptive-engine/cache.ts
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
};

class AdaptiveEngineCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate cache key from components
   */
  private generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  /**
   * Get a value from cache if not expired
   * Returns null if not found or expired
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Invalidate cache entries by prefix
   */
  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Specialized cache methods for common patterns

  getUserMasteryKey(userId: string): string {
    return this.generateKey('mastery', userId);
  }

  getQuestionPoolKey(cellId: string): string {
    return this.generateKey('questions', cellId);
  }

  getAnswerHistoryKey(userId: string, quizId: string): string {
    return this.generateKey('answers', userId, quizId);
  }

  getCellStatsKey(userId: string, cellId: string): string {
    return this.generateKey('cellstats', userId, cellId);
  }

  /**
   * Invalidate all user-related cache when they answer a question
   */
  invalidateUserCache(userId: string): void {
    this.invalidateByPrefix(`mastery:${userId}`);
    this.invalidateByPrefix(`answers:${userId}`);
    this.invalidateByPrefix(`cellstats:${userId}`);
  }
}

// Export singleton instance
export const engineCache = new AdaptiveEngineCache();
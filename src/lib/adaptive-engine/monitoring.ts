// src/lib/adaptive-engine/monitoring.ts
import prisma from "@/lib/db";

export interface EngineMetrics {
  timestamp: Date;
  userId: string;
  quizId: string;
  eventType: 'question_selected' | 'answer_processed' | 'question_skipped' | 'mastery_achieved' | 'quiz_completed' | 'error';
  data: Record<string, any>;
  duration?: number; // milliseconds
}

class EngineMonitor {
  private metrics: EngineMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Log a metric event
   */
  log(metric: Omit<EngineMetrics, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date()
    });

    // Keep only recent metrics in memory
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // In production, send to monitoring service (e.g., DataDog, New Relic)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(metric);
    }
  }

  /**
   * Track question selection performance
   */
  async trackQuestionSelection(
    userId: string,
    quizId: string,
    questionId: string,
    cellId: string,
    ucbScore: number,
    duration: number
  ): Promise<void> {
    this.log({
      userId,
      quizId,
      eventType: 'question_selected',
      duration,
      data: {
        questionId,
        cellId,
        ucbScore,
        selectionTime: duration
      }
    });

    // Store in database for analytics
    await prisma.$executeRaw`
      INSERT INTO engine_logs (user_id, quiz_id, event_type, data, created_at)
      VALUES (${userId}, ${quizId}, 'question_selected', ${JSON.stringify({
        questionId,
        cellId,
        ucbScore,
        duration
      })}, ${new Date()})
    `.catch(() => {
      // Silently fail if table doesn't exist
      console.warn('[MONITOR] engine_logs table not found');
    });
  }

  /**
   * Track answer processing
   */
  trackAnswerProcessing(
    userId: string,
    quizId: string,
    questionId: string,
    isCorrect: boolean,
    responseTime: number
  ): void {
    this.log({
      userId,
      quizId,
      eventType: 'answer_processed',
      data: {
        questionId,
        isCorrect,
        responseTime
      }
    });
  }

  /**
   * Track question skip
   */
  trackQuestionSkipped(
    userId: string,
    quizId: string,
    questionId: string,
    cellId: string,
    difficulty: number,
    abilityAtTime?: number,
    responseTime?: number,
    skipReason?: string
  ): void {
    this.log({
      userId,
      quizId,
      eventType: 'question_skipped',
      data: {
        questionId,
        cellId,
        difficulty,
        abilityAtTime,
        responseTime,
        skipReason: skipReason || 'dont_know'
      }
    });

    console.log(`⊘ [SKIP] User ${userId} skipped question ${questionId} (difficulty: ${difficulty.toFixed(2)}, ability: ${abilityAtTime?.toFixed(2) || 'N/A'})`);
  }

  /**
   * Track mastery achievement
   */
  trackMastery(
    userId: string,
    quizId: string,
    cellId: string,
    cellName: string,
    questionsAnswered: number,
    accuracy: number
  ): void {
    this.log({
      userId,
      quizId,
      eventType: 'mastery_achieved',
      data: {
        cellId,
        cellName,
        questionsAnswered,
        accuracy
      }
    });

    console.log(`🎯 [MASTERY] User ${userId} mastered "${cellName}" with ${accuracy.toFixed(1)}% accuracy in ${questionsAnswered} questions`);
  }

  /**
   * Track quiz completion
   */
  async trackQuizCompletion(
    userId: string,
    quizId: string,
    totalQuestions: number,
    totalTime: number,
    finalStats: {
      cellsMastered: number;
      totalCells: number;
      overallAccuracy: number;
      averageSEM: number;
    }
  ): Promise<void> {
    this.log({
      userId,
      quizId,
      eventType: 'quiz_completed',
      duration: totalTime,
      data: {
        totalQuestions,
        totalTime,
        ...finalStats
      }
    });

    console.log(`✅ [COMPLETED] Quiz ${quizId} finished: ${totalQuestions} questions, ${(finalStats.overallAccuracy * 100).toFixed(1)}% accuracy, ${finalStats.cellsMastered}/${finalStats.totalCells} cells mastered`);
  }

  /**
   * Track errors
   */
  trackError(
    userId: string,
    quizId: string,
    error: Error,
    context: Record<string, any>
  ): void {
    this.log({
      userId,
      quizId,
      eventType: 'error',
      data: {
        errorMessage: error.message,
        errorStack: error.stack,
        context
      }
    });

    console.error(`❌ [ERROR] ${error.message}`, context);
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentErrors: EngineMetrics[];
    averageSelectionTime: number;
  } {
    const eventsByType: Record<string, number> = {};
    let totalSelectionTime = 0;
    let selectionCount = 0;

    this.metrics.forEach((m: EngineMetrics) => {
      eventsByType[m.eventType] = (eventsByType[m.eventType] || 0) + 1;
      
      if (m.eventType === 'question_selected' && m.duration) {
        totalSelectionTime += m.duration;
        selectionCount++;
      }
    });

    const recentErrors = this.metrics
      .filter((m: EngineMetrics) => m.eventType === 'error')
      .slice(-10);

    return {
      totalEvents: this.metrics.length,
      eventsByType,
      recentErrors,
      averageSelectionTime: selectionCount > 0 
        ? totalSelectionTime / selectionCount 
        : 0
    };
  }

  /**
   * Get detailed performance report
   */
  async getPerformanceReport(): Promise<{
    systemHealth: 'healthy' | 'degraded' | 'critical';
    averageSelectionTime: number;
    errorRate: number;
    recentAlerts: string[];
  }> {
    const stats = this.getStats();
    const errorRate = stats.totalEvents > 0
      ? (stats.eventsByType['error'] || 0) / stats.totalEvents
      : 0;

    const recentAlerts: string[] = [];

    // Check for performance issues
    if (stats.averageSelectionTime > 1000) {
      recentAlerts.push(`Slow question selection: ${stats.averageSelectionTime.toFixed(0)}ms average`);
    }

    if (errorRate > 0.05) {
      recentAlerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical';
    if (errorRate > 0.1 || stats.averageSelectionTime > 2000) {
      systemHealth = 'critical';
    } else if (errorRate > 0.05 || stats.averageSelectionTime > 1000) {
      systemHealth = 'degraded';
    } else {
      systemHealth = 'healthy';
    }

    return {
      systemHealth,
      averageSelectionTime: stats.averageSelectionTime,
      errorRate,
      recentAlerts
    };
  }

  /**
   * Send metrics to external monitoring service
   */
  private sendToMonitoringService(metric: Omit<EngineMetrics, 'timestamp'>): void {
    // Example integration with a monitoring service
    // Replace with your actual monitoring setup
    
    // Example for DataDog:
    // datadogLogger.log(metric);
    
    // Example for custom endpoint:
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   body: JSON.stringify(metric)
    // });
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const engineMonitor = new EngineMonitor();

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  reset(): void {
    this.startTime = Date.now();
  }
}
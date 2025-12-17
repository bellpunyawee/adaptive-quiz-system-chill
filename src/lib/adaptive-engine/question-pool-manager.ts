// src/lib/adaptive-engine/question-pool-manager.ts

import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSpacedRepetitionQuestions } from "@/lib/spaced-repetition";

/**
 * Question pool configuration
 */
export interface QuestionPoolConfig {
  maxExposure: number;           // Maximum times a question can be shown
  exposureDecayDays: number;     // Days before exposure count resets
  minResponsesForRetirement: number; // Minimum responses before retirement consideration
  retirementThresholds: {
    lowDiscrimination: number;   // Retire if a < threshold
    extremeDifficulty: number;   // Retire if |b| > threshold
    lowCorrectRate: number;      // Retire if p-value < threshold
    highCorrectRate: number;     // Retire if p-value > threshold
  };
}

const DEFAULT_CONFIG: QuestionPoolConfig = {
  maxExposure: 10,
  exposureDecayDays: 30,
  minResponsesForRetirement: 50,
  retirementThresholds: {
    lowDiscrimination: 0.4,
    extremeDifficulty: 3.5,
    lowCorrectRate: 0.15,
    highCorrectRate: 0.95
  }
};

/**
 * Question selection criteria
 */
export interface QuestionSelectionCriteria {
  cellId: string;
  userId: string;
  quizId?: string;  // Added: to filter by current quiz only
  courseId?: string; // CRITICAL: Filter by course for multi-course support
  excludeQuestionIds?: string[];
  minDifficulty?: number;
  maxDifficulty?: number;
  preferredDifficulty?: number;
  quizType?: string;  // Added: for practice mode filtering
}

/**
 * Question quality metrics
 */
export interface QuestionQualityMetrics {
  questionId: string;
  responseCount: number;
  correctRate: number;
  discrimination: number;
  difficulty: number;
  exposureRate: number;
  isHealthy: boolean;
  issues: string[];
}

/**
 * Question Pool Manager
 * Handles exposure control, quality monitoring, and retirement
 */
export class QuestionPoolManager {
  private config: QuestionPoolConfig;

  constructor(config: Partial<QuestionPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get available questions for selection with exposure control
   */
  async getAvailableQuestions(
    criteria: QuestionSelectionCriteria
  ): Promise<Prisma.QuestionGetPayload<{ include: { answerOptions: true } }>[]> {
    const { cellId, userId, quizId, courseId, excludeQuestionIds = [], quizType = 'regular' } = criteria;

    console.log(`[POOL] Getting questions for cell: ${cellId}, course: ${courseId || 'not specified'}`);
    console.log(`[POOL] User ID: ${userId}, Quiz ID: ${quizId || 'not specified'}, Quiz Type: ${quizType}`);

    // Get questions already answered by this user in THIS quiz only
    let answeredIds: string[] = [];
    let incorrectQuestionIds: string[] = [];
    
    // Practice mode: get incorrect questions from ALL quizzes for review mode
    // NOW USES SPACED REPETITION
    if (quizType === 'practice-review' || quizType === 'review-mistakes') {
      console.log(`[POOL] Practice mode (review): Using spaced repetition system`);

      // Get questions using spaced repetition (prioritizes due reviews)
      const spacedQuestions = await getSpacedRepetitionQuestions(userId, cellId, 20);

      // Combine due reviews and new incorrect questions
      const allQuestions = [...spacedQuestions.dueReviews, ...spacedQuestions.newQuestions];
      incorrectQuestionIds = allQuestions.map(q => q.id);

      console.log(`[POOL] Spaced repetition: ${spacedQuestions.dueReviews.length} due reviews + ${spacedQuestions.newQuestions.length} new incorrect = ${incorrectQuestionIds.length} total`);
    }

    if (quizId) {
      // Only exclude questions from THIS quiz
      const userAnsweredQuestions = await prisma.userAnswer.findMany({
        where: {
          userId,
          quizId  // Filter by current quiz
        },
        select: { questionId: true, isCorrect: true },
        distinct: ['questionId']
      });
      answeredIds = userAnsweredQuestions.map(a => a.questionId);
      console.log(`[POOL] User has answered ${answeredIds.length} questions in this quiz (Quiz ID: ${quizId})`);
    } else {
      // For practice-new mode: exclude ALL previously answered questions
      const userAnsweredQuestions = await prisma.userAnswer.findMany({
        where: {
          userId,
          question: quizType === 'practice-new' ? { cellId } : undefined // Filter by cell for practice-new
        },
        select: { questionId: true },
        distinct: ['questionId']
      });
      answeredIds = userAnsweredQuestions.map(a => a.questionId);
      console.log(`[POOL] User has answered ${answeredIds.length} questions ${quizType === 'practice-new' ? 'in this cell' : 'total'} (across all quizzes)`);
    }

    // Determine which questions to include based on quiz type
    let allExcludedIds: string[];

    if (quizType === 'practice-review' || quizType === 'review-mistakes') {
      // Review mode: ONLY include incorrect questions, exclude answered in this quiz
      allExcludedIds = answeredIds; // Only exclude from current quiz
      console.log(`[POOL] Review mode: will filter to ${incorrectQuestionIds.length} incorrect questions`);
    } else if (quizType === 'practice-new') {
      // New questions only: exclude ALL previously answered
      allExcludedIds = [...excludeQuestionIds, ...answeredIds];
      console.log(`[POOL] New questions mode: excluding all ${allExcludedIds.length} previously answered`);
    } else {
      // Standard mode: exclude from current quiz only
      allExcludedIds = [...excludeQuestionIds, ...answeredIds];
    }

    if (allExcludedIds.length > 0) {
      console.log(`[POOL] Total excluded question IDs: ${allExcludedIds.length}`);
      console.log(`[POOL] Sample excluded IDs: ${allExcludedIds.slice(0, 3).join(', ')}${allExcludedIds.length > 3 ? ` ... (${allExcludedIds.length} total)` : ''}`);
    }

    // Check if enhanced fields exist by checking first question
    const sampleQuestionWhere: any = { cellId };
    if (courseId) {
      sampleQuestionWhere.courseId = courseId; // CRITICAL: Course scoping
    }

    const sampleQuestion = await prisma.question.findFirst({
      where: sampleQuestionWhere
    });

    if (!sampleQuestion) {
      console.log(`[POOL] ⚠️ No questions found in cell ${cellId}`);
      return [];
    }

    // Backwards compatible: Check if new fields exist
    const hasEnhancedFields = sampleQuestion && 
      'exposureCount' in sampleQuestion && 
      'isActive' in sampleQuestion;

    console.log(`[POOL] Enhanced fields available: ${hasEnhancedFields}`);

    let questions;

    if (hasEnhancedFields) {
      // Use enhanced filtering if fields exist
      console.log(`[POOL] Using enhanced filtering with exposure control`);

      const whereClause: any = {
        cellId,
        isActive: true,
        exposureCount: { lt: this.config.maxExposure }
      };

      // CRITICAL: Add course scoping for multi-course support
      if (courseId) {
        whereClause.courseId = courseId;
      }

      // For review mode: ONLY include incorrect questions
      if (quizType === 'practice-review' || quizType === 'review-mistakes') {
        if (incorrectQuestionIds.length > 0) {
          whereClause.id = { in: incorrectQuestionIds, notIn: allExcludedIds };
        } else {
          // No incorrect questions to review
          console.log(`[POOL] No incorrect questions found for review mode`);
          return [];
        }
      } else {
        // Only add exclusion if there are IDs to exclude
        if (allExcludedIds.length > 0) {
          whereClause.id = { notIn: allExcludedIds };
        }
      }

      questions = await prisma.question.findMany({
        where: whereClause,
        include: {
          answerOptions: true
        },
        orderBy: [
          { exposureCount: 'asc' },
          { lastUsed: 'asc' }
        ]
      });

      console.log(`[POOL] Query where clause:`, JSON.stringify(whereClause, null, 2));
    } else {
      // Fallback to basic filtering (backwards compatible)
      console.log('[POOL] Using backwards-compatible mode (basic filtering)');

      const whereClause: any = { cellId };

      // CRITICAL: Add course scoping for multi-course support
      if (courseId) {
        whereClause.courseId = courseId;
      }

      // For review mode: ONLY include incorrect questions
      if (quizType === 'practice-review' || quizType === 'review-mistakes') {
        if (incorrectQuestionIds.length > 0) {
          whereClause.id = { in: incorrectQuestionIds, notIn: allExcludedIds };
        } else {
          console.log(`[POOL] No incorrect questions found for review mode`);
          return [];
        }
      } else {
        if (allExcludedIds.length > 0) {
          whereClause.id = { notIn: allExcludedIds };
        }
      }
      
      questions = await prisma.question.findMany({
        where: whereClause,
        include: {
          answerOptions: true
        }
      });
    }

    console.log(`[POOL] Found ${questions.length} questions after filtering`);
    if (questions.length > 0) {
      console.log(`[POOL] Sample question IDs: ${questions.slice(0, 3).map(q => q.id).join(', ')}`);
    }

    // Apply difficulty filters if specified
    let filteredQuestions = questions;

    if (criteria.minDifficulty !== undefined) {
      const beforeCount = filteredQuestions.length;
      filteredQuestions = filteredQuestions.filter(
        q => q.difficulty_b >= criteria.minDifficulty!
      );
      console.log(`[POOL] After minDifficulty filter (${criteria.minDifficulty}): ${filteredQuestions.length} (removed ${beforeCount - filteredQuestions.length})`);
    }

    if (criteria.maxDifficulty !== undefined) {
      const beforeCount = filteredQuestions.length;
      filteredQuestions = filteredQuestions.filter(
        q => q.difficulty_b <= criteria.maxDifficulty!
      );
      console.log(`[POOL] After maxDifficulty filter (${criteria.maxDifficulty}): ${filteredQuestions.length} (removed ${beforeCount - filteredQuestions.length})`);
    }

    console.log(`[POOL] Final count: ${filteredQuestions.length} available questions`);

    return filteredQuestions;
  }

  /**
   * Track question usage after selection
   */
  async trackQuestionUsage(
    questionId: string,
    userId: string,
    abilityAtTime: number
  ): Promise<void> {
    // Check if enhanced fields exist
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (question && 'exposureCount' in question) {
      // Update with enhanced tracking
      await prisma.question.update({
        where: { id: questionId },
        data: {
          exposureCount: { increment: 1 },
          lastUsed: new Date()
        }
      });

      console.log(`[POOL] Question ${questionId} exposure: ${question.exposureCount + 1}`);
    } else {
      // Backwards compatible: just log
      console.log(`[POOL] Question ${questionId} tracked (enhanced fields not available)`);
    }
  }

  /**
   * Update question after receiving response
   */
  async updateQuestionAfterResponse(
    questionId: string,
    isCorrect: boolean
  ): Promise<void> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { userAnswers: true }
    });

    if (!question) return;

    // Check if enhanced fields exist
    if ('responseCount' in question && 'correctRate' in question) {
      const totalResponses = question.userAnswers.length;
      const correctResponses = question.userAnswers.filter(a => a.isCorrect).length;
      const correctRate = totalResponses > 0 ? correctResponses / totalResponses : null;

      await prisma.question.update({
        where: { id: questionId },
        data: {
          responseCount: totalResponses,
          correctRate
        }
      });

      console.log(`[POOL] Updated question ${questionId}: ${totalResponses} responses, ${(correctRate! * 100).toFixed(1)}% correct`);
    } else {
      // Backwards compatible: just log
      console.log(`[POOL] Question ${questionId} response recorded (enhanced fields not available)`);
    }
  }

  /**
   * Analyze question quality and identify issues
   */
  async analyzeQuestionQuality(questionId: string): Promise<QuestionQualityMetrics> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { userAnswers: true }
    });

    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    const responseCount = question.responseCount;
    const correctRate = question.correctRate ?? 0;
    const discrimination = question.discrimination_a;
    const difficulty = question.difficulty_b;
    const exposureRate = question.exposureCount / Math.max(1, responseCount);

    const issues: string[] = [];
    let isHealthy = true;

    // Check discrimination
    if (responseCount >= this.config.minResponsesForRetirement) {
      if (discrimination < this.config.retirementThresholds.lowDiscrimination) {
        issues.push(`Low discrimination (${discrimination.toFixed(2)} < ${this.config.retirementThresholds.lowDiscrimination})`);
        isHealthy = false;
      }

      // Check difficulty
      if (Math.abs(difficulty) > this.config.retirementThresholds.extremeDifficulty) {
        issues.push(`Extreme difficulty (|${difficulty.toFixed(2)}| > ${this.config.retirementThresholds.extremeDifficulty})`);
        isHealthy = false;
      }

      // Check p-value
      if (correctRate < this.config.retirementThresholds.lowCorrectRate) {
        issues.push(`Too difficult (p-value ${correctRate.toFixed(2)} < ${this.config.retirementThresholds.lowCorrectRate})`);
        isHealthy = false;
      }

      if (correctRate > this.config.retirementThresholds.highCorrectRate) {
        issues.push(`Too easy (p-value ${correctRate.toFixed(2)} > ${this.config.retirementThresholds.highCorrectRate})`);
        isHealthy = false;
      }
    }

    // Check exposure
    if (question.exposureCount >= this.config.maxExposure) {
      issues.push(`Maximum exposure reached (${question.exposureCount}/${this.config.maxExposure})`);
    }

    return {
      questionId,
      responseCount,
      correctRate,
      discrimination,
      difficulty,
      exposureRate,
      isHealthy,
      issues
    };
  }

  /**
   * Retire questions that don't meet quality standards
   */
  async retireQuestion(
    questionId: string,
    reason: string
  ): Promise<void> {
    await prisma.question.update({
      where: { id: questionId },
      data: {
        isActive: false,
        retiredAt: new Date(),
        retirementReason: reason
      }
    });

    console.log(`[POOL] Question ${questionId} retired: ${reason}`);

    // Log to history
    await prisma.iRTParameterHistory.create({
      data: {
        entityType: 'Question',
        entityId: questionId,
        difficulty_b: (await prisma.question.findUnique({ where: { id: questionId } }))!.difficulty_b,
        discrimination_a: (await prisma.question.findUnique({ where: { id: questionId } }))!.discrimination_a,
        reason: `Retired: ${reason}`
      }
    });
  }

  /**
   * Automatically retire problematic questions
   */
  async autoRetireProblematicQuestions(): Promise<{
    retired: number;
    analyzed: number;
  }> {
    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        responseCount: { gte: this.config.minResponsesForRetirement }
      }
    });

    let retiredCount = 0;

    for (const question of questions) {
      const metrics = await this.analyzeQuestionQuality(question.id);

      if (!metrics.isHealthy && metrics.issues.length > 0) {
        await this.retireQuestion(question.id, metrics.issues.join('; '));
        retiredCount++;
      }
    }

    console.log(`[POOL] Auto-retirement: ${retiredCount}/${questions.length} questions retired`);

    return {
      retired: retiredCount,
      analyzed: questions.length
    };
  }

  /**
   * Reset exposure counts for questions not used recently
   */
  async resetExpiredExposure(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.exposureDecayDays);

    const result = await prisma.question.updateMany({
      where: {
        lastUsed: { lt: cutoffDate },
        exposureCount: { gt: 0 }
      },
      data: {
        exposureCount: 0
      }
    });

    console.log(`[POOL] Reset exposure for ${result.count} questions (unused for ${this.config.exposureDecayDays} days)`);

    return result.count;
  }

  /**
   * Get item bank statistics
   */
  async getPoolStatistics(cellId?: string): Promise<{
    total: number;
    active: number;
    retired: number;
    overExposed: number;
    needsCalibration: number;
    averageExposure: number;
    averageResponseCount: number;
  }> {
    const where = cellId ? { cellId } : {};

    const [total, active, retired, overExposed, needsCalibration, stats] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.count({ where: { ...where, isActive: true } }),
      prisma.question.count({ where: { ...where, isActive: false } }),
      prisma.question.count({ where: { ...where, exposureCount: { gte: this.config.maxExposure } } }),
      prisma.question.count({ 
        where: { 
          ...where, 
          responseCount: { gte: 30 },
          OR: [
            { lastCalibrated: null },
            { lastCalibrated: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          ]
        } 
      }),
      prisma.question.aggregate({
        where,
        _avg: {
          exposureCount: true,
          responseCount: true
        }
      })
    ]);

    return {
      total,
      active,
      retired,
      overExposed,
      needsCalibration,
      averageExposure: stats._avg.exposureCount ?? 0,
      averageResponseCount: stats._avg.responseCount ?? 0
    };
  }

  /**
   * Generate comprehensive pool health report
   */
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    statistics: {
      total: number;
      active: number;
      retired: number;
      overExposed: number;
      needsCalibration: number;
      averageExposure: number;
      averageResponseCount: number;
    };
    recommendations: string[];
  }> {
    const stats = await this.getPoolStatistics();
    const recommendations: string[] = [];

    // Check active question ratio
    const activeRatio = stats.active / stats.total;
    if (activeRatio < 0.5) {
      recommendations.push(`Low active question ratio (${(activeRatio * 100).toFixed(1)}%). Consider adding new questions.`);
    }

    // Check over-exposure
    const overExposureRatio = stats.overExposed / stats.active;
    if (overExposureRatio > 0.3) {
      recommendations.push(`High over-exposure rate (${(overExposureRatio * 100).toFixed(1)}%). Run exposure reset or add more questions.`);
    }

    // Check calibration needs
    if (stats.needsCalibration > 0) {
      recommendations.push(`${stats.needsCalibration} questions need IRT recalibration.`);
    }

    // Check average response count
    if (stats.averageResponseCount < 10) {
      recommendations.push(`Low average response count (${stats.averageResponseCount.toFixed(1)}). Questions may not have reliable parameters.`);
    }

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical';
    if (activeRatio < 0.3 || overExposureRatio > 0.5) {
      overall = 'critical';
    } else if (recommendations.length > 2) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      statistics: stats,
      recommendations
    };
  }

  /**
   * Reactivate retired questions (manual override)
   */
  async reactivateQuestion(questionId: string): Promise<void> {
    await prisma.question.update({
      where: { id: questionId },
      data: {
        isActive: true,
        retiredAt: null,
        retirementReason: null,
        exposureCount: 0
      }
    });

    console.log(`[POOL] Question ${questionId} reactivated`);
  }
}

// Export singleton instance
export const questionPoolManager = new QuestionPoolManager();
// src/lib/adaptive-engine/maintenance-jobs.ts

import prisma from "@/lib/db";
import { questionPoolManager } from "./question-pool-manager";
import { estimateQuestionParameters } from "./irt-estimator-enhanced";

/**
 * Background job to recalibrate question parameters
 * Run this periodically (e.g., daily or weekly)
 */
export async function recalibrateQuestionParametersJob(): Promise<{
  totalQuestions: number;
  calibrated: number;
  failed: number;
  skipped: number;
}> {
  console.log('[MAINTENANCE] Starting question parameter recalibration job');
  const startTime = Date.now();

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      responseCount: { gte: 30 } // Only calibrate questions with sufficient data
    },
    select: {
      id: true,
      difficulty_b: true,
      discrimination_a: true,
      responseCount: true,
      lastCalibrated: true
    }
  });

  let calibrated = 0;
  let failed = 0;
  let skipped = 0;

  for (const question of questions) {
    try {
      // Skip if calibrated recently (within 7 days)
      if (question.lastCalibrated) {
        const daysSinceCalibration = (Date.now() - question.lastCalibrated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCalibration < 7) {
          skipped++;
          continue;
        }
      }

      const newParams = await estimateQuestionParameters(question.id);
      
      if (newParams) {
        // Check if parameters changed significantly
        const difficultyChange = Math.abs(newParams.difficulty_b - question.difficulty_b);
        const discriminationChange = Math.abs(newParams.discrimination_a - question.discrimination_a);

        if (difficultyChange > 0.1 || discriminationChange > 0.1) {
          // Store old parameters in history
          await prisma.iRTParameterHistory.create({
            data: {
              entityType: 'Question',
              entityId: question.id,
              difficulty_b: question.difficulty_b,
              discrimination_a: question.discrimination_a,
              reason: `Recalibration (b: ${question.difficulty_b.toFixed(2)} → ${newParams.difficulty_b.toFixed(2)}, a: ${question.discrimination_a.toFixed(2)} → ${newParams.discrimination_a.toFixed(2)})`
            }
          });

          // Update question parameters
          await prisma.question.update({
            where: { id: question.id },
            data: {
              difficulty_b: newParams.difficulty_b,
              discrimination_a: newParams.discrimination_a,
              lastCalibrated: new Date()
            }
          });

          calibrated++;
          console.log(`[MAINTENANCE] Recalibrated question ${question.id}: b=${newParams.difficulty_b.toFixed(2)}, a=${newParams.discrimination_a.toFixed(2)}`);
        } else {
          // Parameters stable, just update timestamp
          await prisma.question.update({
            where: { id: question.id },
            data: { lastCalibrated: new Date() }
          });
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[MAINTENANCE] Failed to calibrate question ${question.id}:`, error);
      failed++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[MAINTENANCE] Recalibration job completed in ${duration}ms`);
  console.log(`[MAINTENANCE] Total: ${questions.length}, Calibrated: ${calibrated}, Failed: ${failed}, Skipped: ${skipped}`);

  return {
    totalQuestions: questions.length,
    calibrated,
    failed,
    skipped
  };
}

/**
 * Background job to retire problematic questions
 * Run this weekly or monthly
 */
export async function autoRetirementJob(): Promise<{
  analyzed: number;
  retired: number;
}> {
  console.log('[MAINTENANCE] Starting auto-retirement job');
  
  const result = await questionPoolManager.autoRetireProblematicQuestions();
  
  console.log(`[MAINTENANCE] Auto-retirement completed: ${result.retired} questions retired`);
  
  return result;
}

/**
 * Background job to reset exposure counts
 * Run this daily
 */
export async function resetExposureJob(): Promise<number> {
  console.log('[MAINTENANCE] Starting exposure reset job');
  
  const count = await questionPoolManager.resetExpiredExposure();
  
  console.log(`[MAINTENANCE] Exposure reset completed: ${count} questions reset`);
  
  return count;
}

/**
 * Background job to generate and log pool health report
 * Run this daily
 */
export async function healthReportJob(): Promise<{
  overall: 'healthy' | 'warning' | 'critical';
  report: Awaited<ReturnType<typeof questionPoolManager.generateHealthReport>>;
}> {
  console.log('[MAINTENANCE] Generating pool health report');
  
  const report = await questionPoolManager.generateHealthReport();
  
  console.log(`[MAINTENANCE] Pool health: ${report.overall}`);
  console.log(`[MAINTENANCE] Active questions: ${report.statistics.active}/${report.statistics.total}`);
  
  if (report.recommendations.length > 0) {
    console.log('[MAINTENANCE] Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  return {
    overall: report.overall,
    report
  };
}

/**
 * Run all maintenance jobs in sequence
 * Schedule this to run at low-traffic times (e.g., 3 AM daily)
 */
export async function runAllMaintenanceJobs(): Promise<{
  recalibration: Awaited<ReturnType<typeof recalibrateQuestionParametersJob>>;
  retirement: Awaited<ReturnType<typeof autoRetirementJob>>;
  exposureReset: number;
  healthReport: Awaited<ReturnType<typeof healthReportJob>>;
  duration: number;
}> {
  const startTime = Date.now();
  console.log('[MAINTENANCE] ====== Starting All Maintenance Jobs ======');

  try {
    // 1. Reset expired exposures
    const exposureReset = await resetExposureJob();

    // 2. Recalibrate question parameters
    const recalibration = await recalibrateQuestionParametersJob();

    // 3. Auto-retire problematic questions
    const retirement = await autoRetirementJob();

    // 4. Generate health report
    const healthReport = await healthReportJob();

    const duration = Date.now() - startTime;
    console.log(`[MAINTENANCE] ====== All Jobs Completed in ${duration}ms ======`);

    return {
      recalibration,
      retirement,
      exposureReset,
      healthReport,
      duration
    };
  } catch (error) {
    console.error('[MAINTENANCE] Maintenance jobs failed:', error);
    throw error;
  }
}

/**
 * Clean up old quiz data (optional - for database maintenance)
 * Run this monthly
 */
export async function cleanupOldDataJob(daysToKeep: number = 90): Promise<{
  quizzesDeleted: number;
  answersDeleted: number;
  logsDeleted: number;
}> {
  console.log(`[MAINTENANCE] Starting cleanup job (keeping last ${daysToKeep} days)`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  // Delete old completed quizzes and their associated data
  const quizzes = await prisma.quiz.findMany({
    where: {
      status: 'completed',
      completedAt: { lt: cutoffDate }
    },
    select: { id: true }
  });

  const quizIds = quizzes.map(q => q.id);

  // Delete associated user answers
  const answersResult = await prisma.userAnswer.deleteMany({
    where: { quizId: { in: quizIds } }
  });

  // Delete associated engine logs
  const logsResult = await prisma.engineLog.deleteMany({
    where: { quizId: { in: quizIds } }
  });

  // Delete quizzes
  const quizzesResult = await prisma.quiz.deleteMany({
    where: { id: { in: quizIds } }
  });

  console.log(`[MAINTENANCE] Cleanup completed:`);
  console.log(`  - Quizzes deleted: ${quizzesResult.count}`);
  console.log(`  - Answers deleted: ${answersResult.count}`);
  console.log(`  - Logs deleted: ${logsResult.count}`);

  return {
    quizzesDeleted: quizzesResult.count,
    answersDeleted: answersResult.count,
    logsDeleted: logsResult.count
  };
}
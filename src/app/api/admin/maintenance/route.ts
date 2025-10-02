// src/app/api/admin/maintenance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  runAllMaintenanceJobs,
  recalibrateQuestionParametersJob,
  autoRetirementJob,
  resetExposureJob,
  healthReportJob,
  cleanupOldDataJob
} from '@/lib/adaptive-engine/maintenance-jobs';

/**
 * POST /api/admin/maintenance
 * Run maintenance jobs
 * 
 * Body: { job: 'all' | 'recalibrate' | 'retire' | 'exposure' | 'health' | 'cleanup' }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to verify admin access
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { job } = body;

    switch (job) {
      case 'all':
        const allResults = await runAllMaintenanceJobs();
        return NextResponse.json({
          success: true,
          job: 'all',
          results: allResults
        });

      case 'recalibrate':
        const recalibrationResults = await recalibrateQuestionParametersJob();
        return NextResponse.json({
          success: true,
          job: 'recalibrate',
          results: recalibrationResults
        });

      case 'retire':
        const retirementResults = await autoRetirementJob();
        return NextResponse.json({
          success: true,
          job: 'retire',
          results: retirementResults
        });

      case 'exposure':
        const exposureCount = await resetExposureJob();
        return NextResponse.json({
          success: true,
          job: 'exposure',
          results: { resetCount: exposureCount }
        });

      case 'health':
        const healthResults = await healthReportJob();
        return NextResponse.json({
          success: true,
          job: 'health',
          results: healthResults
        });

      case 'cleanup':
        const daysToKeep = body.daysToKeep || 90;
        const cleanupResults = await cleanupOldDataJob(daysToKeep);
        return NextResponse.json({
          success: true,
          job: 'cleanup',
          results: cleanupResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid job type. Must be one of: all, recalibrate, retire, exposure, health, cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Maintenance job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/maintenance/health
 * Get current pool health report without running jobs
 */
export async function GET() {
  try {
    // TODO: Add authentication
    
    const healthReport = await healthReportJob();
    
    return NextResponse.json({
      success: true,
      ...healthReport
    });
  } catch (error) {
    console.error('[API] Health report failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
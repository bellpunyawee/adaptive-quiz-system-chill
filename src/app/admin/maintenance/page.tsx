// src/app/admin/maintenance/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Settings,
  RefreshCw,
  Trash2,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

type JobType = 'all' | 'recalibrate' | 'retire' | 'exposure' | 'health' | 'cleanup';

interface JobResult {
  success: boolean;
  job: string;
  results: Record<string, unknown>;
  error?: string;
}

export default function MaintenancePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [results, setResults] = useState<JobResult | null>(null);

  const runMaintenanceJob = async (job: JobType) => {
    setIsRunning(true);
    setCurrentJob(job);
    setResults(null);

    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run maintenance job');
      }

      setResults(data);
    } catch (error) {
      setResults({
        success: false,
        job,
        results: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
      setCurrentJob(null);
    }
  };

  const maintenanceJobs = [
    {
      id: 'health' as JobType,
      title: 'System Health Check',
      description: 'Generate comprehensive health report',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 'recalibrate' as JobType,
      title: 'Recalibrate Questions',
      description: 'Update IRT parameters based on response data',
      icon: Settings,
      color: 'text-blue-600',
    },
    {
      id: 'retire' as JobType,
      title: 'Auto-Retire Questions',
      description: 'Retire overexposed or problematic questions',
      icon: Trash2,
      color: 'text-yellow-600',
    },
    {
      id: 'exposure' as JobType,
      title: 'Reset Exposure Counts',
      description: 'Reset exposure counters for all questions',
      icon: RefreshCw,
      color: 'text-purple-600',
    },
    {
      id: 'cleanup' as JobType,
      title: 'Cleanup Old Data',
      description: 'Remove old logs and temporary data (90+ days)',
      icon: Database,
      color: 'text-red-600',
    },
    {
      id: 'all' as JobType,
      title: 'Run All Jobs',
      description: 'Execute all maintenance tasks in sequence',
      icon: Settings,
      color: 'text-slate-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          System Maintenance
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Run administrative tasks and system maintenance jobs
        </p>
      </div>

      {/* Results Alert */}
      {results && (
        <Alert variant={results.success ? 'default' : 'destructive'}>
          {results.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {results.success ? 'Job Completed Successfully' : 'Job Failed'}
          </AlertTitle>
          <AlertDescription>
            {results.success ? (
              <div className="mt-2">
                <p className="font-medium">Job: {results.job}</p>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(results.results, null, 2)}
                </pre>
              </div>
            ) : (
              <p>{results.error}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Maintenance Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {maintenanceJobs.map((job) => {
          const Icon = job.icon;
          const isCurrentJob = currentJob === job.id;

          return (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${job.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription>{job.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runMaintenanceJob(job.id)}
                  disabled={isRunning}
                  className="w-full"
                  variant={job.id === 'all' ? 'default' : 'outline'}
                >
                  {isCurrentJob ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Icon className="h-4 w-4 mr-2" />
                      Run Job
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Guidelines</CardTitle>
          <CardDescription>Important information about maintenance jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                System Health Check:
              </span>{' '}
              Non-destructive. Safe to run anytime to get a comprehensive system report.
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                Recalibrate Questions:
              </span>{' '}
              Updates IRT parameters based on response data. Run after significant user activity.
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                Auto-Retire Questions:
              </span>{' '}
              Identifies and retires overexposed or poorly performing questions. Irreversible.
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                Reset Exposure Counts:
              </span>{' '}
              Resets exposure counters to zero. Use cautiously as it affects question selection.
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                Cleanup Old Data:
              </span>{' '}
              Removes logs and temporary data older than 90 days. Cannot be undone.
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-white">
                Run All Jobs:
              </span>{' '}
              Executes all maintenance tasks. Recommended to run during low-traffic periods.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

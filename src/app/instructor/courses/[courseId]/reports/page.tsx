'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  TrendingUp,
  Award,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StudentReport {
  student: {
    id: string;
    name: string | null;
    email: string | null;
  };
  stats: {
    totalQuizzes: number;
    completedQuizzes: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    avgResponseTime: number;
    lastActivity: string | null;
  };
  recentActivity: {
    quizId: string;
    createdAt: string;
    questionText: string;
    isCorrect: boolean;
    responseTime: number | null;
    topic: string;
  }[];
}

interface CourseInfo {
  id: string;
  title: string;
  joinCode: string;
}

export default function InstructorReportsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'accuracy' | 'activity'>('name');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [courseId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/instructor/courses/${courseId}/reports`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setReports(data.reports);
      } else {
        console.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Student Name',
      'Student Email',
      'Total Quizzes',
      'Completed Quizzes',
      'Total Questions',
      'Correct Answers',
      'Accuracy (%)',
      'Avg Response Time (s)',
      'Last Activity',
    ];

    const rows = filteredReports.map((report) => [
      report.student.name || 'N/A',
      report.student.email || 'N/A',
      report.stats.totalQuizzes,
      report.stats.completedQuizzes,
      report.stats.totalQuestions,
      report.stats.correctAnswers,
      report.stats.accuracy.toFixed(2),
      report.stats.avgResponseTime?.toFixed(2) || 'N/A',
      report.stats.lastActivity
        ? new Date(report.stats.lastActivity).toLocaleString()
        : 'Never',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course?.title || 'course'}_student_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportDetailedJSON = () => {
    const data = {
      course: course,
      exportDate: new Date().toISOString(),
      reports: filteredReports,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course?.title || 'course'}_detailed_reports_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredReports = reports
    .filter((report) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        report.student.name?.toLowerCase().includes(searchLower) ||
        report.student.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'accuracy':
          return b.stats.accuracy - a.stats.accuracy;
        case 'activity':
          const dateA = a.stats.lastActivity ? new Date(a.stats.lastActivity).getTime() : 0;
          const dateB = b.stats.lastActivity ? new Date(b.stats.lastActivity).getTime() : 0;
          return dateB - dateA;
        case 'name':
        default:
          return (a.student.name || '').localeCompare(b.student.name || '');
      }
    });

  const courseStats = {
    totalStudents: reports.length,
    activeStudents: reports.filter((r) => r.stats.totalQuizzes > 0).length,
    avgAccuracy:
      reports.length > 0
        ? reports.reduce((sum, r) => sum + r.stats.accuracy, 0) / reports.length
        : 0,
    totalQuizzes: reports.reduce((sum, r) => sum + r.stats.completedQuizzes, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/students`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Student Reports</h1>
            <p className="text-muted-foreground">{course?.title}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportDetailedJSON} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Course Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {courseStats.activeStudents} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courseStats.avgAccuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseStats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">Completed by students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courseStats.totalStudents > 0
                ? ((courseStats.activeStudents / courseStats.totalStudents) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Students active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="accuracy">Accuracy (High-Low)</SelectItem>
                <SelectItem value="activity">Recent Activity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>
            Showing {filteredReports.length} of {reports.length} students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No students found matching your search.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.student.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {report.student.name || 'Unnamed Student'}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {report.student.email}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Quizzes</p>
                          <p className="text-lg font-semibold">
                            {report.stats.completedQuizzes} / {report.stats.totalQuizzes}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <p className="text-lg font-semibold flex items-center gap-2">
                            {report.stats.accuracy.toFixed(1)}%
                            {report.stats.accuracy >= 80 ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : report.stats.accuracy >= 60 ? (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Questions</p>
                          <p className="text-lg font-semibold">
                            {report.stats.correctAnswers} / {report.stats.totalQuestions}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Active</p>
                          <p className="text-sm font-medium">
                            {report.stats.lastActivity
                              ? formatDistanceToNow(new Date(report.stats.lastActivity), {
                                  addSuffix: true,
                                })
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Recent Activity Preview */}
                      {report.recentActivity.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Recent Activity</p>
                          <div className="space-y-2">
                            {report.recentActivity.slice(0, 3).map((activity, idx) => (
                              <div
                                key={idx}
                                className="text-sm flex items-center gap-2 text-muted-foreground"
                              >
                                {activity.isCorrect ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span className="truncate max-w-md">
                                  {activity.topic} - {activity.questionText.substring(0, 50)}...
                                </span>
                                <span className="text-xs">
                                  {formatDistanceToNow(new Date(activity.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedStudent(
                          selectedStudent === report.student.id ? null : report.student.id
                        )
                      }
                    >
                      {selectedStudent === report.student.id ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  {/* Detailed Activity (Expandable) */}
                  {selectedStudent === report.student.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-3">All Activity</h4>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {report.recentActivity.map((activity, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-muted/50 rounded border text-sm"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-medium">{activity.topic}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground mb-2">
                              {activity.questionText}
                            </p>
                            <div className="flex items-center gap-4">
                              <span
                                className={`flex items-center gap-1 ${
                                  activity.isCorrect ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {activity.isCorrect ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                {activity.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                              {activity.responseTime && (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {activity.responseTime.toFixed(1)}s
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

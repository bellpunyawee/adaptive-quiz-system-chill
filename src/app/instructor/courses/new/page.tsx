'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, RefreshCw } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const generateJoinCode = () => {
    // Generate 6-character alphanumeric code (uppercase)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setJoinCode(code);
  };

  // Generate initial join code on mount
  useState(() => {
    if (!joinCode) {
      generateJoinCode();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Course title is required');
      return;
    }

    if (!joinCode.trim()) {
      alert('Join code is required');
      return;
    }

    // Validate join code format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(joinCode)) {
      alert('Join code must be 6 uppercase alphanumeric characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/instructor/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
          joinCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/instructor/courses/${data.course.id}/setup`);
      } else {
        const error = await response.json();
        alert(`Failed to create course: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error creating course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/instructor">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground mt-1">
            Set up a new course for your students
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              Provide basic information about your course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Course Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Course Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Course Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Course Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn in this course..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Join Code */}
            <div className="space-y-2">
              <Label htmlFor="joinCode">
                Join Code <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="joinCode"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-lg"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateJoinCode}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Students will use this 6-character code to enroll in your course.
                It will be automatically generated, but you can customize it.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/instructor">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Course
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>After creating your course, you'll be able to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Add topics and questions to your course</li>
            <li>Share the join code with your students</li>
            <li>View and manage student enrollments</li>
            <li>Track student progress and performance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

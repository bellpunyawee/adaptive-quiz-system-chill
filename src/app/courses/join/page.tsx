'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookOpen, ArrowRight } from 'lucide-react';

export default function JoinCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    // Convert to uppercase and validate format
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('Join code must be 6 characters (letters and numbers)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/courses/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ joinCode: code }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/courses/${data.courseId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join course');
      }
    } catch (error) {
      console.error('Error joining course:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-16 max-w-md">
      <div className="text-center mb-8">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">Join a Course</h1>
        <p className="text-muted-foreground">
          Enter the 6-character code provided by your instructor
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Join Code</CardTitle>
          <CardDescription>
            Ask your instructor for the join code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Join Code</Label>
              <Input
                id="joinCode"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError('');
                }}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
                autoComplete="off"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Course
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Don&apos;t have a join code?</p>
        <p>Contact your instructor to get started</p>
      </div>
    </div>
  );
}

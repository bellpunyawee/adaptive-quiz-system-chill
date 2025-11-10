'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ReviewMistakesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');

  useEffect(() => {
    // Redirect to settings page with review mode enabled
    // The settings page will handle creating a review quiz
    router.push('/quiz/settings?mode=review');
  }, [router, quizId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Preparing review mode...</p>
      </div>
    </div>
  );
}

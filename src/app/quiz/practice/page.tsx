'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topics = searchParams.get('topics');

  useEffect(() => {
    if (topics) {
      // Redirect to settings page with practice mode and pre-selected topics
      router.push(`/quiz/settings?mode=practice&topics=${encodeURIComponent(topics)}`);
    } else {
      // No topics specified, just go to practice mode
      router.push('/quiz/settings?mode=practice');
    }
  }, [router, topics]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Preparing practice mode...</p>
      </div>
    </div>
  );
}

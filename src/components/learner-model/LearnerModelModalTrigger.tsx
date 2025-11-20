'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { LearnerModelModal } from './LearnerModelModal';

export function LearnerModelModalTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        size="lg"
      >
        <BookOpen className="h-5 w-5" />
        How It Works
      </Button>

      <LearnerModelModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

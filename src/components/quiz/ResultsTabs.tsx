'use client';

/**
 * Results Tabs Component
 *
 * Client component wrapper for the tabbed results page layout.
 * Handles tab state and URL persistence.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BarChart3, Sparkles, FileText } from 'lucide-react';

export type TabValue = 'overview' | 'analysis' | 'insights' | 'review';

interface ResultsTabsProps {
  defaultTab?: TabValue;
  overviewContent: React.ReactNode;
  analysisContent: React.ReactNode;
  insightsContent: React.ReactNode;
  reviewContent: React.ReactNode;
}

export function ResultsTabs({
  defaultTab = 'overview',
  overviewContent,
  analysisContent,
  insightsContent,
  reviewContent,
}: ResultsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL or use default
  const urlTab = searchParams.get('tab') as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(
    urlTab && ['overview', 'analysis', 'insights', 'review'].includes(urlTab)
      ? urlTab
      : defaultTab
  );

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);

    // Update URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TabValue | null;
    if (urlTab && ['overview', 'analysis', 'insights', 'review'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
        <TabsTrigger value="overview" className="gap-2">
          <LayoutDashboard className="h-4 w-4 hidden sm:inline" />
          <span>Overview</span>
        </TabsTrigger>
        <TabsTrigger value="analysis" className="gap-2">
          <BarChart3 className="h-4 w-4 hidden sm:inline" />
          <span>Analysis</span>
        </TabsTrigger>
        <TabsTrigger value="insights" className="gap-2">
          <Sparkles className="h-4 w-4 hidden sm:inline" />
          <span>AI Insights</span>
        </TabsTrigger>
        <TabsTrigger value="review" className="gap-2">
          <FileText className="h-4 w-4 hidden sm:inline" />
          <span>Review</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6 space-y-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="analysis" className="mt-6 space-y-6">
        {analysisContent}
      </TabsContent>

      <TabsContent value="insights" className="mt-6 space-y-6">
        {insightsContent}
      </TabsContent>

      <TabsContent value="review" className="mt-6 space-y-6">
        {reviewContent}
      </TabsContent>
    </Tabs>
  );
}

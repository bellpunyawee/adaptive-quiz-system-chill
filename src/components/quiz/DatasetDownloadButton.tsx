'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';

interface DatasetDownloadButtonProps {
  questionId: string;
  filename: string;
}

export function DatasetDownloadButton({ questionId, filename }: DatasetDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Open the download URL in a new tab/window
      // The API will redirect to the Vercel Blob URL
      window.open(`/api/questions/${questionId}/dataset`, '_blank');
    } catch (error) {
      console.error('Error downloading dataset:', error);
    } finally {
      // Reset downloading state after a short delay
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        <p className="text-xs text-muted-foreground">Dataset for this question</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Opening...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1" />
            Download
          </>
        )}
      </Button>
    </div>
  );
}

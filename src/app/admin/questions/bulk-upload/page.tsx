// src/app/admin/questions/bulk-upload/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Archive,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadResult {
  success: boolean;
  summary: {
    totalRows: number;
    created: number;
    failed: number;
    imagesUploaded: number;
  };
  createdQuestions: Array<{ id: string; row: number; text: string }>;
  failedQuestions: Array<{ row: number; error: string }>;
  warnings: string[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showFailedDetails, setShowFailedDetails] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['.csv', '.xlsx', '.zip'];
    const fileExtension = selectedFile.name.toLowerCase().match(/\.\w+$/)?.[0];

    if (!fileExtension || !validTypes.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload a CSV, Excel, or ZIP file.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      // 50MB limit
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setError(null);
    toast.success(`File "${selectedFile.name}" selected`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/questions/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.errors || data.parseErrors) {
          const allErrors = [...(data.errors || []), ...(data.parseErrors || [])];
          const errorMessages = allErrors.map((err: any) => {
            if (typeof err === 'string') return err;
            return `Row ${err.row}: ${err.message || err.error}`;
          });

          setError(
            `Failed to parse file:\n${errorMessages.slice(0, 10).join('\n')}${
              errorMessages.length > 10 ? `\n... and ${errorMessages.length - 10} more errors` : ''
            }`
          );
          toast.error('File validation failed. Check errors below.');
        } else {
          setError(data.error || data.message || 'Upload failed');
          toast.error(data.error || 'Upload failed');
        }
        return;
      }

      setResult(data);

      if (data.summary.created > 0) {
        toast.success(
          `Successfully uploaded ${data.summary.created} question${data.summary.created > 1 ? 's' : ''}!`
        );
      }

      if (data.summary.failed > 0) {
        toast.warning(`${data.summary.failed} question${data.summary.failed > 1 ? 's' : ''} failed to upload`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('An unexpected error occurred during upload');
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleGoToQuestions = () => {
    router.push('/admin/questions');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk Upload Questions</h1>
        <p className="text-muted-foreground mt-2">Upload multiple questions at once using CSV, Excel, or ZIP files</p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowInstructions(!showInstructions)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Instructions</CardTitle>
            </div>
            {showInstructions ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>

        {showInstructions && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Step 1: Download a Template</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/templates/question_upload_template.csv" download>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV Template
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/templates/question_upload_template.xlsx" download>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel Template
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/templates/README.md" target="_blank">
                    <Download className="h-4 w-4 mr-2" />
                    Full Guide
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 2: Fill Out Your Questions</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Each row represents one question</li>
                <li>Required fields: question_text, topic_name, options 1-4, correct_option, explanation</li>
                <li>Optional fields: option_5, bloom_taxonomy, tags, image_filename</li>
                <li>Use the "baseline" tag for baseline assessment questions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 3: Upload Your File</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>CSV or Excel only:</strong> Upload the filled template directly
                </li>
                <li>
                  <strong>With images:</strong> Create a ZIP file containing:
                  <ul className="list-circle list-inside ml-6 mt-1">
                    <li>Your filled CSV/Excel file</li>
                    <li>An "images" folder with all referenced image files</li>
                  </ul>
                </li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Topic names must match existing topics exactly. Go to Admin → Dashboard to
                see available topics. Tags must exist in the system (Admin → Tags).
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select or drag and drop your CSV, Excel, or ZIP file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-700'
            } ${file ? 'bg-green-50 dark:bg-green-950 border-green-300' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB •{' '}
                  {file.name.endsWith('.csv')
                    ? 'CSV File'
                    : file.name.endsWith('.xlsx')
                    ? 'Excel File'
                    : 'ZIP Archive'}
                </p>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <p className="text-lg font-medium">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground">or</p>
                <label>
                  <Button variant="outline" asChild>
                    <span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.zip"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      Browse Files
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">Supported: CSV, Excel (.xlsx), ZIP (max 50MB)</p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {file && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.summary.failed === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-2xl font-bold">{result.summary.totalRows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{result.summary.created}</p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{result.summary.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{result.summary.imagesUploaded}</p>
                <p className="text-sm text-muted-foreground">Images</p>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Warnings:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {result.warnings.slice(0, 5).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                    {result.warnings.length > 5 && (
                      <li className="text-muted-foreground">... and {result.warnings.length - 5} more warnings</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Failed Questions */}
            {result.failedQuestions.length > 0 && (
              <div>
                <div
                  className="flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => setShowFailedDetails(!showFailedDetails)}
                >
                  <h4 className="font-semibold text-red-600">Failed Questions ({result.failedQuestions.length})</h4>
                  {showFailedDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>

                {showFailedDetails && (
                  <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                    {result.failedQuestions.map((failed, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="destructive">Row {failed.row}</Badge>
                        <span className="flex-1">{failed.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
              <Button onClick={handleGoToQuestions}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                View All Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, Loader2, ArrowLeft, Save, Eye, Expand } from 'lucide-react';
import { TagSelector } from '@/components/admin/TagSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Cell {
  id: string;
  name: string;
}

interface OptionInput {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  explanation: string | null;
  imageUrl: string | null;
  bloomTaxonomy: string | null;
  cellId: string;
  answerOptions: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  tags: {
    tag: {
      id: string;
      name: string;
      color: string | null;
      category: string | null;
    };
  }[];
}

export default function EditQuestionPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingQuestion, setFetchingQuestion] = useState(true);

  // Form fields
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [cellId, setCellId] = useState('');
  const [bloomTaxonomy, setBloomTaxonomy] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [optionCount, setOptionCount] = useState<'4' | '5'>('4');
  const [options, setOptions] = useState<OptionInput[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageLightbox, setPreviewImageLightbox] = useState(false);

  useEffect(() => {
    fetchCells();
    fetchQuestion();
  }, []);

  useEffect(() => {
    // Update options array when option count changes
    const newCount = parseInt(optionCount);
    if (newCount > options.length) {
      // Add more options
      const newOptions = [...options];
      while (newOptions.length < newCount) {
        newOptions.push({ text: '', isCorrect: false });
      }
      setOptions(newOptions);
    } else if (newCount < options.length) {
      // Remove extra options
      setOptions(options.slice(0, newCount));
    }
  }, [optionCount]);

  const fetchCells = async () => {
    try {
      const response = await fetch('/api/cells');
      if (response.ok) {
        const data = await response.json();
        setCells(data.cells || []);
      }
    } catch (error) {
      console.error('Error fetching cells:', error);
    }
  };

  const fetchQuestion = async () => {
    try {
      setFetchingQuestion(true);
      const response = await fetch(`/api/admin/questions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        const question: Question = data.question;

        setQuestionText(question.text);
        setExplanation(question.explanation || '');
        setCellId(question.cellId);
        setBloomTaxonomy(question.bloomTaxonomy || '');
        setImageUrl(question.imageUrl);
        setOptionCount(question.answerOptions.length === 5 ? '5' : '4');
        setOptions(
          question.answerOptions.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          }))
        );
        setSelectedTagIds(question.tags?.map((t) => t.tag.id) || []);
      } else {
        alert('Failed to fetch question');
        router.push('/admin/questions');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      alert('Error fetching question');
      router.push('/admin/questions');
    } finally {
      setFetchingQuestion(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, PNG, or WebP images.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/questions/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImageUrl(data.url);
        setImageFile(file);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImageFile(null);
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleCorrectOptionChange = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!questionText.trim()) {
      alert('Question text is required');
      return false;
    }

    if (!cellId) {
      alert('Please select a topic');
      return false;
    }

    // Check all options have text
    for (let i = 0; i < options.length; i++) {
      if (!options[i].text.trim()) {
        alert(`Option ${i + 1} cannot be empty`);
        return false;
      }
    }

    // Check exactly one correct answer
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      alert('Exactly one option must be marked as correct');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Update question details
      const response = await fetch(`/api/admin/questions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: questionText,
          explanation: explanation || null,
          imageUrl: imageUrl || null,
          bloomTaxonomy: bloomTaxonomy || null,
          cellId,
          options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to update question: ${error.error || 'Unknown error'}`);
        return;
      }

      // Update tags if any selected
      if (selectedTagIds.length > 0) {
        // First, remove all existing tags
        await fetch(`/api/admin/questions/${params.id}/tags`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: [] }), // Empty array removes all
        });

        // Then add the selected tags
        await fetch(`/api/admin/questions/${params.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: selectedTagIds }),
        });
      } else {
        // If no tags selected, remove all tags
        await fetch(`/api/admin/questions/${params.id}/tags`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: [] }),
        });
      }

      router.push('/admin/questions');
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Error updating question');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingQuestion) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/questions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Question</h1>
          <p className="text-muted-foreground mt-1">
            Update question details and options
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
            <CardDescription>
              Enter the question text and select a topic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="questionText">
                Question Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="questionText"
                placeholder="Enter the question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Question Image (Optional)</Label>
              {!imageUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, or WebP (max 5MB)
                      </p>
                    </div>
                  )}
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={imageUrl}
                    alt="Question image"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized={true}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Topic Selection */}
            <div className="space-y-2">
              <Label htmlFor="cellId">
                Topic <span className="text-destructive">*</span>
              </Label>
              <Select value={cellId} onValueChange={setCellId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {cells.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bloom's Taxonomy Selection */}
            <div className="space-y-2">
              <Label htmlFor="bloomTaxonomy">
                Bloom&apos;s Taxonomy Level (Optional)
              </Label>
              <Select value={bloomTaxonomy || 'none'} onValueChange={(value) => setBloomTaxonomy(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cognitive level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Remember">Remember (Remembering)</SelectItem>
                  <SelectItem value="Understand">Understand (Understanding)</SelectItem>
                  <SelectItem value="Apply">Apply (Applying)</SelectItem>
                  <SelectItem value="Analyze">Analyze (Analyzing)</SelectItem>
                  <SelectItem value="Evaluate">Evaluate (Evaluating)</SelectItem>
                  <SelectItem value="Create">Create (Creating)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Classify the question by cognitive level according to Bloom&apos;s Taxonomy
              </p>
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                disabled={loading || fetchingQuestion}
              />
              <p className="text-xs text-muted-foreground">
                Select tags to categorize this question (e.g., baseline, diagnostic, advanced)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Answer Options</CardTitle>
            <CardDescription>
              Add 4 or 5 answer options and mark the correct one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Option Count Selector */}
            <div className="space-y-2">
              <Label>Number of Options</Label>
              <RadioGroup
                value={optionCount}
                onValueChange={(value) => setOptionCount(value as '4' | '5')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="opt4" />
                  <Label htmlFor="opt4" className="cursor-pointer">
                    4 Options
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="opt5" />
                  <Label htmlFor="opt5" className="cursor-pointer">
                    5 Options
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Options Input */}
            <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex items-center h-10">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={option.isCorrect}
                      onChange={() => handleCorrectOptionChange(index)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`option${index}`} className="sr-only">
                      Option {index + 1}
                    </Label>
                    <Input
                      id={`option${index}`}
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Select the radio button to mark the correct answer
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Explanation</CardTitle>
            <CardDescription>
              Provide an explanation for the correct answer (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Explain why this is the correct answer..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Quiz View
          </Button>
          <div className="flex gap-4">
            <Link href="/admin/questions">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Question
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Preview - How Students Will See This Question</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {/* Replicate quiz interface */}
            <Card className="transition-all">
              <CardHeader>
                <CardTitle>Question 1</CardTitle>
                <CardDescription className="pt-4 text-lg leading-relaxed font-medium text-foreground">
                  {questionText || 'Question text will appear here...'}
                </CardDescription>
                {imageUrl && (
                  <div
                    className="relative w-full h-80 mt-6 mb-2 rounded-lg overflow-hidden bg-muted border cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => setPreviewImageLightbox(true)}
                    title="Click to view full-screen"
                  >
                    <Image
                      src={imageUrl}
                      alt="Question illustration"
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={true}
                      priority
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                      <div className="bg-white/90 dark:bg-black/90 px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium flex items-center gap-2">
                        <Expand className="h-4 w-4" />
                        Click to enlarge
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <RadioGroup className="space-y-3">
                  {options.map((option, index) => (
                    <Label
                      key={index}
                      htmlFor={`preview-option-${index}`}
                      className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-all hover:bg-accent"
                    >
                      <RadioGroupItem value={`option-${index}`} id={`preview-option-${index}`} />
                      <span className="flex-1 text-base">
                        {option.text || `Option ${index + 1}`}
                        {option.isCorrect && (
                          <span className="ml-2 text-xs text-green-600 font-medium">(Correct Answer)</span>
                        )}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>

                {options.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No answer options added yet
                  </p>
                )}

                {explanation && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="font-semibold text-base mb-2 text-foreground">
                      💡 Explanation:
                    </p>
                    <p className="text-base leading-relaxed text-foreground">
                      {explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p><strong>Note:</strong> This preview shows how the question will appear to students during a quiz session.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox in Preview */}
      {imageUrl && (
        <Dialog open={previewImageLightbox} onOpenChange={setPreviewImageLightbox}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Question Image - Full Screen</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[80vh] px-6 pb-6">
              <Image
                src={imageUrl}
                alt="Question illustration - full screen"
                fill
                className="object-contain"
                sizes="95vw"
                unoptimized={true}
                priority
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Upload, X, Loader2, ArrowLeft, Save } from 'lucide-react';
import { TagSelector } from '@/components/admin/TagSelector';
import { DatasetUpload } from '@/components/admin/DatasetUpload';
import { toast } from 'sonner';

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
  datasetUrl: string | null;
  datasetFilename: string | null;
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

export default function EditCourseQuestionPage({
  params: paramsPromise,
}: {
  params: Promise<{ courseId: string; id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const courseId = params.courseId;
  const questionId = params.id;

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
  const [datasetUrl, setDatasetUrl] = useState<string | null>(null);
  const [datasetFilename, setDatasetFilename] = useState<string | null>(null);
  const [optionCount, setOptionCount] = useState<'4' | '5'>('4');
  const [options, setOptions] = useState<OptionInput[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCells();
    fetchQuestion();
  }, [courseId, questionId]);

  useEffect(() => {
    const newCount = parseInt(optionCount);
    if (newCount > options.length) {
      const newOptions = [...options];
      while (newOptions.length < newCount) {
        newOptions.push({ text: '', isCorrect: false });
      }
      setOptions(newOptions);
    } else if (newCount < options.length) {
      setOptions(options.slice(0, newCount));
    }
  }, [optionCount]);

  const fetchCells = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/topics`);
      if (response.ok) {
        const data = await response.json();
        setCells(data.topics || []);
      } else if (response.status === 403) {
        router.push('/403?reason=course_access_denied');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    }
  };

  const fetchQuestion = async () => {
    try {
      setFetchingQuestion(true);
      const response = await fetch(`/api/courses/${courseId}/questions/${questionId}`);
      if (response.ok) {
        const data = await response.json();
        const question: Question = data.question;

        setQuestionText(question.text);
        setExplanation(question.explanation || '');
        setCellId(question.cellId);
        setBloomTaxonomy(question.bloomTaxonomy || '');
        setImageUrl(question.imageUrl);
        setDatasetUrl(question.datasetUrl);
        setDatasetFilename(question.datasetFilename);
        setOptionCount(question.answerOptions.length === 5 ? '5' : '4');
        setOptions(
          question.answerOptions.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          }))
        );
        setSelectedTagIds(question.tags?.map((t) => t.tag.id) || []);
      } else if (response.status === 403) {
        router.push('/403?reason=course_access_denied');
      } else {
        toast.error('Failed to fetch question');
        router.push(`/courses/${courseId}/questions`);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Error fetching question');
      router.push(`/courses/${courseId}/questions`);
    } finally {
      setFetchingQuestion(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or WebP images.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
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
        toast.success('Image uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
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
      toast.error('Question text is required');
      return false;
    }

    if (!cellId) {
      toast.error('Please select a topic');
      return false;
    }

    for (let i = 0; i < options.length; i++) {
      if (!options[i].text.trim()) {
        toast.error(`Option ${i + 1} cannot be empty`);
        return false;
      }
    }

    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      toast.error('Exactly one option must be marked as correct');
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
      const response = await fetch(`/api/courses/${courseId}/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: questionText,
          explanation: explanation || null,
          imageUrl: imageUrl || null,
          datasetUrl: datasetUrl || null,
          datasetFilename: datasetFilename || null,
          bloomTaxonomy: bloomTaxonomy || null,
          cellId,
          answerOptions: options,
          tagIds: selectedTagIds,
        }),
      });

      if (response.ok) {
        toast.success('Question updated successfully');
        router.push(`/courses/${courseId}/questions`);
      } else {
        const error = await response.json();
        toast.error(`Failed to update question: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Error updating question');
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
        <Link href={`/courses/${courseId}/questions`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Question</h1>
          <p className="text-muted-foreground mt-1">
            Update question details
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

            {/* Dataset Upload */}
            <div className="space-y-2">
              <Label>Dataset Attachment (Optional)</Label>
              <DatasetUpload
                currentDatasetUrl={datasetUrl}
                currentDatasetFilename={datasetFilename}
                onUpload={(url, filename) => {
                  setDatasetUrl(url);
                  setDatasetFilename(filename);
                }}
                onRemove={() => {
                  setDatasetUrl(null);
                  setDatasetFilename(null);
                }}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Attach a data file (CSV, JSON, Excel) for students to download with this question
              </p>
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
              <Label>
                Tags (Optional)
              </Label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                disabled={loading}
                courseId={courseId}
              />
              <p className="text-xs text-muted-foreground">
                Tag questions for categorization (e.g., baseline, advanced, practical)
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

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/courses/${courseId}/questions`}>
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
      </form>
    </div>
  );
}

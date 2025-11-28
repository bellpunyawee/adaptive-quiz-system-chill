'use client';

import { useState, useEffect } from 'react';
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
import { Upload, X, Loader2, ArrowLeft, Save } from 'lucide-react';
import { TagSelector } from '@/components/admin/TagSelector';

interface Cell {
  id: string;
  name: string;
}

interface OptionInput {
  text: string;
  isCorrect: boolean;
}

export default function NewQuestionPage() {
  const router = useRouter();
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [cellId, setCellId] = useState('');
  const [bloomTaxonomy, setBloomTaxonomy] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [optionCount, setOptionCount] = useState<'4' | '5'>('4');
  const [options, setOptions] = useState<OptionInput[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: true },
  ]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCells();
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
        if (data.cells && data.cells.length > 0) {
          setCellId(data.cells[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching cells:', error);
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
    const correctCount = options.filter(opt => opt.isCorrect).length;
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
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
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
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        }),
      });

      if (response.ok) {
        router.push('/admin/questions');
      } else {
        const error = await response.json();
        alert(`Failed to create question: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Error creating question');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Create New Question</h1>
          <p className="text-muted-foreground mt-1">
            Add a new question to the question bank
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
              <Label>
                Tags (Optional)
              </Label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                disabled={loading}
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
          <Link href="/admin/questions">
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
                Create Question
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ImageIcon, Search, Loader2, X, Check, ChevronsUpDown, Upload, Tag, FileDown, ArrowLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { ImportQuestionsDialog } from '@/components/admin/ImportQuestionsDialog';

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  bloomTaxonomy?: string | null;
  isActive: boolean;
  cell: {
    id: string;
    name: string;
  };
  answerOptions: AnswerOption[];
  tags: {
    tag: {
      id: string;
      name: string;
      color: string | null;
      category: string | null;
    };
  }[];
}

interface Cell {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
  category: string | null;
}

interface Course {
  id: string;
  title: string;
  description?: string;
}

export default function CourseQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [filterCell, setFilterCell] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [tagSearchText, setTagSearchText] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkTagging, setBulkTagging] = useState(false);
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([]);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCourse();
    fetchCells();
    fetchTags();
  }, [courseId]);

  useEffect(() => {
    fetchQuestions();
  }, [courseId, currentPage, pageSize, filterCell, filterActive, selectedTagIds]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else if (response.status === 403) {
        router.push('/403?reason=course_access_denied');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  const fetchCells = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/topics`);
      if (response.ok) {
        const data = await response.json();
        setCells(data.topics || []);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchTags = async () => {
    try {
      setTagsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data || []);
        console.log('[Course Questions] Loaded tags:', data?.length || 0);
      } else {
        console.error('[Course Questions] Failed to fetch tags:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCell && filterCell !== 'all') params.append('cellId', filterCell);
      if (filterActive && filterActive !== 'all') params.append('isActive', filterActive);
      if (searchText) params.append('search', searchText);
      if (selectedTagIds.length > 0) {
        const selectedTagNames = tags
          .filter(tag => selectedTagIds.includes(tag.id))
          .map(tag => tag.name);
        if (selectedTagNames.length > 0) {
          params.append('tags', selectedTagNames.join(','));
        }
      }

      // Add pagination params
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/courses/${courseId}/questions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Question deleted successfully');
        fetchQuestions();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Error deleting question');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    fetchQuestions();
  };

  const handleTagSelect = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newSelectedIds);
    setCurrentPage(1); // Reset to first page when tags change
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    setCurrentPage(1); // Reset to first page when tags change
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const handleSelectAll = () => {
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map((q) => q.id));
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleBulkTagSelect = (tagId: string) => {
    setBulkTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleBulkTagAssign = async () => {
    if (selectedQuestionIds.length === 0 || bulkTagIds.length === 0) {
      toast.error('Please select questions and tags');
      return;
    }

    try {
      setBulkTagging(true);
      const response = await fetch(`/api/courses/${courseId}/questions/bulk-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: selectedQuestionIds,
          tagIds: bulkTagIds,
          action: 'add',
        }),
      });

      if (response.ok) {
        toast.success(`Successfully tagged ${selectedQuestionIds.length} questions`);
        setSelectedQuestionIds([]);
        setBulkTagIds([]);
        setBulkTagOpen(false);
        fetchQuestions();
      } else {
        const error = await response.json();
        toast.error(`Failed to tag questions: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error bulk tagging:', error);
      toast.error('Error bulk tagging questions');
    } finally {
      setBulkTagging(false);
    }
  };

  const bulkSelectedTags = tags.filter((tag) => bulkTagIds.includes(tag.id));

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/courses/${courseId}/dashboard`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            {course ? `${course.title} - ` : ''}Manage course questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportDialogOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            Import Questions
          </Button>
          <Link href={`/courses/${courseId}/questions/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuestionIds.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="font-medium">
                  {selectedQuestionIds.length} question{selectedQuestionIds.length > 1 ? 's' : ''} selected
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestionIds([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Popover open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="default" size="sm" disabled={bulkTagging}>
                      <Tag className="h-4 w-4 mr-2" />
                      Assign Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Select Tags to Assign</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Tags will be added to all {selectedQuestionIds.length} selected questions
                        </p>
                        <Command>
                          <CommandInput placeholder="Search tags..." />
                          <CommandList>
                            <CommandEmpty>No tags found.</CommandEmpty>
                            <CommandGroup>
                              {tags.map((tag) => (
                                <CommandItem
                                  key={tag.id}
                                  value={tag.name}
                                  onSelect={() => handleBulkTagSelect(tag.id)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      bulkTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                                    }`}
                                  />
                                  <Badge
                                    style={{ backgroundColor: tag.color || '#6B7280' }}
                                    className="text-white"
                                  >
                                    {tag.name}
                                  </Badge>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>

                      {bulkSelectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                          {bulkSelectedTags.map((tag) => (
                            <Badge
                              key={tag.id}
                              style={{ backgroundColor: tag.color || '#6B7280' }}
                              className="text-white"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBulkTagOpen(false);
                            setBulkTagIds([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleBulkTagAssign}
                          disabled={bulkTagIds.length === 0 || bulkTagging}
                        >
                          {bulkTagging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Assign Tags
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Select value={filterCell} onValueChange={setFilterCell}>
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All topics</SelectItem>
                    {cells.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search question text..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tag Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Tags</label>
              <div className="flex flex-col gap-2">
                <Popover open={tagFilterOpen} onOpenChange={(open) => {
                  console.log('[Tag Filter] Popover opened:', open, 'Tags count:', tags.length, 'Tags loading:', tagsLoading);
                  setTagFilterOpen(open);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tagFilterOpen}
                      className="w-full justify-between"
                    >
                      {selectedTags.length > 0
                        ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                        : 'Select tags to filter...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    {tagsLoading ? (
                      <div className="flex justify-center items-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading tags...</span>
                      </div>
                    ) : tags.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <p className="text-sm text-muted-foreground mb-2">No tags available</p>
                        <p className="text-xs text-muted-foreground">Tags can be created in course settings</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search tags..."
                            value={tagSearchText}
                            onChange={(e) => setTagSearchText(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                          {tags
                            .filter(tag => tag.name.toLowerCase().includes(tagSearchText.toLowerCase()))
                            .map((tag) => (
                              <div
                                key={tag.id}
                                onClick={() => {
                                  console.log('[Tag Filter] Tag clicked:', tag.name, tag.id);
                                  handleTagSelect(tag.id);
                                }}
                                className="flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <Badge
                                  style={{ backgroundColor: tag.color || '#6B7280' }}
                                  className="text-white"
                                >
                                  {tag.name}
                                </Badge>
                              </div>
                            ))}
                          {tags.filter(tag => tag.name.toLowerCase().includes(tagSearchText.toLowerCase())).length === 0 && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No matching tags found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Selected Tags Display */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                        className="text-white pl-2 pr-1 py-1"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Questions ({totalCount} total, showing {questions.length})</CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Per page:</label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                No questions found in this course.
              </p>
              <div className="flex justify-center gap-2">
                <Link href={`/courses/${courseId}/questions/new`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Question
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Import from Other Courses
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        questions.length > 0 && selectedQuestionIds.length === questions.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Bloom&apos;s Level</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-24">Options</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(question.id)}
                        onChange={() => handleSelectQuestion(question.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      {question.imageUrl ? (
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-muted">
                          <Image
                            src={question.imageUrl}
                            alt="Thumbnail"
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={question.text}>
                        {question.text}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.cell.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {question.bloomTaxonomy ? (
                        <Badge variant="secondary">{question.bloomTaxonomy}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {question.tags && question.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {question.tags.map((tagRelation) => (
                            <Badge
                              key={tagRelation.tag.id}
                              style={{ backgroundColor: tagRelation.tag.color || '#6B7280' }}
                              className="text-white text-xs"
                            >
                              {tagRelation.tag.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {question.answerOptions.length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={question.isActive ? 'default' : 'secondary'}>
                        {question.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/courses/${courseId}/questions/${question.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this question? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(question.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} questions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Questions Dialog */}
      <ImportQuestionsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        targetCourseId={courseId}
        onImportComplete={() => {
          setImportDialogOpen(false);
          fetchQuestions();
          fetchCells(); // Refresh topics in case new ones were created
          toast.success('Questions imported successfully!');
        }}
      />
    </div>
  );
}

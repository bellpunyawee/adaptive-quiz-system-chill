// src/components/admin/TagSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';

interface Tag {
  id: string;
  name: string;
  color: string | null;
  category: string | null;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ selectedTagIds, onTagsChange, disabled = false }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const handleSelect = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagsChange(newSelectedIds);
  };

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  // Group tags by category
  const groupedTags = tags.reduce((acc, tag) => {
    const category = tag.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {selectedTags.length > 0
              ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
              : 'Select tags...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              {Object.entries(groupedTags).map(([category, categoryTags]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleSelect(tag.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Badge
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                        className="text-white mr-2"
                      >
                        {tag.name}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color || '#6B7280' }}
              className="text-white pl-2 pr-1 py-1"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                disabled={disabled}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

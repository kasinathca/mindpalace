import React from 'react';
import { apiListTags, type TagItem } from '../../api/tags.api.js';

interface TagAutocompleteInputProps {
  id: string;
  label?: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

function normaliseTagName(input: string): string {
  return input.trim().toLowerCase();
}

export function TagAutocompleteInput({
  id,
  label = 'Tags',
  selectedTags,
  onChange,
  disabled = false,
  placeholder = 'Type a tag and press Enter…',
}: TagAutocompleteInputProps): React.JSX.Element {
  const [allTags, setAllTags] = React.useState<TagItem[]>([]);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void apiListTags()
      .then((tags) => {
        if (!mounted) return;
        setAllTags(tags.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (!mounted) return;
        setAllTags([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedSet = React.useMemo(() => new Set(selectedTags), [selectedTags]);

  const matchingSuggestions = React.useMemo(() => {
    const q = normaliseTagName(query);
    if (!q) return [];

    return allTags
      .map((t) => t.name)
      .filter((name) => !selectedSet.has(name))
      .filter((name) => name.includes(q))
      .slice(0, 8);
  }, [allTags, query, selectedSet]);

  const canCreate = React.useMemo(() => {
    const q = normaliseTagName(query);
    if (!q) return false;
    if (selectedSet.has(q)) return false;
    return !allTags.some((t) => t.name === q);
  }, [allTags, query, selectedSet]);

  function addTag(name: string): void {
    const tag = normaliseTagName(name);
    if (!tag || selectedSet.has(tag)) return;
    onChange([...selectedTags, tag]);
    setQuery('');
    setOpen(false);
  }

  function removeTag(name: string): void {
    onChange(selectedTags.filter((t) => t !== name));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <div className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                className="rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeTag(tag)}
                disabled={disabled}
              >
                ×
              </button>
            </span>
          ))}

          <input
            id={id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setTimeout(() => setOpen(false), 100);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const raw = query.trim();
                if (!raw) return;
                const q = normaliseTagName(raw);
                const exact = matchingSuggestions.find((name) => name === q);
                addTag(exact ?? raw);
              }

              if (e.key === 'Backspace' && query.length === 0 && selectedTags.length > 0) {
                removeTag(selectedTags[selectedTags.length - 1] as string);
              }
            }}
            placeholder={selectedTags.length === 0 ? placeholder : 'Add another tag…'}
            disabled={disabled}
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {open && (matchingSuggestions.length > 0 || canCreate) && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
            {matchingSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(name)}
              >
                {name}
              </button>
            ))}

            {canCreate && (
              <button
                type="button"
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(query)}
              >
                Create "{normaliseTagName(query)}"
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Select an existing tag or type a new one.</p>
    </div>
  );
}

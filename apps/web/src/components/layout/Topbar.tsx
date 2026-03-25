// ─────────────────────────────────────────────────────────────────────────────
// components/layout/Topbar.tsx — Application top bar
//
// Contains: hamburger menu toggle, app name, user avatar / display name,
//           sign-out button.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { apiSearchBookmarks, type SearchBookmarkItem } from '../../api/search.api.js';
import { Button } from '../ui/button.js';

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ sidebarOpen, onToggleSidebar }: TopbarProps): React.JSX.Element {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchBookmarkItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const latestRequestId = React.useRef(0);

  React.useEffect(() => {
    const onDocClick = (event: MouseEvent): void => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      latestRequestId.current += 1;
      const requestId = latestRequestId.current;

      setLoading(true);
      void apiSearchBookmarks({ q: trimmed, limit: 8 })
        .then((data) => {
          if (requestId !== latestRequestId.current) return;
          setResults(data.bookmarks);
          setActiveIndex(data.bookmarks.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (requestId !== latestRequestId.current) return;
          setResults([]);
          setActiveIndex(-1);
        })
        .finally(() => {
          if (requestId !== latestRequestId.current) return;
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function onSubmitSearch(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
    const first = results[0];
    if (activeResult) {
      setOpen(false);
      void navigate(`/bookmarks/${activeResult.id}`);
      return;
    }
    if (first) {
      setOpen(false);
      void navigate(`/bookmarks/${first.id}`);
      return;
    }
    if (query.trim()) {
      setOpen(false);
      void navigate('/dashboard');
    }
  }

  function onPickResult(id: string): void {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    void navigate(`/bookmarks/${id}`);
  }

  return (
    <header className="grid h-14 flex-shrink-0 grid-cols-[auto,1fr,auto] items-center gap-3 border-b border-border bg-card px-4">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {/* Simple three-line hamburger icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold tracking-tight">Mind Palace</span>
      </div>

      {/* Middle: global search */}
      <form className="mx-auto w-full max-w-xl" onSubmit={onSubmitSearch}>
        <div className="relative" ref={containerRef}>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z"
              />
            </svg>
          </span>
          <input
            name="global-search"
            type="text"
            placeholder="Search bookmarks..."
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setActiveIndex(-1);
                return;
              }

              if (!open || results.length === 0) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % results.length);
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
                return;
              }

              if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                const selected = results[activeIndex];
                if (selected) {
                  onPickResult(selected.id);
                }
              }
            }}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            aria-label="Global search"
          />

          {open && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {loading && <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>}

              {!loading && results.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
              )}

              {!loading && results.length > 0 && (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {results.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-accent ${
                          index === activeIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => onPickResult(item.id)}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.displayName ?? user?.email}</span>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

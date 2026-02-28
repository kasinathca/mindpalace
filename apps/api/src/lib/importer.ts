// ─────────────────────────────────────────────────────────────────────────────
// lib/importer.ts — Browser bookmark HTML file parser
//
// Parses the Netscape Bookmark File Format produced by all major browsers
// (Chrome, Firefox, Safari, Edge) when exporting bookmarks.
//
// The format looks like:
//   <DT><A HREF="https://example.com" ADD_DATE="1234567890">Title</A>
//   <DL><p>  ... nested folder children
//
// Returns a flat list of ParsedBookmark items with optional collection path.
// ─────────────────────────────────────────────────────────────────────────────
import * as cheerio from 'cheerio';
import type { Cheerio } from 'cheerio';

// Cheerio wraps DOM nodes — use the generic parameter from CheerioAPI instead
// of importing from transitive deps (domhandler/domutils).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Selection = Cheerio<any>;

export interface ParsedBookmark {
  url: string;
  title: string;
  addedAt?: Date;
  collectionPath: string[]; // e.g. ['Work', 'Research'] — breadcrumb from root
  tags: string[];
}

/**
 * Parse a Netscape Bookmark HTML file buffer into a flat list of bookmarks.
 * Invalid URLs are silently skipped.
 */
export function parseNetscapeBookmarks(html: string): ParsedBookmark[] {
  const $ = cheerio.load(html, { xmlMode: false });
  const results: ParsedBookmark[] = [];

  function walkDL(container: Selection, breadcrumb: string[]): void {
    // Iterate child <DT> elements of this <DL>
    container.children('dt').each((_i, dt) => {
      const $dt = $(dt);
      const link = $dt.children('a').first();
      const folder = $dt.children('h3').first();

      if (link.length > 0) {
        // It's a bookmark entry
        const href = link.attr('href') ?? '';
        const title = link.text().trim() || href;
        const addDateRaw = link.attr('add_date');
        const tagsRaw = link.attr('tags') ?? '';

        // Validate URL — only allow http/https (blocks javascript:, data:, etc.)
        try {
          const parsed = new URL(href);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return; // skip non-web URLs silently
          }
        } catch {
          return; // skip invalid URLs
        }

        const addedAt = addDateRaw ? new Date(parseInt(addDateRaw, 10) * 1000) : undefined;
        const parsed: ParsedBookmark = {
          url: href,
          title: title.slice(0, 500),
          collectionPath: [...breadcrumb],
          tags: tagsRaw
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
        };
        if (addedAt !== undefined) parsed.addedAt = addedAt;
        results.push(parsed);
      } else if (folder.length > 0) {
        // It's a folder — cheerio parses the Netscape format such that the
        // nested <DL> becomes a CHILD of the <DT> (not a sibling), so we
        // look for it with .children('dl') rather than .nextAll('dl').
        const folderName = folder.text().trim();
        const nestedDL = $dt.children('dl').first();
        if (nestedDL.length > 0) {
          walkDL(nestedDL, [...breadcrumb, folderName]);
        }
      }
    });
  }

  // Root <DL> — the first one is always the bookmarks bar / root folder
  const rootDL = $('dl').first();
  if (rootDL.length > 0) {
    walkDL(rootDL, []);
  }

  return results;
}

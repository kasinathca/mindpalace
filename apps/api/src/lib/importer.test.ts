// ─────────────────────────────────────────────────────────────────────────────
// lib/importer.test.ts — Unit tests for the Netscape Bookmark HTML parser
//
// parseNetscapeBookmarks is a pure function: no mocks required.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { parseNetscapeBookmarks } from './importer.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wrap links in the minimal Netscape Bookmark HTML boilerplate */
function netscape(inner: string): string {
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${inner}
</DL><p>`;
}

// ── Basic parsing ─────────────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — basic', () => {
  it('parses a single bookmark link', () => {
    const html = netscape(`<DT><A HREF="https://example.com" ADD_DATE="1672531200">Example</A>`);

    const results = parseNetscapeBookmarks(html);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      url: 'https://example.com',
      title: 'Example',
      collectionPath: [],
      tags: [],
    });
  });

  it('returns empty array for empty DL', () => {
    const html = netscape('');
    expect(parseNetscapeBookmarks(html)).toEqual([]);
  });

  it('returns empty array for completely empty string', () => {
    expect(parseNetscapeBookmarks('')).toEqual([]);
  });

  it('parses multiple flat bookmarks', () => {
    const html = netscape(`
      <DT><A HREF="https://react.dev">React</A>
      <DT><A HREF="https://typescriptlang.org">TypeScript</A>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.url)).toEqual(['https://react.dev', 'https://typescriptlang.org']);
  });
});

// ── ADD_DATE parsing ──────────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — ADD_DATE', () => {
  it('converts Unix timestamp (seconds) to a Date', () => {
    // 1672531200 = 2023-01-01T00:00:00Z
    const html = netscape(`<DT><A HREF="https://example.com" ADD_DATE="1672531200">Example</A>`);

    const [result] = parseNetscapeBookmarks(html);
    expect(result?.addedAt).toBeInstanceOf(Date);
    expect(result?.addedAt?.getFullYear()).toBe(2023);
  });

  it('omits addedAt when ADD_DATE attribute is absent', () => {
    const html = netscape(`<DT><A HREF="https://example.com">No date</A>`);

    const [result] = parseNetscapeBookmarks(html);
    expect(result).not.toHaveProperty('addedAt');
  });
});

// ── Tags parsing ──────────────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — tags', () => {
  it('splits comma-separated TAGS attribute', () => {
    const html = netscape(
      `<DT><A HREF="https://example.com" TAGS="React,TypeScript,Web">Example</A>`,
    );

    const [result] = parseNetscapeBookmarks(html);
    expect(result?.tags).toEqual(['react', 'typescript', 'web']);
  });

  it('lowercases and trims tag values', () => {
    const html = netscape(`<DT><A HREF="https://example.com" TAGS="  My Tag , OTHER  ">X</A>`);

    const [result] = parseNetscapeBookmarks(html);
    expect(result?.tags).toEqual(['my tag', 'other']);
  });

  it('returns empty tags array when no TAGS attribute', () => {
    const html = netscape(`<DT><A HREF="https://example.com">X</A>`);
    const [result] = parseNetscapeBookmarks(html);
    expect(result?.tags).toEqual([]);
  });
});

// ── Nested folders ────────────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — folders', () => {
  it('assigns collectionPath from single folder', () => {
    const html = netscape(`
      <DT><H3>Work</H3>
      <DL><p>
        <DT><A HREF="https://example.com/work">Work Link</A>
      </DL><p>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(1);
    expect(results[0]?.collectionPath).toEqual(['Work']);
  });

  it('builds nested breadcrumb for two levels deep', () => {
    const html = netscape(`
      <DT><H3>Engineering</H3>
      <DL><p>
        <DT><H3>Frontend</H3>
        <DL><p>
          <DT><A HREF="https://react.dev">React</A>
        </DL><p>
      </DL><p>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(1);
    expect(results[0]?.collectionPath).toEqual(['Engineering', 'Frontend']);
  });

  it('correctly separates bookmarks in different folders', () => {
    const html = netscape(`
      <DT><H3>FolderA</H3>
      <DL><p>
        <DT><A HREF="https://site-a.com">Site A</A>
      </DL><p>
      <DT><H3>FolderB</H3>
      <DL><p>
        <DT><A HREF="https://site-b.com">Site B</A>
      </DL><p>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(2);
    expect(results[0]?.collectionPath).toEqual(['FolderA']);
    expect(results[1]?.collectionPath).toEqual(['FolderB']);
  });

  it('includes both top-level and folder bookmarks', () => {
    const html = netscape(`
      <DT><A HREF="https://root.com">Root link</A>
      <DT><H3>Folder</H3>
      <DL><p>
        <DT><A HREF="https://folder.com">Folder link</A>
      </DL><p>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(2);
    expect(results[0]?.collectionPath).toEqual([]);
    expect(results[1]?.collectionPath).toEqual(['Folder']);
  });
});

// ── Invalid URL handling ──────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — invalid URLs', () => {
  it('silently skips entries with invalid href', () => {
    const html = netscape(`
      <DT><A HREF="not-a-url">Bad</A>
      <DT><A HREF="https://good.com">Good</A>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe('https://good.com');
  });

  it('skips empty HREF', () => {
    const html = netscape(`<DT><A HREF="">Empty</A>`);
    expect(parseNetscapeBookmarks(html)).toHaveLength(0);
  });

  it('skips javascript: protocol', () => {
    const html = netscape(`
      <DT><A HREF="javascript:void(0)">Script</A>
      <DT><A HREF="https://safe.com">Safe</A>
    `);

    const results = parseNetscapeBookmarks(html);
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe('https://safe.com');
  });
});

// ── Title handling ────────────────────────────────────────────────────────────

describe('parseNetscapeBookmarks — titles', () => {
  it('uses href as title when link text is empty', () => {
    const html = netscape(`<DT><A HREF="https://example.com"></A>`);
    const [result] = parseNetscapeBookmarks(html);
    expect(result?.title).toBe('https://example.com');
  });

  it('truncates titles longer than 500 characters', () => {
    const longTitle = 'A'.repeat(600);
    const html = netscape(`<DT><A HREF="https://example.com">${longTitle}</A>`);
    const [result] = parseNetscapeBookmarks(html);
    expect(result?.title.length).toBe(500);
  });
});

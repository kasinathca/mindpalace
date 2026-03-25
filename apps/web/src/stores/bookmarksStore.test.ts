import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchTreeMock = vi.fn();
const fetchTagsMock = vi.fn();

vi.mock('../api/bookmarks.api.js', () => ({
  apiListBookmarks: vi.fn(),
  apiGetBookmark: vi.fn(),
  apiCreateBookmark: vi.fn(),
  apiUpdateBookmark: vi.fn(),
  apiDeleteBookmark: vi.fn(),
  apiBatchDeleteBookmarks: vi.fn(),
}));

vi.mock('./collectionsStore.js', () => {
  const useCollectionsStore = vi.fn();
  (
    useCollectionsStore as unknown as { getState: () => { fetchTree: () => Promise<void> } }
  ).getState = () => ({
    fetchTree: fetchTreeMock,
  });
  return { useCollectionsStore };
});

vi.mock('./tagsStore.js', () => {
  const useTagsStore = vi.fn();
  (useTagsStore as unknown as { getState: () => { fetchTags: () => Promise<void> } }).getState =
    () => ({
      fetchTags: fetchTagsMock,
    });
  return { useTagsStore };
});

import { useBookmarksStore } from './bookmarksStore.js';
import { apiCreateBookmark } from '../api/bookmarks.api.js';

const createdBookmark = {
  id: 'bm_1',
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  coverImageUrl: null,
  notes: null,
  isPublic: false,
  isPinned: false,
  isFavourite: false,
  linkStatus: 'UNCHECKED',
  lastCheckedAt: null,
  readAt: null,
  userId: 'user_1',
  collectionId: null,
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  tags: [{ id: 'tag_1', name: 'newtag', color: null }],
};

describe('bookmarksStore tag sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useBookmarksStore.getState().reset();

    fetchTreeMock.mockResolvedValue(undefined);
    fetchTagsMock.mockResolvedValue(undefined);
    vi.mocked(apiCreateBookmark).mockResolvedValue(createdBookmark);
  });

  it('refreshes tags store when creating bookmark with tags', async () => {
    await useBookmarksStore.getState().createBookmark({
      url: 'https://example.com',
      tags: ['newtag'],
    });

    expect(fetchTagsMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh tags store when creating bookmark without tags', async () => {
    await useBookmarksStore.getState().createBookmark({
      url: 'https://example.com',
    });

    expect(fetchTagsMock).not.toHaveBeenCalled();
  });
});

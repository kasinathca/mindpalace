# Mind Palace — User Manual

**Version:** 1.0  
**Date:** February 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Creating an Account](#2-creating-an-account)
3. [Saving Your First Bookmark](#3-saving-your-first-bookmark)
4. [Organising with Collections](#4-organising-with-collections)
5. [Using Tags for Cross-referencing](#5-using-tags-for-cross-referencing)
6. [Searching and Filtering Your Library](#6-searching-and-filtering-your-library)
7. [Batch Operations](#7-batch-operations)
8. [Importing Bookmarks from Your Browser](#8-importing-bookmarks-from-your-browser)
9. [Exporting Your Library](#9-exporting-your-library)
10. [Understanding Link Health Indicators](#10-understanding-link-health-indicators)
11. [Reading and Annotating Saved Pages](#11-reading-and-annotating-saved-pages)
12. [Account Settings and Data Management](#12-account-settings-and-data-management)
13. [Keyboard Shortcuts](#13-keyboard-shortcuts)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Introduction

**Mind Palace** is a web-based bookmark management system designed to go far beyond what your
browser's built-in bookmarks offer. It provides:

- **Smart ingestion** — paste a URL and Mind Palace automatically fetches the page title,
  description, and cover image for you.
- **Hierarchical organisation** — create nested collections (folders within folders) to any
  depth to reflect the exact structure that makes sense for your work.
- **Flexible tagging** — assign multiple keywords to any bookmark so you can cross-reference
  content across collections.
- **Permanent copies** — Mind Palace saves a clean, readable version of each page so you can
  read it even if the original URL goes offline.
- **Link health monitoring** — an automated background job checks all your saved URLs every 24
  hours and flags any that are broken or unreachable.
- **Full-text search** — search across titles, descriptions, and even the text of saved permanent
  copies.
- **Annotation system** — highlight text and attach sticky notes to saved pages.

---

## 2. Creating an Account

### Registration

1. Open Mind Palace in your browser (e.g. `http://localhost:5173` during development).
2. Click **Sign Up** on the login page.
3. Fill in:
   - **Display Name** — the name shown on your profile (2–64 characters).
   - **Email Address** — must be a valid email; used for login and password resets.
   - **Password** — minimum 8 characters; use a mix of letters, numbers, and symbols.
4. Click **Create Account**.
5. You will be logged in immediately and redirected to your Dashboard.

### Logging In

1. Navigate to the login page.
2. Enter your registered **email** and **password**.
3. Click **Log In**.
4. Check **Remember Me** to stay logged in across browser sessions.

### Forgotten Password

1. On the login page, click **Forgot your password?**
2. Enter your email address and click **Send Reset Link**.
3. Check your inbox for an email from Mind Palace.
4. Click the **Reset Password** link in the email (valid for **1 hour**).
5. Enter and confirm your new password.

---

## 3. Saving Your First Bookmark

### Adding a Bookmark

1. Click the **+ Add Bookmark** button in the top-right corner of the Dashboard.
2. Enter the full URL (must begin with `http://` or `https://`).
3. Click **Fetch Metadata**. Mind Palace will automatically populate:
   - **Title** — extracted from the page's `<title>` or Open Graph `og:title` tag.
   - **Description** — from the page's meta description or Open Graph `og:description`.
   - **Cover Image** — from the Open Graph `og:image` or Twitter Card image.
4. Optionally:
   - Edit the **Title** or **Description** manually.
   - Select a **Collection** from the dropdown to file it immediately.
   - Add **Tags** by typing tag names and pressing Enter (see [Section 5](#5-using-tags-for-cross-referencing)).
   - Add personal **Notes** (supports Markdown).
5. Click **Save Bookmark**.

> **Tip:** If Mind Palace cannot reach the URL (e.g. the site blocks scrapers), you can still save
> the bookmark and fill in the title and description yourself.

### Duplicate Detection

If you try to save a URL that already exists in your library, Mind Palace will show a warning
banner listing the existing bookmark's title and collection. You can:

- **Navigate to the existing bookmark** — click the link in the warning.
- **Save anyway** — the same URL can legitimately live in multiple collections.

### Editing and Deleting

- To **edit** a bookmark, hover over its card and click the ✏️ **Edit** icon.
- To **delete** a bookmark, hover over its card and click the 🗑️ **Delete** icon. Confirm in the
  dialog.

---

## 4. Organising with Collections

Collections are Mind Palace's equivalent of folders. They can be nested to unlimited depth.

### Creating a Collection

1. In the **left sidebar**, click **New Collection** (the `+` button next to "Collections").
2. Enter a **Name** (required) and optionally a **Description**, **Colour**, and **Icon**.
3. To create a **sub-collection**, select a parent collection from the **Parent** dropdown.
4. Click **Create**.

### Navigating Collections

- Click any collection in the sidebar to filter the Dashboard to only show bookmarks in that
  collection.
- Collections with sub-collections show an **▶** expand arrow. Click it to reveal children.
- The **breadcrumb** at the top of the bookmark list shows your current location in the tree.

### Moving Bookmarks Between Collections

- **Drag and drop** a bookmark card onto a collection in the sidebar.
- Or open the **Edit** modal for a bookmark and select a new collection from the dropdown.

### Renaming and Deleting Collections

- **Right-click** a collection name in the sidebar and select **Rename** or **Delete**.
- When deleting a collection you will be asked what to do with its bookmarks:
  - **Move to parent** — bookmarks are moved up one level.
  - **Delete bookmarks too** — permanently removes all contained bookmarks.

---

## 5. Using Tags for Cross-referencing

Tags are free-form labels that you assign to bookmarks. Unlike collections, a bookmark can have
any number of tags, and the same tag can appear across many collections.

### Adding Tags to a Bookmark

1. Open the **Add** or **Edit** bookmark modal.
2. Click the **Tags** input field and start typing a tag name.
3. Autocomplete suggestions will appear for existing tags.
4. Press **Enter** or click a suggestion to add the tag.
5. Repeat for additional tags.
6. Tags are automatically stored in lowercase.

### Managing Tags

Navigate to **Tags** in the left sidebar to see all your tags with usage counts.

From the Tag Management page you can:

- **Rename** a tag — updates the name on all bookmarks at once.
- **Delete** a tag — removes the tag label from all bookmarks (bookmarks themselves are not
  deleted). Requires confirmation.
- **Merge tags** — select one or more source tags and a target tag. All bookmarks from the
  source tags are re-labelled with the target tag; the source tags are deleted.
- **Assign a colour** to a tag for visual distinction.

### Filtering by Tags

- On the **Dashboard**, use the **Filter** panel (funnel icon) and tick one or more tags under
  **Tags**.
- The bookmark list updates in real-time to show only bookmarks matching the selected tags.

---

## 6. Searching and Filtering Your Library

### Keyword Search

1. Click the **Search** icon in the top navigation bar, or navigate to the **Search** page.
2. Type your query. Mind Palace searches across bookmark **titles**, **descriptions**, **URLs**, and
   the text content of **permanent copies**.
3. Results are ranked by relevance. Matching snippets are highlighted.

**Advanced query syntax** (powered by PostgreSQL `websearch_to_tsquery`):

| Syntax             | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `react hooks`      | Finds bookmarks containing both "react" and "hooks" |
| `"react hooks"`    | Exact phrase search                                 |
| `react -class`     | Contains "react" but not "class"                    |
| `react OR angular` | Contains either "react" or "angular"                |

### Filter Panel

Click the **Filter** (funnel) icon on the Dashboard or Search page to open the filter panel:

| Filter          | Description                                           |
| --------------- | ----------------------------------------------------- |
| **Tags**        | Show bookmarks with selected tag(s)                   |
| **Date Added**  | Filter by a relative range (Today / This Week / etc.) |
| **Domain**      | Filter by source website domain                       |
| **Link Status** | Show only OK / Broken / Unchecked / Redirected        |
| **Pinned**      | Show only pinned bookmarks                            |
| **Favourites**  | Show only favourited bookmarks                        |
| **Unread**      | Show bookmarks you haven't marked as read             |

### Sorting

Use the **Sort** dropdown to order results by:

- **Date Added** (newest first — default)
- **Date Added** (oldest first)
- **Title** A→Z
- **Title** Z→A

---

## 7. Batch Operations

To perform an action on multiple bookmarks at once:

1. Enable multi-select mode by clicking the **checkbox** that appears on hover, or by holding
   **Ctrl** (Windows/Linux) / **⌘ Cmd** (macOS) and clicking bookmark cards.
2. A **Batch Action Bar** appears at the bottom of the screen, showing the count of selected
   items and the available actions.

| Action          | Description                                           |
| --------------- | ----------------------------------------------------- |
| **Move**        | Move all selected bookmarks to a chosen collection    |
| **Add Tags**    | Assign one or more tags to all selected bookmarks     |
| **Remove Tags** | Remove one or more tags from all selected bookmarks   |
| **Delete**      | Delete all selected bookmarks (requires confirmation) |

> **Warning:** Batch delete is irreversible. Review your selection before confirming.

---

## 8. Importing Bookmarks from Your Browser

Mind Palace supports the **Netscape Bookmark File Format** exported by all major browsers.

### Exporting from Your Browser

| Browser | Steps                                                                       |
| ------- | --------------------------------------------------------------------------- |
| Chrome  | Bookmarks menu → Bookmark Manager → ⋮ → Export bookmarks                    |
| Firefox | Bookmarks → Manage Bookmarks → Import and Backup → Export Bookmarks to HTML |
| Safari  | File → Export → Bookmarks                                                   |
| Edge    | Settings → Favourites → ⋯ → Export favourites                               |

### Importing into Mind Palace

1. Navigate to **Import / Export** in the left sidebar.
2. Under **Import**, click **Choose File** and select the `.html` file you exported.
3. Click **Import**.
4. A progress bar shows import status. Large files (up to 1,000 bookmarks) are processed within
   60 seconds.
5. When complete, a summary shows:
   - Bookmarks **imported** successfully.
   - Bookmarks **skipped** (duplicates).
   - Any **errors** (e.g. invalid URLs).

Folder hierarchy from your browser bookmarks is preserved as nested collections in Mind Palace.

---

## 9. Exporting Your Library

1. Navigate to **Import / Export** in the left sidebar.
2. Under **Export**, choose your preferred format:
   - **HTML** — compatible with all major browsers; preserves folder structure.
   - **JSON** — machine-readable; includes all metadata (tags, notes, dates).
3. Click the corresponding **Export** button.
4. The download begins immediately.

---

## 10. Understanding Link Health Indicators

Mind Palace automatically checks the health of every saved URL every **24 hours**.

A small dot on each bookmark card shows the link's current status:

| Indicator     | Colour | Meaning                                                     |
| ------------- | ------ | ----------------------------------------------------------- |
| **OK**        | Green  | The page responded with a 2xx HTTP status code              |
| **Broken**    | Red    | The page returned 4xx/5xx or did not respond within timeout |
| **Redirect**  | Amber  | The URL has permanently moved (301)                         |
| **Unchecked** | Grey   | The URL has not yet been checked                            |

### Manual Recheck

On the **Bookmark Detail** page, click **Check Link Now** to immediately recheck a single URL.

### When a Link Is Broken

A broken link does not prevent access to the bookmark. If a **Permanent Copy** was captured
before the link broke, you can still read the archived version (see
[Section 11](#11-reading-and-annotating-saved-pages)).

---

## 11. Reading and Annotating Saved Pages

### Viewing a Permanent Copy

1. Click a bookmark card to open its **Detail** page.
2. Switch to the **Saved Copy** tab.
3. The clean, reader-friendly version of the page (extracted by Mozilla Readability) is
   displayed.

If the copy was not yet captured (e.g. the page was only just saved), a message is shown and
the system will attempt to capture it in the background.

### Highlighting Text

1. In the **Saved Copy** tab, select any text with your cursor.
2. A tooltip appears with colour options: yellow, green, blue, pink, red.
3. Click a colour to save the highlight.

Highlights are saved automatically and visible every time you return to the page.

### Adding Notes

1. On the **Detail** page, click **+ Add Note**.
2. Enter your note (up to 1,000 characters).
3. Click **Save Note**.

Notes appear as sticky cards alongside the permanent copy. You can **edit** or **delete** each
note individually.

---

## 12. Account Settings and Data Management

Navigate to **Settings** from the bottom of the left sidebar.

### Profile

| Setting          | Description                                     |
| ---------------- | ----------------------------------------------- |
| **Display Name** | The name shown in the interface                 |
| **Email**        | Your login email address                        |
| **Password**     | Change your current password (requires old one) |

### Preferences

| Setting          | Options               | Description                              |
| ---------------- | --------------------- | ---------------------------------------- |
| **Theme**        | System / Light / Dark | Controls the colour scheme               |
| **Default View** | Grid / List / Compact | How bookmarks are displayed on Dashboard |

### Notifications

Toggle email notifications for weekly broken-link summary reports.

### Data Management

- **Export All Data** — downloads a full JSON export of your library (bookmarks, collections,
  tags, and annotations).
- **Delete Account** — permanently removes your account and all associated data. This action
  cannot be undone. A final confirmation dialog is shown.

---

## 13. Keyboard Shortcuts

| Shortcut                          | Action                                |
| --------------------------------- | ------------------------------------- |
| `Ctrl + K` / `⌘ K`                | Open search                           |
| `N` (on Dashboard)                | Open Add Bookmark modal               |
| `Escape`                          | Close any open modal or dialog        |
| `Ctrl + A` / `⌘ A` (on Dashboard) | Select all visible bookmarks          |
| `Delete` (with items selected)    | Opens batch delete confirmation       |
| `Tab` / `Shift + Tab`             | Navigate between interactive elements |
| `Enter` / `Space`                 | Activate focused button or link       |

---

## 14. Troubleshooting

### Metadata was not fetched automatically

Some websites block automated scrapers. If automatic fetch fails, the bookmark is saved with
the raw URL as its title. You can manually edit the title and description from the **Edit** modal.

### My import file was rejected

- Ensure the file is a valid `.html` bookmark export (not a `.json` or `.csv`).
- Maximum file size is **10 MB**.
- The file must use the Netscape Bookmark File Format (the standard format produced by all
  major browsers).

### A bookmark shows "Broken" but the page loads fine

Some pages block HEAD requests (the lightweight check Mind Palace uses). Try clicking
**Check Link Now** on the detail page, which attempts a full GET request. If the status
updates to OK, the site was blocking the HEAD check only.

### I can't log in after resetting my password

Password reset links expire after **1 hour**. If yours has expired, visit the Forgot Password
page and request a new one.

### The permanent copy says "Capture failed"

Capture can fail if:

- The page returned an error during archival (rate-limited, paywalled, etc.).
- The page exceeded the 5 MB size limit for archival.

The original URL remains saved. Click the URL to visit the live page.

---

_Mind Palace User Manual — Version 1.0 — February 2026_  
_Team: Kasinath C A, Nicky Sheby, Sree Sai Madhurima, Balini_

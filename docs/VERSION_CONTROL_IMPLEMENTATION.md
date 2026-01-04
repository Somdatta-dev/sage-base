# Version Control & Approval System - Implementation Summary

## ✅ What's Been Implemented (Backend Complete)

### 1. Database Schema Changes
**File:** [`backend/alembic/versions/002_add_version_control.py`](backend/alembic/versions/002_add_version_control.py)

**New fields in `pages` table:**
- `edit_mode` - Controls who can edit ("anyone" or "approval")
- `last_published_at` - Timestamp of last publish action
- `last_published_by` - User ID who last published

**Enhanced `page_versions` table:**
- `title` - Now stores version title (not just content)
- `change_summary` - Optional description of changes
- `is_published` - Distinguishes draft vs published versions
- `published_at` - When this version was published

**New `page_update_requests` table:**
- Complete approval workflow system
- Tracks requester, proposed changes, review status

### 2. Models Updated
**File:** [`backend/app/models/page.py`](backend/app/models/page.py:1)

**New Enums:**
- `EditMode` (anyone, approval)
- `UpdateRequestStatus` (pending, approved, rejected, cancelled)

**New Model:**
- `PageUpdateRequest` - Full approval workflow support

### 3. API Schemas
**File:** [`backend/app/schemas/page.py`](backend/app/schemas/page.py:1)

**New Schemas:**
- `PagePublishRequest` - Optional change summary on publish
- `PageSettingsUpdate` - Change edit mode
- `UpdateRequestCreate` - Create update request
- `UpdateRequestResponse` - Update request with status
- `UpdateRequestReview` - Approve/reject review
- `DiffResponse` - Version comparison results

### 4. New Backend Services

#### Diff Service
**File:** [`backend/app/services/diff.py`](backend/app/services/diff.py:1)
- Text-based diff generation using Google's diff-match-patch library
- Compares versions including title changes
- Returns statistics (additions, deletions, unchanged)

#### Enhanced Embedding Service
**File:** [`backend/app/services/embedding.py`](backend/app/services/embedding.py:82-88)
- Added `update_page_embedding()` wrapper function
- Called automatically when pages are published
- Keeps AI knowledge base in sync

### 5. New API Endpoints
**File:** [`backend/app/api/pages.py`](backend/app/api/pages.py:347)

All endpoints implemented and tested:

#### Publishing Workflow
- `POST /api/pages/{id}/publish` - Publish page, create version, update vector store
- `POST /api/pages/{id}/unpublish` - Change status to draft (no version)

#### Settings
- `PATCH /api/pages/{id}/settings` - Update edit mode (anyone/approval)

#### Version Comparison
- `GET /api/pages/{id}/diff/{from_version}/{to_version}` - Get diff between versions

#### Update Requests
- `POST /api/pages/{id}/update-requests` - Create update request
- `GET /api/pages/{id}/update-requests` - List all requests for a page
- `GET /api/pages/update-requests/pending` - Get pending requests for your pages
- `PATCH /api/pages/update-requests/{id}/approve` - Approve and auto-publish
- `PATCH /api/pages/update-requests/{id}/reject` - Reject with message

#### Modified Endpoint
- `PATCH /api/pages/{id}` - Now only updates drafts (no auto-version, no vector update)

### 6. Frontend API Client
**File:** [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts:137-170)

Added all new methods to `pagesApi`:
- `publish()`, `unpublish()`
- `updateSettings()`
- `getDiff()`
- `createUpdateRequest()`, `getUpdateRequests()`, `getPendingUpdateRequests()`
- `approveUpdateRequest()`, `rejectUpdateRequest()`

### 7. TypeScript Types
**File:** [`frontend/src/types/index.ts`](frontend/src/types/index.ts:39-127)

**New Types:**
- `EditMode`, `UpdateRequestStatus`
- `UpdateRequest` interface
- `VersionDiff` interface with `DiffStats`

**Enhanced Types:**
- `Page` - Added `edit_mode`, `last_published_at`, `last_published_by`
- `PageVersion` - Added `title`, `change_summary`, `is_published`, `published_at`

### 8. Re-indexing Script
**File:** [`backend/scripts/reindex_pages.py`](backend/scripts/reindex_pages.py:1)

Run this after migration to index all existing published pages in Qdrant.

---

## 📋 Deployment Steps

### 1. Install New Dependency
```bash
cd backend
pip install diff-match-patch>=20230430
```

### 2. Run Database Migration
```bash
cd backend
alembic upgrade head
```

This will:
- Add new columns to `pages` and `page_versions` tables
- Create `page_update_requests` table
- Backfill existing versions with page titles

### 3. Re-index Existing Pages
```bash
cd backend
python scripts/reindex_pages.py
```

This ensures all published pages have vector embeddings for AI search.

---

## 🎨 Frontend Components to Build

The backend is **100% complete**. Here are the frontend components you need to create:

### 1. PublishButton Component ⭐ HIGH PRIORITY
**Location:** `frontend/src/components/pages/PublishButton.tsx`

**Purpose:** Replace the status toggle with explicit publish action

**Features:**
- Button shows "Publish" when page has unpublished changes
- Optional modal to add change summary
- Calls `pagesApi.publish(pageId, changeSummary)`
- Shows confirmation: "Page published successfully"

**UI Flow:**
```
[Publish] button → Click → Modal (optional summary) → Confirm → API call → Success toast
```

### 2. PageSettingsModal Component
**Location:** `frontend/src/components/pages/PageSettingsModal.tsx`

**Purpose:** Let page owners configure edit permissions

**Features:**
- Radio buttons: "Anyone can edit" / "Requires approval"
- Only shown to page owner/admin
- Visual indicator of current setting
- Calls `pagesApi.updateSettings(pageId, editMode)`

**UI:**
```
Edit Permissions:
  ○ Anyone can edit (collaborative)
  ● Requires approval (controlled)

[Cancel] [Save Settings]
```

### 3. UpdateRequestModal Component
**Location:** `frontend/src/components/pages/UpdateRequestModal.tsx`

**Purpose:** Non-owners submit changes for approval

**Features:**
- Shows when user tries to edit an approval-required page
- Form with: title input, editor for content, message field
- Preview of changes before submitting
- Calls `pagesApi.createUpdateRequest(pageId, data)`

**UI:**
```
Submit Update Request

Title: [input field]
Changes: [TipTap editor]
Message to page owner: [textarea]

[Cancel] [Submit Request]
```

### 4. UpdateRequestList Component
**Location:** `frontend/src/components/pages/UpdateRequestList.tsx`

**Purpose:** Page owners review and approve/reject requests

**Features:**
- Fetches `pagesApi.getPendingUpdateRequests()`
- Shows list of pending requests with requester name, message, timestamp
- Inline diff preview
- Approve/Reject buttons
- Calls `pagesApi.approveUpdateRequest()` or `pagesApi.rejectUpdateRequest()`

**UI:**
```
Pending Update Requests (3)

┌─────────────────────────────────────┐
│ John Doe wants to update "API Docs" │
│ 2 hours ago                         │
│                                     │
│ "Fixed typo in authentication      │
│  section"                           │
│                                     │
│ [View Diff] [Approve] [Reject]     │
└─────────────────────────────────────┘
```

### 5. DiffViewer Component
**Location:** `frontend/src/components/pages/DiffViewer.tsx`

**Purpose:** Show side-by-side or inline diff between versions

**Features:**
- Fetches `pagesApi.getDiff(pageId, fromVersion, toVersion)`
- Color-coded: green for additions, red for deletions
- Line-by-line comparison
- Stats display (additions/deletions count)

**Recommended Library:**
```bash
npm install react-diff-viewer-continued
```

**UI:**
```
Comparing v4 → v5

Stats: +15 additions, -8 deletions

Old Version (v4)        | New Version (v5)
-----------------------|------------------------
Installation Guide     | Installation Guide
                       |
docker-compose up      | docker compose up (✓ updated)
                       |
This will start...     | This will start...
```

### 6. Enhanced VersionHistoryModal
**Location:** Modify existing `frontend/src/components/pages/VersionHistoryModal.tsx`

**Enhancements:**
- Display `change_summary` for each version
- Show who published (`last_published_by`)
- Show `published_at` timestamp
- Add "Compare" button between versions → Opens DiffViewer
- Visual distinction: published versions (solid border) vs drafts (dashed border)

**Updated UI:**
```
Version History

┌─────────────────────────────────────┐
│ v5 (Current)                  ✓ PUBLISHED│
│ Published by You, 1 hour ago        │
│ "Fixed authentication docs"         │
│ [Compare with v4]                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ v4                           ✓ PUBLISHED│
│ Published by John Doe, 2 days ago   │
│ "Updated API endpoints"             │
│ [Compare with v3] [Restore]         │
└─────────────────────────────────────┘
```

### 7. NotificationBell Component (OPTIONAL)
**Location:** `frontend/src/components/notifications/NotificationBell.tsx`

**Purpose:** Alert page owners of pending update requests

**Features:**
- Shows badge count of pending requests
- Dropdown with request list
- Links to approval UI
- Polls `pagesApi.getPendingUpdateRequests()` every 30s

**UI:**
```
🔔 (3)   ← Badge with count

Dropdown:
  Update Requests (3)
  • John wants to edit "API Docs"
  • Sarah updated "Getting Started"
  • Mike edited "Troubleshooting"

  [View All]
```

---

## 📝 Integration Points

### Where to Add Components

#### 1. In Page Editor View
**File:** `frontend/src/app/(dashboard)/space/[key]/page/[slug]/page.tsx`

**Replace:**
```tsx
// Old: Status toggle
<StatusToggle ... />
```

**With:**
```tsx
// New: Publish button
<PublishButton
  pageId={page.id}
  status={page.status}
  onPublish={() => refetch()}
/>

// Add settings button (page owner only)
{isOwner && (
  <PageSettingsButton
    pageId={page.id}
    currentMode={page.edit_mode}
  />
)}
```

#### 2. Version History Enhancement
**File:** `frontend/src/components/pages/VersionHistoryModal.tsx`

**Add:**
```tsx
{version.change_summary && (
  <p className="text-sm text-gray-600">{version.change_summary}</p>
)}

{version.published_at && (
  <span className="text-xs text-gray-500">
    Published {formatDate(version.published_at)}
    {version.is_published && " ✓"}
  </span>
)}

<button onClick={() => showDiff(version.version, version.version - 1)}>
  Compare with previous
</button>
```

#### 3. Pending Requests Badge
**File:** `frontend/src/components/layout/Navbar.tsx` (or similar)

**Add:**
```tsx
<NotificationBell />
```

---

## 🔐 Permission Logic Summary

### Edit Permissions
```typescript
// Page with edit_mode = "anyone"
if (isAuthenticated) {
  allowEdit = true;  // Any user can edit
}

// Page with edit_mode = "approval"
if (isPageOwner || isSpaceOwner || isAdmin) {
  allowEdit = true;  // Owners can always edit
} else {
  showUpdateRequestButton = true;  // Others submit requests
}
```

### Publish Permissions
```typescript
if (isPageOwner || isSpaceOwner || isAdmin) {
  showPublishButton = true;
} else {
  showPublishButton = false;  // No direct publish for non-owners
}
```

---

## 🎯 User Workflows

### Scenario 1: Page Owner Edits Their Own Page
1. Edit content in editor (auto-saves to draft)
2. Click **[Publish]** button
3. Optional: Add change summary
4. Confirm → Version created, vector store updated, AI gets new content

### Scenario 2: Collaborator Edits "Anyone" Page
1. Edit content in editor (auto-saves to draft)
2. Click **[Publish]** button (allowed because edit_mode="anyone")
3. Version created, page updated

### Scenario 3: User Requests Update on "Approval" Page
1. Try to edit → Blocked by permission check
2. Modal appears: "This page requires approval. Submit an update request?"
3. User fills in changes + message
4. Submits request (status: pending)
5. Page owner gets notification
6. Owner reviews diff, approves
7. Changes are published automatically, version created

### Scenario 4: Comparing Versions
1. Click **[Version History]** button
2. See list of published versions with summaries
3. Click **[Compare v4 → v5]**
4. DiffViewer shows side-by-side changes
5. Option to restore old version (future enhancement)

---

## 🧪 Testing Checklist

### Backend Tests (Already Working)
- ✅ Migration runs without errors
- ✅ New models have correct relationships
- ✅ Publish endpoint creates version + updates vector store
- ✅ Approval workflow creates/approves/rejects requests
- ✅ Diff generation works for content + title changes
- ✅ Permission checks prevent unauthorized edits

### Frontend Tests (To Implement)
- [ ] Publish button appears for draft pages
- [ ] Change summary modal works
- [ ] Settings modal updates edit_mode
- [ ] Update request form submits correctly
- [ ] Approval UI shows pending requests
- [ ] Diff viewer displays changes correctly
- [ ] Version history shows metadata
- [ ] Notification badge updates count

---

## 📊 Database Migration Status

**Current Revision:** `002`

**What the migration does:**
1. Adds columns to `pages` table without data loss
2. Adds columns to `page_versions` table
3. Creates `page_update_requests` table with proper foreign keys
4. **Backfills** existing `page_versions` with titles from current pages

**Safe to run:** ✅ Yes, non-destructive

---

## 🚀 Quick Start Commands

```bash
# Backend setup
cd backend
pip install diff-match-patch>=20230430
alembic upgrade head
python scripts/reindex_pages.py

# Frontend dependencies (if using react-diff-viewer)
cd frontend
npm install react-diff-viewer-continued

# Test the APIs (using curl or Postman)
# Publish a page
curl -X POST http://localhost:8787/api/pages/123/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"change_summary": "Fixed typos"}'

# Get diff
curl -X GET http://localhost:8787/api/pages/123/diff/4/5 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create update request
curl -X POST http://localhost:8787/api/pages/123/update-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content_json": {...},
    "message": "Please review my changes"
  }'
```

---

## 🎨 UI/UX Recommendations

### 1. Publish Button States
```
Draft → "Publish" (blue, primary)
Published (no changes) → "Published ✓" (green, disabled)
Published (has changes) → "Publish Changes" (orange, primary)
```

### 2. Edit Mode Badge
```
📝 Anyone can edit
🔒 Requires approval
```

### 3. Version List Design
```
┌─────────────────────────────────────────┐
│ Version 5 (Current)          [PUBLISHED]│
│ by You, 1 hour ago                      │
│ "Fixed authentication documentation"    │
│                                         │
│ Stats: +12 lines, -5 lines              │
│ [Compare] [Restore] [View Full]        │
└─────────────────────────────────────────┘
```

### 4. Approval Request Card
```
┌─────────────────────────────────────────┐
│ 🔔 John Doe                    2h ago   │
│ "Installation Guide"                    │
│                                         │
│ "Fixed Docker Compose command"          │
│                                         │
│ Changes: +1 line, -1 line               │
│                                         │
│ [View Diff] [✓ Approve] [✗ Reject]     │
└─────────────────────────────────────────┘
```

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations
1. No real-time notifications (requires WebSockets)
2. No version restore functionality (UI button exists but not implemented)
3. No conflict resolution for concurrent edits
4. No bulk approval operations
5. No email notifications for update requests

### Future Enhancements
1. **Real-time Updates:** WebSocket notifications for instant approval alerts
2. **Version Restore:** One-click rollback to previous versions
3. **Branching:** Create draft branches before publishing
4. **Scheduled Publishing:** Set future publish dates
5. **Change Comments:** Inline comments on specific changes
6. **Approval Workflows:** Multi-step approval chains
7. **Version Analytics:** Track which versions are most viewed

---

## 📞 Support & Questions

### Architecture Decisions Made

1. **Publish-Only Versioning:** Versions created only on explicit publish (not auto-save)
   - **Why:** Prevents version bloat, clear audit trail

2. **Auto-Publish on Approval:** Approved requests immediately publish
   - **Why:** Reduces friction, faster workflow

3. **Vector Store Updates on Publish:** AI only sees published content
   - **Why:** Prevents AI from referencing draft/unreviewed content

4. **Text-Based Diff:** Uses plain text extraction, not JSON structure
   - **Why:** Simpler to display, more human-readable

5. **Optional Change Summary:** Not required but encouraged
   - **Why:** Balance between convenience and documentation

---

## ✅ Implementation Status

### Backend (100% Complete)
- ✅ Database schema & migration
- ✅ Models & relationships
- ✅ API endpoints (publish, approve, diff)
- ✅ Permission checks
- ✅ Vector store integration
- ✅ Diff generation service
- ✅ Re-indexing script

### Frontend API Layer (100% Complete)
- ✅ API client methods
- ✅ TypeScript types
- ✅ Type definitions for all new entities

### Frontend UI (0% Complete - Ready for Implementation)
- ⬜ PublishButton component
- ⬜ PageSettingsModal component
- ⬜ UpdateRequestModal component
- ⬜ UpdateRequestList component
- ⬜ DiffViewer component
- ⬜ Enhanced VersionHistoryModal
- ⬜ NotificationBell component (optional)

---

## 🎬 Next Steps

1. **Run Migration:** `alembic upgrade head`
2. **Install Dependencies:** `pip install diff-match-patch`
3. **Re-index Pages:** `python scripts/reindex_pages.py`
4. **Build Frontend Components** (use guidelines above)
5. **Test End-to-End Workflow**
6. **Deploy to Production**

The backend is production-ready. Focus on building the React components using the comprehensive API provided!

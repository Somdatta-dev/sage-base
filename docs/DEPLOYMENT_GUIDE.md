# Version Control & Approval System - Deployment Guide

## 🎉 Implementation Complete!

All components have been successfully implemented. This guide will walk you through deploying the new version control system.

---

## 📦 What's Been Implemented

### ✅ Backend (100% Complete)
- Database migration with new schema
- All API endpoints for publish/approve/diff
- Permission system for approval workflow
- Vector store auto-update on publish
- Diff generation service

### ✅ Frontend (100% Complete)
- **PublishButton** - Replace old status toggle
- **PageSettingsModal** - Configure edit permissions
- **UpdateRequestModal** - Submit changes for approval
- **UpdateRequestList** - Review and approve requests
- **DiffViewer** - Side-by-side version comparison
- **Enhanced VersionHistoryModal** - Show metadata and diffs
- **Page Editor Integration** - All components integrated

---

## 🚀 Quick Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make script executable
chmod +x deploy-version-control.sh

# Run deployment
bash deploy-version-control.sh
```

This will:
1. Stop existing containers
2. Rebuild with new dependencies (`diff-match-patch`)
3. Run database migration (`002_add_version_control`)
4. Re-index existing pages in Qdrant
5. Start all services

### Option 2: Manual Deployment

```bash
# 1. Stop containers
docker-compose down

# 2. Rebuild (include new Python dependency)
docker-compose build --no-cache app

# 3. Start services
docker-compose up -d

# 4. Wait for PostgreSQL
sleep 10

# 5. Run migration
docker-compose exec app alembic upgrade head

# 6. Re-index pages
docker-compose exec app python scripts/reindex_pages.py
```

---

## 🧪 Testing the Implementation

### Test 1: Basic Publish Workflow
1. Navigate to any page in your app
2. Make edits (auto-saves as draft)
3. Click **"Publish"** button in the header
4. Optional: Add a change summary
5. Verify version increments
6. Check version history - should show new version with summary

### Test 2: Page Settings (Owner Only)
1. On a page you own, click the **Settings** icon (⚙️)
2. Switch to "Requires approval"
3. Save
4. Verify badge shows "🔒 Approval Required"

### Test 3: Approval Workflow
1. Log in as a different user
2. Navigate to a page with "Requires approval"
3. Try to edit - should trigger update request modal
4. Fill in changes and message
5. Submit request
6. Log back in as page owner
7. Click notification bell icon - should show pending request
8. Review and approve
9. Verify changes are published

### Test 4: Version Comparison
1. Open any page with multiple versions
2. Click **More (...)** → **Version History**
3. Select a version
4. Click **"Compare with Previous"**
5. Verify diff viewer shows additions/deletions

### Test 5: Vector Store Update
1. Publish a page
2. Check logs - should see "✓ Indexed page X"
3. Use AI chat - ask about the page content
4. Verify AI has latest information

---

## 📁 Files Created/Modified

### New Backend Files
```
backend/
├── alembic/versions/002_add_version_control.py   # Migration
├── app/
│   ├── services/diff.py                          # New diff service
│   └── (modified) services/embedding.py          # Added update method
└── scripts/reindex_pages.py                       # Re-indexing script
```

### Modified Backend Files
```
backend/
├── app/
│   ├── models/page.py                            # Enhanced models
│   ├── schemas/page.py                           # New schemas
│   └── api/pages.py                              # New endpoints
└── requirements.txt                               # Added diff-match-patch
```

### New Frontend Components
```
frontend/src/components/pages/
├── PublishButton.tsx                              # Publish with summary
├── PageSettingsModal.tsx                          # Edit mode settings
├── UpdateRequestModal.tsx                         # Submit updates
├── UpdateRequestList.tsx                          # Approve requests
├── DiffViewer.tsx                                 # Version comparison
└── (modified) VersionHistoryModal.tsx             # Enhanced UI
```

### Modified Frontend Files
```
frontend/src/
├── lib/api.ts                                     # New API methods
├── types/index.ts                                 # New types
└── app/(dashboard)/space/[key]/page/[slug]/page.tsx  # Integrated components
```

---

## 🎨 UI Components Overview

### 1. Publish Button
**Location:** Page header (replaces old status toggle)

**States:**
- Draft: Blue "Publish" button
- Published: Green "Published ✓" button (click to unpublish)

**Features:**
- Optional change summary modal
- Auto-updates vector store on publish

### 2. Page Settings Modal
**Location:** Settings icon in page header (owners only)

**Options:**
- 📝 Anyone can edit
- 🔒 Requires approval

### 3. Update Request List
**Location:** Bell icon in page header (owners with pending requests)

**Features:**
- Badge shows count of pending requests
- View requester, message, and preview
- Approve/reject with optional review message

### 4. Update Request Modal
**Location:** Triggered when non-owner edits approval-required page

**Features:**
- Edit title and content
- Add message explaining changes
- Submit for owner approval

### 5. Diff Viewer
**Location:** Opened from version history "Compare" button

**Features:**
- Side-by-side comparison
- Color-coded additions (green) and deletions (red)
- Statistics (additions/deletions count)

### 6. Version History (Enhanced)
**Location:** More (...) → Version History

**New Features:**
- Shows change summaries
- Published vs draft badge
- Published by/at timestamps
- Compare button for diffs
- Visual distinction (solid border = published, dashed = draft)

---

## 🔑 User Workflows

### Scenario A: Page Owner Publishes Changes
```
1. Edit page (auto-saves to draft)
2. Click "Publish"
3. Add change summary (optional)
4. Confirm
   → Version created
   → Vector store updated
   → AI gets new content
```

### Scenario B: Collaborator on "Anyone" Page
```
1. Edit page (auto-saves to draft)
2. Click "Publish" (allowed)
3. Changes go live immediately
```

### Scenario C: User Requests Update on "Approval" Page
```
1. Try to edit → Update Request Modal appears
2. Make changes, add message
3. Submit request
4. Owner gets notification
5. Owner reviews diff
6. Owner approves
   → Changes published automatically
   → Requester gets credit in version history
```

---

## 🛡️ Permission Matrix

| Action | Page Owner | Space Owner | Admin | Anyone (edit_mode=anyone) | Anyone (edit_mode=approval) |
|--------|------------|-------------|-------|---------------------------|----------------------------|
| Edit Draft | ✅ | ✅ | ✅ | ✅ | ❌ (Must submit request) |
| Publish | ✅ | ✅ | ✅ | ✅ | ❌ |
| Change Settings | ✅ | ❌ | ✅ | ❌ | ❌ |
| Approve Requests | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Version History | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🐛 Troubleshooting

### Issue: Migration fails
**Solution:**
```bash
# Check current revision
docker-compose exec app alembic current

# If stuck, show history
docker-compose exec app alembic history

# Force stamp if needed (development only!)
docker-compose exec app alembic stamp head
```

### Issue: Diff library not found
**Solution:**
```bash
# Ensure rebuild happened
docker-compose build --no-cache app

# Or manually install in running container
docker-compose exec app pip install diff-match-patch
```

### Issue: Vector store not updating
**Check:**
1. `OPENAI_API_KEY` is set in environment
2. Qdrant container is running: `docker-compose ps`
3. Check logs: `docker-compose logs app | grep "vector"`

**Fix:**
```bash
# Re-index all pages
docker-compose exec app python scripts/reindex_pages.py
```

### Issue: Components not rendering
**Check:**
1. Browser console for errors
2. UI library components imported correctly
3. Restart Next.js: `docker-compose restart app`

### Issue: Permission errors
**Verify:**
```bash
# Check user roles in database
docker-compose exec postgres psql -U sagebase -d sagebase -c "SELECT id, email, role FROM users;"

# Check page edit_mode
docker-compose exec postgres psql -U sagebase -d sagebase -c "SELECT id, title, edit_mode, author_id FROM pages;"
```

---

## 📊 Database Schema Reference

### New Fields in `pages`
```sql
ALTER TABLE pages ADD COLUMN edit_mode VARCHAR(20) DEFAULT 'anyone';
ALTER TABLE pages ADD COLUMN last_published_at TIMESTAMP NULL;
ALTER TABLE pages ADD COLUMN last_published_by INTEGER NULL REFERENCES users(id);
```

### New Fields in `page_versions`
```sql
ALTER TABLE page_versions ADD COLUMN title VARCHAR(500);
ALTER TABLE page_versions ADD COLUMN change_summary TEXT;
ALTER TABLE page_versions ADD COLUMN is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE page_versions ADD COLUMN published_at TIMESTAMP NULL;
```

### New Table `page_update_requests`
```sql
CREATE TABLE page_update_requests (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  requester_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  content_json JSON,
  content_text TEXT,
  message TEXT,
  status VARCHAR(20) NOT NULL, -- pending, approved, rejected, cancelled
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 🎯 Success Checklist

- [ ] Migration ran successfully
- [ ] New dependency installed (`diff-match-patch`)
- [ ] Existing pages re-indexed in Qdrant
- [ ] Publish button appears on pages
- [ ] Settings icon shows for page owners
- [ ] Change summary modal works
- [ ] Version history shows metadata
- [ ] Diff viewer displays changes
- [ ] Update request flow works end-to-end
- [ ] Vector store updates on publish
- [ ] AI chat reflects latest page content

---

## 🎓 User Training Notes

### For Page Owners
1. **Publish is now explicit** - Auto-save creates drafts, publish creates versions
2. **Add change summaries** - Help others understand what changed
3. **Configure edit mode** - Choose collaborative or controlled
4. **Review update requests** - Check the bell icon for pending approvals

### For Contributors
1. **Drafts don't create versions** - Only publishing does
2. **Respect approval workflow** - If page requires approval, submit a request
3. **Write helpful messages** - Explain why your changes should be approved
4. **Check version history** - See what changed and when

### For Admins
1. **Can bypass restrictions** - Admins can always edit and publish
2. **Monitor update requests** - Keep workflows moving
3. **Re-index if needed** - Run script if vector search seems stale

---

## 🔮 Future Enhancements (Not Implemented Yet)

- [ ] Real-time notifications via WebSockets
- [ ] Version restore functionality
- [ ] Conflict resolution for concurrent edits
- [ ] Scheduled publishing
- [ ] Multi-step approval chains
- [ ] Email notifications
- [ ] Bulk approval operations
- [ ] Version branching/merging

---

## 📞 Support

**Documentation:** See [VERSION_CONTROL_IMPLEMENTATION.md](VERSION_CONTROL_IMPLEMENTATION.md)

**Issues:** Check Docker logs
```bash
# App logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# Vector store logs
docker-compose logs -f qdrant
```

**Database Console:**
```bash
docker-compose exec postgres psql -U sagebase -d sagebase
```

---

## ✅ You're All Set!

Your SageBase application now has enterprise-grade version control with:
- ✨ Git-like version tracking
- 🔒 Flexible approval workflows
- 📊 Visual diff comparison
- 🤖 AI-aware publishing (vector store sync)
- 📝 Comprehensive audit trail

**Next Steps:**
1. Run the deployment script
2. Test all workflows
3. Train your users
4. Monitor for issues

Enjoy your new version control system! 🚀

# Approval System Documentation

## 📚 Table of Contents
- [Overview](#overview)
- [How It Works](#how-it-works)
- [Setting Up Approval Mode](#setting-up-approval-mode)
- [Submitting an Update Request](#submitting-an-update-request)
- [Reviewing Update Requests](#reviewing-update-requests)
- [Technical Architecture](#technical-architecture)
- [Step-by-Step Examples](#step-by-step-examples)
- [Database Structure](#database-structure)
- [API Endpoints](#api-endpoints)

---

## 📖 Overview

The **Approval System** is a collaborative feature that allows page creators to control who can publish changes to their pages. When a page is set to "Requires Approval" mode, other users can suggest edits, but those changes won't go live until the page owner reviews and approves them.

### Why Use Approval Mode?

- **Quality Control**: Page owners can review all changes before they're published
- **Collaboration**: Other users can still contribute without compromising content quality
- **Transparency**: All changes are tracked with messages and history
- **Accountability**: Every update request shows who made the changes and when

---

## 🔧 How It Works

### Two Edit Modes

Every page has an edit mode setting that controls how edits work:

1. **"Anyone" Mode** (default)
   - Any authenticated user can edit and publish changes directly
   - Changes go live immediately
   - Best for collaborative, fast-moving documentation

2. **"Approval" Mode**
   - Page owner, space owner, and admins can edit directly
   - Other users must submit "update requests"
   - Changes only go live after approval
   - Best for controlled, high-quality content

### Who Can Do What?

| Action | Page Owner | Space Owner | Admin | Other Users (Anyone Mode) | Other Users (Approval Mode) |
|--------|------------|-------------|-------|---------------------------|----------------------------|
| Edit & Publish Directly | ✅ | ✅ | ✅ | ✅ | ❌ |
| Submit Update Request | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve/Reject Requests | ✅ | ❌ | ✅ | ❌ | ❌ |
| Change Edit Mode | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 🎨 Setting Up Approval Mode

### For Page Owners

1. **Open your page** that you want to protect
2. Click the **Settings icon** (⚙️) in the page toolbar
3. In the **Page Settings** modal, you'll see two options:

   **Option 1: 📝 Anyone can edit**
   - Collaborative mode
   - Any authenticated user can edit and publish changes directly
   
   **Option 2: 🔒 Requires approval**
   - Controlled mode
   - Other users can submit update requests which you must approve before publishing

4. Select **"Requires approval"**
5. Click **"Save Settings"**

### What Happens Next?

- The page's edit mode changes to "approval"
- Regular users can no longer edit the page directly
- Instead, they'll see an option to "Submit Update Request"

---

## 📝 Submitting an Update Request

### Step 1: User Edits the Page

When a regular user tries to edit a page in approval mode:

1. They can make changes in the editor (just like normal editing)
2. But when they try to save, the system checks their permissions
3. The system sees they're not the page owner, space owner, or admin
4. Instead of a regular "Save" button, they see **"Submit Update Request"**

### Step 2: The Update Request Modal

When they click "Submit Update Request", a modal window appears asking for:

**Information Required:**
- **Page Title**: The updated title for the page
- **Content**: The new content (this is captured automatically from the editor)
- **Message** (optional): A note to the page owner explaining what was changed and why

**Example Modal Display:**
```
┌─────────────────────────────────────────────────┐
│ Submit Update Request                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Page Title:                                     │
│ [Getting Started with Our API]                  │
│                                                 │
│ Message to Page Owner (optional):               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Fixed several typos in the authentication   │ │
│ │ section and added a missing code example    │ │
│ │ for the POST /users endpoint.               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 💡 Tip: Your current edits will be included     │
│    in this request. The page owner can review   │
│    the full diff before approving.              │
│                                                 │
│         [Cancel]  [Submit Request]              │
└─────────────────────────────────────────────────┘
```

### Step 3: Request is Created

When the user clicks "Submit Request", the system:

1. **Collects the information** - Title, content, and message
2. **Sends it to the server** - The frontend makes a request to the backend
3. **Validates permissions** - The backend checks the user is allowed to submit requests
4. **Extracts plain text** - For preview purposes, the system extracts readable text from the editor content
5. **Creates a database record** - A new update request is saved with:
   - Which page it's for
   - Who submitted it (the requester)
   - The proposed new title and content
   - The user's message
   - Status set to "pending"
   - Current timestamp

### Step 4: Success Confirmation

The user sees a success message:
```
✅ Update request submitted successfully
```

The request now sits in the database, waiting for the page owner to review it. The user can continue browsing or working on other pages while they wait.

---

## 👀 Reviewing Update Requests

### Step 1: Notification

Page owners see a **notification bell icon** (🔔) in the top navigation bar. If there are pending requests for their pages, a red badge appears showing the count.

**Example Display:**
```
┌─────────────────────┐
│  [🔔 3]  User ▼     │  ← 3 pending requests waiting
└─────────────────────┘
```

### Step 2: Opening the Requests List

Clicking the bell opens the **"Pending Update Requests"** modal showing all requests that need review.

**The system:**
1. Queries the database for all update requests
2. Filters to show only "pending" status requests
3. Shows only requests for pages owned by the current user
4. Sorts them by date (newest first)
5. Displays them in a scrollable list

### Step 3: Viewing a Request

Each request in the list shows:

```
┌────────────────────────────────────────────────┐
│ Getting Started with Our API                   │
│ Requested 2h ago                      [Pending]│
├────────────────────────────────────────────────┤
│ 💬 Message from requester:                     │
│ ┌────────────────────────────────────────────┐ │
│ │ Fixed several typos in the authentication  │ │
│ │ section and added a missing code example   │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ 📄 Preview:                                    │
│ ┌────────────────────────────────────────────┐ │
│ │ Getting Started Welcome to our API docs... │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ [Review]                                       │
└────────────────────────────────────────────────┘
```

**Information Displayed:**
- The proposed new page title
- When the request was submitted (in friendly format like "2h ago")
- The current status badge (Pending/Approved/Rejected)
- The requester's message explaining their changes
- A preview of the proposed content (plain text version)

### Step 4: Reviewing - Two Options

Clicking **"Review"** expands the interface showing two action buttons:

```
┌────────────────────────────────────────────────┐
│ Review Message (optional):                     │
│ ┌────────────────────────────────────────────┐ │
│ │ Thanks for the improvements!                │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ [✓ Approve & Publish] [✗ Reject] [Cancel]     │
└────────────────────────────────────────────────┘
```

**Option A: Approve & Publish** 

When you click "Approve & Publish", the system:

1. **Creates a backup** - Saves the current page content as an unpublished version (in case you need to revert)
2. **Applies the changes** - Updates the page with the new title and content from the request
3. **Publishes immediately** - Changes the page status to "published"
4. **Increments the version** - Increases the version number (e.g., from version 3 to version 4)
5. **Creates a published version** - Saves a new version record in the version history
6. **Credits the contributor** - The version history shows the requester as the author of this version
7. **Updates the search index** - Refreshes the AI search database so the new content is searchable
8. **Marks the request** - Changes request status to "approved"
9. **Records review details** - Saves who approved it, when, and the review message
10. **Shows success message** - Displays "✅ Update request approved and published"

**Option B: Reject**

When you click "Reject", the system:

1. **Does NOT change the page** - The current content remains exactly as it was
2. **Marks the request** - Changes request status to "rejected"
3. **Records review details** - Saves who rejected it, when, and the review message
4. **Notifies the requester** - The person who submitted can see it was rejected and read your feedback
5. **Shows success message** - Displays "✅ Update request rejected"

The requester can see your feedback message and potentially submit a revised request if they want to try again.

---

## 🎯 Technical Architecture

### Technology Stack

Our approval system is built using several modern technologies working together:

**Backend (Server Side):**
- **FastAPI** - A Python web framework that handles all the API requests
- **PostgreSQL** - The database that stores pages, requests, and version history
- **SQLAlchemy** - A tool that makes it easy to work with the database from Python
- **Pydantic** - Validates that incoming data is in the correct format
- **Python Slugify** - Converts page titles into URL-friendly slugs (e.g., "My Page" → "my-page")

**Frontend (User Interface):**
- **Next.js 14** - A React framework that powers the web application
- **React** - The JavaScript library for building user interfaces
- **TipTap** - The rich text editor where users write content
- **Zustand** - Manages application state (like who's logged in)
- **shadcn/ui** - Provides beautiful, accessible UI components (modals, buttons, forms)
- **Sonner** - Shows toast notifications (those little popup messages)
- **Lucide React** - Icon library for all the visual icons

### How Components Communicate

Here's how information flows through the system when someone submits an update request:

**The Journey of an Update Request:**

1. **User Makes Changes**
   - User opens a page in the TipTap editor
   - Types and formats their improvements
   - Clicks "Submit Update Request"

2. **Frontend Collects Information**
   - The UpdateRequestModal component captures the title, content, and message
   - It prepares this data in the correct format
   - Uses the pagesApi to send the data to the backend

3. **Request Travels to Backend**
   - The data is sent as a POST request to the API endpoint
   - Includes the user's authentication token to verify their identity

4. **Backend Processes the Request**
   - FastAPI receives the request at the pages router
   - Validates the user has permission to submit requests
   - Extracts plain text from the content for preview
   - Uses SQLAlchemy to insert a new record into the database

5. **Database Stores Everything**
   - PostgreSQL saves the new record in the `page_update_requests` table
   - Includes all the details: page ID, requester ID, title, content, message, status

6. **Success Returns to User**
   - Backend sends a success response back to frontend
   - Frontend shows a success notification using Sonner
   - Modal closes and user can continue working

**Later, When Owner Reviews:**

1. **Owner Opens Notifications**
   - Clicks the bell icon in the header
   - UpdateRequestList component fetches pending requests from the API

2. **Backend Queries Database**
   - Searches for all requests with "pending" status
   - Filters for requests on pages owned by current user
   - Returns the list to frontend

3. **Owner Reviews and Decides**
   - Clicks "Review" on a request
   - Adds optional feedback message
   - Clicks either "Approve & Publish" or "Reject"

4. **Action is Processed**
   - Frontend sends approval/rejection request to backend
   - Backend either applies changes (approve) or just updates status (reject)
   - Database is updated accordingly
   - If approved, search index is refreshed for AI features

5. **Everyone Gets Updated**
   - Owner sees success confirmation
   - Request is removed from pending list
   - Requester can see the outcome when they check their request

### Data Flow Diagram

```
┌──────────────┐
│   User       │  "I want to fix a typo"
│  (Editor)    │
└──────┬───────┘
       │ 1. Makes changes in TipTap editor
       │ 2. Clicks "Submit Update Request"
       ▼
┌──────────────────────┐
│  Frontend            │  Collects: title, content, message
│  - UpdateRequestModal│
│  - pagesApi          │
└──────┬───────────────┘
       │ 3. POST /api/pages/{id}/update-requests
       │    (Sends data to server)
       ▼
┌──────────────────────┐
│  Backend API         │  Validates: user permissions
│  - FastAPI           │  Processes: extracts text preview
│  - pages.py router   │
└──────┬───────────────┘
       │ 4. Saves to database
       ▼
┌──────────────────────┐
│  PostgreSQL          │  Stores: new update request record
│  Database            │  With: status = "pending"
└──────┬───────────────┘
       │
       │ (Time passes... owner logs in)
       │
┌──────▼───────────────┐
│  Page Owner          │  Sees: 🔔 notification badge
│                      │
└──────┬───────────────┘
       │ 5. Opens notification modal
       ▼
┌──────────────────────┐
│  Frontend            │  Requests: pending updates
│  - UpdateRequestList │
└──────┬───────────────┘
       │ 6. GET /api/pages/update-requests/pending
       ▼
┌──────────────────────┐
│  Backend API         │  Queries: database for pending requests
│                      │  Returns: list to display
└──────┬───────────────┘
       │ 7. Owner reviews and decides
       ▼
┌──────────────────────┐
│  Approve or Reject   │  If approve: updates page content
│  - PATCH /approve OR │  If reject: just marks as rejected
│  - PATCH /reject     │  Both: record who reviewed and when
└──────────────────────┘
```

---

## 📋 Step-by-Step Examples

### Example 1: Complete Flow - From Edit to Approval

**Scenario:** Sarah wants to fix a typo on John's page about "API Authentication"

#### Step 1: Sarah Opens the Page

Sarah navigates to John's page at: `/space/docs/page/api-authentication`

She's reading through the documentation and notices a typo: "autentication" should be "authentication"

#### Step 2: Sarah Tries to Edit

Sarah clicks the edit button. The page opens in the editor.

She corrects the typo: "autentication" → "authentication"

#### Step 3: System Checks Permissions

When Sarah tries to save, the system checks:
- Is Sarah the page owner? **No** (John owns it)
- Is Sarah the space owner? **No**
- Is Sarah an admin? **No**
- Is the page in "anyone" mode? **No** (it's in "approval" mode)

Result: Sarah cannot save directly. The "Save" button is replaced with "Submit Update Request"

#### Step 4: Sarah Submits Update Request

Sarah clicks "Submit Update Request"

A modal appears. Sarah fills it out:
- **Title**: "API Authentication" (already filled in)
- **Message**: "Fixed typo: autentication → authentication"

She clicks "Submit Request"

#### Step 5: Request Goes to Database

The system processes Sarah's request:

1. **Validates** - Confirms Sarah is logged in and can submit requests
2. **Extracts text** - Creates a plain text version for preview
3. **Creates record** - Saves a new update request in the database with:
   - Request ID: 42
   - Page ID: 123 (John's page)
   - Requester ID: Sarah's user ID
   - Title: "API Authentication"
   - Content: The corrected version
   - Message: "Fixed typo: autentication → authentication"
   - Status: "pending"
   - Created: Current timestamp

4. **Confirms success** - Shows Sarah: "✅ Update request submitted successfully"

#### Step 6: John Gets Notified

John logs into the system later that day.

He sees a red badge on the bell icon: **[🔔 1]**

This tells him there's 1 pending update request waiting for his review.

#### Step 7: John Opens the Request

John clicks the bell icon. A modal opens showing "Pending Update Requests"

He sees Sarah's request:

```
┌─────────────────────────────────┐
│ API Authentication              │
│ Requested 5m ago     [Pending]  │
├─────────────────────────────────┤
│ 💬 Fixed typo: autentication    │
│    → authentication             │
├─────────────────────────────────┤
│ 📄 Preview:                     │
│ API Authentication Getting      │
│ started with authentication...  │
├─────────────────────────────────┤
│ [Review]                        │
└─────────────────────────────────┘
```

#### Step 8: John Reviews the Request

John clicks "Review"

He can see:
- Sarah's proposed changes
- Her explanation message
- A preview of the content

John thinks: "Great catch! This is a helpful fix."

He types a response message: "Thanks for catching that!"

#### Step 9: John Approves

John clicks "✓ Approve & Publish"

The system now processes the approval:

**What Happens Behind the Scenes:**

1. **Creates backup snapshot**
   - Saves the current page content as version 3 (unpublished)
   - This preserves the old version in case John needs to revert

2. **Applies Sarah's changes**
   - Updates the page title to "API Authentication"
   - Replaces the content with Sarah's corrected version
   - Changes page status to "published"
   - Increments version number from 3 to 4

3. **Creates published version**
   - Saves new version 4 in version history
   - Sets author as Sarah (giving her credit)
   - Adds change summary: "Approved update request: Fixed typo..."
   - Marks as published with current timestamp

4. **Updates the request record**
   - Changes status from "pending" to "approved"
   - Records John as the reviewer
   - Saves the review timestamp
   - Stores John's message: "Thanks for catching that!"

5. **Refreshes search index**
   - Updates the AI search database with the corrected content
   - Makes sure searches will find the corrected spelling

6. **Commits all changes**
   - Saves everything to the database
   - Makes changes permanent

#### Step 10: Success!

**John sees:** "✅ Update request approved and published"

**Sarah will see (when she checks):** Her request is now marked "Approved" with John's thank you message

**Everyone else sees:** The page now shows the corrected spelling "authentication"

**Version history shows:**
- Version 4 (current) - Author: Sarah - "Approved update request: Fixed typo..."
- Version 3 - Author: John - Previous version
- Version 2 - Author: John - Earlier version
- Version 1 - Author: John - Initial version

### Example 2: Rejection Flow

**Scenario:** Mike submits a change that John doesn't want to accept

#### Mike's Submission

Mike makes changes to John's page and submits an update request:

**Request Details:**
- Title: "API Auth - New Section"
- Message: "Added section about OAuth2 authentication flow"
- Content: Includes a new section explaining OAuth2

Mike clicks "Submit Request"

System creates request #43 with status "pending"

#### John Receives Notification

John logs in and sees **[🔔 1]** notification

He opens the pending requests and sees Mike's submission

#### John Reviews the Content

John reads through Mike's proposed changes about OAuth2

**John's thinking:** 
- "We don't actually use OAuth2 in our API"
- "We use API key authentication instead"
- "This would confuse our users"
- "The current documentation is correct"

John decides this request should be rejected

#### John Prepares Feedback

John clicks "Review" and types a helpful message:

"Thanks for the suggestion, Mike! However, we're using API key authentication, not OAuth2, so the current documentation is correct. If you'd like to contribute, we could use help improving the API key examples section instead."

#### John Rejects the Request

John clicks "✗ Reject"

**What Happens:**

1. **No changes to the page**
   - The page content stays exactly as it is
   - No new version is created
   - Status remains "published"
   - Version number stays at 4

2. **Updates the request record**
   - Changes status from "pending" to "rejected"
   - Records John as the reviewer
   - Saves the rejection timestamp
   - Stores John's feedback message

3. **Commits the status change**
   - Only the request record is modified
   - Nothing else changes in the database

#### Results

**John sees:** "✅ Update request rejected"

**Mike sees (when he checks):**
- His request status changed to "Rejected"
- John's feedback message explaining why
- The suggestion to help with API key examples instead

**The page:** Remains unchanged with the correct information about API key authentication

**Mike's options:**
- Read John's feedback and understand why it was rejected
- Submit a new request for the API key examples section
- Ask John questions if he needs clarification

This shows how the rejection flow provides constructive feedback while keeping the page content accurate.

---

## 💾 Database Structure

### The Three Main Tables

Our approval system uses three database tables that work together:

#### 1. Pages Table

This table stores all the actual pages in your knowledge base.

**Information Stored:**
- **id** - Unique identifier for each page (e.g., 123)
- **space_id** - Which space this page belongs to
- **title** - The page title (e.g., "Getting Started")
- **slug** - URL-friendly version (e.g., "getting-started")
- **content_json** - The actual page content in structured format
- **author_id** - Who originally created the page
- **status** - Current status: "draft", "published", or "archived"
- **edit_mode** - Very important! Either "anyone" or "approval"
- **version** - Current version number (increases each time published)
- **last_published_at** - When it was last published
- **last_published_by** - Who published it last

**Example Record:**
- id: 123
- title: "API Authentication"
- author_id: 1 (John)
- edit_mode: "approval" ← This enables the approval system
- version: 4
- status: "published"

#### 2. Page Update Requests Table

This table stores all the update requests people submit.

**Information Stored:**
- **id** - Unique identifier for each request (e.g., 42)
- **page_id** - Which page this request is for
- **requester_id** - Who submitted the request
- **title** - The proposed new title
- **content_json** - The proposed new content (structured format)
- **content_text** - Plain text version (for previews)
- **message** - The requester's explanation of their changes
- **status** - Current status: "pending", "approved", "rejected", or "cancelled"
- **reviewed_by** - Who reviewed it (only filled after review)
- **reviewed_at** - When it was reviewed (only filled after review)
- **review_message** - The reviewer's feedback (only filled after review)
- **created_at** - When the request was submitted
- **updated_at** - Last time the request was modified

**Example Record (Pending):**
- id: 42
- page_id: 123
- requester_id: 5 (Sarah)
- message: "Fixed typo: autentication → authentication"
- status: "pending"
- reviewed_by: null (not yet reviewed)
- reviewed_at: null

**Example Record (Approved):**
- id: 42
- page_id: 123
- requester_id: 5 (Sarah)
- status: "approved"
- reviewed_by: 1 (John)
- reviewed_at: "2024-01-05 10:35:00"
- review_message: "Thanks for catching that!"

#### 3. Page Versions Table

This table stores the version history of pages - every time a page is published, a snapshot is saved.

**Information Stored:**
- **id** - Unique identifier for each version
- **page_id** - Which page this version belongs to
- **content_json** - The content at this point in time
- **title** - The title at this point in time
- **version** - The version number (1, 2, 3, 4...)
- **author_id** - Who created this version
- **change_summary** - Description of what changed
- **is_published** - Is this a published version or just a snapshot?
- **published_at** - When it was published (if published)
- **created_at** - When this version record was created

**Example Records for Page 123:**

Version 1 (Initial):
- id: 1
- page_id: 123
- version: 1
- author_id: 1 (John)
- change_summary: "Initial version"
- is_published: true

Version 2:
- id: 2
- page_id: 123
- version: 2
- author_id: 1 (John)
- change_summary: "Added examples"
- is_published: true

Version 3 (Pre-approval backup):
- id: 3
- page_id: 123
- version: 3
- author_id: 1 (John)
- change_summary: "Pre-approval snapshot"
- is_published: false (backup only)

Version 4 (Sarah's approved changes):
- id: 4
- page_id: 123
- version: 4
- author_id: 5 (Sarah) ← Credits the contributor
- change_summary: "Approved update request: Fixed typo..."
- is_published: true

### Status Values Explained

**Update Request Status:**
- **"pending"** - Waiting for page owner to review
- **"approved"** - Accepted and changes applied to the page
- **"rejected"** - Declined, changes NOT applied
- **"cancelled"** - Withdrawn by the person who submitted it

**Page Edit Mode:**
- **"anyone"** - Anyone can edit and publish directly
- **"approval"** - Others must submit update requests for review

### How Tables Connect

These tables are related to each other:

**Pages ← Update Requests:**
- One page can have many update requests
- Each update request belongs to exactly one page
- Connection: update_request.page_id → page.id

**Pages ← Versions:**
- One page can have many versions (history)
- Each version belongs to exactly one page
- Connection: version.page_id → page.id

**Example Relationship:**

```
Page 123: "API Authentication"
├── Update Request 42 (pending)
├── Update Request 43 (rejected)
├── Version 1 (published)
├── Version 2 (published)
├── Version 3 (backup snapshot)
└── Version 4 (published)
```

---

## 🔌 API Endpoints

These are the web addresses the frontend uses to communicate with the backend:

### 1. Create Update Request

**What it does:** Submits a new update request for a page

**Address:** `POST /api/pages/{page_id}/update-requests`

**Authentication:** Required (must be logged in)

**Information Sent:**
- page_id (in the URL) - Which page you want to update
- title - Your proposed new title
- content_json - Your proposed new content
- message (optional) - Your explanation

**What Happens:**
1. Backend verifies you're logged in
2. Checks the page exists
3. Extracts plain text from content
4. Creates new update request in database
5. Sets status to "pending"
6. Returns the created request

**Response When Successful:**
- Status Code: 201 (Created)
- Contains: The full request details including the generated ID

### 2. Get Requests for a Page

**What it does:** Lists all update requests for a specific page

**Address:** `GET /api/pages/{page_id}/update-requests`

**Authentication:** Required

**What Happens:**
1. Backend finds all requests for this page
2. Sorts them by date (newest first)
3. Returns the list

**Response:**
- Status Code: 200 (OK)
- Contains: Array of all requests (pending, approved, rejected)

### 3. Get My Pending Requests

**What it does:** Shows all pending requests for pages you own

**Address:** `GET /api/pages/update-requests/pending`

**Authentication:** Required

**What Happens:**
1. Backend finds all your pages (where you're the author)
2. Finds all update requests for those pages
3. Filters to only "pending" status
4. Sorts by date (newest first)
5. Returns the list

**Response:**
- Status Code: 200 (OK)
- Contains: Array of pending requests needing your review

### 4. Approve Request

**What it does:** Approves an update request and applies the changes

**Address:** `PATCH /api/pages/update-requests/{request_id}/approve`

**Authentication:** Required (must be page owner or admin)

**Information Sent:**
- request_id (in the URL) - Which request to approve
- review_message (optional) - Your feedback to the requester

**What Happens:**
1. **Validates** - Checks you own the page or are admin
2. **Creates backup** - Saves current page content as unpublished version
3. **Applies changes** - Updates page with new title and content
4. **Publishes** - Changes page status to "published"
5. **Increments version** - Increases version number
6. **Creates published version** - Saves in version history, crediting requester
7. **Updates request** - Changes status to "approved", records reviewer and message
8. **Updates search** - Refreshes the AI search index
9. **Commits** - Saves everything to database

**Response:**
- Status Code: 200 (OK)
- Contains: The updated request showing approved status

### 5. Reject Request

**What it does:** Rejects an update request without applying changes

**Address:** `PATCH /api/pages/update-requests/{request_id}/reject`

**Authentication:** Required (must be page owner or admin)

**Information Sent:**
- request_id (in the URL) - Which request to reject
- review_message (optional) - Your feedback explaining why

**What Happens:**
1. **Validates** - Checks you own the page or are admin
2. **Updates request only** - Changes status to "rejected"
3. **Records details** - Saves reviewer ID, timestamp, and message
4. **Does NOT change page** - Page content remains unchanged
5. **Commits** - Saves only the request status update

**Response:**
- Status Code: 200 (OK)
- Contains: The updated request showing rejected status

### 6. Update Page Settings

**What it does:** Changes a page's edit mode between "anyone" and "approval"

**Address:** `PATCH /api/pages/{page_id}/settings`

**Authentication:** Required (must be page owner or admin)

**Information Sent:**
- page_id (in the URL) - Which page to update
- edit_mode - Either "anyone" or "approval"

**What Happens:**
1. **Validates** - Checks you own the page or are admin
2. **Updates page** - Changes the edit_mode field
3. **Commits** - Saves to database

**Response:**
- Status Code: 200 (OK)
- Contains: The full updated page information

**Permission Note:** Only page owners and admins can change settings. Space owners cannot change page settings (only the page creator can).

---

## 🎓 Best Practices

### When to Use Approval Mode

✅ **Good Use Cases:**

**Official Documentation**
- Technical documentation that must be accurate
- API documentation with code examples
- Installation guides and tutorials
- Best practices and standards documents

**Important Content**
- Legal documents and terms of service
- Privacy policies and compliance information
- Company policies and procedures
- Safety and security guidelines

**Quality-Critical Pages**
- Customer-facing knowledge base articles
- Public-facing help documentation
- Training materials and courses
- Product specifications

❌ **Not Recommended For:**

**Collaborative Spaces**
- Brainstorming documents and ideation
- Meeting notes and minutes
- Team discussions and planning
- Rough drafts and work-in-progress

**Fast-Moving Content**
- Quick reference guides
- Internal team wikis
- Project management pages
- Daily status updates

**Casual Documentation**
- Personal notes
- Informal team documentation
- Scratch pads and temporary docs

### Tips for Page Owners

**1. Review Requests Promptly**
- Don't let requests pile up
- Contributors lose motivation if they wait too long
- Set aside time weekly to review requests
- Aim to respond within 24-48 hours

**2. Provide Helpful Feedback**
- Always use the review message field
- Explain why you approved or rejected
- Be constructive and encouraging
- Suggest improvements for rejected requests

**Examples of good feedback:**
- ✅ "Great catch on that typo! Thank you for the improvement."
- ✅ "Thanks for the suggestion! However, we're using a different approach. See section 3 for our current method."
- ✅ "Love the additional examples! Could you also add one for error handling?"

**Examples of poor feedback:**
- ❌ "No" (too brief, not helpful)
- ❌ "Wrong" (doesn't explain what's wrong)
- ❌ Leaving review message empty (contributor doesn't know why)

**3. Credit Contributors**
- Approved changes automatically credit the requester in version history
- This encourages future contributions
- Publicly acknowledge frequent contributors

**4. Consider Switching Modes**
- Use "anyone" mode during collaborative drafting
- Switch to "approval" mode when content is finalized
- You can change modes at any time

**5. Be Consistent**
- If you approve similar requests, approve all similar ones
- Set clear criteria for what you'll approve/reject
- Communicate your standards to frequent contributors

### Tips for Contributors

**1. Write Clear Messages**
- Always fill in the message field
- Explain what you changed AND why
- Make it easy for the owner to understand quickly

**Examples:**
- ✅ "Fixed grammatical error in paragraph 2: changed 'your' to 'you're'"
- ✅ "Added missing code example for JWT authentication as mentioned in issue #45"
- ✅ "Updated outdated library version from 1.5 to 2.0 and adjusted syntax accordingly"

**2. Make Focused Changes**
- One logical improvement per request
- Don't mix typo fixes with content additions
- Easier for owners to review smaller changes

**Instead of:** Submitting one request that fixes typos + adds new section + reorganizes content
**Do:** Submit three separate requests, each with clear focus

**3. Check Your Work**
- Review your changes before submitting
- Run any code examples you add
- Check for new typos you might have introduced
- Make sure formatting looks correct

**4. Be Patient**
- Page owners may take time to review
- They might be busy or reviewing multiple requests
- Give at least 48 hours before following up
- Remember they're volunteering their time

**5. Accept Feedback Gracefully**
- Rejections are not personal
- Read the feedback carefully
- Learn from the comments
- Improve and resubmit if appropriate

**6. Follow Up Appropriately**
- If rejected with suggestions, consider implementing them
- If approved, you can submit future improvements
- Build a relationship with page owners
- Become a trusted contributor

**7. Respect the Owner's Decisions**
- Remember: they own the page and know the content best
- They may have context you don't have
- Trust their judgment
- Focus on being helpful, not right

### Tips for Administrators

**1. Set Clear Guidelines**
- Document when approval mode should be used
- Create a contribution guide
- Train page owners on review best practices
- Set service level agreements (e.g., "review within 2 days")

**2. Monitor Request Backlogs**
- Check for pending requests that are aging
- Remind page owners to review
- Consider reassigning pages if owners are inactive

**3. Balance Control and Collaboration**
- Don't overuse approval mode
- Reserve it for truly critical content
- Encourage "anyone" mode where appropriate
- Foster a culture of trust

**4. Provide Feedback Channels**
- Let users report if owners are unresponsive
- Have a process for escalation
- Consider automated reminders for old pending requests

---

## 🔍 Troubleshooting

### Problem: "This page requires approval" Error

**Symptom:** When you try to save a page, you get error message: "This page requires approval. Please submit an update request instead."

**Cause:** The page is in approval mode and you're not the page owner, space owner, or admin.

**Solution:**
1. Don't try to save directly
2. Look for the "Submit Update Request" button
3. Click it and fill in the modal with your proposed changes
4. Add a clear message explaining your changes
5. Submit and wait for the page owner to review

**Prevention:** Check the page settings before making extensive edits

### Problem: Not Seeing Pending Requests

**Symptom:** You're a page owner but don't see any pending requests in the notification modal.

**Possible Causes and Solutions:**

**A. You're not logged in as the correct user**
- Log out and log back in as the page owner
- Check which account you're currently using

**B. The request is for someone else's page**
- You can only see requests for pages YOU created
- You must be the original author (author_id matches your user ID)
- Space ownership is not enough - you must be the page creator

**C. The request is not "pending" anymore**
- Requests might have already been approved or rejected
- Check the individual page's update request list
- Filter by "all requests" instead of just "pending"

**D. Browser cache issue**
- Refresh the page (F5 or Ctrl+R)
- Clear browser cache and reload
- Try in an incognito/private window

**E. No requests actually exist**
- Verify someone actually submitted a request
- Ask the contributor to confirm they submitted it
- Check the request was successful (they saw success message)

### Problem: Approval Button Disabled or Not Working

**Symptom:** Can't click "Approve & Publish" even though you're the page owner.

**Possible Causes and Solutions:**

**A. Network connectivity**
- Check your internet connection
- Look for error messages in browser console (F12)
- Try refreshing the page

**B. Backend server issue**
- The API server might be down or slow
- Wait a minute and try again
- Contact system administrator if it persists

**C. You already approved/rejected it**
- Refresh the page to see updated status
- Request might be processed but UI didn't update

**D. Database lock**
- Someone else might be processing the same request
- Wait 30 seconds and try again

### Problem: Changes Not Appearing After Approval

**Symptom:** You approved a request but the page still shows old content.

**Solutions:**

**A. Refresh the page**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- This clears the cache and reloads everything

**B. Clear browser cache**
- Your browser might be showing a cached version
- Clear cache for this specific site
- Or use incognito/private mode to check

**C. Check version history**
- Open version history to see if new version was created
- If new version exists, the change was applied
- The display issue is just cache-related

**D. Database issue**
- Contact administrator if refreshing doesn't work
- They can check database logs
- Might need to manually trigger a refresh

### Problem: Notification Count Wrong

**Symptom:** Bell icon shows a number but no requests appear in the list.

**Possible Causes:**

**A. Already handled**
- You may have already approved/rejected them in another tab
- Refresh the page to update the count

**B. Cache mismatch**
- The count is cached but the list was updated
- Clear cache or hard refresh

**C. Requests on deleted pages**
- If a page was deleted, its requests still exist
- Administrator needs to clean up orphaned requests

### Problem: Can't Change Edit Mode

**Symptom:** Settings button disabled or "Only page owner can change settings" error.

**Cause:** You must be either:
- The page owner (original creator), OR
- A system administrator

Space owners CANNOT change page settings. This is intentional to give page creators full control.

**Solution:**
- If you need to change settings on someone else's page, ask them to change it
- Or ask an administrator to change it
- Or ask an administrator to transfer page ownership to you

### Problem: Request Submitted But Creator Doesn't See It

**Symptom:** You submitted a request but the page owner says they don't see it.

**Troubleshooting Steps:**

1. **Verify submission was successful**
   - Did you see "✅ Update request submitted successfully"?
   - If you saw an error instead, the request wasn't created

2. **Check you submitted to correct page**
   - Verify the page title in your submission
   - Make sure you edited the right page

3. **Ask owner to refresh**
   - They might need to refresh their browser
   - The bell notification updates automatically but might lag

4. **Check the request status**
   - Visit the page and check if there's an "Update Requests" section
   - See if your request appears in the list
   - Check if status is "pending"

5. **Verify owner account**
   - Confirm the person checking is actually the page owner
   - They must be the original page creator
   - Check the "author" field on the page

### Problem: Multiple Users Approving Same Request

**Symptom:** Two owners try to approve the same request simultaneously.

**What Happens:**
- Database prevents duplicate processing
- First person to click "Approve" wins
- Second person will get an error
- The request will already show as "approved"

**Solution:**
- Refresh the page to see current status
- If someone else approved it, that's fine - changes are applied
- No need to approve again

---

## 📝 Summary

The approval system provides controlled collaboration on your knowledge base pages:

### Key Features

**Two Edit Modes:**
1. **"Anyone" mode** - Open collaboration, changes publish immediately
2. **"Approval" mode** - Controlled collaboration, changes need review

**Approval Workflow:**
1. Page owner enables approval mode
2. Contributors submit update requests
3. Page owner reviews and decides
4. Approved changes publish immediately
5. Rejected changes stay private with feedback

**Permission Structure:**
- **Page owners** control their pages completely
- **Space owners** can edit their space's pages directly
- **Administrators** have full access
- **Contributors** can submit requests on approval-mode pages

### Technology Stack

**Backend:** FastAPI (Python) handles all API requests and business logic

**Database:** PostgreSQL stores pages, requests, and version history

**Frontend:** Next.js (React) provides the user interface

**Editor:** TipTap rich text editor for content creation

**Notifications:** Sonner displays success/error messages

### The Review Process

**For Contributors:**
1. Make your improvements
2. Write a clear explanation message
3. Submit the request
4. Wait for review
5. Learn from feedback

**For Page Owners:**
1. Check notifications regularly
2. Review proposed changes
3. Provide helpful feedback
4. Approve good contributions
5. Reject when necessary with explanation

### Benefits

✅ **Quality Control** - Only approved changes go live

✅ **Collaboration** - Everyone can contribute ideas

✅ **Transparency** - All changes are tracked

✅ **Accountability** - Contributors get credit in version history

✅ **Flexibility** - Switch modes as your needs change

✅ **Feedback Loop** - Review messages help contributors improve

---

The approval system balances the need for quality control with the value of collaborative contributions, creating a sustainable process for maintaining accurate, high-quality documentation! 🎉
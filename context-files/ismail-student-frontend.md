# 🎨 Student Portal & Group Management Frontend — Handover & Context Summary (Sprint 2)

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint Target:** **Sprint 2 — Group Formation & Student Portal** (`documents/05-sprints/SPRINT-02-GROUP-FORMATION.md`)
- **Functional Requirements Covered:** FR-3.1 to FR-3.10, FR-10.4, Bidirectional Join Requests, Profile & Security Settings
- **Tech Stack:** React 18, Vite, React Router DOM v6, Axios with JWT interceptors, Lucide React icons, Vanilla CSS & CSS Tokens
- **Branch:** `feature/student-dashboard`
- **Status:** ✅ **Frontend 100% Complete & Verified:** Production bundle builds cleanly in `< 4s` (`npm run build`), all pages responsive across mobile, tablet, laptop, and desktop, clean design system aligned with Manager Dashboard, zero clunky emojis.

---

## 🏗️ Architecture & Component Directory Map

```
frontend/src/
├── api/
│   ├── client.js                      # Axios instance with baseURL '/api', Bearer JWT injection, 401 interceptor
│   ├── authApi.js                     # Login, logout, getMe
│   ├── studentDashboardApi.js         # GET /api/student/dashboard/
│   ├── studentGroupApi.js             # My group, browse groups, create, update, leave, invite, join requests, peer search
│   ├── studentProfileApi.js           # Get profile, update profile, change password
│   ├── studentAnnouncementsApi.js     # List/get student announcements
│   ├── studentAttachmentsApi.js       # List/download student attachments
│   ├── managerGroupsApi.js            # Manager group list, details, approve, reject with feedback
│   ├── departmentsApi.js              # Departments CRUD & listing
│   └── coursesApi.js                  # Courses CRUD & listing
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx               # Main application shell (Sidebar + Header + Page container)
│   │   ├── Sidebar.jsx                # Responsive collapsible sidebar (Manager & Student nav with role RBAC)
│   │   ├── Header.jsx                 # Top bar with user profile chip, role badge, and notifications
│   │   └── ProtectedRoute.jsx         # Route guard checking JWT authentication and allowed role
│   ├── ui/
│   │   ├── PageHeader.jsx             # Unified title, subtitle, breadcrumb, and action button container
│   │   ├── StatCard.jsx               # Responsive metric card supporting numbers, strings, icons, and click handlers
│   │   ├── StatusBadge.jsx            # Standardized status badge (pending, approved, rejected, evaluated)
│   │   ├── EmptyState.jsx             # Clean empty state container with icon, title, description, and action
│   │   ├── Modal.jsx                  # Accessible modal overlay with backdrop click and escape handlers
│   │   ├── Toast.jsx                  # Auto-dismissing success/error/info notifications
│   │   ├── Preloader.jsx              # Loading spinner with customizable label
│   │   └── Accordion.jsx              # Collapsible accordion item for announcements
│   └── student/
│       └── groups/
│           ├── EditGroupModal.jsx     # Reusable modal for dedicated Group Name changes (mode='name') & Proposal updates (mode='all')
│           ├── InviteModal.jsx        # Multi-select peer discovery search modal with cross-section & capacity guards
│           ├── LeadershipTransferModal.jsx # Transfer leadership to successor or disband sole-member group
│           └── GroupMemberList.jsx    # Standardized member list displaying roll, section, email, and leader tag
├── pages/
│   ├── student/
│   │   ├── StudentDashboard.jsx       # Aggregated student home (stat grid, group summary, inline rename, proposal resubmit, announcements, attachments)
│   │   ├── profile/
│   │   │   └── StudentProfilePage.jsx # Student profile details, editable fields, and modal password change
│   │   └── groups/
│   │       ├── MyGroupPage.jsx        # Active group hub, capacity meter, member management, inline rename, revision workflow, leader join requests card
│   │       ├── BrowseGroupsPage.jsx   # 3 Tabs: Browse Groups, Sent Join Requests, and Pending Invitations
│   │       └── CreateGroupPage.jsx    # Group creation wizard with academic context verification
│   └── manager/
│       ├── ManagerDashboard.jsx       # Aggregated manager overview (stats, announcements, attachments with upload/edit title/download/delete)
│       └── groups/
│           └── ManageGroupsPage.jsx   # Manager group oversight: live counter tabs, search, filters, approve/reject modals
├── App.jsx                            # React Router v6 tree with student and manager protected routes
└── index.css                          # Global design tokens, responsive grids (.stat-grid-4, .card-responsive, etc.)
```

---

## 📱 Page-by-Page Feature Specifications

### 1. 📊 Student Dashboard (`StudentDashboard.jsx` — `/student/dashboard`)
- **Metric Cards Grid:** 4 standardized stat cards displaying:
  1. **Project Group:** Shows active group name (e.g. `Sigma Club` or `No Group`) with status badge styling.
  2. **Group Members:** Displays capacity progress (e.g. `4 / 4`) and role (`Group Leader` vs `Team Member`).
  3. **Pending Invitations:** Live counter badge indicating pending requests requiring response.
  4. **Announcements:** Total count of active PBL announcements and live unread counter badge.
- **Revision Guidance Alert:** When a student's group is rejected, a prominent banner renders:
  - Manager's constructive feedback reason.
  - Direct call-to-action button: `"Update Proposal & Resubmit"` (opens `EditGroupModal` directly on the dashboard) + `"View Group"` shortcut.
- **Group Name Modification:** Beside `Group Name: [Name]`, group leaders of editable groups (`pending` or `rejected`) have a direct `"Change Name"` button that opens `EditGroupModal` in `mode="name"` with 3–100 character validation.
- **Dual Content Grid:**
  - **Left Panel:** Group overview summary or prompt to form/join a group.
  - **Right Panel:** Tabbed interface switching between:
    - **Announcements:** Expandable accordions with per-user `[✨ Recent]` tags for announcements created since last login. Interacting with or opening an announcement immediately auto-untags it and persists the view state. Includes a `"Mark all as read"` shortcut button.
    - **Project Resources & Attachments:** Shared course attachments with direct file download.

---

### 2. 👥 Active Group Hub (`MyGroupPage.jsx` — `/student/group/my`)
- **Group Status Card:** Displays project title, group name, course, department, section, creation date, and status badge.
- **Dedicated Change Group Name Action:** Right next to the group name in the header, leaders have a `"Change Name"` pencil button to rename their team anytime before approval.
- **Capacity Meter:** Visual progress bar tracking `members.length / max_capacity` with capacity alert when full (`Invite Peer` button is hidden/disabled when full).
- **Member Roster (`GroupMemberList`):** Lists all team members with name, roll number, section, email, and leader badge.
- **Leader Actions:**
  - **Invite Members:** Opens `InviteModal` to search peers in the same course.
  - **Incoming Join Requests Card:** Displays list of pending applicants (Name, Roll, Section, Email, Date, Message) with **Accept** and **Decline** action buttons.
  - **Remove Member:** Leader can remove non-leader members with immediate roster update.
  - **Edit Proposal & Resubmit:** Allows revising project title and group name via `EditGroupModal`. Automatically resets status from `rejected` to `pending` for re-approval.
- **Leave Group / Transfer Leadership:** Non-leaders can leave directly; leaders are prompted to transfer leadership to a chosen successor or disband if sole member.

---

### 3. 🔍 Group Discovery & Collaboration (`BrowseGroupsPage.jsx` — `/student/group/browse`)
Features a 3-tab layout:

1. **Tab 1 — Browse Course Groups:**
   - Real-time search by group name or project title with debounced API queries.
   - Filter by status (`All`, `Pending`, `Approved`, `Needs Revision`).
   - **User's Enrolled Group Pinned at Top:** The currently logged-in student's group is placed first with sky-blue styling and `"YOUR ENROLLED GROUP"` chip.
   - **Card Status Badges & Action Buttons:**
     - **Full Group:** Displays `"Group Full"` badge (disabled).
     - **Rejected Group:** Displays `"Needs Revision"` badge (disabled).
     - **Pending Request:** Displays `"Request Pending"` badge + `"Cancel"` button.
     - **Available Group:** Displays `"Request to Join"` button opening a note modal.
2. **Tab 2 — Sent Join Requests:**
   - Dedicated tracker for all outgoing join requests submitted by the student.
   - Shows Group Name, Project Title, Leader Name & Roll, Date Sent, Updated Date, and live Status Badge (`Pending`, `Accepted`, `Rejected`, `Cancelled`).
   - Enables cancelling pending requests directly.
3. **Tab 3 — Pending Invitations (Pull Model):**
   - Displays all pending leader-sent invitations with rich metadata (Inviter, Course, Dept, Date).
   - **One-Group Membership Guard:** If a student already belongs to a group, the **Accept** button is disabled with an advisory note.

---

### 4. ➕ Group Creation Wizard (`CreateGroupPage.jsx` — `/student/group/create`)
- Checks student enrollment status and blocks duplicate group creation (`409 Conflict` prevention).
- Context banner displaying the student's enrolled Course, Department, and Section.
- Validates Group Name and Project Title with character length rules.
- On submit, creates the group, assigns the creator as Group Leader, and navigates to `MyGroupPage`.

---

### 5. 👤 Student Profile & Security (`StudentProfilePage.jsx` — `/student/profile`)
- **Navigation Position:** Relocated to the bottom of the navigation menu directly above the **Logout** button.
- **Academic Summary Card:** Read-only verified data (Roll Number, Course, Department, Section, Assigned Evaluator/Teacher).
- **Personal Information:** Allows updating `Name` and `Recovery Email`.
- **Password Change Modal:** Current password verification, strength validation (min 6 chars), and confirm matching.

---

### 6. 🛡️ Manager Group Approval & Oversight (`ManageGroupsPage.jsx` — `/manager/groups/manage`)
- **Real-Time Status Tabs:** Counter tabs for `All Groups`, `Pending Approval` (amber badge), `Approved` (green badge), and `Needs Revision` (red badge).
- **Filters Toolbar:** Search by group/project name, filter by synced Department dropdown, filter by synced Course dropdown.
- **Table Data & Status-Driven Action Buttons:**
  - **Pending:** Shows **View**, **Approve** (green button), and **Reject** (red button).
  - **Approved:** Shows **only View** button.
  - **Rejected / Needs Revision:** Shows **only View** button (Approve hidden so rejected groups cannot be approved without student revision).
- **Reject Feedback Modal:** Requires the manager to provide detailed constructive guidance explaining what the students need to revise.
- **Group Detail Inspection Modal:** Displays full group metadata, rejection reason (if any), and complete roster of enrolled students.

---

## 🎨 Design System & Responsive Layout Engine

### Unified Responsive Breakpoints (`index.css`)

All student and manager pages follow the identical multi-device grid system:

```css
/* 4-Column Grid for Student Dashboard */
.stat-grid-4 {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
  grid-template-columns: repeat(4, 1fr);
}

/* 5-Column Grid for Manager Dashboard */
.stat-grid-responsive {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
  grid-template-columns: repeat(5, 1fr);
}

/* Laptop / Large Tablet (900px - 1280px) */
@media (max-width: 1280px) {
  .stat-grid-responsive { grid-template-columns: repeat(3, 1fr); }
  .stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
}

/* Tablet (580px - 900px) */
@media (max-width: 900px) {
  .stat-grid-responsive,
  .stat-grid-4 {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 18px;
  }
}

/* Mobile Devices (<= 580px) */
@media (max-width: 580px) {
  .stat-grid-responsive,
  .stat-grid-4 {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
}
```

---

## 🔌 API Client Contracts & Method Reference

| API Client File | Exported Methods | Backend Route |
| :--- | :--- | :--- |
| `studentDashboardApi.js` | `getDashboard()` | `GET /api/student/dashboard/` |
| `studentGroupApi.js` | `getMyGroup()` | `GET /api/student/groups/my` |
| | `browseGroups(params)` | `GET /api/student/groups/?search=...&status=...` |
| | `createGroup(data)` | `POST /api/student/groups/` |
| | `updateGroup(id, data)` | `PUT /api/student/groups/<id>` |
| | `leaveGroup(id)` | `POST /api/student/groups/<id>/leave` |
| | `transferLeadership(id, data)` | `POST /api/student/groups/<id>/transfer-leadership` |
| | `inviteMember(id, roll)` | `POST /api/student/groups/<id>/invite` |
| | `removeMember(id, memberId)` | `POST /api/student/groups/<id>/remove/<member_id>` |
| | `sendJoinRequest(groupId, msg)` | `POST /api/student/groups/<id>/join-request` |
| | `cancelJoinRequest(requestId)` | `DELETE /api/student/groups/join-requests/<id>` |
| | `getMySentRequests()` | `GET /api/student/groups/my/sent-requests` |
| | `getIncomingJoinRequests()` | `GET /api/student/groups/my/join-requests` |
| | `acceptJoinRequest(requestId)` | `POST /api/student/groups/join-requests/<id>/accept` |
| | `rejectJoinRequest(requestId)` | `POST /api/student/groups/join-requests/<id>/reject` |
| | `getPendingInvitations()` | `GET /api/student/invitations/pending` |
| | `acceptInvitation(id)` | `POST /api/student/invitations/<id>/accept` |
| | `declineInvitation(id)` | `POST /api/student/invitations/<id>/decline` |
| | `searchStudents(roll)` | `GET /api/student/students/search/?roll=...` |
| `studentProfileApi.js` | `getProfile()` | `GET /api/student/profile/` |
| | `updateProfile(data)` | `PUT /api/student/profile/` |
| | `changePassword(data)` | `POST /api/student/profile/change-password` |
| `studentAnnouncementsApi.js` | `getAll()` | `GET /api/student/announcements/` |
| | `getById(id)` | `GET /api/student/announcements/<id>` |
| | `markAsViewed(id)` | `POST /api/student/announcements/<id>/view` |
| | `markAllAsViewed()` | `POST /api/student/announcements/view-all` |
| `managerGroupsApi.js` | `getGroups(params)` | `GET /api/manager/groups/` |
| | `getGroupById(id)` | `GET /api/manager/groups/<id>` |
| | `approveGroup(id)` | `POST /api/manager/groups/<id>/approve` |
| | `rejectGroup(id, reason)` | `POST /api/manager/groups/<id>/reject` |
| `departmentsApi.js` | `list(params)` / `getDepartments(params)` | `GET /api/manager/departments/` |
| `coursesApi.js` | `list(params)` / `getCourses(params)` | `GET /api/manager/courses/` |

---

## 💡 Gotchas & Implementation Tips for Future Developers

1. **Bidirectional Join Requests vs Invitations:**
   - Both invitations (Leader ➔ Student) and Join Requests (Student ➔ Leader) are supported simultaneously.
   - When a student joins any group via either method, the system automatically marks all other pending requests and invitations as `cancelled`.
2. **Capacity Enforcement:**
   - Both backend and frontend check group capacity (`member_count >= max_group`).
   - Group leaders cannot invite candidates, and students cannot send join requests when a group is full.
3. **Rejected Groups:**
   - Rejected groups cannot receive join requests until the leader edits and resubmits the proposal (transitioning to `pending`).

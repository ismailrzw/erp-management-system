# 🎨 Student Portal & Group Management Frontend — Handover & Context Summary (Sprint 2)

## 📋 Executive Overview

- **Project:** ERP Management System (PBL Management System) · Beaconhouse National University
- **Sprint Target:** **Sprint 2 — Group Formation & Student Portal** (`documents/05-sprints/SPRINT-02-GROUP-FORMATION.md`)
- **Functional Requirements Covered:** FR-3.1 to FR-3.10, FR-10.4, Profile & Security Settings
- **Tech Stack:** React 18, Vite, React Router DOM v6, Axios with JWT interceptors, Lucide React icons, Vanilla CSS & CSS Tokens
- **Branch:** `feature/student-dashboard`
- **Status:** ✅ **Frontend 100% Complete & Verified:** Production bundle builds cleanly in `< 8s` (`npm run build`), all pages responsive across mobile, tablet, laptop, and desktop, clean design system aligned with Manager Dashboard, zero clunky emojis.

---

## 🏗️ Architecture & Component Directory Map

```
frontend/src/
├── api/
│   ├── client.js                      # Axios instance with baseURL '/api', Bearer JWT injection, 401 interceptor
│   ├── authApi.js                     # Login, logout, getMe
│   ├── studentDashboardApi.js         # GET /api/student/dashboard/
│   ├── studentGroupApi.js             # My group, browse groups, create, update, leave, invite, peer search
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
│           ├── InviteModal.jsx        # Multi-select peer discovery search modal with cross-section support
│           ├── LeadershipTransferModal.jsx # Transfer leadership to successor or disband sole-member group
│           └── GroupMemberList.jsx    # Standardized member list displaying roll, section, email, and leader tag
├── pages/
│   ├── student/
│   │   ├── StudentDashboard.jsx       # Aggregated student home (stat grid, group summary, announcements, attachments)
│   │   ├── profile/
│   │   │   └── StudentProfilePage.jsx # Student profile details, editable fields, and modal password change
│   │   └── groups/
│   │       ├── MyGroupPage.jsx        # Active group hub, capacity meter, member management, revision workflow
│   │       ├── BrowseGroupsPage.jsx   # Course group discovery tab (own group pinned at top) + invitations tab
│   │       └── CreateGroupPage.jsx    # Group creation wizard with academic context verification
│   └── manager/
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
  4. **Announcements:** Total count of active PBL announcements.
- **Revision Guidance Alert:** When a student's group is rejected, a prominent banner renders:
  - Manager's constructive feedback reason.
  - Direct call-to-action button: `"Update Proposal"`.
- **Dual Content Grid:**
  - **Left Panel:** Group overview summary or prompt to form/join a group.
  - **Right Panel:** Tabbed interface switching between **Announcements** (with expandable accordions) and **Project Resources & Attachments** (with direct file download).

---

### 2. 👥 Active Group Hub (`MyGroupPage.jsx` — `/student/group/my`)
- **Group Status Card:** Displays project title, group name, course, department, section, creation date, and status badge.
- **Capacity Meter:** Visual progress bar tracking `members.length / max_capacity` with capacity alert when full.
- **Member Roster (`GroupMemberList`):** Lists all team members with name, roll number, section, email, and leader badge.
- **Leader Actions:**
  - **Invite Members:** Opens `InviteModal` to search peers in the same course.
  - **Remove Member:** Leader can remove non-leader members with immediate roster update.
  - **Edit Proposal:** Allows revising project title and group name. Resets status from `rejected` to `pending` for re-approval.
- **Leave Group / Transfer Leadership:** Non-leaders can leave directly; leaders are prompted to transfer leadership to a chosen successor or disband if sole member.

---

### 3. 🔍 Group Discovery & Invitations (`BrowseGroupsPage.jsx` — `/student/group/browse`)
- **Browse Course Groups Tab:**
  - Real-time search by group name or project title with debounced API queries.
  - Filter by status (`All`, `Pending`, `Approved`, `Needs Revision`).
  - **User's Enrolled Group Pinned at Top:** The currently logged-in student's group is automatically placed first with a distinct sky-blue background (`#f0f9ff`), accent border (`2px solid #38bdf8`), and `"YOUR ENROLLED GROUP"` chip.
  - Cards show project title, group name, leader info & roll number, course, section, member count, and status.
- **Pending Invitations Tab (Pull Model):**
  - Displays all pending group invitations sent to the student.
  - Rich metadata: Group Name, Project Title, Inviter Name, Course, Department, Date.
  - **One-Group Membership Guard:** If a student already belongs to a group, the **Accept** button is automatically disabled with an advisory note explaining that they must leave their current group first.

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
- **Password Change Modal:**
  - Current password verification.
  - New password strength validation (minimum 6 characters).
  - Confirm password matching with toast notifications.

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

### UI Consistency Rules
1. **Zero Clunky Emojis:** All unicode emojis (e.g. 👑, 💡, 🎉, ⚠️, ✕) have been removed across the entire frontend. Clean Lucide SVG icons and subtle styled badges are used exclusively.
2. **Text Wrapping & Overflow:** Containers apply `max-width: 100%`, `box-sizing: border-box`, and `.break-words` to eliminate horizontal scrollbars on mobile.
3. **Table Responsiveness:** Tables are wrapped in `.table-responsive-container` with smooth touch-scrolling.

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
| | `getPendingInvitations()` | `GET /api/student/invitations/pending` |
| | `acceptInvitation(id)` | `POST /api/student/invitations/<id>/accept` |
| | `declineInvitation(id)` | `POST /api/student/invitations/<id>/decline` |
| | `searchStudents(roll)` | `GET /api/student/students/search/?roll=...` |
| `studentProfileApi.js` | `getProfile()` | `GET /api/student/profile/` |
| | `updateProfile(data)` | `PUT /api/student/profile/` |
| | `changePassword(data)` | `POST /api/student/profile/change-password` |
| `managerGroupsApi.js` | `getGroups(params)` | `GET /api/manager/groups/` |
| | `getGroupById(id)` | `GET /api/manager/groups/<id>` |
| | `approveGroup(id)` | `POST /api/manager/groups/<id>/approve` |
| | `rejectGroup(id, reason)` | `POST /api/manager/groups/<id>/reject` |
| `departmentsApi.js` | `list(params)` / `getDepartments(params)` | `GET /api/manager/departments/` |
| `coursesApi.js` | `list(params)` / `getCourses(params)` | `GET /api/manager/courses/` |

---

## 💡 Gotchas & Implementation Tips for Future Developers

1. **Course Constraint vs Cross-Section:**
   - Group formation enforces that students must be in the **same course**.
   - Students from different **sections** of the same course are allowed to form groups together.
2. **StatCard Props Flexibility:**
   - [`StatCard.jsx`](file:///c:/Users/lenovo/Documents/University/1.%20ERP%20System/erp-management-system/frontend/src/components/ui/StatCard.jsx) accepts either `value` (for strings like `"Group Alpha"`) or `count` (for numbers like `4`). Always use `value` when rendering non-numeric strings.
3. **Manager Role Name Constant:**
   - The backend JWT claim for managers is `"pbl_manager"`, represented in Python as `Role.MANAGER` and in React as `allowedRoles={['pbl_manager']}`.
4. **Optimistic UI & Re-fetching:**
   - After mutations (accept invite, leave group, transfer leadership, approve/reject), invoke the page's `fetchData(true)` callback to sync database counters and avoid stale UI state.

---

## 🚀 Next Steps (Sprint 3 & Beyond)

With Sprint 2 Student Portal and Group Management fully functional, the next development tasks are:

1. **Sprint 3 — Project Assignments & Evaluator Management:**
   - Implement Manager project assignment to approved groups.
   - Build Evaluator portal for viewing assigned student groups and grading criteria.
2. **Sprint 4 — Iteration Progress & File Submissions:**
   - Enable group leaders to submit project deliverables, reports, and code repositories per iteration.
3. **Sprint 5 — Grading Rubrics & Scoring Engine:**
   - Evaluator grading forms with weighted criteria and feedback logs.
4. **Sprint 6 — Surveys & Feedback Reports:**
   - Peer evaluations and end-of-semester PBL surveys.

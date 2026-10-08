# FYP system improvement — implementation prompt

Use the text below as the implementation request for this repository. Repository paths are relative to its root.

## Objective and scope

Improve the existing FYP/PBL management system by implementing the requirements below across the React frontend, Flask API, and MongoDB data model. Deliver a coherent flow with consistent authorization, synchronized data, clear recovery behavior, and responsive interfaces. Preserve existing working functionality except where a requirement explicitly changes it.

Work within the existing architecture. Extend the current services, schemas, role-specific blueprints, API wrappers, authentication context, shared components, and tests. Do not replace the application, introduce an ORM, redesign unrelated modules, or add multiple course offerings. Treat current source code as authoritative over outdated README examples.

Read the relevant frontend and backend implementation before editing. Inspect the current Git status and preserve every existing staged and unstaged change. Do not reset the repository, overwrite another developer's work, reseed the application database, or run destructive tests against live data. Establish a baseline and record existing failures separately from regressions introduced by this work.

Implement in small, complete stages. Each stage must include backend enforcement, frontend behavior, contract alignment, relevant data compatibility, and meaningful verification. A hidden button alone does not enforce a business rule.

## Resolved terminology and proposed policy defaults

The original requirements contain ambiguities. Use these explicit defaults unless the project owner changes them; report them in the implementation summary rather than silently inventing different policies:

1. **Student Name:** Full Name is permanently immutable after creation for every role, including Manager. No student, manager, bulk update, or alternate profile endpoint may change it.
2. **Department editing:** Department is read-only to students once assigned. Manager may correct Department, Academic Session, and the single Course through View All Students → Edit before group membership. This resolves the conflict between “Department cannot be changed” and “add Department to Manager Edit.” Block Department/Course reassignment once group membership exists; never silently move a group or break membership consistency.
3. **Manager editing:** “Manager cannot edit student information” is interpreted as prohibiting name/identity editing, while allowing the explicitly requested academic-assignment corrections. Keep Roll Number and generated institutional Email immutable under the existing rules. Recovery email and password management continue through their existing authorized flows.
4. **Supervisor capacity:** A supervisor may supervise at most **four active groups in total**, including groups awaiting Manager approval. This replaces the current per-course cap. Pending requests do not reserve capacity; acceptance must atomically recheck it. Identify existing over-capacity records without automatically removing assignments.
5. **Milestone visibility versus submission:** Every member of a valid, non-deleted group can view milestones targeting its course, including pending/rejected groups. Preserve the existing rule that only a Manager-approved group can submit or be graded; show pending groups a clear approval-required state. This separates the requested visibility fix from an unrequested expansion of submission privileges.
6. **Late penalty:** Use the existing percentage field, with a one-time percentage deduction from the earned rubric score. Default is disabled/0%; valid range is 0–100. No daily accumulation or automatic penalty for late group formation is implied by milestone lateness.
7. **Deadline boundary:** A submission received at or before the deadline is on time. Changes/unsubmission are allowed only strictly before the deadline and while ungraded. After the deadline, an existing submission is locked. A first late submission is allowed for an otherwise eligible group and receives the configured penalty; it cannot subsequently be replaced or deleted.
8. **Proposal editing:** Preserve the existing leader-only proposal editing permission and approved-group freeze. Pending/rejected groups may revise title, scope, and proposal. Material revisions invalidate approvals for the previous proposal version and return through Supervisor → Manager review. Do not silently permit approved-project rewriting.
9. **Membership removal:** Remove the open per-member removal buttons from My Group. Preserve safe, authorized invitation, joining, leaving, and leadership-transfer functionality unless an explicit requirement changes it. Do not invent a new removal-request system. Any retained membership mutation must respect approvals, submissions, academic records, and backend permission checks.
10. **Email verification:** Exact domain validation does not prove ownership of an email address. Reuse the account activation/password-setup mechanism to verify ownership for new internal evaluators; do not claim an address is verified merely because it ends in the university domain. Persist verification state and provide resend/retry behavior.

## Repository-specific starting points

Verify these observations against the current working tree before changing them:

- Backend: Flask, Flask-RESTx, raw PyMongo, Marshmallow, Flask-JWT-Extended, and bcrypt. Frontend: React/Vite, Axios, React Router, shared CSS and UI components.
- `backend/app/models/user.py` distinguishes `pbl_manager`, `student`, `teacher`, and `evaluator`. Supervisor is the existing `teacher` role; evaluator is a separate role. Preserve that distinction when enabling supervisor grading.
- Student edit behavior spans `backend/app/schemas/student_schema.py`, `backend/app/services/student_service.py`, `backend/app/services/student_profile_service.py`, and `backend/app/blueprints/student/profile.py`. Names are currently editable in multiple places; Department is omitted from Manager update validation.
- `backend/app/services/student_service.py` currently soft-deletes a student and pulls them out of `member_ids`. Replace that behavior with dependency blocking; do not orphan leaders, user `group_id` links, or academic records.
- `backend/app/services/group_service.py` already has generated identifiers, invitations, join requests, `group_id` synchronization, proposal attachment storage, and optimistic version fields. Extend these rather than building parallel features. Its creation function still accepts a supplied name and does not require valid academic enrollment at the service boundary.
- Group relations currently include course names, department codes, and section fields. Keep compatible reads while introducing stable references where needed. Group eligibility and ownership must stop depending on Section.
- `backend/app/services/manager_group_service.py` returns workspace `group`, `members`, and `timeline`; the frontend also expects `proposal`, `submissions`, and exhibition data. Agree on one explicit workspace contract before refactoring.
- `ManageGroupsPage.jsx` uses `g.course_name` while the backend returns `course`. `ProjectDetailWorkspace.jsx` reads `m.roll_no` while the backend resolves `roll`. These are concrete mapping problems; do not fill them with fake defaults.
- The Manager workspace service already permits non-deleted groups regardless of approval. Reproduce the unavailable-workspace failure and inspect response serialization and frontend error handling before blaming approval status alone.
- `backend/app/blueprints/manager/sprints.py` creates sprint documents during GET when no sprints are returned. This also makes filtered-empty results dangerous. Remove this read-time seeding.
- Milestones are currently stored in `iterations`; sprints are linked by `sprint_name`. Preserve existing URLs/API compatibility while making sprint association and ordering reliable.
- `backend/app/blueprints/student/iterations.py` uses JWT course claims before fresh database values, looks up approved groups, and has inconsistent list/detail/submit eligibility checks. Apply one policy to every path and serialize every nested ObjectId/date.
- `frontend/src/api/client.js` and `apiCache.js` implement response caching. Stale GET results can update the cache without updating the mounted component. `AuthContext.jsx` verifies the profile on mount. Correct cross-role freshness without removing working session isolation or navigation performance.
- Announcement read tracking exists in `announcement_views`, but `announcement_service.py` treats recent flags primarily as a student feature. The Navbar bell currently navigates to a dashboard. Extend the existing announcement model to persistent read/unread states for all supported roles.
- Rubric grading currently lives under evaluator endpoints, while the teacher group page provides oversight. Manager workspaces read `student_evaluations`; evaluator marking writes `evaluations`. Make the required supervisor grading visible consistently without inventing an unrelated scoring store or averaging incompatible records.
- Existing exhibition functionality spans backend routes, registration/imports, frontend routes/navigation/pages, dashboard statistics, exports, and tests. Removing one workspace card is insufficient.

## 1. Academic setup, ownership, and immutable identity

The academic hierarchy is:

`Department → Course → Group → Members / Proposal / Milestone Submissions`

A student is enrolled in at most one Course. A Course belongs to one Department. A Group belongs to one Course and derives its Department from that Course. Supervisors belong to a Department and are explicitly assigned to groups. Evaluator assignments remain separate. Section may remain a student administrative field but must not define group ownership or block otherwise valid same-course membership.

Use stable entity IDs for integrity-sensitive relationships where practical, with an explicit compatibility strategy for existing string references. Do not confuse MongoDB IDs, course display names, department codes, or department display names. Renaming a Department or Course must not orphan children or change their identity. Do not undertake a destructive wholesale schema conversion.

When Manager creates a student, require:

- Full Name (cannot be changed later);
- Roll Number  (cannot be changed later)r;
- Academic Session  (cannot be changed later);
- a valid, active Department.

Course can remain unassigned initially, but it must be valid and belong to the assigned Department when selected. Validate the same rules in individual creation, bulk-import preview, bulk-import execution, and the API. Trim and normalize values consistently. Reject duplicate roll/email identities using database constraints as well as friendly service validation.

Remove all Change Name/profile-name inputs and actions from student dashboards/settings/profile pages and Manager student editors and also the Roll Number and Academic Session. Display Name read-only. Reject attempts to mutate Name through direct requests, including mixed payloads containing valid fields, rather than quietly accepting misleading partial success. Use explicit allowlists of editable fields.

Manager's Student Edit form must include Department, and Course according to the policy defaults. Course options must be filtered by Department. Changing Department clears an incompatible unsaved Course selection. Persist changes together after validating them; cancel leaves the server unchanged. A grouped student gets an explanatory lock with the blocking group linked where accessible.

Fallbacks: if there are no departments, Manager sees Create Department as the next step. If no courses exist for a department, show that state and allow initial student creation without Course. Legacy records missing mandatory academic data remain readable and are clearly flagged for correction; do not assign a guessed Department or Course.

## 2. Dependency-aware deletion and recycle bins

Enforce the rule: an entity can be deleted only if no dependent child/reference would be orphaned. Apply it to soft deletion, permanent deletion, alternate endpoints, and concurrent creation/assignment. Never delete children automatically to make a parent deletion succeed.

| Entity | Deletion must be blocked by |
| --- | --- |
| Student | Any retained group membership/leadership or dependent academic record |
| Course | Groups; enrolled students; targeted milestones or other retained dependent records |
| Department | Courses; directly associated students/faculty; groups or descendants referencing it, including inconsistent legacy data |
| Teacher/Supervisor | Supervised groups or retained assignment/evaluation references |
| Evaluator | Bound groups or retained assignment/evaluation references |
| Sprint | Milestones belonging to it |
| Milestone | Submissions, grades, comments, or other retained child records |
| Rubric template/attachment | References whose removal would break an active task, proposal, or retained academic record |

Count retained children even when archived or soft-deleted if they still depend on that parent for restoration/history. Restore parents before children, or return a clear dependency error. Permanent deletion must recheck dependencies; moving an item to trash never bypasses integrity rules. Preserve the existing soft-delete/recovery model.

Return a structured conflict with a readable explanation and authorized dependency counts, for example: “Cannot delete this course: 3 groups and 12 enrolled students still reference it.” Show a link to the relevant list when allowed. If dependency loading fails, keep deletion unavailable and offer retry; do not treat failure as zero children. Use atomic coordination suitable for the deployment so deletion cannot race with child creation.

On View All Students, Departments, Courses, Teachers, and Evaluators, remove the standalone row Delete button. Put Delete inside the row's Edit menu/dialog, clearly separated from saving changes. Keep confirmation and show dependency errors without closing or pretending deletion succeeded.

Remove Recycle Bin entries from global navigation/sidebar/dashboard menus. Add one contextual Recycle Bin action on each supported entity's View/List page. Preserve authorized trash routes, restoration, and permanent-delete behavior. Use consistent names and avoid repeated dropdown entries.

## 3. Evaluator onboarding

Manager Add Evaluator must start with a clear type choice:

**Internal Faculty:** Name, Email, Relevant Department, and Expertise. Validate a syntactically valid email with the exact normalized domain `bnu.edu.pk`. Reject suffix tricks such as `person@bnu.edu.pk.example.com`, subdomains, and unrelated domains. Validate an active Department and nonempty meaningful Expertise. Apply checks to frontend, schemas, services, and applicable update paths. Reuse activation and ownership-verification delivery with a persistent pending/verified state.

**External Industry Expert:** Full Name, valid personal/company Email, Company Name, and Relevant Post/Job Title. Do not require an institutional email or force an academic Department. Persist company and post and display them in list/detail/edit views. Do not discard them during serialization.

Switching type must show the appropriate fields and validate the resulting type-specific record. Use consistent type constants. Handle existing evaluators with incomplete metadata without deleting accounts or blocking unrelated access.

Fallbacks: duplicate email has an explicit error; email delivery failure does not create duplicate accounts or claim verification succeeded. Preserve the created account in a clear pending state and expose a retry/resend mechanism. Preserve authorization distinctions between faculty supervisors and evaluators; internal evaluator status alone does not grant supervisor privileges.

## 4. Student enrollment refresh and group creation

At `/student/group/create`, load fresh student enrollment and group membership from the server before enabling creation. Show Course and Department read-only when assigned by Manager. Do not rely on `localStorage`, an old JWT course claim, or stale API-cache values as the academic source of truth.

If Course is unassigned, allow selection only from active courses within the student's assigned Department. If a legacy student lacks Department, allow choosing a valid Department/Course pair only to fill missing values. Persist and validate this choice on the backend before, or atomically with, group creation so Manager and student views agree. Students cannot override existing Manager assignments. If assignment changes while the form is open, reject the stale selection, refresh enrollment, and explain the change while preserving title/file selection where possible.

The creation page must offer:

- Project Title / Idea;
- proposal document upload;
- Add Members, producing runtime invitations;
- Supervisor selection/request and optional extra message.

Use a clear staged flow on this page:

1. Resolve valid academic enrollment.
2. Enter title and attach the proposal; retain the current required-proposal behavior.
3. Create the group once with the authenticated creator as its first member.
4. Send selected invitations against that real group ID. Invitations remain Pending until recipients accept; selected invitees are never shown as confirmed members.
5. Allow supervisor-request preparation on the same page. Send the request only when the proposal is attached and accepted members meet the existing course minimum/maximum constraints. Pending invitations do not satisfy minimum membership.

If invitation or supervisor dispatch fails after creation, keep the created group, report which operation failed, and allow retry without recreating it. Recheck availability/eligibility at dispatch and acceptance, not only when loading dropdowns. Existing browse/join-request flows must use the same course-based policy.

Invitations require the same Course and Department, an active student, no conflicting group membership, and available group capacity. Recheck those conditions when accepting. Prevent double acceptance, duplicate pending invitations, simultaneous overfilling, or a student joining two groups. Declining/cancelling is a normal state, not a server error.

Never create a group with an empty/nonexistent Course or Department or fallback group limits from an unresolved course. If no eligible courses/supervisors/members exist, show a specific empty state and the next useful action. Preserve course-configured group sizes and formation-deadline reporting.

## 5. Group identity, proposal, members, and review lifecycle

Generate the immutable group display identifier on the backend using `grp-YYYY-NNN`, for example `grp-2026-001`, with concurrency-safe sequence allocation and uniqueness. The MongoDB group ID remains the relational identity. Reject caller-supplied group-name overrides on create/update. Remove Change Group Name controls everywhere, including the pencil beside the group identifier and name-only edit mode.

For existing identifiers, preserve identity and references. If standardizing legacy display names, use an explicit idempotent migration with a preserved legacy alias/audit mapping; do not casually regenerate names or reuse old numbers.

On `/student/group/my`, Project Information must show Project Title, scope/details, and the initial proposal's metadata and preview/download action. Edit Proposal includes Title, scope, and replacement proposal document according to existing leader/status permissions. Keep the old attachment until the new upload and database linkage succeed. Protect attachment downloads using role/group access rather than relying on a guessable URL.

Member display must preserve joining order: creator first, then members in acceptance order. Persist `creator_id` and join timestamps/order where needed; MongoDB `$in` result order is not membership order. Highlight the current logged-in member in blue and label them “You.” A Leader badge can remain but must not control highlighting/order. Leadership transfer does not move members. Use standard-width supervisor cards that stay compact even when there is only one.

Represent proposal review as distinct states, mapped explicitly to existing group/request status fields or a backward-compatible extension:

`Forming → Ready for Supervisor → Supervisor Review → Manager Review → Approved`

Rejection paths return to revision with the reviewer, reason, proposal version, and next action visible. Group formation status, supervisor-request status, Manager approval status, submission status, and evaluation status must not be collapsed into one contradictory badge.

Supervisor request must show the group identifier, Course/Department, Project Title, proposal attachment and scope, all accepted members with roll numbers, and the optional message. Store the requested proposal version so the reviewer cannot approve one document while students replace it with another. Retain resolved requests/history rather than only returning the latest pending request.

Supervisor can accept or reject only their own pending requests. Acceptance revalidates the proposal version, group validity, Department eligibility, and four-group total cap. Assign the Supervisor consistently in the group and assignment records and transition to Manager Review. A supervisor acceptance is not final Manager approval. Ensure competing acceptances cannot exceed capacity or assign two supervisors to one group.

Manager can inspect every existing non-deleted group, including Forming, Pending, Rejected, and Approved groups. Manager approval requires current Supervisor acceptance, a valid attached proposal, coherent course membership, and course group-size rules. Manager rejection requires feedback. Revisions must go back through the necessary review steps; stale or duplicate approval returns a conflict and reloads the latest state.

Fallbacks: supervisor rejection allows revision and another request; a full/unavailable supervisor causes a readable conflict without a false assignment; a missing proposal disables review with a repair action; a lost response after acceptance must reconcile server state before retrying. Retain Manager-rejection feedback and the assigned Supervisor, but require the revised proposal to be reviewed again before final approval.

## 6. Manager list and workspace

Keep `/manager/groups` as the list and `/manager/groups/:groupId` as the specific workspace route. A trailing slash on the list is not a group identifier. Use the actual database group ID in links. Preserve existing route aliases if they are still used.

Fix Course & Dept in the list and Department/Roll Number in the workspace through a documented response contract and canonical backend lookups. The workspace must consistently expose:

- group ID, immutable display identifier, title, Course, Department, review state, Supervisor;
- ordered members with `id`, `name`, `roll`, and relevant enrollment data;
- proposal metadata, scope, version, and authorized download/preview;
- applicable sprints/milestones, shared submissions, rubric grades, feedback, and penalty breakdown;
- explicit missing/empty states.

Align the frontend fields with the backend; do not mask missing values with guessed `CS`, `General`, or fake roll numbers. Resolve recoverable legacy data through validated relations. Conflicting or missing relations should produce an “Enrollment data needs correction” state for Manager.

Desktop layout: Group Members in the left column; Project Proposal and Scope on the right; beneath the right-side proposal place Sprint Milestone Deliverables / Activity, then Sprint Milestones & Performance Timeline. Mobile stacks these in the same logical order. Use consistent headings, spacing, readable tables/cards, and accessible attachment actions.

Distinguish request failures correctly: 404 genuinely missing group, 403 forbidden, expired session, network/server error with Retry, and successful group with no proposal/submissions. A request exception must not become “record does not exist.” Preserve successfully loaded group content if an optional timeline section fails; label that section unavailable and retry it.

## 7. Sprint → milestone → rubric setup

Use “Milestone” in the user-facing flow; retain `iterations` API/storage names where compatibility requires them.

A fresh database has **zero sprints**. Listing or filtering sprints must never write data. Deleting the last childless sprint must leave zero after navigation, reload, and API GET. Remove fallback sprint creation from read paths, frontend defaults, and runtime startup. Existing valid sprints/milestones must survive; use a separate explicit migration to associate legacy records if necessary.

When there are no sprints, show one primary action: Create Sprint. The form has only Sprint Name and Sprint Description. Generate identity/order on the backend. Sprint course targeting is not a user input; targeting belongs to each milestone.

Once a sprint exists, show Add Milestone within that sprint. Its context supplies the sprint automatically. The form includes:

- Milestone Title;
- Target Course: All Courses or one active Course;
- Submission Deadline with date and time;
- Details and Instructions;
- Attached Document;
- attachable rubric/template;
- optional late-submission penalty percentage.

Do not expose Milestone Type, Target Sprint, or Milestone# as manual fields. Generate stable milestone identity and display order server-side. Use a stable sprint reference so renaming a sprint does not disconnect milestones. Historical formation-milestone metadata may remain for compatibility; removing that UI must not accidentally break existing course formation deadlines/reports.

Create one milestone definition for its target scope; do not require Manager to create it separately for each group. All Courses covers valid groups across courses; a course-specific milestone applies only to groups enrolled in that course. Groups formed later inherit the applicable milestones through the same eligibility query. Do not manufacture separate group-task copies that drift.

Rubric criteria include stable IDs, descriptions/questions, marks/weights, and scoring levels consistent with the current 0–5 evaluation model. Preserve the current ability to configure a positive total of custom marks; do not impose a 100-point total unless the owner requests it. Validate scores and criterion coverage on the backend.

Allow milestone creation before attaching a rubric, but display Rubric Not Configured and disable grading until configured. Students may see instructions and submit eligible work without a rubric; never show fake/default criteria. Edit → Rubrics opens the attached rubric; if absent, it leads to rubric creation with return context preserved. Editing a template must not silently change an already-used milestone rubric or historical grades. Version/snapshot criteria and protect graded history.

Fallbacks: zero courses produces a setup action; deleted/invalid course or rubric references are validation errors; failed instruction upload retains form input; an orphan legacy milestone remains visible to Manager for explicit repair rather than being silently reassigned to a newly generated sprint.

## 8. Milestone access and synchronization across roles

Use one shared backend eligibility rule for milestone list, detail, attachment, submission, unsubmission, comments, grading, and workspace timelines:

- Student must have active membership in the relevant non-deleted group.
- Group must have valid canonical Course/Department relations.
- Milestone must target that Course or All Courses.
- Viewing is allowed for pending/rejected groups; submitting/grading requires final Manager approval under the stated default.
- Supervisor sees only their supervised groups and their applicable milestones/rubrics.
- Evaluator sees only explicitly assigned groups under existing permissions.
- Manager sees the scope they manage; preserve any existing oversight role restrictions.

Ungrouped students see a “Join or create a group” state and no group milestone content. Students in Course X cannot access Course Y tasks by guessing an ID, posting directly, or following an attachment URL. Deleted milestones/groups must not remain writable or leak into normal lists.

Every group member sees the same task, rubric, deadline, shared submission status, submitter, grade, and feedback. Submission by any one member satisfies the group's task; do not mark other members Missing. Preserve any intentional individual grading data separately from this shared completion state.

Reproduce and fix milestone internal-server errors with and without rubric templates and for pending and approved groups. Check ObjectId/datetime serialization recursively, null optional fields, legacy ID representations, missing group relations, and endpoint response shapes. Do not hide failures by returning an empty success list.

Treat database enrollment and membership as authoritative on requests. JWT supplies authenticated identity and role, not permanently frozen academic assignment. Refresh enrollment/profile/group data at login, relevant page entry, focus/visibility return, and after mutations; provide bounded polling or the existing event mechanism where one role must see another role's updates without signing out. Do not add heavyweight infrastructure solely for this task.

Scope caches by authenticated session/user where necessary, preserve logout/login cache clearing, and invalidate all dependent resource families after changes. Fresh responses must update mounted components, not only the invisible cache. Prevent old in-flight responses from repopulating a new user's cache or overwriting newer state. Use an explicit refresh path for enrollment, approval status, deadlines, and other permission-sensitive data.

## 9. Shared uploads, deadlines, and cancellation

Keep exactly one active submission per `(group_id, milestone_id)` with a database uniqueness constraint and explicit version/conflict handling for simultaneous submissions by different members. Record submitter identity, server receipt time, file metadata, revision history where needed, and the applicable deadline/penalty policy version.

Show the states Not Submitted, Uploading, Submitted On Time, Submitted Late, Unsubmitted, and Graded. Group approval gating should be an additional permission state, not a fake upload result.

Any current group member can submit. Before the deadline and before grading, any member can unsubmit or replace the active group submission with confirmation and an audit record. Other members must immediately see the shared state. Preserve immutable grading safeguards.

Support cancelling an in-progress upload. Distinguish transport cancellation from unsubmission of an already accepted server record. If a response is lost or cancellation arrives after receipt, query the server before reporting success/failure; never promise a persisted submission was removed merely because the browser aborted.

After the deadline, deny changes/removal/replacement of an existing submission on both frontend and backend. A first late submission follows the penalty default. Do not allow resubmission to reset lateness. Changing a deadline must be validated and versioned; it must not rewrite already-final grades or silently unlock them.

Persist timezone-aware UTC instants and display deadlines using the application's locale/timezone, with Asia/Karachi as the local project default. Do not interpret a browser `datetime-local` value as UTC without conversion. Define an explicit compatibility interpretation for legacy date-only/naive values and flag ambiguous records rather than treating parse failure as “on time.” Server time determines eligibility, including when an upload crosses the deadline while in flight.

Validate file type and size consistently using existing storage limits. A failed/cancelled replacement must leave the previous valid submission intact. Commit the database record only after successful storage; clean orphan temporary uploads on failure. Do not delete referenced files before the replacement link commits. Recheck membership, target eligibility, approval, and deadline at commit time.

## 10. Supervisor grading and automatic penalties

The required flow is:

`Manager creates Sprint → creates Milestone → attaches Rubric → group members and Supervisor see it → any eligible member submits → assigned Supervisor grades the group → all authorized roles see the result.`

Enable grading for the actual Supervisor (`teacher` role), with group-assignment checks. Do not simply relabel evaluator pages or grant every teacher/evaluator grading rights over every group. Reuse or factor the existing grading calculation/validation, and return canonical results to student, teacher, evaluator where authorized, and Manager views.

Use only Manager-configured milestone criteria for the required group grade. Preserve existing independent evaluator workflows unless expressly changed; do not mix custom evaluator marks into the supervisor score without a documented policy. Snapshot the rubric used for a final grade, reject incomplete/out-of-range/unknown criterion scores, and preserve locked evaluations and audit history.

Manager can enable/edit the milestone's penalty through Edit before grading. Reject invalid percentages instead of silently clamping. Notify eligible users when published deadline/penalty instructions change. Preserve the applicable policy snapshot for existing submissions; penalty changes apply prospectively to new submissions/replacements and must not silently revise recorded academic results.

For the proposed percentage rule:

`raw_score = sum((criterion_score / 5) × criterion_marks)`

`deduction = raw_score × penalty_percent / 100` if late; otherwise `0`.

`final_score = max(0, round(raw_score - deduction, 2))`.

Example: 80 earned marks and a 10% late penalty produce an 8-mark deduction and 72 final marks. Store/display raw score, applicable penalty, deduction, final score, and maximum possible score. Apply deduction exactly once on the backend, with the same breakdown in every role and export. Pending grading shows lateness/policy without inventing marks.

## 11. Private milestone comments

Add a private comment thread in milestone detail addressed explicitly to either the assigned Supervisor or the Manager who created the milestone. Persist `created_by` for milestones and resolve legacy missing creators explicitly.

Under the privacy default, only the student sender, selected recipient, and their authorized replies can read that conversation. Do not expose it to unrelated groups, other team members, evaluators, or the other recipient by default. Keep private comments distinct from group-visible grade feedback. Enforce privacy on list/detail/write paths and notifications, not just UI filtering.

Record author, recipient, group, milestone, message, and timestamps. Comments do not count as submissions or modify grades. Validate empty/overlong content, show pending/failure/retry state without duplication, and retain the comment input on failure. If the intended recipient is missing/unavailable, explain that state instead of redirecting a private message to an arbitrary person.

## 12. Announcements in the shared Navbar

Place the shared notification bell beside the profile dropdown for every supported authenticated role. Clicking opens an accessible dropdown with the latest authorized announcements, unread badge/count, clear unread styling, and individual open/read behavior. Opening the bell alone must not mark every item read.

Show More opens a dedicated role-appropriate announcements/history page, not a dashboard. Add the actual routes/API access needed because these pages are not currently present. History is newest-first, paginated or incrementally loaded, and distinguishes read/unread. Provide explicit Mark All Read for accessible items only if included in the UI. Preserve Manager announcement authoring and existing targeted announcements.

Use persistent per-user read timestamps via the existing view collection. Read state must survive refresh/sign-out and must not derive solely from “recent since login.” Apply audience and role restrictions to feed, count, history, detail, mark-read, and links for every role. Do not broaden department/group announcements to everyone while adding read tracking.

Move desktop announcement reading/history into this bell/history flow; avoid duplicated competing dashboard feeds. Keep mobile access usable. Handle no announcements, failed load with Retry, failed read-state updates without a false success, outside-click/Escape closing, keyboard focus, and accessible labels. Do not mark all announcements globally read for one user.

## 13. Remove Exhibition Day Final Evaluation

Remove the Exhibition Day Final Evaluation feature across the application: navigation, routes, pages/forms/cards, backend route registration and handlers, exhibition-specific statistics, export columns, active documentation, and obsolete tests/imports. Remove stale frontend links rather than leaving dead navigation.

Keep general evaluator onboarding, assignments, rubric-based milestone scoring, supervision, and meetings. These remain required independently of exhibition. Historical exhibition records must not be silently deleted; retain them as inactive history or document an explicit archival migration. Test that retired endpoints are unavailable and that the surviving evaluator/supervisor workflows still work.

## 14. Shared layout, action menus, and back navigation

Make `/manager/iterations`, `/manager/rubric-templates`, and `/manager/iterations/submissions` use the same page container width, responsive gutters, header structure, and tab placement. Preserve selected filters/return context where practical. Match the existing Iterations page dimensions through a shared class/component rather than separate copied pixel values.

Replace the oversized Submission Progress panel for late formations, ungrouped defaulters, and late submissions with compact useful counts/filters and the existing actionable submission list. Removing that visual panel must not remove working late-status calculations, reporting, or authorized grading.

On milestone/deliverable cards, remove the standalone “+ Attach the Rubric Criteria” action. Put Edit, rubric management, saving within the editor, and Delete within the consistent Edit flow across screen sizes. Keep destructive confirmation; actions must be discoverable and keyboard accessible. Do not auto-save incomplete edits merely because the action menu closes.

Show date/time normally on laptop/desktop. On small screens, show an accessible `i` button that opens deadline/date/time details on tap and keyboard activation, not hover alone. Use readable cards/scrollable tables, compact controls, adequate touch targets, and no page-wide horizontal overflow. Keep proposal/files/rubrics reachable on mobile.

Create a reusable Back control matching `/manager/groups/broadcast` (`btn btn-back`, ArrowLeft, destination label). Use it wherever a Back button exists and add it to detail/add/edit/history/trash pages reached from a main page. Use the correct parent destination as a fallback for direct links; do not rely only on `navigate(-1)` when history might lead outside the app. Do not add redundant Back controls to top-level dashboards/lists.

Use the existing design variables, loading/empty/error components, dialogs, and toasts consistently. Ensure modal focus, labelled inputs, visible focus states, accessible errors/status announcements, readable contrast, and predictable destructive-action placement.

## 15. System-wide fallback contract

Every changed workflow needs Loading, Ready, Empty, Validation Error, Permission/Conflict Error, and Network/Server Error states where applicable. Use the existing response envelope (`success`, `message`, `data`, `errors`) and add machine-readable error codes only compatibly.

Use consistent statuses: 400 malformed input/IDs, 401 authentication expiry, 403 denied action, 404 missing or inaccessible resource according to the established privacy policy, 409 state/dependency/version conflict, 422 field validation, and 5xx unexpected failures. Log unexpected failures safely and return a helpful message; do not expose secrets or internal tracebacks.

Preserve form values on failures. Disable duplicate actions while processing. Reconcile server state after ambiguous failures, then retry only safe/idempotent operations. Show the latest authoritative state when another user has changed membership, proposal version, capacity, deadline, approval, or submission. Never fall back to fabricated enrollment, empty-success responses, broad unauthorized lists, or optimistic success after a failed write.

Email/notification failure must not roll back a valid academic action or cause duplicate creation. Record delivery failure and support retry separately. File/database partial failures must preserve valid existing references and clean temporary orphans. Use MongoDB transactions when supported; if unavailable, implement guarded operations and compensating cleanup appropriate to the existing deployment rather than leaving half-linked records.

## 16. Implementation order and migration discipline

Implement in this dependency order:

1. Record baseline behavior, changed working-tree files, role permissions, API contracts, and failing scenarios.
2. Establish canonical academic relations, student field allowlists, dependency checks, and compatible serializers.
3. Fix enrollment freshness, immutable group identity, joining order, proposal storage/editing, and group creation/invitation eligibility.
4. Implement proposal-version-aware Supervisor → Manager review and the total four-group cap.
5. Repair Manager list/workspace mappings, pending-group access, proposal visibility, and request-error states.
6. Remove GET-time sprint seeding; implement stable Sprint → Milestone → Rubric association and targeting.
7. Apply shared milestone authorization/freshness; implement group submissions, cancellation/unsubmission, deadline locking, and private comments.
8. Enable assigned Supervisor grading and one-time penalties with canonical cross-role results.
9. Complete notification bell/history, contextual recycle bins, shared layout/action menus/back controls, and exhibition removal.
10. Run regression checks, inspect responsive workflows, and document migration/remaining limitations.

Schema/data migrations must be explicit, idempotent, previewable, and bounded. Preserve old identity and valid academic history. Audit legacy name/code references, missing enrollment, mixed ObjectId/string IDs, proposal metadata, creator/join order, sprint links, deadline formats, and orphan assignments. Report ambiguous mappings for Manager correction rather than guessing. Do not automatically erase existing sprints, rename all groups, revoke assignments, or rewrite final grades.

## 17. Acceptance and regression verification

Add meaningful tests for business rules, direct API bypass attempts, data contracts, and race-sensitive behavior. Update existing tests that intentionally assert the old behavior, especially editable student/group names, section restrictions, per-course supervisor cap, and exhibition endpoints. Preserve tests for unaffected functionality; do not delete failing tests merely to obtain a green result.

Required scenarios:

1. New student creation and bulk import reject missing Full Name, Roll, Session, or Department; valid creation preserves existing activation/login/password flows.
2. Every role and relevant endpoint rejects Name mutation; the name remains unchanged. Student cannot override an assigned Department/Course. Manager can correct an ungrouped student's academic fields but cannot break grouped enrollment.
3. Each parent deletion is blocked with meaningful dependencies; a childless entity can be soft-deleted/restored. Permanent deletion/restore cannot bypass retained relations.
4. Internal evaluator domain/type-specific requirements and ownership verification work; external company/post survive create/read/edit. Invalid type switching fails clearly.
5. Manager enrollment changes become visible to a logged-in student through refresh/revalidation without a new login; old JWT claims do not override database enrollment.
6. Missing enrollment prevents group creation until valid selection is persisted. Cross-course invitations fail at send and acceptance; same-course students from different Sections are eligible. Concurrent acceptance cannot overfill a group or double-enroll a student.
7. New group identifiers are unique/automatic/immutable. Creation retries and partial invitation/request failures do not produce duplicate groups. Proposal appears consistently to students, Supervisor, and Manager.
8. Joining order remains stable after leadership transfer; the current user alone gets blue highlighting; supervisor cards remain compact.
9. Supervisor sees the full versioned request, accepts/rejects with correct rights, and cannot accept a fifth active group across courses even concurrently. Manager cannot approve before current Supervisor acceptance.
10. Pending/rejected/approved group workspaces all load; valid Department/Roll/Course values display; network failure shows Retry rather than a fabricated 404.
11. Zero-sprint GET and filtered-empty GET are read-only. Deleting the last childless sprint leaves zero. Sprint deletion with milestones is blocked. Existing milestones survive the migration.
12. Sprint creation has only Name/Description; milestone sprint/order are assigned automatically. Targeting, attachment and rubric-return flows work.
13. Pending/approved groups see applicable milestones without serialization errors; ungrouped/non-target users cannot list, read, download, comment on, submit to, or grade another course's milestone.
14. Any approved group member can submit; everyone sees one shared completion. Concurrent uploads do not create duplicate active submissions or silently overwrite each other.
15. In-progress cancellation, pre-deadline unsubmission/replacement, failed replacement, response-loss reconciliation, first late submission, and post-deadline locking behave according to the stated rules. Test timezone conversion, exact deadline boundary, and invalid legacy dates.
16. Assigned Supervisor grades only their own eligible groups using the attached rubric. Missing rubrics disable grading. Snapshot/locked results, penalty math, one-time application, feedback, and exports agree across roles.
17. Private comments are readable only by the sender/selected recipient; notifications and direct API calls do not leak them.
18. Bell unread counts/read persistence/targeting/Show More history work for each supported role. Opening the dropdown does not mark everything read.
19. Exhibition UI and API are retired while evaluator accounts, assignments, milestones, supervision, and meetings still work.
20. The three Manager iteration pages have consistent widths on mobile/laptop, action menus contain required controls, contextual recycle bins work, and standardized Back buttons handle direct links.
21. Existing sign-in/session isolation, password setup/change, course group limits, invitations/join requests, targeted announcements, attachments, reports/exports, and unaffected role access remain operational.

Use the existing frontend build/lint scripts and backend pytest suite with a verified isolated test database. `backend/tests/conftest.py` selects `pbl_system_test` and clears collections; confirm the effective database before running. Never run it against application data. Record exact commands/results, any pre-existing failures, environment limitations, and responsive/manual verification. Do not claim tests or migrations passed when they were not executed.

## Completion report

Provide: implemented behavior grouped by user flow; relevant files/API/data changes; migration steps and preview results; policy defaults used; tests/build/lint and manual verification results; preserved behavior; and any genuinely unresolved blocker. Include a compact requirement-to-evidence checklist. Finish each authorized implementation stage completely, and clearly distinguish implemented, tested, and still-unverified work.

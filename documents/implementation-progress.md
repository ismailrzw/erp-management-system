# Implementation report

## Scope and preserved behavior

Implemented the workflows in `implementation-prompt.md` within the existing React/Vite, Flask/RESTx and PyMongo architecture. Existing role names, authentication, password setup/change, single-course enrollment, invitations/join requests, evaluator marking and meetings, announcements, general resources, reports and exports remain in place. Existing staged changes were preserved; no reset, reseed, mass group rename, assignment revocation or final-grade rewrite was performed.

## Delivered user flows

### Student records and academic relationships

- Creation and bulk import require Full Name, Roll Number, Academic Session and active Department. Optional Course must belong to that Department.
- Name, Roll, generated institutional Email and Academic Session are immutable. Student profile settings retain recovery-email/password management. Manager Student Edit includes Department and filtered Course corrections before retained group membership; grouped academic reassignment is blocked.
- New records store stable parent IDs alongside compatible Department codes and Course names. Reads support existing ObjectId/string relationships.
- Shared dependency checks protect soft/permanent deletion and parent/code/name changes. Restoration requires active parents and rejects reused identities. Academic writes use an expiring, renewed MongoDB lease across workers to coordinate child creation, assignment and parent deletion on standalone MongoDB.
- Delete is inside Edit for Students, Departments, Courses, Teachers and Evaluators. Recycle bins are reached from their lists rather than dashboard menus.

### Group formation, enrollment and proposal review

- Current enrollment comes from the database, including focus/online/periodic revalidation. Session/cache guards prevent an old account's response from contaminating a new session.
- Existing Course/Department assignments are read-only during creation; missing assignments require valid selection and persistence. Stale group markers cannot reveal another group's workspace.
- Creation requires a Project Title and proposal document; identifiers are generated uniquely as `grp-YYYY-NNN`. Sections do not define groups. Legacy identifiers remain unchanged.
- The creation result offers invitations and Supervisor requests. Invitations become membership only on acceptance; Course/Department and membership/capacity are rechecked at acceptance. Stored joining order is preserved, and the current user gets the blue highlight.
- Edit Proposal changes title, scope and attachment, with version conflicts and preserved inputs. Revisions and membership changes invalidate stale review dossiers. Approved/academically locked membership cannot be changed; open member-removal controls are removed.
- Supervisor requests include the versioned proposal, title, ordered members and optional message. Supervisor acceptance precedes Manager approval. Both steps validate current academic relationships and proposal requirements.
- Supervisor capacity is four active groups in total. Concurrent acceptance cannot claim a fifth place. The assigned Supervisor remains eligible to review revisions of an existing project at capacity.
- Pending, rejected and approved Manager workspaces load with correct member fields, proposal, deliverables and timeline. Members occupy the left column; proposal/activity/timeline occupy the right. Missing and network states are distinct and offer appropriate recovery.
- Manager workspace offers a verified correction for incomplete legacy group associations. All current members must already share the chosen active Course/Department; valid Course moves and changes conflicting with retained academic work are blocked. Previous values are recorded.

### Sprints, milestones, rubrics and submissions

- Sprint GET is read-only. No automatic default sprints are created; deleting the last empty sprint leaves zero. Retained milestones block Sprint deletion.
- Sprint creation/editing presents Name and Description. Add Milestone carries stable Sprint context and assigns milestone order automatically. Milestones support Course/all-course targeting, deadline, instructions, document, rubric and late penalty.
- Rubric creation can return to and attach to the originating milestone. Retry preserves a created template instead of duplicating it. Graded milestone policy/criteria are locked.
- Shared eligibility governs list/detail/download/comment/submission/grading access. Every valid group member can view matching milestones while pending/rejected; Manager approval remains required to submit or grade. Ungrouped and non-target students cannot access another group's work.
- Any approved member submits the group's shared work. Active submissions are unique per group/milestone. Replacements require the current submission ID, preserve history and compensate failed file writes.
- Browser upload cancellation reconciles server state. Any member can unsubmit/replace ungraded work before the deadline. First late submission is accepted; an existing submission cannot be changed or removed after the deadline. Invalid historical deadlines disable submission and request Manager correction.
- Assigned Supervisors grade using Manager-defined criteria. Submission deadline/penalty and grading rubrics/results are snapshotted; final grades are locked. A one-time 10% penalty on 80 earned marks yields 72, with raw/deduction/final values shared across roles and exports.
- Missing historical submission policy requires explicit Manager confirmation before new Supervisor grading. Existing grades are preserved.
- Private comment threads connect a student to the selected assigned Supervisor or creating Manager. Other members/staff cannot read the thread; retries use a client key to avoid duplicates.
- Academic downloads use authenticated requests and scope checks. Unpublished milestone uploads are private; general Manager resources retain their existing publication behavior. Referenced attachments cannot be deleted.

### Notifications and interface consistency

- Shared notification bell and paginated history serve every supported authenticated role, with audience filtering, unread styling/counts and persistent per-user read state. Show More opens role-specific history; opening the bell does not mark everything read. Read changes refresh the bell immediately.
- Desktop student announcement reading is reached through the bell/history. Manager announcement authoring remains available.
- Manager Iterations, Rubrics and Submissions share page width, compact controls and responsive layouts. Edit menus contain milestone/rubric/delete controls. Mobile date/time details use an accessible information control.
- Shared Back styling and a reusable Back component cover existing Back controls and relevant child/profile/history/trash pages with explicit parent destinations. Dialogs receive focus, trap Tab, restore focus and support Escape.
- Active Exhibition UI/API/navigation are retired. Historical exhibition collections and independent evaluator assignments, grading and meetings are retained.

## Policy defaults applied

- The edited prompt's explicit immutable Academic Session requirement takes precedence over its earlier paragraph permitting Session correction.
- Students have one Course. Manager academic corrections occur before membership; legacy association repair cannot move a valid existing Course.
- Four supervised groups in total, including groups awaiting Manager approval; pending requests do not reserve places.
- Pending/rejected groups view relevant milestones; approved groups submit/receive grades.
- Late penalty is one deduction from earned marks, recorded on submission and grading. First late submission is allowed; replacement/unsubmission closes at the deadline or grading.
- Proposal editing is leader-only before approval, with versioned Supervisor then Manager review. Unknown legacy creators, enrollment or policy are never guessed.

## API and data additions

The existing role-specific API URLs remain. Additions include `/api/student/groups/enrollment`, group milestone unsubmission/comments, `/api/workflow/groups/<group_id>/milestones/<task_id>` review/grade/comments/historical-policy confirmation, `/api/files/submissions/<id>`, `/api/notifications` and read actions, and Manager group `academic-link` correction.

New compatible fields include parent IDs, immutable group creator/joining order, proposal/review versions, milestone creator/Sprint IDs, submission snapshots, Supervisor group grades and private comment recipients. History collections preserve replacements, milestone policy changes and verified relation corrections.

## Data migration and legacy review

`backend/seed/audit_academic_relations.py` previews bounded, unambiguous reference backfills. It identifies ambiguous parents/Sprint links, missing proposals/creators/submission policy, over-capacity Supervisors and orphan assignments. It does not manufacture enrollment, rename groups, seed sprints or rewrite grades. `--apply` records prior values and writes missing fields conditionally; existing values and concurrent corrections are preserved.

Application database `pbl_system` was inspected read-only: **6 unambiguous backfills and 7 review issues**, all involving missing/ambiguous Department associations. No application backfill was applied. The preview is in `.qa/application-academic-plan.json` (local, ignored by Git).

A disposable local QA database was used to verify applying five backfills and repeating the preview: **0 remaining backfills**, with the missing-proposal review issue preserved. No ambiguous values were changed.

From `backend`, use the configured URI in `.env` (or an explicit appropriate `--uri`) and an explicit database name:

```powershell
venv/Scripts/python.exe seed/audit_academic_relations.py --database pbl_system --output ../.qa/academic-plan.json
```

Review the plan and database backup before deliberately running the same command with `--apply`. Correct unresolved enrollment/proposals through authorized Manager workflows; a group with conflicting member enrollment or retained historical work needs a separately reviewed data correction.

## Verification and requirement evidence

All backend tests used explicit isolated `mongodb://localhost:27017/pbl_system_test`; fixtures guard the database name and mock email delivery. Application data was not cleared. Earlier incompatible expectations were updated for immutable identities, required proposals, automatic group identifiers, active parents, total Supervisor capacity and exhibition retirement; unaffected tests remain.

- Full backend suite: **256 passed**, zero failures (`venv/Scripts/python.exe -m pytest tests/ -q --tb=short --maxfail=10`).
- Latest workflow/download/Teacher regression run: **25 passed** (`tests/test_complete_workflow.py tests/test_attachments.py tests/test_teacher_portal.py`). Assigned-Supervisor re-review at capacity: **1 passed**. Title-only multipart proposal edit, stale-version conflict and invalid replacement-document preservation: **1 passed**.
- Backend Ruff: passed, including the final repeat. Baseline had 35 errors.
- Frontend ESLint: passed. Baseline had 22 errors.
- Production Vite build: passed. Existing large-bundle warning remains.
- `git diff --check`: passed.
- Headless browser: **30 checks** at 1366×768 and 390×844, zero page-wide overflow, including populated Manager milestones/workspace, Student creation/group/milestone detail/history, Teacher/Evaluator dashboards/history. Additional actions verified unclipped Edit menus, two-field Sprint editor/focus/Escape and notification read persistence/bell synchronization/Show More.
- The native computer-use helper failed to initialize on this machine. Browser checks used installed Edge with disposable profiles, isolated QA accounts/database and a project-local CDP test script. Screenshots/report are in `.qa/`; this does not claim a complete manual test of every dialog.

| Prompt requirements | Implementation and evidence |
|---|---|
| 1–2: student restrictions, deletion hierarchy | Student schemas/services, shared academic integrity checks, entity Edit dialogs; student/bulk/course/academic regression tests |
| 3: evaluator types and verification | Type-specific evaluator forms/service, institutional activation; evaluator and workflow tests |
| 4: Manager pending workspace and layout | Canonical member/proposal/timeline mappings, scope/error states; workflow tests and laptop/mobile checks |
| 5: bell/history | Shared notifications API, bell and history; audience/read tests and browser action checks |
| 6–8: creation, sync, proposal identity/review | Enrollment freshness, immutable IDs, invitations, versioned review and total cap; group/workflow/concurrent-acceptance tests |
| 9, 13–14: Sprint/milestone/rubric/submission/penalty | Stable associations, targeting, shared submissions, deadline locks, group grading/comments; iteration/rubric/submission/workflow tests and responsive checks |
| 10: members and Supervisor sizing | Joining-order resolution, current-user highlight, compact cards; group tests and screenshots |
| 11–12: Back and recycle-bin navigation | Shared Back control/styles and contextual entity trash routes; lint/build and route inspection |
| Exhibition retirement and preserved features | Retired routes/UI with retained history; full authentication/role/evaluator/meeting/report regression suite |

## Practical limits

Seven legacy records still require verified academic-data correction. They are reported rather than silently guessed. Real outbound email delivery and every network/response-loss timing were not exercised against live providers; mail is mocked in tests. A browser cancellation can stop the client upload but cannot undo a request already committed by the server, so the UI reconciles and offers unsubmission where allowed. The production bundle still reports the existing chunk-size warning.

# Code review notes for the enhanced prompt

This is a source-based review supporting `implementation-prompt.md`, not a runtime audit or an implementation of the requested features. Application source files were left unchanged. Existing staged changes were present when the review began and were preserved.

## Review coverage

The review inventoried the backend application and frontend source tree, including routes, role boundaries, models, schemas, services, API adapters, authentication/cache behavior, shared layout/components, and pages. It examined the core student, group, supervisor, Manager workspace, sprint/milestone, announcement, and grading code in detail and inspected relevant test fixtures and test cases. It did not execute the application, connect to the project database, inspect private environment values, or verify live browser behavior. An inventory and targeted source review are not a guarantee that every line of every module is correct.

## Concrete findings

| Finding | Source | Consequence for the prompt |
| --- | --- | --- |
| README stack/structure examples differ from actual dependencies and role-specific code | `README.md`, `frontend/package.json`, `backend/app/__init__.py` | Implement against the current architecture, not README assumptions |
| Session/Department are optional on student creation; Manager update exposes Name and omits Department | `backend/app/schemas/student_schema.py` | Update individual/bulk validation and both edit surfaces together |
| Manager service does not protect Name; own-profile service allows Name | `backend/app/services/student_service.py`, `student_profile_service.py` | Enforce immutable Name with explicit backend allowlists |
| Student deletion pulls `member_ids` rather than blocking grouped deletion | `backend/app/services/student_service.py` | Replace automatic unlinking with dependency conflicts |
| Course soft deletion checks active groups, while permanent deletion lacks the same dependency check | `backend/app/services/course_service.py` | Apply integrity checks to soft/permanent paths |
| Department, Teacher, and Evaluator deletion lack comprehensive child checks | corresponding services | Add consistent relation checks and restore validation |
| Group creation permits supplied display names and unresolved course enrollment; proposal upload already exists | `backend/app/services/group_service.py` | Reuse upload/naming infrastructure and enforce valid enrollment/name immutability |
| Member enrichment uses database query order; Manager resolver sorts leader first, then Name | group and manager group services | Persist/reconstruct creator/joining order, independent of leadership |
| Existing supervisor capacity is per Course | `backend/app/services/supervisor_service.py`, `backend/tests/test_sprint5_features.py` | Label total four-group cap as a proposed policy change and update old tests |
| Incoming Supervisor request summary lacks full members/proposal enrichment; accepted request assigns group but does not enforce the full Manager review sequence | `backend/app/services/supervisor_service.py`, `manager_group_service.py` | Define complete versioned request and approval prerequisites |
| Workspace service permits pending groups already | `backend/app/services/manager_group_service.py` | Investigate contracts/serialization/error handling, not just approval filtering |
| Workspace returns `group`, `members`, `timeline`, while frontend expects additional fields | same service; `ProjectDetailWorkspace.jsx` | Define one response contract with proposal/submission/grade sections |
| Workspace member rendering uses `roll_no`, backend resolves `roll` | `ProjectDetailWorkspace.jsx`, `_resolve_group_members` | Correct field mapping instead of displaying N/A |
| Main group list renders `course_name`, backend returns `course` | `ManageGroupsPage.jsx`, `manager_group_service.py` | Correct Course column mapping |
| Workspace treats absent data after any failed fetch as record unavailable | `ProjectDetailWorkspace.jsx` | Separate 404 from network/permission/server errors |
| Sprint GET writes default sprints when its result is empty | `backend/app/blueprints/manager/sprints.py` | Remove GET-time seeding, including filtered-empty behavior |
| Milestones link to sprint names and forms expose manual sprint/order/type fields | Manager sprint/iteration blueprints; `IterationFormModal.jsx` | Use stable sprint context and generated order without deleting existing milestones |
| Student milestone list trusts existing JWT Course first; approved group lookup is repeated; detail/submit lack consistent targeting checks | `backend/app/blueprints/student/iterations.py` | Use fresh enrollment and uniform authorization for every task operation |
| Nested milestone ObjectIds such as template IDs are not consistently converted by local formatters | Manager/student iteration blueprints | Test recursive serialization as a possible 500 cause; runtime cause remains unverified |
| Submission endpoint upserts group task files without deadline replacement locks or unsubmission | student iteration blueprint | Add shared versioned submission lifecycle and backend deadline enforcement |
| Naive datetime-local deadlines are labelled UTC; invalid deadline parsing defaults to on time | `is_submission_late` | Specify timezone conversion and explicit invalid-date handling |
| Teacher group API supplies oversight, while grading endpoint is evaluator-only | `backend/app/blueprints/teacher/groups.py`, `evaluator/evaluations.py` | Add scoped Supervisor grading without conflating Teacher and Evaluator |
| Manager timeline reads `student_evaluations`, evaluator grading writes `evaluations` | manager group service; evaluator evaluations | Unify result presentation without averaging incompatible records |
| Percentage penalty metadata exists, but required one-time milestone deduction needs an explicit policy and implementation | iteration models/Manager blueprint; grading code | Define formula, policy snapshots, and cross-role result contract |
| Current bell points at dashboards; recent/read behavior is student-focused | `Navbar.jsx`, `announcement_service.py` | Extend existing read store and add actual history routes for supported roles |
| Cache stale revalidation updates the cache without notifying mounted consumers | `frontend/src/api/client.js`, `apiCache.js` | Require visible revalidation and permission-sensitive freshness |
| Login/logout already clear the API cache | `AuthContext.jsx` | Preserve working session isolation while fixing freshness |
| Exhibition is an entire registered evaluator module | evaluator blueprint imports/routes; `App.jsx`, sidebar, evaluator pages | Remove feature comprehensively while retaining evaluator CRUD/other scoring |
| Rubrics/Submissions have different fixed containers | `RubricTemplatesPage.jsx`, `IterationSubmissionsPage.jsx` | Share Iterations page width and responsive layout |
| Existing tests explicitly allow old Name editing, group naming, per-course cap, and exhibition | backend tests | Intentionally revise changed expectations while preserving regression coverage |
| Test fixtures clear collections in `pbl_system_test` | `backend/tests/conftest.py` | Confirm isolated database before execution; do not use production data |

## Decisions made explicit

The enhanced prompt proposes Manager-only academic corrections before group membership, a total four-group supervision cap, pending-group task viewing with approved-only submission, a percentage-of-earned-score penalty, first late submission with later locking, current leader-only proposal editing, preserved approved-group freeze, and private sender/recipient comments. These policies resolve ambiguity; they are not claims that the current application already implements them.

The user's `/manager/groups/` reference is clarified as the list route; the existing individual workspace route is `/manager/groups/:groupId`.

No backend tests, frontend build/lint, migrations, or browser checks were run for this documentation-only task. The observed source risks are evidence for the implementation prompt, not a certification that those are the only bugs or that every reported runtime issue has been reproduced.

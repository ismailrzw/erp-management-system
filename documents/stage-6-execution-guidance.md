# Stage 6 — Execution Guidance Package
## PBL Management System · Beaconhouse National University
**Version:** 1.0
**Date:** 2026-08-05

---

# Part A: Git Workflow Guide

> [!NOTE]
> This guide assumes you have Git installed and have been added to the GitHub repository as a collaborator. Every command below is meant to be run in a terminal (Command Prompt, PowerShell, or Git Bash on Windows).

---

## A.1 First-Time Setup (Do This Once)

```bash
# Step 1: Clone the repository to your computer
git clone https://github.com/ismailrzw/erp-management-system.git
cd erp-management-system

# Step 2: Tell Git who you are (replace with your actual name and email)
git config --global user.name "Muhammad Ismail Rana"
git config --global user.email "ismail.rana551@gmail.com"

# Step 3: Check which branch you're on
git branch
# You should see: * main   (or * develop if it's been set up)

# Step 4: Create the develop branch (only one person does this — the team lead)
git checkout -b develop
git push -u origin develop

# Step 5: Everyone else: switch to develop
git checkout develop
git pull origin develop
```

---

## A.2 Starting Work on a New Task

**IMPORTANT: Never work directly on `develop` or `main`.** Always create a new branch for your task.

```bash
# Step 1: Make sure your develop is up to date first
git checkout develop
git pull origin develop

# Step 2: Create your feature branch from develop
# Format: feature/<sprint-number>-<what-you-are-doing>
git checkout -b feature/sprint0-decorators

# Step 3: Verify you are on the new branch
git branch
# You should see:  * feature/sprint0-decorators
```

---

## A.3 Saving Your Work (Commit and Push)

```bash
# Step 1: Check what files you have changed
git status
# You'll see: modified, new, deleted files

# Step 2: Stage the files you want to commit
# To stage specific files:
git add backend/app/utils/decorators.py
git add backend/app/utils/audit.py

# OR to stage ALL changed files (be careful — check git status first):
git add .

# Step 3: Commit your changes with a descriptive message
# Format: type(scope): description
git commit -m "feat(auth): add @role_required decorator with JWT role validation"

# Step 4: Push to GitHub
# First push (creates the remote branch):
git push -u origin feature/sprint0-decorators
# Subsequent pushes:
git push
```

---

## A.4 Opening a Pull Request (PR)

After pushing, open a PR to merge your feature branch into `develop`:

1. Go to `github.com/ismailrzw/erp-management-system`
2. You'll see a yellow banner: *"feature/sprint0-decorators had recent pushes — Compare & pull request"* → Click it
3. Set **base branch** = `develop` and **compare branch** = your feature branch
4. Fill in the PR template (title, description, checklist)
5. **Assign a reviewer** (another team member)
6. Click **Create Pull Request**

> [!WARNING]
> Do NOT click **Merge pull request** yourself. Wait for your reviewer to approve it, then the reviewer merges (or the team lead merges after approval).

---

## A.5 Reviewing a PR

When another team member asks you to review their PR:

1. Go to the PR on GitHub
2. Click **Files changed** tab → Read through the changes
3. For each file, check:
   - Does every route have `@role_required`?
   - Is there a `log_audit()` call for mutations?
   - No hardcoded passwords or secrets?
   - Is the logic clear and readable?
4. Leave comments on specific lines by clicking the **+** icon
5. When done: click **Review changes** → choose:
   - **Approve** — looks good, ready to merge
   - **Request changes** — there are issues to fix first
6. After approval: click **Merge pull request** → **Confirm merge**

---

## A.6 Updating Your Branch When `develop` Changes

If someone else merges to `develop` while you're working, you need to update your branch:

```bash
# Step 1: Save your current work (commit first if you haven't)
git add .
git commit -m "wip: saving progress before rebase"

# Step 2: Fetch the latest changes from GitHub
git fetch origin

# Step 3: Merge develop into your branch
git merge origin/develop

# OR (cleaner history) rebase:
git rebase origin/develop
```

---

## A.7 Resolving Merge Conflicts

A merge conflict happens when two people changed the same lines in the same file.

```bash
# After running git merge or git rebase, if there's a conflict:
# Git will tell you which files have conflicts
git status
# Look for "both modified" files

# Step 1: Open the conflicted file in your editor
# You'll see conflict markers like this:
# <<<<<<< HEAD
#     your version of the code
# =======
#     the other person's version
# >>>>>>> origin/develop

# Step 2: Edit the file to keep the correct version (or combine both)
# DELETE the conflict markers (<<<<<<, =======, >>>>>>>)
# Keep only the code you want

# Step 3: Stage the resolved file
git add backend/app/blueprints/auth/routes.py

# Step 4: Continue the rebase or commit the merge
git rebase --continue  # if you were rebasing
# OR
git commit             # if you were merging
```

---

## A.8 Tagging a Release

At the end of each sprint, tag a release:

```bash
# Sprint 0 done:
git checkout develop
git pull origin develop
git tag -a v0.0.1 -m "Sprint 0 complete: foundation and security"
git push origin v0.0.1

# Final release:
git tag -a v1.0.0 -m "Sprint 9 complete: production-ready PBL portal"
git push origin v1.0.0
```

---

## A.9 Common Git Commands Reference

| Command | What It Does |
|---------|-------------|
| `git status` | Show changed files |
| `git branch` | List all branches (current marked with *) |
| `git checkout develop` | Switch to develop branch |
| `git pull origin develop` | Download latest changes from GitHub |
| `git log --oneline -10` | Show last 10 commits |
| `git diff` | Show what you changed since last commit |
| `git stash` | Temporarily save unfinished work |
| `git stash pop` | Restore stashed work |
| `git reset --soft HEAD~1` | Undo last commit but keep changes |
| `git check-ignore -v backend/.env` | Verify .env is gitignored |

---

# Part B: Team Responsibilities and File Ownership

> [!NOTE]
> This is the recommended ownership. All team members can make small changes in each other's areas (e.g., fixing a typo). For significant changes to someone else's core files, always get their review.

---

## Ismail (F2023-551) — Backend Lead

**Primary ownership:**
```
backend/app/blueprints/auth/          → All auth routes
backend/app/blueprints/manager/       → All manager routes
backend/app/extensions.py             → Flask extension setup
backend/app/__init__.py               → App factory + blueprint registration
backend/app/utils/decorators.py       → @role_required
backend/app/utils/audit.py            → log_audit()
backend/app/services/                 → All service files
backend/seed/                         → Seed scripts
backend/wsgi.py                       → WSGI entry point
backend/gunicorn_conf.py              → Production config
```

**Secondary ownership:**
- Reviews all backend PRs for security (role checking, input validation)
- Responsible for MongoDB index setup (runs seed script)
- Manages the `.env` file and credential rotation

---

## Ramsha (F2023-027) — Frontend Lead

**Primary ownership:**
```
frontend/src/context/AuthContext.jsx  → Auth state management
frontend/src/services/api.js          → Axios instance
frontend/src/routes/AppRouter.jsx     → All routing
frontend/src/layouts/                 → DashboardLayout, Sidebar
frontend/src/components/              → All reusable components
frontend/src/pages/manager/           → All Manager pages
frontend/vite.config.js               → Vite config
frontend/tailwind.config.js           → Tailwind config
```

**Secondary ownership:**
- Reviews all frontend PRs for UI consistency and correct API usage
- Ensures components follow the established pattern (loading states, empty states, error toasts)

---

## Sara (F2023-744) — Frontend Pages

**Primary ownership:**
```
frontend/src/pages/student/           → All Student pages
frontend/src/pages/hod/               → HOD Dashboard and Reports
frontend/src/pages/dean/              → Dean Dashboard and Reports
frontend/src/pages/LoginPage.jsx      → Login page
frontend/src/components/forms/        → Form components
```

**Secondary ownership:**
- Responsible for ensuring all pages match the prototype visually
- Tests pages on mobile screen widths (375px)

---

## Ibrahim (F2023-630) — Backend + Testing + DevOps

**Primary ownership:**
```
backend/app/blueprints/evaluator/     → All evaluator routes
backend/app/blueprints/hod/           → All HOD routes
backend/app/blueprints/dean/          → All dean routes
backend/app/models/                   → All model constant files
backend/app/schemas/                  → All marshmallow schemas
backend/app/utils/validators.py       → Shared validation helpers
backend/tests/                        → All test files
backend/postman/                      → Postman collection
.github/workflows/                    → CI configuration
.github/PULL_REQUEST_TEMPLATE.md      → PR template
docker-compose.yml                    → Docker setup
README.md                             → Project README
docs/                                 → Project documentation
```

**Secondary ownership:**
- Runs `pytest tests/ -v` before every sprint release tag
- Responsible for CI staying green
- Documents new endpoints in Postman collection

---

# Part C: Risk Register

| Risk ID | Risk | Probability | Impact | Sprint(s) Affected | Mitigation | Contingency |
|---------|------|-------------|--------|-------------------|------------|-------------|
| R-01 | Live MongoDB credentials committed to Git history | **HIGH** (confirmed in audit) | **CRITICAL** | All | Rotate immediately; clean Git history with BFG Repo Cleaner | If credentials not rotated before any new push, abort all development |
| R-02 | Atlas M0 free tier storage limit (512 MB) hit during demo | LOW | HIGH | Sprint 9 | Monitor Atlas usage weekly from Sprint 3; compress uploaded files | Upgrade to M2 ($9/mo) or move to BNU on-premises MongoDB |
| R-03 | Render.com backend goes to sleep after 15 min inactivity (free tier) | HIGH | MEDIUM | Sprint 9 | Acceptable for demo — warn evaluators; add a "pinging" script | Upgrade Render to $7/mo paid tier 1 week before demo |
| R-04 | Team member unavailable for a sprint | MEDIUM | HIGH | Any | Assign tasks at sprint start; any abandoned task re-assigned by Sprint 0 | Re-scope the affected sprint; defer one feature to next sprint |
| R-05 | Race condition in join request accept not properly handled | MEDIUM | HIGH | Sprint 2 | Optimistic locking with `version` field (already designed) | Add pessimistic locking with MongoDB session transactions (MongoDB 4.0+) |
| R-06 | Bulk import file corrupts database if interrupted mid-import | LOW | HIGH | Sprint 1 | Per-row error handling; never partial silent insert | Wrap in try/except; log failed rows; do not abort successful rows |
| R-07 | Evaluation data lost if evaluation collection drops | LOW | CRITICAL | Sprint 4 | Evaluations are immutable and never deleted; Atlas M0 has no backup | Enable Atlas M0 cloud backups ($2.95/mo) before Sprint 4 |
| R-08 | JWT secret key rotation mid-semester logs out all users | LOW | HIGH | Any | Use a strong, stable JWT secret; never rotate mid-semester | Rotate only during downtime windows; communicate to all users before rotating |
| R-09 | Scope creep: supervisor requests unplanned features | MEDIUM | HIGH | Any | Point supervisor to this SRS; all new requests go through Change Request process | Document the new request; defer to v2 sprint if not in SRS |
| R-10 | Frontend CORS error blocking API calls | HIGH (early phases) | MEDIUM | Sprint 0 | Configure CORS in Flask with correct origin; use `proxy` in Vite config for dev | Temporarily allow `*` in dev; restrict in Sprint 8 |
| R-11 | `.env` file accidentally committed in a PR | MEDIUM | CRITICAL | Any | CI check: add a git-secrets step to scan for credential patterns in PRs | If committed: rotate all credentials immediately; scrub history |
| R-12 | Tailwind CSS classes not loading (config error) | MEDIUM | LOW | Sprint 0 | Verify `content` array in `tailwind.config.js` includes `./src/**/*.{js,jsx}` | Fall back to inline styles for Sprint 0; fix Tailwind before Sprint 1 UI work |
| R-13 | Docker compose fails on team member's machine (Windows path issues) | HIGH | MEDIUM | Sprint 0 | Document Windows-specific Docker settings in CONTRIBUTING.md; use WSL2 | All backend development can be done without Docker — use venv directly |
| R-14 | Postman collection outdated when evaluators test the API | MEDIUM | MEDIUM | Sprint 8 | Ibrahim updates Postman collection every sprint | Run a final pass before submission: test every endpoint in Postman |
| R-15 | Missing `@role_required` on a newly added route | HIGH | HIGH | Any | PR template includes security checklist; CI code analysis (stretch goal) | Manual audit script: `grep -r "def " backend/app/blueprints/ | grep -v "@role_required"` to find unprotected routes |

---

## Risk Response Plan for R-01 (Critical — Act Today)

1. **Ismail opens MongoDB Atlas** → Database Access → Edit `ismailrizwanrana_db_user` → Autogenerate new password → Update User
2. **Update `backend/.env`** on local machine with new password
3. **Verify** connection: `python seed/seed_manager.py` should connect and print success
4. **Check Git history:** `git log --all --full-history -- backend/.env`
   - If empty → `.env` was never committed. Safe. Move on.
   - If shows commits → Run: `pip install bfg` → `bfg --delete-files .env` on the repo → `git push --force` → All team members must re-clone
5. **Verify `.gitignore`:** `git check-ignore -v backend/.env`
   - Should output: `backend/.gitignore:1:backend/.env`

---

## Checklist: Before the First PR is Merged

- [ ] R-01: Atlas credentials rotated
- [ ] `backend/.env` not in Git history (check with `git log --all -- backend/.env`)
- [ ] `backend/.env` confirmed gitignored (`git check-ignore -v backend/.env`)
- [ ] All team members can `git clone` and run `docker-compose up` successfully
- [ ] All team members have been added as GitHub collaborators
- [ ] CI pipeline passes on the `develop` branch
- [ ] Sprint 0 acceptance criteria 100% complete

---

*End of Stage 6 — Execution Guidance Package*
*This completes the 6-stage documentation suite for the PBL Management System.*

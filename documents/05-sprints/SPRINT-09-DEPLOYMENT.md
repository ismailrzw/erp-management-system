# Sprint 9 — Deployment to Staging and Production
## PBL Management System · Beaconhouse National University
**Sprint Goal:** The system is live on a public URL. The Manager can log in from any internet-connected device. All 6 user roles can be tested on the deployed URL. The repository is clean, tagged as v1.0.0, and fully documented.
**FRs Covered:** NFR-PO-01, NFR-PO-02, NFR-PO-03 (Portability), NFR-R-01 (Reliability)
**Dependency:** Sprint 8 fully complete — production deployment requires security hardening done first.
**Owners:** Ismail (backend deployment), Ramsha (frontend deployment), Ibrahim (README + documentation), All team (production smoke test)

---

> [!IMPORTANT]
> Do NOT deploy until Sprint 8 is fully complete. Deploying with debug mode on, wildcard CORS, or missing rate limiting is a security risk. The checklist at the start of Sprint 8 must be 100% complete before any production deployment.

---

## Why Sprint 9 Exists

Development on localhost means nothing to BNU administration. Sprint 9 makes the system accessible:
- Supervisor can log in and review the live system
- External evaluators can access their accounts from any browser
- Students can use the portal from campus or home
- The team has a real URL to put in their project report

---

## Sprint 9 Tasks by Team Member

### Ismail — Backend Deployment (Render.com or BNU Server)

| Task ID | Task | Status |
|---------|------|--------|
| S9-BE-01 | Create a `develop` branch if not already created; merge all sprint branches into it | ☐ |
| S9-BE-02 | Create a Render.com account (free) → New Web Service → connect GitHub repo | ☐ |
| S9-BE-03 | Set Root Directory to `backend/` in Render settings | ☐ |
| S9-BE-04 | Set Build Command to `pip install -r requirements.txt` in Render settings | ☐ |
| S9-BE-05 | Set Start Command to `gunicorn -c gunicorn_conf.py wsgi:app` | ☐ |
| S9-BE-06 | Add all environment variables in Render Dashboard (see table below) | ☐ |
| S9-BE-07 | Trigger a manual deploy → wait for build to succeed | ☐ |
| S9-BE-08 | Test: `curl https://YOUR-RENDER-URL.onrender.com/api/auth/login -d '{}' -H 'Content-Type: application/json'` → should return 400 (missing fields), not 500 | ☐ |
| S9-BE-09 | Update `CORS_ORIGINS` env var with Vercel frontend URL (added after S9-FE-02) | ☐ |

---

### Ramsha — Frontend Deployment (Vercel)

| Task ID | Task | Status |
|---------|------|--------|
| S9-FE-01 | Create a Vercel account → Import Project → select GitHub repo | ☐ |
| S9-FE-02 | Set Root Directory to `frontend/` in Vercel settings | ☐ |
| S9-FE-03 | Set Build Command to `npm run build` | ☐ |
| S9-FE-04 | Set Output Directory to `dist` | ☐ |
| S9-FE-05 | Add environment variable in Vercel: `VITE_API_URL = https://YOUR-RENDER-URL.onrender.com/api` | ☐ |
| S9-FE-06 | Deploy → wait for build to succeed | ☐ |
| S9-FE-07 | Test: open Vercel URL in browser → Login page appears | ☐ |
| S9-FE-08 | Test: log in as Manager → Dashboard loads with real data | ☐ |

---

### Ibrahim — Documentation and Final Cleanup

| Task ID | Task | File(s) | Status |
|---------|------|---------|--------|
| S9-DOC-01 | Update `README.md` with live staging URL, team names, setup instructions | `README.md` | ☐ |
| S9-DOC-02 | Verify `documents/` folder in repo contains all Sprint documents | `documents/` | ☐ |
| S9-DOC-03 | Create `docs/manual-test-plan.md` — 20 test cases covering all 6 roles | `documents/manual-test-plan.md` | ☐ |
| S9-DOC-04 | Run the complete manual test plan on the live staging URL | Manual | ☐ |
| S9-DOC-05 | Tag the release: `git tag -a v1.0.0 -m "Sprint 9: production-ready"` | Git | ☐ |
| S9-DOC-06 | Push the tag: `git push origin v1.0.0` | Git | ☐ |

---

### All Team — Production Smoke Test

**Each team member logs in as their assigned test role and verifies their pages work on the live URL.**

| Tester | Role to Test | Key Checks |
|--------|-------------|------------|
| Ismail | Manager | Login → Dashboard → Add 1 student → Bulk import 3 students → View all → Approve a group |
| Ramsha | Student | Login → Browse Groups → Create Group → Send join request → View My Group |
| Sara | Evaluator | Login → View Assigned Groups → Submit evaluation form for one group |
| Ibrahim | HOD | Login → Dashboard shows dept stats → Groups table shows only own dept |

---

## Step-by-Step: Render.com Deployment

### Step 1 — Create the Service

1. Go to [render.com](https://render.com) → Sign Up (free)
2. Click **New** → **Web Service**
3. Connect your GitHub account → select `erp-management-system`
4. Fill in:
   - **Name:** `pbl-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn -c gunicorn_conf.py wsgi:app`
   - **Plan:** Free

### Step 2 — Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/pbl_system` |
| `JWT_SECRET_KEY` | (generate: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `FLASK_ENV` | `production` |
| `JWT_EXPIRATION_HOURS` | `8` |
| `CORS_ORIGINS` | `https://pbl-portal.vercel.app` (update after Vercel deployment) |
| `STORAGE_BACKEND` | `local` (update to `cloudinary` when ready) |

> [!WARNING]
> Never paste your MongoDB URI into any chat, commit, or public document. Only enter it in the Render environment variables dashboard.

### Step 3 — Verify Deployment

After the build succeeds (green checkmark), test the API:
```bash
# Should return 400 (missing body fields), not 500 (server error)
curl -X POST https://pbl-backend.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@bnu.edu.pk", "password": "wrongpassword"}'
```

Expected response:
```json
{"success": false, "message": "Invalid email or password."}
```

---

## Step-by-Step: Vercel Deployment

### Step 1 — Create the Project

1. Go to [vercel.com](https://vercel.com) → Sign Up (free, use GitHub)
2. Click **New Project** → Import `erp-management-system`
3. Fill in:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 2 — Set Environment Variables

In Vercel project settings → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://pbl-backend.onrender.com/api` |

> [!NOTE]
> In Vite, only variables prefixed with `VITE_` are accessible in the frontend code. Make sure `api.js` uses `import.meta.env.VITE_API_URL` as the base URL.

### Step 3 — Fix Frontend api.js for Production

```javascript
// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  // Uses environment variable in production, falls back to localhost in development
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pbl_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pbl_token');
      localStorage.removeItem('pbl_user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message || 'Request failed.';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

---

## Step-by-Step: BNU Production Server (If Available)

If BNU provides a Linux server, follow these steps. Ask your supervisor for:
- SSH access to the server
- Server IP address and username

```bash
# Step 1: SSH into the server
ssh username@SERVER_IP

# Step 2: Install dependencies (if not already installed)
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nginx nodejs npm git

# Step 3: Clone the repository
sudo mkdir -p /opt/pbl-backend
sudo chown $USER:$USER /opt/pbl-backend
git clone https://github.com/ismailrzw/erp-management-system.git /opt/pbl-backend

# Step 4: Set up Python virtual environment
cd /opt/pbl-backend/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Step 5: Create the environment file
sudo mkdir -p /etc/pbl-system
sudo nano /etc/pbl-system/.env
# Add: MONGO_URI=... JWT_SECRET_KEY=... FLASK_ENV=production ...

# Step 6: Create systemd service
sudo nano /etc/systemd/system/pbl-backend.service
```

**systemd service file content:**
```ini
[Unit]
Description=PBL Backend — Flask/Gunicorn
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/pbl-backend/backend
EnvironmentFile=/etc/pbl-system/.env
ExecStart=/opt/pbl-backend/backend/venv/bin/gunicorn -c gunicorn_conf.py wsgi:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Step 7: Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable pbl-backend
sudo systemctl start pbl-backend
sudo systemctl status pbl-backend   # Should show "active (running)"

# Step 8: Build and deploy frontend
cd /opt/pbl-backend/frontend
npm ci
VITE_API_URL=https://SERVER_IP/api npm run build

# Step 9: Configure Nginx
sudo nano /etc/nginx/sites-available/pbl-portal
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name SERVER_IP;

    # Serve frontend static files
    root /opt/pbl-backend/frontend/dist;
    index index.html;

    # React Router: send all unknown routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Gunicorn
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Step 10: Enable Nginx site and restart
sudo ln -s /etc/nginx/sites-available/pbl-portal /etc/nginx/sites-enabled/
sudo nginx -t    # Should print: syntax is ok / test is successful
sudo systemctl restart nginx
```

---

### S9-DOC-03: Manual Test Plan

Create `documents/manual-test-plan.md` with these 20 test cases:

```markdown
# Manual Test Plan — PBL Portal v1.0.0

## TC-01: Manager Login
- Open: https://pbl-portal.vercel.app/login
- Enter Manager credentials
- Expected: Dashboard loads with stat cards

## TC-02: Add Student
- Navigate to Students → Add Student
- Fill all fields → Submit
- Expected: Student appears in list with correct email (ROLL@bnu.edu.pk)

## TC-03: Bulk Import
- Download sample Excel → Upload → Submit
- Expected: Import results show (N imported, M skipped, errors list)

## TC-04: Soft Delete and Restore Student
- Delete a student → Check Recycle Bin → Restore
- Expected: Student returns to main list

## TC-05: Create Department
- Add Department "Computer Science" code "CS"
- Expected: Appears in departments list

## TC-06: Student Login
- Log in as a student → see dashboard showing "No group yet"
- Expected: Browse Groups page shows groups in student's section

## TC-07: Create Group
- Student creates group "AI Team"
- Expected: Group appears in Browse Groups with "Pending" badge

## TC-08: Join Request Flow
- Student B sends join request to Student A's group
- Student A (leader) accepts
- Expected: Student B appears in My Group member list

## TC-09: Manager Approves Group
- Manager approves a group with 2+ members
- Expected: Group status changes to "Approved"

## TC-10: Manager Assigns Evaluator
- Manager assigns evaluator to approved group
- Expected: Evaluator sees this group in Assigned Groups

## TC-11: Create Iteration with Rubrics
- Manager creates iteration → attaches 3 rubrics (weights: 40, 35, 25)
- Expected: Rubrics saved; weight total shows 100

## TC-12: Student Submits Iteration
- Student in approved group uploads PDF for iteration
- Expected: "Submitted on time" badge appears

## TC-13: Evaluator Scores Rubric
- Evaluator opens assigned group → scores each rubric 0–5 → submits
- Expected: Evaluation locked with total_weighted_score shown

## TC-14: Duplicate Evaluation Blocked
- Evaluator tries to submit again for same group + iteration
- Expected: Error message "You have already submitted..."

## TC-15: HOD Scoped Dashboard
- HOD logs in → Dashboard shows only their dept groups
- Expected: No other dept data visible

## TC-16: Dean University Dashboard
- Dean logs in → sees all departments in breakdown table
- Expected: All dept codes and counts shown

## TC-17: Create and Fill Survey
- Manager creates survey → publishes → Student fills all questions
- Expected: Survey shows "Completed" badge for student

## TC-18: Survey Report
- Manager opens survey report
- Expected: Shows total responses, mean per question, bar chart

## TC-19: Change Password
- Any user changes password → logs out → logs in with new password
- Expected: Login succeeds with new password

## TC-20: Print Export
- HOD clicks "Print / Export PDF"
- Expected: Browser print dialog opens; sidebar is hidden in print preview
```

---

## Sprint 9 Acceptance Criteria

### Staging Deployment
- [ ] Frontend live at Vercel URL — login page renders
- [ ] Backend live at Render URL — `/api/auth/login` responds (even if with an error for wrong credentials)
- [ ] Manager can log in on the live URL
- [ ] All 6 roles can log in on the live URL
- [ ] `CORS_ORIGINS` is set to the Vercel URL — no CORS errors in browser DevTools

### Production BNU Server (If Available)
- [ ] `systemctl status pbl-backend` shows `active (running)`
- [ ] Nginx serves the frontend and proxies `/api` to Gunicorn
- [ ] System accessible at BNU server IP

### Documentation
- [ ] `README.md` has the live URL, team names, supervisor name, setup guide
- [ ] `documents/` folder in repo contains all 12 sprint and stage documents
- [ ] Manual test plan exists and all 20 test cases have been run and passed
- [ ] Release tagged `v1.0.0` and pushed to GitHub
- [ ] Git history contains no `.env` files (`git log --all -- "backend/.env"` is empty)

---

## Common Beginner Mistakes to Avoid

| Mistake | How to Avoid |
|---------|-------------|
| Render build fails — module not found | Make sure `requirements.txt` is up to date: run `pip freeze > requirements.txt` before pushing |
| Render starts but API returns 500 — env vars missing | Check Render logs → missing env vars cause `KeyError` at startup → add them in Render dashboard |
| Vercel shows blank page after login | React Router needs `try_files $uri /index.html` in Nginx OR set Vercel rewrites for SPA |
| CORS error on live URL | After Vercel URL is known, update `CORS_ORIGINS` in Render env vars and redeploy |
| `VITE_API_URL` not available in code | Must be prefixed with `VITE_` and accessed as `import.meta.env.VITE_API_URL` |
| Render free tier goes to sleep | First load after sleep takes 30–60 seconds. Warn supervisor and evaluators. Upgrade to paid tier for demo day |
| Missing React Router `<Route>` for new pages | Check `AppRouter.jsx` — every page component needs a `<Route>` entry |
| Files uploaded in dev not available in production | Local `uploads/` directory is not on Render. Switch to Cloudinary for production file storage |

---

## Cloudinary File Storage (If Using)

If you decide to switch from local file storage to Cloudinary for production:

```bash
pip install cloudinary
# Add to requirements.txt
```

```python
# backend/app/services/storage_service.py — add Cloudinary support

import cloudinary
import cloudinary.uploader
import os

if os.getenv("STORAGE_BACKEND") == "cloudinary":
    cloudinary.config(
        cloud_name = os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key    = os.environ["CLOUDINARY_API_KEY"],
        api_secret = os.environ["CLOUDINARY_API_SECRET"],
        secure     = True
    )


def upload_file(file, subfolder: str = "submissions") -> str:
    """
    Routes to local or Cloudinary storage based on STORAGE_BACKEND env var.
    """
    if os.getenv("STORAGE_BACKEND") == "cloudinary":
        return _upload_to_cloudinary(file, subfolder)
    else:
        return _upload_to_local(file, subfolder)


def _upload_to_cloudinary(file, subfolder: str) -> str:
    extension = file.filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '.{extension}' not allowed.")
    result = cloudinary.uploader.upload(
        file,
        folder          = f"pbl_portal/{subfolder}",
        resource_type   = "raw",         # for non-image files
        use_filename    = True,
        unique_filename = True,
    )
    return result["secure_url"]          # Returns a permanent HTTPS URL
```

**Add to Render environment variables:**
```
STORAGE_BACKEND=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

*End of Sprint 9 Document*
*System deployment complete. The PBL Management System is live.*

---

# 🎉 Project Complete

**All 9 sprints documented. All 6 stages of documentation delivered.**

Congratulations to the team:
- **Muhammad Ismail Rana** (F2023-551)
- **Ramsha Naveed** (F2023-027)
- **Sara Haider** (F2023-744)
- **Sheikh Muhammad Ibrahim** (F2023-630)

The system is now built, tested, secured, documented, and deployed.
Good luck with your FYP demonstration at Beaconhouse National University!

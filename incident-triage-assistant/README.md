# AI-Powered Incident/Bug Triage Assistant

A full-stack app for submitting software bugs and automatically triaging
them (category, priority, severity, root cause, responsible team, and
recommended action) with an AI-powered engine that falls back to a
deterministic rule-based engine when no external AI service is configured.

```
incident-triage-assistant/
├── backend/     Node.js + Express REST API, MongoDB/Mongoose, AI triage engine
├── frontend/    React dashboard (login, dashboard, create bug, bug list, bug details)
└── README.md
```

## 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

## 2. Backend setup

```bash
cd backend
cp .env.example .env      # edit values if needed
npm install
npm run seed               # creates demo login: admin@triage.com / admin123
npm run dev                 # starts API on http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

### AI triage engine

By default (`AI_API_KEY` empty in `.env`) the backend uses the built-in
**rule-based triage engine** (`backend/ai/triageEngine.js`) — fully
functional offline, no external calls. It matches bug text against
keyword rules (auth, database, security, performance, deployment,
frontend, backend) to determine category, and combines reported severity
with rule urgency to compute priority and a confidence score.

To use a real AI model instead, set `AI_API_KEY`, `AI_API_URL`, and
`AI_MODEL` in `.env` (OpenAI-compatible chat completions endpoint). If
that call fails for any reason, the app automatically falls back to the
rule-based engine — the triage step never fails.

## 3. Frontend setup

```bash
cd frontend
npm install
npm start                   # starts React app on http://localhost:3000
```

The frontend calls the API at `http://localhost:5000/api` by default. To
change it, create `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## 4. Using the app

1. Go to `http://localhost:3000` → redirected to **Login**.
2. Log in with `admin@triage.com` / `admin123` (or register your own user
   via `POST /api/auth/register`).
3. **Dashboard** — bug counts by priority/status and charts by category,
   priority, and status.
4. **Create Bug** — fill in the form and click **"Analyze Bug with AI"**.
   The bug is saved to MongoDB and triaged immediately; the result panel
   shows category, priority, root cause, suggested team/assignee,
   recommended action, and confidence score.
5. **Bug List** — search and filter by category/priority/status.
6. **Bug Details** — full bug info, AI triage result, change status, or
   re-run AI triage.

## 5. REST API reference

| Method | Endpoint                     | Description                          |
|--------|-------------------------------|---------------------------------------|
| POST   | /api/auth/login                | Log in, returns JWT                   |
| POST   | /api/auth/register             | Create a user (helper/demo)           |
| GET    | /api/auth/me                   | Current user (requires token)         |
| POST   | /api/bugs                      | Create bug + run AI triage            |
| GET    | /api/bugs                      | List bugs (search/filter/pagination)  |
| GET    | /api/bugs/:id                  | Get one bug (with triage result)      |
| PUT    | /api/bugs/:id                  | Update bug fields                     |
| DELETE | /api/bugs/:id                  | Delete bug                            |
| PUT    | /api/bugs/:id/status           | Update bug status                     |
| POST   | /api/bugs/:id/triage            | Re-run AI triage on existing bug      |
| GET    | /api/bugs/stats/dashboard       | Dashboard counts + chart data         |

All `/api/bugs/*` routes require `Authorization: Bearer <token>`.

## 6. Data models

- **User**: name, email, password (hashed), role
- **Bug**: title, description, stepsToReproduce, errorMessage, severity,
  environment, reporter, category, priority, status, assignedTeam,
  assignedTo, triageResult (ref), timestamps
- **TriageResult**: bugId (ref), category, severity, priority, rootCause,
  suggestedTeam, suggestedAssignee, recommendedAction, confidenceScore,
  engine, createdAt

## 7. Notes

- Passwords are hashed with bcrypt; auth uses JWT (`Authorization: Bearer`).
- CORS is restricted to `CLIENT_ORIGIN` from `.env`.
- The rule-based AI engine guarantees the app is fully functional without
  any external API key or internet access.

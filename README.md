# Population Management Software

Population Management Software is a full-stack platform that helps local administrative units manage households, citizens, fee collections, and user permissions. The system delivers a modern React dashboard backed by a FastAPI service and PostgreSQL database, with Docker support and deployment-ready configuration for Render and GitHub Pages.

## Features
- Authentication with JWT tokens and role-based routing for admin, tổ trưởng, and kế toán users.
- Household management: create, view, update, and remove households with member insights.
- Citizen registry: track demographic data, residency status, and temporary residence details.
- Fee collection: configure fee periods, capture payments, and monitor statistics at a glance.
- User administration: manage accounts and roles from an intuitive UI.
- Responsive, dark-themed UI built with TailwindCSS and shadcn-inspired components.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui components, Axios, React Router, Recharts
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT Auth
- **Infrastructure:** Docker, Docker Compose, Render.com (backend + DB), GitHub Pages (static frontend)

## Repository Structure
```
population_management_software/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, database, security utilities
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # FastAPI routers (auth, users, households, citizens, fees)
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic stubs
│   │   └── tests/          # Test suite (pytest)
│   ├── alembic/            # Migration environment
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI blocks & modals
│   │   ├── contexts/       # Auth context & provider
│   │   ├── layouts/        # Shell layout (navbar + sidebar)
│   │   ├── pages/          # Feature routes (dashboard, households, etc.)
│   │   └── services/       # Axios client wrappers
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Getting Started

### 1. Install prerequisites
- **Node.js 18+**
- **Python 3.11+**
- **Docker Desktop** (includes Docker Compose v2)

Make sure Docker Desktop is running before executing any container commands.

### 2. Clone repo & prepare environment variables
```bash
git clone https://github.com/khanhnq35/population_management_software
cd population_management_software
cp .env.example .env
```

The `.env` file is loaded by Docker and by the backend when running locally. Update values if needed:
- `DATABASE_URL` – Postgres DSN (defaults to `postgresql://admin:123456@db:5432/population_db` for Docker).
- `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` – auth configuration.

### 3. Backend virtualenv (for local-only dev or Alembic migrations)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # .venv\Scripts\activate on Windows
pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head                 # applies DB migrations to DATABASE_URL
```
> When you only rely on Docker you can skip the venv and let the containers run Alembic during `./test_local.sh`, but having the venv ready helps with IDE tooling and manual testing.

### 4. Manual local dev servers
- **Backend** (expects DATABASE_URL in `.env`): `uvicorn app.main:app --reload`
- **Frontend**: from `frontend/` run `npm install` once, then `npm run dev`

### 5. One-click Docker workflow with `./test_local.sh`
The script reproduces production-like behavior and runs smoke tests automatically. It performs:
1. Stop & clean any existing project containers/networks.
2. Build frontend/backend images.
3. Start PostgreSQL, backend, and Vite dev server in Docker.
4. Wait for the API health check (`/api/health`) and for Postgres readiness.
5. Verify FastAPI docs and the frontend endpoint.
6. Run backend smoke tests and write results to `logs/test_local.log`.

Usage:
```bash
chmod +x test_local.sh
./test_local.sh
```
Troubleshooting tips:
- Ensure Docker Desktop is running and your user can access the Docker socket (`~/.docker/run/docker.sock` on macOS).
- If the script stops at “Frontend did not respond”, check `docker-compose logs frontend` for errors (e.g., missing PostCSS config).
- Logs for each run live in `logs/test_local.log` for auditing.

### Database Migrations
Create new migrations via Alembic:
```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Testing
Run backend smoke tests:
```bash
cd backend
pytest
```

## 🧪 Test Locally
Run the following command before deploying to Render:

```bash
chmod +x test_local.sh
./test_local.sh
```

This script automatically builds, runs, and verifies the Docker Compose stack, performs API smoke tests, and opens the frontend once everything is healthy.

### Changelog Automation
- `./test_local.sh` automatically records its execution in the `Unreleased` section of `CHANGELOG.md`.
- Run `scripts/install_hooks.sh` once after cloning to enable git hooks that promote `Unreleased` notes into a new version on every commit.

## API Overview (Base URL: `/api`)
- `POST /auth/login` – obtain JWT access token
- `POST /auth/register` – create a user (admin-only after first account)
- `GET /users` – list users (admin)
- `GET /users/me` – fetch current user profile
- `CRUD /hogiadinh` – manage households
- `CRUD /nhankhau` – manage citizens with status filters
- `CRUD /thuphi` – manage fee collections
- `POST /thuphi/{fee_id}/payments` – record payments
- `GET /thuphi/stats/summary` – aggregate fee statistics

Refer to the FastAPI docs at `http://localhost:8000/docs` during development for interactive testing.

## Deployment Guide

### Backend on Render
1. Create a new Render **Web Service** from this repository pointing to `/backend`.
2. Runtime: Python 3.11; Build command: `pip install -r requirements.txt && alembic upgrade head`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
4. Add environment variables from `.env` (update `DATABASE_URL` to the managed Render PostgreSQL instance).
5. Provision a Render **PostgreSQL** service and connect it to the backend via shared environment variables.

### Frontend on GitHub Pages
1. In the frontend directory, set the production API endpoint:
   ```bash
   echo "VITE_API_BASE_URL=https://<render-backend-host>/api" > frontend/.env.production
   ```
2. Build the site:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. Deploy the `frontend/dist` folder to GitHub Pages (manual upload or GH Actions workflow). A sample `gh-pages` deployment can use [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages).

Update the README with the public URLs once deployed.

## Licensing
This project is released under the MIT License. See [LICENSE](LICENSE) for details.

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

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (for containerized run)

### Environment Variables
Copy the provided sample and adjust values as needed:
```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` – connection string for PostgreSQL
- `JWT_SECRET` – secret key for signing JWT tokens
- `JWT_ALGORITHM` – usually `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` – token lifetime

### Run with Docker Compose
```bash
docker-compose up --build
```
Services start at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- PostgreSQL: localhost:5432 (credentials in `docker-compose.yml`)

To stop:
```bash
docker-compose down
```

### Manual Local Development
1. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

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

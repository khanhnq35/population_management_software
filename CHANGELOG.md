# Changelog

All notable changes to this project will be documented in this file following [Keep a Changelog](https://keepachangelog.com/) guidelines.

## [Unreleased]
- Local test pipeline succeeded (2025-12-31 21:38)
- Local test pipeline succeeded (2025-12-31 21:44)
- Local test pipeline succeeded (2025-12-31 21:48)
- Local test pipeline succeeded (2025-12-31 21:56)
- Local test pipeline succeeded (2025-12-31 22:02)

## [v0.4.4] - 2025-12-31
- Added configurable fee collection types (mandatory per citizen/household/list, voluntary, none) with import/export support, optional fee amounts for voluntary fees, and paid/unpaid obligation views in the fee detail modal.
- Fixed population endpoints rejecting legacy records without national IDs by accepting null values.
- Introduced an interactive “Thống kê” dashboard with advanced KPIs, filters, charts, and insights focused on fee collection and household status.
- Local test pipeline succeeded (2025-12-29 23:16)
- Local test pipeline succeeded (2025-12-29 23:25)
- Local test pipeline succeeded (2025-12-29 23:38)
- Local test pipeline succeeded (2025-12-29 23:42)
- Local test pipeline succeeded (2025-12-29 23:45)
- Local test pipeline succeeded (2025-12-29 23:53)
- Local test pipeline succeeded (2025-12-30 00:12)
- Local test pipeline succeeded (2025-12-30 00:17)
- Local test pipeline succeeded (2025-12-30 00:28)
- Local test pipeline succeeded (2025-12-30 00:35)
- Local test pipeline succeeded (2025-12-30 00:42)
- Local test pipeline succeeded (2025-12-30 00:47)
- Local test pipeline succeeded (2025-12-30 00:52)
- Local test pipeline succeeded (2025-12-30 01:02)
- Local test pipeline succeeded (2025-12-30 01:08)
- Local test pipeline succeeded (2025-12-30 12:59)
- Local test pipeline succeeded (2025-12-31 00:28)
- Local test pipeline succeeded (2025-12-31 00:45)
- Local test pipeline succeeded (2025-12-31 00:48)
- Local test pipeline succeeded (2025-12-31 00:58)
- Local test pipeline succeeded (2025-12-31 01:00)
- Local test pipeline succeeded (2025-12-31 01:04)
- Local test pipeline succeeded (2025-12-31 01:15)
- Local test pipeline succeeded (2025-12-31 01:18)
- Local test pipeline succeeded (2025-12-31 01:25)
- Local test pipeline succeeded (2025-12-31 01:36)
- Local test pipeline succeeded (2025-12-31 01:42)
- Local test pipeline succeeded (2025-12-31 01:45)
- Local test pipeline succeeded (2025-12-31 19:42)
- Local test pipeline succeeded (2025-12-31 19:46)
- Local test pipeline succeeded (2025-12-31 19:54)
- Local test pipeline succeeded (2025-12-31 20:51)
- Local test pipeline succeeded (2025-12-31 20:55)
- Local test pipeline succeeded (2025-12-31 21:01)

## [v0.4.3] - 2025-12-26
- Local test pipeline succeeded (2025-12-26 22:27)
- Local test pipeline succeeded (2025-12-30 01:19)
- Local test pipeline succeeded (2025-12-30 01:24)
- Local test pipeline succeeded (2025-12-30 01:29)

## [v0.4.2] - 2025-10-30
- feat: added automated local testing pipeline (test_local.sh)

## [v0.4.1] - 2025-10-30
- Local test pipeline succeeded (2025-10-30 19:20)
- Local test pipeline succeeded (2025-10-30 20:40)

## [v0.4.0] - 2025-10-31
### Added
- Automated local testing pipeline using test_local.sh
- Health check endpoint for backend

## [v0.3.0] - 2024-05-12
### Added
- Project documentation, Docker Compose orchestration, environment templates, and MIT license.
- Deployment guidance for Render and GitHub Pages.

### Updated
- README instructions covering local, Docker, and production workflows.

## [v0.2.0] - 2024-05-12
### Added
- React 18 + Vite frontend with TailwindCSS, shadcn-inspired components, protected routing, and Axios data layer.
- Dashboard analytics, CRUD pages for households, citizens, fees, and user management UI.

## [v0.1.0] - 2024-05-12
### Added
- FastAPI backend with JWT authentication, role-based access control, and CRUD routers for core entities.
- SQLAlchemy models, Alembic migrations, and PostgreSQL integration.
- Dockerized backend service with smoke tests.

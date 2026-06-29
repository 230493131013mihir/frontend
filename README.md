# SkillForge AI

SkillForge AI is a runnable AI business operating system foundation for CRM, ERP, HR, inventory, finance, analytics, automation, and AI modules.

This version is a complete Phase 1 MVP: it has a real frontend, backend APIs, login/register, protected dashboard, CRM lead creation, audit activity, and a local database file that works without Docker.

## What You Need

- Node.js
- VS Code

Docker is optional. The app runs first with the included local JSON database.

## Run In VS Code

Open this folder:

```text
C:\Users\MIHIR JADAV\Desktop\business\frontend
```

Install packages:

```bash
npm install
```

Open two VS Code terminals.

Terminal 1, backend:

```bash
npm run start:server
```

Terminal 2, frontend:

```bash
npm run dev:client
```

Open:

```text
http://localhost:5173
```

Check backend health:

```text
http://localhost:5000/health
```

## Login

Use the seeded admin account:

```text
Email: admin@acme.com
Password: adminpassword123
```

Or create a new company from the Register tab.

## Database

The app automatically creates this file when the backend runs:

```text
server/data/skillforge-db.json
```

That file stores:

- Companies
- Users
- Sessions
- Audit logs
- CRM leads

So the app is runnable for another person without PostgreSQL setup.

## Project Flow

1. User opens the React frontend.
2. User logs in or registers a company.
3. Frontend sends request to Express backend.
4. Backend validates request data.
5. Backend stores or reads data from `server/data/skillforge-db.json`.
6. Backend returns JSON response.
7. Frontend updates the dashboard, CRM leads, reports, and messages.

## Main Folders

- `client`: React + TypeScript + Vite frontend.
- `server`: Node + Express + TypeScript backend.
- `server/src/controllers`: receives requests and sends responses.
- `server/src/services`: business logic like auth.
- `server/src/middleware`: auth protection and error handling.
- `server/src/data`: local database read/write layer.
- `docs`: architecture, API, database, and deployment notes.

## Useful Commands

Build everything:

```bash
npm run build
```

Build backend only:

```bash
npm run build:server
```

Build frontend only:

```bash
npm run build:client
```

If backend says port 5000 is already in use, stop the old backend terminal or run:

```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

Replace `<PID>` with the number shown in `OwningProcess`.

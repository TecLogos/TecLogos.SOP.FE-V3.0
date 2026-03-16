# TecLogos SOP Frontend

React + Vite + Tailwind CSS frontend for the TecLogos SOP Management System.

## Tech Stack
- **React 18** with React Router v6
- **Tailwind CSS** for styling
- **Axios** for API calls with JWT auto-refresh
- **react-hot-toast** for notifications
- **lucide-react** for icons
- **Sora** font (Google Fonts)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure API URL
cp .env.example .env
# Edit .env and set VITE_API_URL to your backend URL

# 3. Start dev server
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├── components/
│   ├── common/        # Shared: Modal, StatusBadge, SopTable, Loaders
│   └── layout/        # AppLayout, Sidebar
├── context/
│   └── AuthContext.jsx  # JWT auth, user state, role helpers
├── pages/
│   ├── LoginPage.jsx
│   ├── admin/         # Dashboard, SOPs, Employees, Workflow, Groups, Roles
│   ├── initiator/     # Dashboard, My SOPs, Submit
│   ├── supervisor/    # Dashboard, Pending + Forward/Request Changes
│   └── approver/      # Dashboard, Pending + Approve/Reject
├── services/
│   └── api.js         # All API calls (auth, sop, employee, roles, groups)
└── utils/
    └── sopUtils.js    # Status labels, date helpers, blob download
```

## Roles & Routes

| Role       | Routes                                        |
|------------|-----------------------------------------------|
| Admin      | `/admin/dashboard`, `/admin/sops`, `/admin/employees`, `/admin/groups`, `/admin/roles`, `/admin/workflow` |
| Initiator  | `/initiator/dashboard`, `/initiator/sops`     |
| Supervisor | `/supervisor/dashboard`, `/supervisor/pending`|
| Approver   | `/approver/dashboard`, `/approver/pending`    |

## API Base URL

Default: `https://localhost:7001`  
Override via `VITE_API_URL` in `.env`

## Build for Production

```bash
npm run build
```

Output in `dist/` folder — deploy to any static host or serve via Nginx.

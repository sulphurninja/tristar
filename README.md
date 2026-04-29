# Tristar Realtors CRM

A focused real estate CRM for **Tristar Realtors** — projects, leads, site visits,
brokers, channel partners and reporting in one workspace.

This is a CRM-only edition (no marketing channels, no WhatsApp/Voice/Email send engine).
Marketing, communications and cloud telephony surfaces are visible in the navigation as
"Available in Tristar+" so the team knows the option exists, but they aren't enabled here.

> Single-tenant deployment — the first sign-up creates the workspace and becomes the
> owner. After that, additional team members must be invited from
> **Settings → Manage Users**.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript + React 19 |
| DB | MongoDB Atlas + Mongoose |
| Auth | JWT in httpOnly cookie + bcrypt + RBAC middleware |
| UI | Tailwind v4 + shadcn-style primitives + Radix + lucide-react |
| Forms | react-hook-form + zod |
| Charts | Recharts |

---

## Quick start

```bash
cd tristar-realty
bun install        # or npm install / pnpm install / yarn

# A working .env is shipped in the repo pointing to the dev Atlas cluster
# (see .env / .env.example). Copy .env.example to .env.local if you prefer.

bun run dev        # serves on http://localhost:3020
```

The dev server runs on **port 3020** so it doesn't clash with other Realty/Zaptick apps.

> First run will create indexes in the `tristar` database in MongoDB Atlas. Sign up at
> `/signup` to create the workspace + owner.

---

## Folder structure

```
src/
├── app/
│   ├── (auth)/            login, signup, forgot/reset password
│   ├── (app)/             the main CRM with sidebar layout
│   │   ├── dashboard/                     → Home
│   │   ├── leads/                         → Lead Management → Pipeline
│   │   ├── leads/bulk-update/             → Lead Management → Bulk Update
│   │   ├── visits/                        → Site Visits (calendar)
│   │   ├── visits/scheduled/              → SVP Dashboard
│   │   ├── projects/                      → Projects
│   │   ├── brokers/                       → Channel Partners / Brokers
│   │   ├── reports/                       → 14 reports (incl. personalised)
│   │   ├── requests/                      → Approvals
│   │   ├── communication-analysis/        → disabled (Tristar+ placeholder)
│   │   ├── outgoing-calls/                → disabled (Tristar+ placeholder)
│   │   └── settings/
│   │       ├── users/                     → Manage Users (invite/edit/suspend)
│   │       ├── projects/                  → Manage Projects (redirect)
│   │       ├── sources/                   → Manage Sources
│   │       ├── brokers/                   → Manage Brokers (redirect)
│   │       ├── api-keys/                  → API Keys
│   │       └── compliance/                → RERA & company details
│   ├── api/                               → all REST endpoints
│   ├── globals.css
│   └── page.tsx                           → public landing
├── components/
│   ├── ui/                shadcn primitives
│   ├── layout/            Sidebar, Topbar, Command Palette
│   ├── brand/             Logo (uses /tristar-logo.png)
│   ├── leads/             NewLeadSheet, LeadDetailSheet
│   ├── visits/            NewVisitSheet
│   ├── projects/          NewProjectSheet
│   ├── brokers/           NewBrokerSheet
│   ├── reports/           ReportShell, StageTableReport
│   └── shared/            EmptyState, StatusPill, UpgradeNotice
├── contexts/              AuthContext
├── lib/                   mongodb, auth, api wrapper, utils, report-utils
├── models/                Workspace, User, Project, Lead, Broker, SiteVisit,
│                          LeadActivity, Source, ApiKey, Request
└── middleware.ts          public/private route gating
```

---

## Roles

`owner > admin > manager > supervisor > sales_executive > telecaller / field_executive > channel_partner > viewer`

`hasRole(userRole, minRole)` checks hierarchy via `ROLE_HIERARCHY` in `src/lib/auth.ts`.

---

## Reports

| Report | Endpoint |
| --- | --- |
| Lead Volume | `/api/reports/lead-volume` |
| Team Performance | `/api/reports/team-performance` |
| Projects | `/api/reports/projects` |
| Sources | `/api/reports/sources` |
| Channel Partner | `/api/reports/channel-partner` |
| Backlog | `/api/reports/backlog` |
| Closing Manager Backlog | `/api/reports/closing-manager-backlog` |
| Activity | `/api/reports/activity` |
| Inactive Leads (per user) | `/api/reports/inactive-leads` |
| Inactive Lead Source | `/api/reports/inactive-lead-source` |
| SVC User | `/api/reports/svc-user` |
| SVC Source | `/api/reports/svc-source` |
| Closing Manager | `/api/reports/closing-manager` |
| Personalised | `/api/reports/personalised` |

Every report supports CSV export and date-range filtering (Today, 7d, 30d, This Month, Last Month, Till Date).

---

## Disabled-but-visible features

The following entry points appear in the navigation as **Available in Tristar+** with
a lock badge — selecting them takes the user to a friendly upgrade screen.

- Communication Analysis
- Outgoing Calls / Cloud Telephony
- Marketing ROI Report
- Marketing channels in Settings

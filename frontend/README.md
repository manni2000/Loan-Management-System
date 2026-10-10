# Lumen — Loan Management Frontend

Lumen provides a borrower application portal and an internal operations dashboard for managing loans from submission through repayment. The frontend integrates with the Express backend for authentication, eligibility checks, document uploads, and loan lifecycle actions.

## Technology Stack

| Technology | Purpose |
| --- | --- |
| Next.js 16 / App Router | Routing, layouts, and production builds |
| React 19 | Interactive application components |
| TypeScript | Typed API contracts and application code |
| Tailwind CSS 4 / global CSS | Styling and responsive layouts |
| Lucide React | Interface icons |

## Features

### Borrower Portal

- Account registration and sign-in.
- A resumable application journey covering personal details, eligibility, salary-slip upload, and loan configuration.
- PDF, JPG, and PNG uploads with a maximum size of 5 MiB.
- Loan amount and tenure sliders with a live repayment breakdown at a fixed rate of 12% per year.
- Application status, activity timeline, payment history, and repayment progress.

### Operations Dashboard

| Module | Responsibility |
| --- | --- |
| Sales | View registered borrowers who have not submitted an application |
| Sanction | Review applications, approve loans, or reject them with a reason |
| Disbursement | Mark sanctioned loans as disbursed after funds are released |
| Collection | Record payments, review outstanding balances, and track closed loans |

The dashboard includes a role-scoped overview, searchable queues, filters, pagination, CSV exports, and contextual action dialogs. Administrators can access all four modules; executives can access their assigned module. Borrowers use the application portal.

## Getting Started

### Prerequisites

- Node.js 20.9 or later and npm.
- A running Lumen backend. Follow the [backend setup guide](../backend/README.md) for database configuration, seeding, and startup.

### Installation

Run these commands from the project root:

```powershell
cd frontend
npm install
```

### Environment Configuration

Create a local environment file if one does not already exist:

```powershell
Copy-Item .env.example .env.local
```

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Backend API base URL, including the `/api` prefix |

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Next.js also reads `.env`; values in `.env.local` take precedence. Restart the development server after changing configuration. Public environment variables are included in the browser build, so do not store secrets in them. Changes to the production API URL require a new build.

### Development

Start the backend in a separate terminal, then run:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route directs users to sign-in or their role-appropriate workspace.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run build` | Create an optimized production build and check TypeScript |
| `npm start` | Serve an existing production build |

To run a production build locally:

```powershell
npm run build
npm start
```

## Routes and Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Redirect to the appropriate entry point | Public |
| `/login` | Sign-in, registration, and evaluator account shortcuts | Public |
| `/portal` | Borrower application and loan tracking | Borrower |
| `/dashboard` | Operations overview | Admin and executives |
| `/dashboard/sales` | Borrower lead queue | Admin / Sales |
| `/dashboard/sanction` | Application review queue | Admin / Sanction |
| `/dashboard/disbursement` | Approved loan queue | Admin / Disbursement |
| `/dashboard/collection` | Repayment ledger | Admin / Collection |

## Project Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── login/              # Authentication screen
│   │   ├── portal/             # Borrower journey and loan tracking
│   │   ├── dashboard/
│   │   │   └── [module]/       # Shared role-specific operations screen
│   │   ├── globals.css        # Global styles and responsive layouts
│   │   ├── layout.tsx         # Root layout and authentication provider
│   │   └── page.tsx           # Entry-point redirect
│   ├── components/
│   │   ├── AuthProvider.tsx   # Session state and protected layouts
│   │   ├── Shell.tsx          # Navigation and workspace shell
│   │   └── UI.tsx             # Shared controls, status badges, and dialogs
│   └── lib/
│       ├── api.ts             # API client and structured errors
│       ├── demo.ts            # Public evaluator role names
│       ├── export.ts          # CSV generation and formula protection
│       └── types.ts           # Data contracts and formatting helpers
├── .env.example               # Environment configuration template
├── package.json               # Dependencies and scripts
├── postcss.config.mjs         # Tailwind PostCSS integration
└── tsconfig.json              # TypeScript configuration
```

The `@/*` import alias maps to `src/*`.

## API Integration and Authentication

The shared API client sends credentialed requests to the configured backend and surfaces structured validation and connection errors. Portfolio, application, and payment data come from the API; the frontend does not replace unavailable backend responses with sample records.

JWT sessions are managed by the backend in HttpOnly cookies. The frontend obtains the current user through `/auth/me` and keeps session state in React context; tokens are not stored in browser localStorage.

Protected layouts and module checks control navigation and rendering. The backend independently validates authentication, roles, eligibility, financial calculations, and state transitions. Client-side checks improve usability; backend checks provide authoritative enforcement.

For endpoint definitions, request shapes, status codes, and data relationships, see the [backend API documentation](../backend/README.md#rest-api).

## Evaluator Accounts

Run the backend seed before signing in. The login screen includes buttons that fill the credentials for each role.

| Role | Email |
| --- | --- |
| Admin | `admin@lumen.test` |
| Sales | `sales@lumen.test` |
| Sanction | `sanction@lumen.test` |
| Disbursement | `disbursement@lumen.test` |
| Collection | `collection@lumen.test` |
| Borrower | `borrower@lumen.test` |

All seeded accounts use **`Lumen@123`**. These accounts are intended for local evaluation and should not be seeded into a public production database.

## Verification

Run `npm run typecheck` and `npm run build` to validate the frontend. The backend test suite covers API authorization and loan lifecycle behavior; it does not provide browser interaction coverage.

For a manual review, test borrower registration and application submission, each executive module, restricted-route access, validation errors, CSV downloads, and narrow-screen navigation. The interface includes loading and empty states, semantic form controls, and action dialogs with keyboard dismissal and focus trapping.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| “Unable to reach the server” | Confirm the backend is running and `NEXT_PUBLIC_API_URL` is correct |
| Seeded login fails | Run the backend seed against the database used by the running API |
| Session does not persist | Confirm the backend permits the frontend origin and browser cookies are enabled |
| API URL changes have no effect | Restart development, or rebuild and restart production |
| A workspace is restricted | Verify that the signed-in account has the required role |

For production, serve the frontend and API over HTTPS on the same site, configure the backend's `FRONTEND_URL`, and rebuild with the intended API URL. The default backend cookie policy does not support cross-site frontend/API deployments.

# Lumen Loan Management System

The workspace has exactly two top-level folders: `frontend` and `backend`. Backend team routes are in `src/routes/{sales,sanction,disbursement,collection}.ts`; frontend team screens share the role-guarded `dashboard/[module]` route.

## Quick start (no MongoDB installation required)

Requires Node.js 20.9+ and npm. Use two terminals from the project root:

```powershell
cd backend
npm install
Copy-Item .env.example .env  # Skip if .env already exists
# Set JWT_SECRET in .env to a random value of at least 32 characters.
npm run demo
```

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The demo runs an actual MongoDB process on port 27018, seeds evaluation accounts and sample records, then starts Express on port 4000. MongoDB data persists inside `backend/.local-data`; documents persist inside `backend/uploads`. The first demo/test run may download a MongoDB binary. Stop with Ctrl+C. Do not start `demo` and `dev` for the backend at the same time.

For an installed MongoDB or Atlas, set `MONGODB_URI` in `.env`, run `npm run seed`, then `npm run dev`. A standalone MongoDB works; transactions and a replica set are unnecessary because each payment updates one loan atomically.

Optional `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` configures Node's promise DNS resolver before MongoDB connects, including the seed script. This supports SRV/TXT discovery for `mongodb+srv://` URLs. Leave it empty to use system DNS. Invalid DNS addresses stop startup with a configuration error. Restart the backend after changing this setting. This does not change the operating system resolver used by `dns.lookup()`.

## Evaluator credentials

Every account below uses password **`Lumen@123`**. The login page provides role buttons that fill these credentials. Run the seed before using them.

| Role | Email | Access |
| --- | --- | --- |
| Admin | admin@lumen.test | All operations modules |
| Sales | sales@lumen.test | Registered borrowers who have not applied |
| Sanction | sanction@lumen.test | Applied and rejected applications |
| Disbursement | disbursement@lumen.test | Sanctioned loans |
| Collection | collection@lumen.test | Disbursed and closed loans |
| Borrower | borrower@lumen.test | Personal application portal |

The borrower account starts without an application for testing the complete flow. Additional sample borrowers have the same password and email pattern `first.last@lumen.test` (e.g. `aarav.sharma@lumen.test`). Seed is additive: it does not overwrite existing accounts or loan records. Credentials are evaluator fixtures, not production accounts; do not seed them into a public production database.

## Application decisions

- Registration always creates a Borrower, ignoring any client-supplied role. Passwords are bcrypt-hashed at cost 12. JWT sessions expire after 8 hours and live in HttpOnly, SameSite=Lax cookies; production cookies are Secure. Authenticated APIs load the user role from MongoDB rather than trusting client data. A missing/expired session returns 401; an authenticated account with the wrong role returns 403.
- The frontend guards the portal/dashboard and individual modules; every backend team router separately enforces its allowed role, including Admin. Salary slips are served through an authenticated download route, restricted to the owning borrower, Admin, or Sanction.
- BRE lives on the server and runs when saving personal details and again when submitting. Client controls provide guidance only: a client can be altered or bypassed. Age is based on completed calendar years, inclusive 23–50. Salary must be at least ₹25,000; employment must be Salaried or Self-Employed. PAN uses `^[A-Z]{5}[0-9]{4}[A-Z]$` after uppercasing. This validates format, not government identity or PAN ownership.
- Uploads accept PDF/JPG/PNG, max 5 MiB (5 × 1024 × 1024 bytes), with MIME, extension, and file signature checks. Files have random server-generated names, are stored outside the frontend, and are linked through the user record. Signature checks do not replace antivirus scanning in a production deployment.
- Amount is ₹50,000–₹5,00,000; tenure is 30–365 whole days. Rate is fixed at 12% p.a. Interest = `round(principalPaise × 12 × tenure / 36500)`. Principal, interest, total, and paid amounts are integers in paise; all displayed rupee amounts divide by 100. The server calculates the authoritative quote and ignores client-supplied totals/status.
- One submitted loan per borrower is supported in this assignment. Draft details are editable; submitted applications are locked. Rejected applications remain visible with the rejection reason. Reapplication and multiple loans are intentionally outside this implementation scope.

## Collections and relationships

**Users:** name, unique normalized email, hidden password hash, role enum, personal details, salary slip metadata, timestamps. Borrowers also serve as sales leads until a loan exists.

**Loans:** unique borrower reference and loan reference, integer financial terms, status, stage timestamps, rejection reason, embedded payments, audit history. A loan references a User. Payments are embedded so inserting a payment, adjusting the balance, and closing a loan happen in a single atomic write.

`APPLIED → SANCTIONED → DISBURSED → CLOSED`

`APPLIED → REJECTED`

Sanction/Admin alone can approve or reject applied loans (rejection requires a reason). Disbursement/Admin releases sanctioned loans. Collection/Admin records payments on disbursed loans. Due date starts at disbursement plus tenure days. No endpoint permits skipping or reversing stages.

Outstanding balance = `totalPaise − paidPaise`. Payments require a positive amount with at most two decimals, no overpayment, a valid date between disbursement and today in Asia/Kolkata, and a 6–40 character uppercase alphanumeric/hyphen UTR. A unique sparse multikey MongoDB index enforces UTR uniqueness across loans; an atomic `$ne` filter enforces uniqueness within a loan. A compare-and-swap filter on `paidPaise` prevents concurrent writers from overpaying. A competing request receives 409 and must refresh/retry. Exactly matching total repayment closes the loan in that same write; closed loans reject further payments.

## REST API

All routes are prefixed with `/api`. Requests use JSON except salary upload (`multipart/form-data`, field `file`). Success responses contain `user`, `loan`, `loans`, or `leads` as appropriate. Errors contain `{ message, failures? }`. Loan list responses populate borrower name/email and the details required for the role. No response exposes password hashes, JWTs, or server filesystem paths.

| Method | Route | Input / behavior | Access |
| --- | --- | --- | --- |
| POST | /auth/register | `{name,email,password}` → 201 + session | Public |
| POST | /auth/login | `{email,password}` → session | Public |
| POST | /auth/logout | Clear session | Public |
| GET | /auth/me | Current public user | Authenticated |
| GET | /borrower/application | Saved user + loan or null | Borrower |
| PUT | /borrower/personal | `{fullName,pan,dob,monthlySalary,employment}` | Borrower |
| POST | /borrower/salary-slip | Multipart `file` → 201 | Borrower |
| POST | /borrower/loans | `{amount,tenure}` → 201 applied loan | Borrower |
| GET | /sales/leads | Borrowers without loans | Sales/Admin |
| GET | /sanction/loans | Applied/rejected queue | Sanction/Admin |
| PATCH | /sanction/loans/:id/decision | `{decision:"approve"}` or `{decision:"reject",reason}` | Sanction/Admin |
| GET | /disbursement/loans | Sanctioned queue | Disbursement/Admin |
| PATCH | /disbursement/loans/:id/disburse | Mark funds released | Disbursement/Admin |
| GET | /collection/loans | Disbursed/closed queue | Collection/Admin |
| POST | /collection/loans/:id/payments | `{utr,amount,date:"YYYY-MM-DD"}` → 201 | Collection/Admin |
| GET | /operations/overview | Role-scoped portfolio | Executives/Admin |
| GET | /documents/:userId | Salary slip download | Owner/Sanction/Admin |
| GET | /health | Database readiness | Public |

Status codes: 200 read/update/login; 201 creation/upload/payment; 400 malformed JSON/ID; 401 missing or invalid session; 403 role/origin denial; 404 missing resource/route; 409 duplicate or invalid/concurrent transition; 413 oversized JSON; 422 validation/eligibility/upload failures; 429 rate limit; 500 unexpected server error; 503 unavailable database on health check.

## Verification and deployment

```powershell
cd backend
npm test
npm run build
cd ../frontend
npm run build
```

Tests use isolated, temporary MongoDB data and upload storage. They exercise all role/module combinations, password hashing, registration role escalation prevention, eligibility boundaries, file validation, state transitions, exact loan math, duplicate UTRs across loans, overpayment, concurrent final payments, rejection, and logout/origin protection.

For production: configure a private MongoDB, strong JWT_SECRET, `NODE_ENV=production`, explicit `FRONTEND_URL`, and frontend `NEXT_PUBLIC_API_URL`; build both apps, use `npm start` in each, and serve both through HTTPS. The API rejects unapproved browser origins and allows cross-site mutations only from the configured FRONTEND_URL origin. Production session cookies use SameSite=None and Secure for separate frontend/API domains; browsers must allow cross-site cookies. Persist the backend upload directory or replace local storage with private object storage. Do not run the local demo launcher in production.

UI verification in this environment consisted of a successful Next.js production build and HTTP checks; automated browser visual verification was unavailable.

## Vercel backend deployment

Set the Vercel project's **Root Directory** to `backend`. The included `vercel.json` selects the Express framework, installs locked dependencies with `npm ci --include=dev`, and runs `npm run build`. Including development dependencies ensures the TypeScript compiler is available even when `NODE_ENV=production` is set during installation. Vercel uses the default export in `src/app.ts`; its request middleware initializes MongoDB and indexes once per warm instance. Local startup continues to use `src/server.ts`.

Set `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, and `NODE_ENV=production` in Vercel's environment settings; optionally set `MONGODB_DNS_SERVERS`. Configure the frontend's `NEXT_PUBLIC_API_URL` to the deployed API URL including `/api`, and use HTTPS and the production cookie configuration described above.

The current salary-slip implementation writes to local disk. It must be replaced with durable private object storage for Vercel: the deployed application filesystem is read-only and temporary storage is not persistent. The existing upload implementation is not production-ready on Vercel. See [Vercel's filesystem guidance](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).

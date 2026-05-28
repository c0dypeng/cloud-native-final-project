# User Stories — 護你安 HuYouAn

Employee Safety & Response System

---

## Employee (員工)

### US-E1: Login

**As an** employee,
**I want to** log in with my email and password,
**so that** I can access the safety reporting dashboard.

**Acceptance Criteria:**
- POST `/api/auth/login` validates credentials and returns a JWT
- JWT is set as an httpOnly cookie (`token`, 8h TTL)
- Invalid credentials return 401 with a generic error (no user enumeration)
- Inactive accounts are rejected
- After login, the user is redirected to `/dashboard`

---

### US-E2: View Active Events

**As an** employee,
**I want to** see all currently active emergency events on my dashboard,
**so that** I know which events require my safety report.

**Acceptance Criteria:**
- GET `/api/events` returns only `status=active` events for employees
- Dashboard renders an `ActiveEventsList` with event cards (title, type, description, time)
- When no active events exist, an empty state is displayed
- New events appear in real time via SSE (`event_created`)
- Closed events disappear in real time via SSE (`event_closed`)

---

### US-E3: Submit Safety Report

**As an** employee,
**I want to** report whether I am safe or need help for an active event,
**so that** my manager and the company know my status.

**Acceptance Criteria:**
- POST `/api/events/:eventId/report` accepts `{ status: "safe" | "need_help", message?: string }`
- The report is stored in `safety_reports` with a unique constraint on `(eventId, userId)`
- A success toast confirms the submission
- The dashboard updates to show the reported status
- Submitting `need_help` triggers SSE alerts to the manager chain and an email to the direct manager

---

### US-E4: Update Safety Report

**As an** employee,
**I want to** change my report from "safe" to "need help" (or vice versa),
**so that** I can reflect my current situation if it changes.

**Acceptance Criteria:**
- The same POST endpoint upserts (ON CONFLICT DO UPDATE) on `(eventId, userId)`
- The `updatedAt` timestamp is refreshed
- Stats cache is invalidated on every update
- The UI shows the current status and a "modify" button

---

### US-E5: Receive Reminders

**As an** employee who has not yet reported,
**I want to** receive reminders via push notification and email,
**so that** I don't forget to report my safety status.

**Acceptance Criteria:**
- A cron job runs every 5 minutes and scans all active events
- Unreported employees receive an SSE `reminder` event
- Unreported employees receive an email (max 3 per event per user)
- The web dashboard shows a `ReminderToast` when a reminder arrives
- Distributed Redis lock ensures only one pod runs the cron per tick

---

### US-E6: Switch Language

**As an** employee,
**I want to** switch the interface language between zh-TW, English, and Japanese,
**so that** I can use the system in my preferred language.

**Acceptance Criteria:**
- `LanguageSwitcher` component available on login and settings pages
- Locale is stored in a cookie (`huyouan-locale`) and persisted across sessions
- API responses respect the `locale` query param / `x-locale` header / cookie
- Event titles and department names fall back to the default when no translation exists

---

### US-E7: Offline Fallback

**As an** employee with a poor network connection,
**I want to** see a meaningful offline page instead of a browser error,
**so that** I know the system is temporarily unavailable.

**Acceptance Criteria:**
- The web app registers a service worker in production
- When offline, navigating to any page shows `/offline` with a friendly message
- PWA manifest enables install-to-home-screen on mobile devices

---

## Manager (主管)

### US-M1: View Team Report Status

**As a** manager,
**I want to** see the safety report status of all my direct and indirect subordinates,
**so that** I can assess my team's safety at a glance.

**Acceptance Criteria:**
- GET `/api/manager/team` returns all subordinates via recursive CTE (depth 1 = direct, depth 2+ = indirect)
- GET `/api/manager/team/:eventId/status` joins subordinates with their reports for a specific event
- The `/dashboard/team` page displays a table with name, department, status (safe / need_help / not_reported), and reported time
- `TeamStatusSummary` card shows aggregate counts (safe, need_help, unreported)

---

### US-M2: Receive Need-Help Alerts

**As a** manager,
**I want to** be immediately notified when a subordinate reports "need help",
**so that** I can reach out and provide assistance.

**Acceptance Criteria:**
- SSE `need_help` event is sent to the entire manager chain + all admins
- The event includes employee name, department, message, and timestamp
- An email is sent to the direct manager with employee name, event title, contact phone, and message
- `NeedHelpBanner` on the web dashboard highlights active help requests

---

### US-M3: View Unreported Subordinates

**As a** manager,
**I want to** see which of my subordinates have not yet reported,
**so that** I can follow up with them individually.

**Acceptance Criteria:**
- GET `/api/events/:eventId/unreported` returns unreported users (manager scope = own subordinates only)
- `UnreportedTeamList` component on the dashboard/team page shows the list
- Each entry shows name, email, phone, and department

---

### US-M4: Receive Manager Reminders

**As a** manager with unreported subordinates,
**I want to** receive periodic reminders about how many of my team members have not reported,
**so that** I can take action to ensure everyone reports.

**Acceptance Criteria:**
- The reminder cron sends SSE `manager_reminder` events with `unreportedCount`
- An email is sent to the manager (max 3 per event per manager)
- The email includes the event title, unreported count, and a link to the dashboard

---

## Admin (管理員)

### US-A1: Admin Login

**As an** admin,
**I want to** log in to the admin console with my username and password,
**so that** I can manage events, users, and departments.

**Acceptance Criteria:**
- POST `/api/admin/auth/login` validates credentials against `admin_accounts` table
- A session UUID is stored in Redis (24h TTL) and set as an httpOnly cookie (`admin-session`)
- Invalid credentials return 401 (constant-time bcrypt comparison prevents timing attacks)
- Rate limited to 3 attempts per minute

---

### US-A2: Create Emergency Event

**As an** admin,
**I want to** create a new emergency event (earthquake, fire, security, accident, drill, other),
**so that** employees can start reporting their safety status.

**Acceptance Criteria:**
- POST `/api/events` creates an event with title, type, and optional description
- SSE `event_created` is broadcast to all connected clients
- The event appears on the admin events table and on every employee's dashboard
- Event types: earthquake, fire, security, accident, drill, other

---

### US-A3: Close Event

**As an** admin,
**I want to** close an event when the emergency is over,
**so that** employees no longer need to report for it.

**Acceptance Criteria:**
- PATCH `/api/events/:id/close` sets `status=closed` and `closedAt=now()`
- Returns 409 if already closed (idempotency guard)
- Stats cache is invalidated for the event
- SSE `event_closed` is broadcast to all connected clients
- The event disappears from employees' active dashboard

---

### US-A4: Live Command Center

**As an** admin during an active event,
**I want to** see a real-time command center with live stats and unreported lists,
**so that** I can coordinate the emergency response.

**Acceptance Criteria:**
- `/events/[id]/live` page displays live stats (safe, need_help, unreported counts)
- Stats refresh automatically via SSE (`report_submitted` triggers re-fetch)
- Unreported list is searchable and sortable
- "Send reminder now" button triggers `POST /api/admin/events/:id/remind`

---

### US-A5: Manual Reminder Trigger

**As an** admin,
**I want to** manually trigger reminder notifications for an active event,
**so that** I can push reminders immediately without waiting for the 5-minute cron.

**Acceptance Criteria:**
- POST `/api/admin/events/:id/remind` triggers the reminder flow for one event
- Returns 404 if event not found, 409 if event is not active
- Respects the per-user 3-email cap (Redis counter)
- Returns `{ ok: true, unreported: <count> }`

---

### US-A6: User Management

**As an** admin,
**I want to** create, view, update, and deactivate employee/manager accounts,
**so that** the system reflects the current workforce.

**Acceptance Criteria:**
- GET `/api/users` supports search (name/email), filter (role, department, isActive), and pagination (limit/offset)
- POST `/api/users` creates a user with email, name, password (≥8 chars), role, department, manager
- PATCH `/api/users/:id` updates user fields; rejects `managerId === id` (self-reference)
- DELETE `/api/users/:id` soft-deletes (sets `isActive=false`)
- POST `/api/users/:id/password` resets password (bcrypt cost 10)
- Email is normalized to lowercase; duplicate email returns 409

---

### US-A7: Department Management

**As an** admin,
**I want to** manage the organizational department hierarchy,
**so that** reports can be grouped by department.

**Acceptance Criteria:**
- GET `/api/departments` returns a flat list with locale-aware names
- GET `/api/departments/tree` returns a hierarchical tree with user counts per node
- POST `/api/departments` creates a department with name and optional parentId
- PATCH `/api/departments/:id` updates; rejects `parentId === id` (self-parent)
- DELETE `/api/departments/:id` refuses if the department has users or sub-departments (409)

---

### US-A8: Reports & Analytics

**As an** admin,
**I want to** view statistical reports for each event, broken down by department,
**so that** I can understand the overall safety response.

**Acceptance Criteria:**
- GET `/api/events/:eventId/stats` returns `{ overall: { total, safe, needHelp, notReported }, byDepartment: [...] }`
- Stats are cached in Redis for 15 seconds to handle high traffic
- Cache is invalidated on every report submission or event closure
- The admin event detail page displays stats cards and a filterable reports table
- Reports page lists all events with links to their detail views

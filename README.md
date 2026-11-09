# IIITA Connect — Working Campus Event Management System

A React + Express + MongoDB application for campus event discovery and publishing at IIIT Allahabad.

## Implemented workflows

### Roles
- **Admin:** one account provisioned by `backend/.env` and `npm run seed:admin`. No public Admin signup.
- **Organizer:** submits an access request with a password. The request is saved in MongoDB and appears in the Admin dashboard. Admin can approve or reject it. On approval, an active Organizer account is created; the applicant can sign in with the password they supplied.
- **Student:** self-registers with an `@iiita.ac.in` email and signs in.

### Event workflow
- Approved Organizers can create and publish events directly from their dashboard.
- Published events appear in the Student event feed and Admin's event list.
- Students can register for events. Duplicate registrations are blocked and event capacity is enforced.
- Organizers can view attendees for their own events and cancel their own events.
- Admin dashboard shows basic counts, pending Organizer requests, and all events.

## Setup (Windows PowerShell)

1. Install Node.js 20+ and MongoDB Community Server. Start the MongoDB Windows service.
2. Open the project root in VS Code.
3. Copy `backend/.env.example` to `backend/.env`.
4. Edit `backend/.env`:
   ```env
   PORT=5000
   FRONTEND_ORIGIN=http://localhost:5173
   MONGODB_URI=mongodb://127.0.0.1:27017/iiita_connect
   JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
   JWT_EXPIRES_IN=1d
   ADMIN_NAME=IIITA Main Admin
   ADMIN_EMAIL=admin@iiita.ac.in
   ADMIN_PASSWORD=choose_a_unique_password_at_least_12_chars
   ```
5. From the project root:
   ```powershell
   npm install
   npm run install:all
   ```
6. Create or update the single Admin account:
   ```powershell
   cd backend
   npm run seed:admin
   cd ..
   ```
7. Start frontend and backend:
   ```powershell
   npm run dev
   ```
8. Open `http://localhost:5173`.

## Important notes
- Do not commit or share `backend/.env`. It contains secrets.
- Organizer request passwords are stored as bcrypt hashes, not plain text.
- Admin approval creates the Organizer user. The Organizer uses the password entered on the request form.
- Events are published immediately by an approved Organizer; there is no additional Admin event-approval step in this version.
- MongoDB collections are created automatically by Mongoose.
- API health check: `http://localhost:5000/api/health`.

## Troubleshooting
- If port 5000 is occupied, find its PID with `netstat -ano | findstr :5000`, then stop the old Node process or change `PORT` in `backend/.env` and `VITE_API_URL` in `frontend/.env`.
- If frontend says `Failed to fetch`, check the backend terminal and open `/api/health`.


## Admin moderation features

The Admin dashboard includes User Management for Student and Organizer accounts:
- Permanently delete Student accounts and their internal registrations.
- Permanently delete Organizer accounts, their events, and event registrations.
- Permanently delete events and their internal registrations.
- The single Admin account cannot be deleted through these routes.

Account status is checked against MongoDB on every authenticated API request.

When an Organizer cancels an event, the event status becomes `CANCELLED`, it disappears from the Student published-events feed, and internal registrations for that event are cleared. This project version does not have a separate notification collection or notification delivery system yet; external Google/Microsoft form responses remain with their form provider.


## Object-Oriented Methodology (OOM)

The backend is a layered, domain-oriented design (routes → controllers → services → domain / repositories):
- **Inheritance + polymorphism:** `Account` (abstract) → `Student`, `Organizer`, `Admin`; `RegistrationField` (abstract) → `TextField`, `EmailField`, `NumberField`, `SelectField`, `TextAreaField`; `DomainError` → `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `AuthenticationError`.
- **Encapsulation:** `#private` fields in all entities; capabilities (`canCreateEvents()`, `canManage()`) replace role-string checks.
- **Composition / aggregation / association:** `CampusEvent` owns a `RegistrationForm` (owning its fields) and a `RegistrationWindow`; `EventCatalog` aggregates events; events reference organizers by id.
- **Patterns:** Factory, Repository, Observer (domain event bus), Dependency Injection (`container.js`).
- **SOLID:** services depend on repository contracts, not Mongoose (DIP); new roles / field types / event listeners need no edits to existing code (OCP).
- **Tests:** `cd backend && npm test` runs 23 tests with in-memory repositories (no MongoDB needed).
- `docs/oom-design.md` has the full concept map, SOLID/pattern tables and UML diagrams (use-case, class, sequence, activity); PNGs are in `docs/diagrams/`.

## Event features
- Registration is optional per event (`requiresRegistration`). If on, a registration link is mandatory; optional `registrationOpensAt` / `registrationDeadline` (default: opens immediately, stays open until the event ends).
- Students see **Current / Upcoming / Past** tabs, computed automatically (`backend/src/domain/eventPhase.js`, mirrored in the dashboard and refreshed every 20 s).
- Cards show a short description preview; tapping a card opens the full details.
- Organizers edit or cancel their events from the event details popup; cancelled events move to a separate "Cancelled events" list. Permanent delete is Admin-only.
- Deleting an event or an account (Admin) requires typing the exact event title / email in a confirmation dialog; the API also rejects `DELETE` without a matching `confirmTitle`.

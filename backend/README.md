# IIITA Connect backend (MongoDB)

## Requirements
- Node.js 20+
- MongoDB Community Server running locally

## Setup
1. Copy `.env.example` to `.env` in this `backend` folder.
2. Set `MONGODB_URI=mongodb://127.0.0.1:27017/iiita_connect`.
3. Set a private `JWT_SECRET` with at least 32 characters.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters).
5. Install packages: `npm install`.
6. Create the initial Admin: `npm run seed:admin`.
7. Start API: `npm run dev`.

MongoDB creates the `iiita_connect` database and collections automatically when the first documents are inserted. No SQL schema import is needed.

## Auth API
- `POST /api/auth/login` with `{ "email", "password", "expectedRole" }`, where expectedRole is `ADMIN`, `ORGANIZER`, or `STUDENT`.
- `POST /api/auth/register/student` with `{ "name", "email", "password" }`.
- `POST /api/auth/organizer-request` with `{ "name", "email", "clubName", "reason" }`.
- `GET /api/auth/me` with `Authorization: Bearer <token>`.
- `GET /api/health` checks API process health; successful startup also confirms MongoDB connection.

Only the seed script creates the Admin. Student signup is self-service. Organizer requests are stored for review; approval and organizer account creation are not implemented yet.

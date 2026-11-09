# API (all routes are under /api/auth, except /api/health)

Public: `POST /login`, `POST /register/student`, `POST /organizer-request`, `GET /events`
Any signed-in user: `GET /me`
Student: `POST /student/events/:id/register`, `GET /student/registrations`, `GET /student/events/:id/registration-status`
Organizer: `POST /organizer/events`, `GET /organizer/events`, `PUT /organizer/events/:id`, `PATCH /organizer/events/:id/cancel`, `GET /organizer/events/:id/registrations`
Admin: `GET /admin/organizer-requests`, `PATCH /admin/organizer-requests/:id`, `GET /admin/events`, `GET /admin/stats`, `GET /admin/users`, `DELETE /admin/users/:id`, `DELETE /admin/events/:id`, `GET /admin/events/:id/registrations`

Errors are JSON: `{ "message": "...", "code": "VALIDATION_ERROR" }` with status 400 / 401 / 403 / 404 / 409.

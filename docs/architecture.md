# Architecture

React (Vite) presentation layer -> Express REST API -> MongoDB database.

Authentication flow:
1. User chooses Student, Organizer or Admin login tab.
2. Frontend sends email, password and expectedRole.
3. Backend looks up account by email, verifies bcrypt hash and ACTIVE status.
4. Backend compares the stored role with expectedRole.
5. Backend signs a JWT containing user ID and stored role.
6. React stores the token and redirects using the returned role.
7. Protected APIs verify JWT and authorize using the role claim.

Security:
- No public admin registration.
- Admin provisioned only through seed script and environment variables.
- Organizer account requests are stored separately; an admin approval workflow must create/activate an ORGANIZER user.
- Student self-registration restricted to @iiita.ac.in in this starter.
- Never trust a role supplied by the client.

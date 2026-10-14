# Security Plan
## Assets
Accounts/roles, request and inventory integrity, allocation approvals, dispatch records, signing secrets, database credentials, audit history and application availability.

## Controls
- Hash passwords using Argon2id or bcrypt via a maintained library.
- Short-lived tokens or a secure session strategy; validate on backend.
- Enforce roles on every protected endpoint; never trust browser-supplied roles.
- Validate schemas, enums, lengths, coordinate bounds, quantities and page sizes.
- Use SQLAlchemy parameterization; no raw SQL concatenation from user input.
- Keep `.env` out of Git; use placeholders in `.env.example`; rotate leaked secrets.
- Restrict CORS to known origins and use HTTPS when hosted.
- If cookies are used, configure Secure/HttpOnly/SameSite and consider CSRF protection.
- Rate-limit login if feasible; cap request payloads.
- Never log passwords/tokens; audit important state changes with safe metadata.
- Use fictional data; label simulated locations and recommendations.
- Re-check stock at approval and prevent concurrent double allocation.
- Do not expose stack traces or database connection strings to clients.

## Minimum checklist
No production default password; demo credentials limited to local/demo mode; tests for every role; config validation; database constraints; atomic approval; audit trail; dependency review; no secrets in frontend bundle/Git.

A hackathon prototype is not automatically production-ready. Real use would require security review, backups, monitoring, recovery testing, privacy/legal review, validated data and coordination with relevant authorities.

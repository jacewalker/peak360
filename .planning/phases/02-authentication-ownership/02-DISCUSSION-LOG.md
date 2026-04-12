# Phase 2: Authentication & Ownership - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 02-authentication-ownership
**Areas discussed:** Client invitation flow

---

## Client Invitation Flow

### Q1: How should a coach invite a client into the system?

| Option | Description | Selected |
|--------|-------------|----------|
| Email invite link | Coach enters client email, system sends a magic link or signup URL. Client clicks to set password and activate account. | ✓ |
| Coach creates credentials | Coach sets email + temporary password for the client. Hands them credentials directly. | |
| Auto-create on assessment | When coach creates assessment for new client email, account is auto-created. | |

**User's choice:** Email invite link
**Notes:** Recommended option — cleanest UX for both coach and client.

### Q2: What should the client see on first login?

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome + assessment list | Simple welcome message, then straight to assessment results. Minimal friction. | ✓ |
| Profile setup first | Client fills in basic profile before seeing assessments. More complete data but adds a step. | |
| You decide | Claude picks the approach that fits best. | |

**User's choice:** Welcome + assessment list
**Notes:** Minimal friction preferred.

### Q3: Client authentication method

| Option | Description | Selected |
|--------|-------------|----------|
| Set password on invite | Client clicks invite link, sets password, uses email+password going forward. | |
| Magic link every login | No passwords for clients — request a login link each time. More secure. | ✓ |
| You decide | Claude picks based on infrastructure constraints. | |

**User's choice:** Magic link every login
**Notes:** Zero-password experience for clients. Requires reliable email delivery.

### Q4: Coach scope

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-client dashboard | Each coach manages many clients. Dashboard shows client list with assessment status. | ✓ |
| Single coach for now | One coach account manages all clients. Simpler. | |

**User's choice:** Multi-client dashboard
**Notes:** Full multi-coach support from the start.

### Q5: Email delivery

| Option | Description | Selected |
|--------|-------------|----------|
| SMTP2Go | Already configured in project tooling. Transactional email via API or SMTP. | ✓ |
| Resend | Modern email API, generous free tier. | |
| Console log for now | Log links to console during dev. Wire up email later. | |

**User's choice:** SMTP2Go
**Notes:** Already set up in project tooling — no new infrastructure needed.

## Claude's Discretion

- Auth library choice (Better Auth vs custom)
- Magic link token format and expiry
- Database schema design for users/sessions
- Migration strategy from shared admin password
- Rate limiting for magic link requests

## Deferred Ideas

- Password reset for coaches (future — email infra now available)
- Two-factor authentication (future security enhancement)
- OAuth/social login (out of scope)
- Client self-registration (clients invited by coaches only)

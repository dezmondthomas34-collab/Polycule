# Polycule — a starter polyamory dating app

A real, runnable dating-app codebase built with **zero dependencies** — just
Node.js built-ins (`http`, `fs`, `crypto`, `path`). No `npm install` needed.

It was built as a working model/prototype: sign up, build a profile, discover
people, match, and message — all persisted to a local JSON file.

## Run it locally

Requires Node.js 18 or newer.

```bash
cd polyamory-app
node server.js
# or
npm start
```

Then open <http://localhost:3000> in your browser.

To use a different port:

```bash
PORT=8080 node server.js
```

### Try it in 2 minutes

1. Sign up with any email + a password (6+ characters).
2. Fill in **My Profile** (you must be 18+; the server enforces this) and save.
3. Go to **Discover**. The feed contains 8 clearly-labelled **fictional demo
   profiles** (singles and couples) plus any other real accounts created on
   your copy of the app.
4. Like someone. **Maya** and **Jordan** (the first two demo profiles) always
   like you back, so you can test matching instantly.
5. Open **Matches**, pick your match, and send a message. Demo matches send
   one canned reply after your first message.
6. Every profile card has **Report** and **Block** buttons; both hide the
   profile from your feed, and blocking also removes them from your matches.

To reset everything, stop the server and delete `data/db.json` — a fresh
empty database is created on the next run.

## How the code is organized

```
polyamory-app/
├── server.js          # Everything server-side: HTTP server, API, auth, DB
├── package.json       # Just a start script; there are no dependencies
├── public/
│   ├── index.html     # Single-page UI (auth, discover, matches, profile)
│   ├── styles.css     # All styling; avatars are initials in CSS circles
│   └── app.js         # Frontend logic; talks to the API with fetch()
└── data/
    └── db.json        # Created automatically on first run. All app data.
```

### The API (all JSON, `Authorization: Bearer <token>` after login)

| Method | Route | What it does |
|---|---|---|
| POST | `/api/signup` | Create account, returns a session token |
| POST | `/api/login` | Log in, returns a session token |
| POST | `/api/logout` | Invalidate the session token |
| GET | `/api/me` | Current user + profile |
| PUT | `/api/profile` | Create/edit your profile (18+ enforced) |
| GET | `/api/discover?style=` | Profiles you haven't liked/passed/blocked/reported |
| POST | `/api/like` | Like a profile; `{match: true}` on a mutual like |
| POST | `/api/pass` | Pass on a profile |
| GET | `/api/matches` | Your mutual matches |
| GET | `/api/messages?with=<id>` | Message thread with a match |
| POST | `/api/messages` | Send a message to a match |
| POST | `/api/block` | Block a profile (hides them everywhere) |
| POST | `/api/report` | Report a profile (hides them from your feed) |

### Data & auth details

- Everything lives in `data/db.json`: users, sessions, likes, passes,
  messages, blocks, reports. It's read/written with small helpers in
  `server.js` (`loadDb` / `saveDb`, atomic-ish via write-then-rename).
- Passwords are **never stored in plain text**: each user gets a random salt
  and a `crypto.scrypt` hash; login compares with `timingSafeEqual`.
- Sessions are random 32-byte tokens stored server-side in `db.json` and
  sent by the frontend in the `Authorization` header.
- Demo profiles live in `server.js` (`DEMO_PROFILES`). The first two are in
  `AUTO_LIKE_BACK`, which is what makes matching testable solo.

## Honest next steps before going truly public

This is a **starter codebase, not a production service**. Do not put real
users on it as-is. At minimum you would need:

- **Real auth hardening**: rate limiting, stronger password policy, email
  verification, password reset flow, session expiry/rotation, CSRF
  protection, and ideally a vetted auth library or provider instead of
  hand-rolled sessions.
- **HTTPS everywhere** (e.g. behind a reverse proxy with Let's Encrypt) —
  right now it speaks plain HTTP on your own machine only.
- **A real database** (Postgres/SQLite with proper schema and backups)
  instead of a single JSON file, which will not survive concurrent traffic.
- **Hosting**: a VPS or platform (Fly.io, Render, a small VPS, etc.),
  process management, logging, monitoring, and backups.
- **Moderation & safety systems**: human review of reports, photo/content
  moderation, ban tooling, abuse response process. The report/block buttons
  here only store a record — nobody is reviewing them.
- **Age verification**: the 18+ check here is an honour-system number in a
  form. A public dating service needs a defensible age-verification process.
- **Legal & privacy**: Terms of Service, a Privacy Policy, GDPR/CCPA-style
  data rights (export/delete my data), data-retention rules, and legal
  review. Dating data is among the most sensitive data there is.
- **Privacy engineering**: location fuzzing (never show exact locations),
  photo handling, screenshot/blocking protections, and strict limits on
  what other users can see by default.
- **Input hardening & testing**: stricter validation, security headers,
  dependency and penetration testing before launch.

## License

MIT — do what you like with it; it's a starting point, not a business.

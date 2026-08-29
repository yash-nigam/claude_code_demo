---
name: unawaited-promise-auth-bypass
description: Auth-path bugs in this repo cluster as truthiness/type-confusion errors (unawaited bcrypt.compare, inverted expiry comparison, JWT expiry helper applied to an opaque UUID) plus unbound token ops (revokeToken/refreshToken take no caller identity); authService.js also has a hard SyntaxError so it cannot be required at runtime
metadata:
  type: feedback
---

When auditing `src/auth/` in this repo, check boolean-producing security predicates for
truthiness bugs before anything else — that is where the real vulnerabilities are, not in
injection or crypto choice.

Confirmed instances (2026-08-18 audit of `src/auth/authService.js`):
- `bcrypt.compare(...)` called without `await`, result used in `if (!isPasswordValid)`.
  A pending Promise is always truthy, so the negation is always false and every password
  is accepted. Full pre-auth bypass.
- `isTokenExpired()` returns `decoded.exp > now` — inverted. Expired tokens report
  "not expired", valid tokens report "expired".
- `REFRESH_EXPIRES_IN` is read from env but never referenced; refresh tokens in the
  in-memory `Map` have no expiry enforcement at all.

**Type confusion masks the inverted operator — don't "fix" it with a one-character change.**
Re-confirmed 2026-08-18. `isTokenExpired()` is a *JWT* helper (`jwt.decode`), but its only
caller passes an **opaque UUID** refresh token. `jwt.decode(uuid)` returns `null`, so the
`!decoded` guard returns `true` before the comparison is ever reached. Runtime result: the
refresh endpoint *always* throws `'Refresh token expired'` **and deletes the token on the way
out**, so one refresh call permanently destroys a valid session (availability bug, and it
silently hides the inverted `>`).

Consequence for fixes: flipping `>` to `<=` changes nothing on the refresh path. The refresh
token has no `exp` claim at all — expiry must be derived from the `createdAt` already stored
in the `refreshTokenStore` map entry, compared against `REFRESH_EXPIRES_IN`. Verify any
proposed patch against both call paths (JWT access token vs UUID refresh token) before
accepting it.

**Why:** These read as correct on a skim — the function names, JSDoc, and control flow all
describe the right behaviour, and the bug is a single missing keyword or flipped operator.
ESLint's `require-await` does not catch a missing `await` on a call inside a non-async
context, and there is no test coverage on this module (see below), so nothing flags them.

**How to apply:** On any audit touching auth, grep for `bcrypt.compare`, `bcrypt.compareSync`,
`verify`, and any `is*Expired`/`is*Valid` helper, and read the call site's truthiness check
rather than the function body. Also verify every declared token-lifetime constant is actually
consumed somewhere.

**Runtime verification caveat:** `src/auth/authService.js` currently has `await` inside the
non-async `function refreshToken()` (~line 92), which is a parse-time SyntaxError. The module
cannot be `require()`d, so dynamic testing, `npm test`, and coverage all fail on it. To
reproduce findings at runtime, copy the file to the scratchpad and add the missing `async`
first — do not conclude the code is unreachable or unused just because it will not load.

Note: root `CLAUDE.md` says planted bugs are intentional for a demo. Still report them as
findings; the demo framing is not a reason to downgrade severity.

**Re-confirmed unchanged 2026-08-29** (branch `feature-validate-birth-date`). All four items
above are still present at the same lines: `bcrypt.compare` unawaited (`authService.js:32`),
inverted `decoded.exp > now` (`:68`), `REFRESH_EXPIRES_IN` still unreferenced (`:13`),
`await` in non-async `function refreshToken` (`:80`/`:92`). They are not being fixed between
audits — lead with them, don't re-derive them from scratch.

**Second failure mode in this file: unbound token operations (found 2026-08-29).**
`revokeToken(token)` and `refreshToken(token)` take *only* a token — no `userId`, no caller
identity. Reading `authService.js` alone this looks fine; the bug is only visible from
`routes.js`. `POST /logout` is behind `authenticate` but then passes `req.body.refreshToken`
straight to `revokeToken` with **no check that the token belongs to `req.user`** — so any
user with any valid access token can terminate any other user's session by guessing/replaying
a refresh UUID. Same shape on refresh: `getUserById` is a stub that echoes back whatever
`userId` it is given, so the refresh path never re-validates that the user still exists or is
still enabled.

**How to apply:** for every function in `authService.js` that accepts a bare token, check the
route that calls it and ask "whose token is this, and who is allowed to act on it?" The
ownership check does not exist anywhere in the request path.

**Already triaged — do not re-flag as findings:**
- *Log injection / CRLF forging via `logger.warn(\`... ${email}\`)`*: not exploitable.
  `src/utils/logger.js` builds an object and runs it through `JSON.stringify`, which escapes
  newlines and control characters. The interpolation looks unsafe on a skim but the sink is
  safe. (PII-in-logs is still a legitimate separate finding; log *injection* is not.)
- *Algorithm confusion / `none` on `jwt.verify` without an `algorithms` whitelist*
  (`tokenHelper.js:19`): jsonwebtoken is pinned to 9.0.3 in `package-lock.json`, which rejects
  `none` and restricts to HMAC when the key is a string. Report as defence-in-depth/Low, not High.
- *`node_modules/` is absent from the repo*, so nothing can be `require()`d and no runtime
  verification is possible without an install (which root `CLAUDE.md` forbids without asking).
  **Correction (2026-08-29): `npm audit` DOES work in-session** — it resolves purely from
  `package-lock.json`. Don't skip it. Beware: `ls node_modules | head -3 && echo PRESENT`
  reports PRESENT even when the dir is missing (pipeline exit status comes from `head`).
- *`uuid` moderate advisory GHSA-w5hq-g745-h8pq* (`<11.1.1`, resolved 9.0.1) — the only
  `npm audit` hit as of 2026-08-29. Not exploitable here: the bug is a missing bounds check
  on the optional `buf` argument of v3/v5/v6, and this repo only calls `uuidv4()` with no
  args. Report as informational hygiene, not a real finding.
- Everything else in the lockfile is on a current patched version (express 4.22.2,
  jsonwebtoken 9.0.3, body-parser 1.20.6, qs 6.15.3, path-to-regexp 0.1.13).

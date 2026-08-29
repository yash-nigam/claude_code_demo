---
name: jwt-secret-provisioning-and-test-env
description: JWT_SECRET now fails closed at module load in tokenHelper.js/authService.js, but nothing loads .env (no dotenv dependency at all), there is no entropy floor, and tests/setupEnv.js honours an ambient secret
metadata:
  type: feedback
---

When auditing secret handling in this repo, the interesting gap is **provisioning**, not the
guard itself. Check these four things before writing anything up.

**1. The guard is real and fail-closed.** As of branch `feature-validate-birth-date` (PR #1),
both `src/auth/tokenHelper.js` and `src/auth/authService.js` read `process.env.JWT_SECRET`
with no fallback and `throw` at module load if it is falsy. The `'dev-secret-key'` default is
gone from `src/`. Don't re-report the hardcoded-secret finding — verify with a grep first.

**2. Nothing ever loads `.env`.** There is no `dotenv` in `package.json` dependencies and no
`require('dotenv')` anywhere in the repo (verified 2026-08-29). But `README.md` line ~49 tells
developers to `cp .env.example .env`, and `.gitignore` whitelists `.env.example`. So the
documented setup path is decorative — the secret must be exported into the process environment
by hand or by the process manager. Since the guard now throws, `npm start` / `npm run dev`
crash for anyone following the README. This is the pressure that reintroduces hardcoded
fallbacks, so flag it whenever the fail-closed guard comes up.

**3. There is no entropy floor.** `if (!JWT_SECRET)` accepts `JWT_SECRET=x` — runtime-verified.
HS256 with a short secret is offline-crackable from one captured JWT. A "we removed the
hardcoded secret" PR is not complete without a length check (>=32 chars).

**4. `tests/setupEnv.js` honours an ambient secret**: `process.env.JWT_SECRET =
process.env.JWT_SECRET || 'test-secret-for-jest'`. If CI or a dev shell exports the real
secret, `npm test` runs against it and `tests/auth/tokenHelper.test.js` signs live tokens with
it. Tests should assign unconditionally. Related leftover: `tests/api/middleware.test.js:12`
still contains `process.env.JWT_SECRET || 'dev-secret-key'` — inert only because setupEnv
always sets the var, and it is a live copy of the exact secret that was just removed.

**Why:** The guard, the `algorithms: ['HS256']` pin, and a passing test suite make the secret
story look finished on a skim. All three are genuinely correct; the residual risk sits
entirely in how the value gets into the process and into the test runner.

**How to apply:** On any audit or PR review touching `JWT_SECRET`, run
`grep -rn "dotenv\|JWT_SECRET" --exclude-dir=node_modules` and check `README.md` /
`.env.example` wiring before judging the change complete. Note that `.claude/settings.json`
denies reads of `.env*` including `.env.example` — infer from README and `.gitignore` rather
than working around the deny rule. See [[unawaited-promise-auth-bypass]] for why a green test
suite proves nothing about `authService.js` here.

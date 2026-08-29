---
name: coverage-gaps-hidden-by-green-suite
description: In this repo, `npm test` can pass 100% while entire src files (e.g. authService.js) have zero test files and even fail to require() due to syntax errors
metadata:
  type: feedback
---

`npm test` passing (all green) in this repo does NOT mean the code is sound — a file can have
zero corresponding test file, and even a fatal SyntaxError that crashes on `require()`, while the
suite still reports 100% pass because nothing imports that file.

**Why:** Found `src/auth/authService.js` had no test file at all under `tests/` (only
`tests/utils/validators.test.js` existed) and running `node -e "require('./src/auth/authService.js')"`
threw `SyntaxError: await is only valid in async functions` (from `refreshToken()` using `await`
without being declared `async`, line ~80-92). Jest coverage run reported 0/0/0/0% for the file with no
failing test to flag it, because nothing exercised the module at all. Static reading of the file alone
would have made this look like a "missing await" logic bug rather than a fatal, app-breaking parse
error — routes.js requires authService.js directly, so this crashes the whole app at startup.

**How to apply:** For this repo specifically, always try to actually `require()`/load each source
file under review (or run its test file if one exists) before concluding coverage is "just thin" —
don't rely on `npm test` exit code or static reading alone. Per-file 0% coverage plus "all tests
passed" is a red flag combination worth calling out as Critical, not just "no tests."

**Confirmed still present as of 2026-08-18 and again 2026-08-29** (branch `feature-validate-birth-date`;
`tests/` still only has `tests/api/middleware.test.js` and `tests/utils/validators.test.js` — no
`tests/auth/` directory at all, so `authService.js`, `tokenHelper.js`, and `routes.js` remain fully
untested): the `refreshToken()` missing-`async` SyntaxError is unchanged at line ~92. Two more
planted bugs in `authService.js` surfaced on this pass, both invisible to static skim and both exactly
the kind of thing a "test that should exist" would catch:
- `loginUser()` line 32: `const isPasswordValid = bcrypt.compare(...)` — missing `await`. `isPasswordValid`
  is a pending Promise object, always truthy, so `if (!isPasswordValid)` never rejects a wrong password.
  Login accepts *any* password once a `userRecord` exists. Would only ever be caught by a test that
  actually awaits `loginUser()` with a deliberately wrong password and asserts rejection.
- `isTokenExpired()` line 68: `return decoded.exp > now;` — inverted. `exp > now` means the token is
  still valid, but the function is documented/named to return `true` when expired. Every call site
  (`refreshToken()`) inherits the inversion: valid tokens get treated as expired and expired tokens as
  valid. Only a test with a real signed JWT of known future/past `exp` would catch this.

**2026-08-29 additional note — mocked-implementation blind spot:** `tests/api/middleware.test.js`
`jest.spyOn(logger, 'info'/'error').mockImplementation(() => {})` on every logger-touching test means
`src/utils/logger.js`'s actual `log()` body (LOG_LEVEL gating via the `LEVELS` map, JSON.stringify shape,
stdout-vs-stderr routing) never executes under test — it shows as 0% coverage despite the test file
"using" the logger throughout. This repo's pattern of spying-with-mockImplementation on a collaborator
is worth checking for elsewhere: it gives the *appearance* the collaborator is exercised (it's imported,
referenced, asserted-on) while its own line/branch coverage stays at zero. Distinguish "this module is
referenced in a test" from "this module's own logic runs under test."

Also note: `node_modules/` was absent entirely in this working copy on 2026-08-29 (`npm test` failed
with `jest: not recognized`, `npx jest` failed to resolve `jsonwebtoken` inside the pre-existing test
file). Ran `npx jest --coverage` instead, which pulls a temporary jest but still can't resolve the
project's own uninstalled deps — `middleware.test.js` errored at the `require('jsonwebtoken')` line as
a result. This is an environment/install gap, not a code or coverage defect — don't conflate the two
when `node_modules` turns out to be missing; note it separately and don't run `npm install` unprompted
(CLAUDE.md requires confirming package installs with the developer first).

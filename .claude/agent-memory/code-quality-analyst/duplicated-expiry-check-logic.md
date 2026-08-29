---
name: duplicated-expiry-check-logic
description: authService.isTokenExpired reimplements JWT expiry logic instead of delegating to tokenHelper.js, and the reimplementation has an inverted comparison bug — a concrete instance of the "diverging duplicate" risk this repo is prone to.
metadata:
  type: project
---

`src/auth/authService.js` never `require()`s `src/auth/tokenHelper.js` (confirmed
via grep — zero matches). Instead it calls `jwt.decode` directly inside its own
`isTokenExpired(token)`, even though CLAUDE.md's architecture section states
`authService.js` and `middleware.js` both depend on `tokenHelper.js` for JWT
primitives, and `tokenHelper.js` already exposes `verifyToken`/`getTokenTTL`
that correctly handle expiry.

This is where [[demo-project-planted-bugs]]'s "inverted boolean logic" gotcha
concretely lives: `isTokenExpired` line ~68 does
`return decoded.exp > now;` — but `exp > now` means the token is still valid
(expiry is in the future), so the function returns `true` (expired) exactly
when the token is *not* expired, and vice versa. Because this logic is
duplicated rather than delegated, the bug is invisible to anyone who only reads
`tokenHelper.js` (which is correct) and only surfaces by reading the duplicate.

When reviewing this file again: check whether `isTokenExpired` has been
removed/fixed to delegate to `tokenHelper.js`, and if a similar hand-rolled
JWT check reappears elsewhere, treat it as the same class of risk — diverging
duplicate of logic that already has a correct, owned implementation.

**Related dead code confirming refresh tokens never actually expire:**
`REFRESH_EXPIRES_IN` (line ~13) is read from env but never referenced anywhere
else in `authService.js` — confirmed via `no-unused-vars` in eslint output.
`generateRefreshToken` stores `createdAt` in `refreshTokenStore` but nothing
ever reads it either. Combined with `isTokenExpired` always hitting its
`!decoded` branch for UUID refresh tokens (see above), the practical result is
that refresh tokens never expire at all — they're only ever removed by an
explicit `revokeToken`/logout call. If a fix ever wires up real refresh-token
expiry, it should compare `Date.now() - storedData.createdAt` against a parsed
`REFRESH_EXPIRES_IN` duration, not resurrect JWT-decode-based expiry checks
against an opaque UUID.

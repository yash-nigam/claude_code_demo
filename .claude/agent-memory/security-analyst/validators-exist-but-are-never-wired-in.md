---
name: validators-exist-but-are-never-wired-in
description: src/utils/validators.js keeps growing (phone, UUID, credit card, DOB, sanitizeString) but only validateEmail/validatePassword are ever called; validateEmail also validates a trimmed string while callers use the untrimmed original
metadata:
  type: feedback
---

The validator module in this repo is a decoy surface. Check wiring before depth.

**Rule: before analysing any function in `src/utils/validators.js`, grep for its call sites
in `src/`. Most have none.** As of 2026-08-29 only `validateEmail` and `validatePassword`
are called (both in `src/api/routes.js` on `POST /login`). `validatePhoneNumber`,
`validateUUID`, `validateCreditCard`, `validateDateOfBirth`, and `sanitizeString` are
exported and unit-tested but invoked from nowhere in the application.

Consequences for an audit:
- `sanitizeString` being dead is itself the finding — no route sanitises anything. Don't
  report "sanitisation is weak"; report "sanitisation is never applied".
- `validateDateOfBirth` (added in commit `de91f6f`) is **behaviourally correct** on the
  security-relevant edges — I ran it: rejects `2026-02-31`, `2027-01-01`, `1899-01-01`,
  `2000-1-15`, `+002000-01-15`, and all non-string input; the
  `date.toISOString().slice(0,10) === dob` round-trip is what kills rollover dates. It has
  no route behind it. Don't spend audit budget re-deriving this.

**The real validator bug is a validate-one-value / use-another mismatch.**
`validateEmail` tests `emailRegex.test(email.trim())` but `routes.js` then passes the
**untrimmed** `email` into `loginUser`, the `mockUserRecord`, the logger, and the JWT
`email` claim. Verified: `validateEmail("a@b.c\n") === true`. So CR/LF and surrounding
whitespace survive validation and reach every downstream sink. Today the sinks are safe
(JSON encoding), but this is the pattern to re-check the moment email is used in an
SMTP header, a URL, or a DB lookup.

**Why:** The directory's own `src/utils/CLAUDE.md` mandates single-composed-expression
validators with a test for valid/invalid/non-string input, so this file always looks
thoroughly covered and correct. Coverage and style compliance say nothing about whether
the validator is reachable from a request.

**How to apply:** On any audit touching validators, do the call-site grep first, then
diff "what the validator normalised" against "what the caller actually forwards". See
[[unawaited-promise-auth-bypass]] for the auth-path equivalent of this looks-right-on-a-skim
failure mode.

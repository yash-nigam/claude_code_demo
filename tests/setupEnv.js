/**
 * Jest setupFiles hook — runs before each test file's modules are required.
 * Supplies a test-only JWT_SECRET so src/auth/tokenHelper.js and
 * src/auth/authService.js (which now throw if JWT_SECRET is unset) can load.
 *
 * Assigned unconditionally, not with `||`: if a real JWT_SECRET is already
 * exported in the environment (e.g. a production value in CI), tests must
 * not sign or verify tokens with it — that would turn a test-run log into a
 * working auth credential.
 */

process.env.JWT_SECRET = 'test-secret-for-jest';

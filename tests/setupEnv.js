/**
 * Jest setupFiles hook — runs before each test file's modules are required.
 * Supplies a test-only JWT_SECRET so src/auth/tokenHelper.js and
 * src/auth/authService.js (which now throw if JWT_SECRET is unset) can load.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jest';

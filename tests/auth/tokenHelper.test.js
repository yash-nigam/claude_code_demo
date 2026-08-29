const jwt = require('jsonwebtoken');

describe('module load', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    jest.resetModules();
  });

  test('throws if JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    jest.resetModules();

    expect(() => require('../../src/auth/tokenHelper')).toThrow('JWT_SECRET environment variable must be set');
  });

  test('throws if JWT_SECRET is an empty string', () => {
    process.env.JWT_SECRET = '';
    jest.resetModules();

    expect(() => require('../../src/auth/tokenHelper')).toThrow('JWT_SECRET environment variable must be set');
  });
});

describe('verifyToken', () => {
  const { verifyToken } = require('../../src/auth/tokenHelper');

  test('returns the decoded payload for a validly signed token', () => {
    const token = jwt.sign({ sub: 'user-1' }, process.env.JWT_SECRET);

    expect(verifyToken(token)).toMatchObject({ sub: 'user-1' });
  });

  test('rejects a token signed with a non-HS256 algorithm', () => {
    const token = jwt.sign({ sub: 'user-1' }, process.env.JWT_SECRET, { algorithm: 'HS384' });

    expect(() => verifyToken(token)).toThrow('Invalid token');
  });

  test('rejects a token signed with the "none" algorithm', () => {
    const token = jwt.sign({ sub: 'attacker', role: 'admin' }, '', { algorithm: 'none' });

    expect(() => verifyToken(token)).toThrow('Invalid token');
  });
});

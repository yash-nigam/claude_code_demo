const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');

const {
  requestLogger,
  authenticate,
  validateBody,
  errorHandler
} = require('../../src/api/middleware');
const { logger } = require('../../src/utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Builds a minimal Express-like request object.
 *
 * @param {object} overrides - properties to merge over the defaults
 * @returns {object}
 */
function createRequest(overrides = {}) {
  return {
    method: 'GET',
    path: '/api/auth/me',
    headers: {},
    body: {},
    ...overrides
  };
}

/**
 * Builds a minimal Express-like response object. Extends EventEmitter so
 * that middleware subscribing to the 'finish' event behaves as it would
 * under a real server.
 *
 * @returns {object}
 */
function createResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn(() => res);
  return res;
}

/**
 * Signs a JWT with the secret the application uses.
 *
 * @param {object} payload
 * @param {object} options - jwt.sign options, e.g. { expiresIn }
 * @returns {string}
 */
function signToken(payload = { sub: 'user-001', email: 'user@example.com', role: 'user' }, options = { expiresIn: '1h' }) {
  return jwt.sign(payload, JWT_SECRET, options);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestLogger', () => {
  test('calls next exactly once so the request continues', () => {
    const next = jest.fn();
    requestLogger(createRequest(), createResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('does not log until the response has finished', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    requestLogger(createRequest(), createResponse(), jest.fn());
    expect(spy).not.toHaveBeenCalled();
  });

  test('logs method, path and status code once the response finishes', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const res = createResponse();
    res.statusCode = 201;

    requestLogger(createRequest({ method: 'POST', path: '/api/auth/login' }), res, jest.fn());
    res.emit('finish');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('POST');
    expect(spy.mock.calls[0][0]).toContain('/api/auth/login');
    expect(spy.mock.calls[0][0]).toContain('201');
  });

  test('reports the elapsed duration in milliseconds', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1150);

    const res = createResponse();
    requestLogger(createRequest(), res, jest.fn());
    res.emit('finish');

    expect(spy.mock.calls[0][0]).toContain('150ms');
  });

  test('logs the status code the handler actually set, not the default', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const res = createResponse();

    requestLogger(createRequest(), res, jest.fn());
    res.statusCode = 404;
    res.emit('finish');

    expect(spy.mock.calls[0][0]).toContain('404');
  });

  test('logs once per response, even if finish is emitted repeatedly', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const res = createResponse();

    requestLogger(createRequest(), res, jest.fn());
    res.emit('finish');
    res.emit('finish');

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('authenticate', () => {
  test('attaches the decoded payload to req.user for a valid token', () => {
    const req = createRequest({ headers: { authorization: `Bearer ${signToken()}` } });
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(req.user).toMatchObject({
      sub: 'user-001',
      email: 'user@example.com',
      role: 'user'
    });
  });

  test('calls next and sets no status code for a valid token', () => {
    const req = createRequest({ headers: { authorization: `Bearer ${signToken()}` } });
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('responds 401 when the Authorization header is absent', () => {
    const res = createResponse();
    const next = jest.fn();

    authenticate(createRequest(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 401 when the header omits the Bearer scheme', () => {
    const req = createRequest({ headers: { authorization: signToken() } });
    const res = createResponse();

    authenticate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
  });

  test('responds 401 for a lowercase bearer scheme, as matching is case-sensitive', () => {
    const req = createRequest({ headers: { authorization: `bearer ${signToken()}` } });
    const res = createResponse();

    authenticate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
  });

  test('responds 401 when the Bearer scheme is present but the token is empty', () => {
    const req = createRequest({ headers: { authorization: 'Bearer ' } });
    const res = createResponse();

    authenticate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
  });

  test('responds 401 with an expiry message for an expired token', () => {
    const expired = signToken({ sub: 'user-001' }, { expiresIn: '-1h' });
    const req = createRequest({ headers: { authorization: `Bearer ${expired}` } });
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token has expired' });
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 401 with an invalid-token message for a malformed token', () => {
    const req = createRequest({ headers: { authorization: 'Bearer not-a-jwt' } });
    const res = createResponse();

    authenticate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  test('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'attacker', role: 'admin' }, 'wrong-secret');
    const req = createRequest({ headers: { authorization: `Bearer ${forged}` } });
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a token using the "none" algorithm', () => {
    const unsigned = jwt.sign({ sub: 'attacker', role: 'admin' }, '', { algorithm: 'none' });
    const req = createRequest({ headers: { authorization: `Bearer ${unsigned}` } });
    const res = createResponse();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('leaves req.user unset when authentication fails', () => {
    const req = createRequest({ headers: { authorization: 'Bearer not-a-jwt' } });

    authenticate(req, createResponse(), jest.fn());

    expect(req.user).toBeUndefined();
  });
});

describe('validateBody', () => {
  test('calls next when every required field is present', () => {
    const middleware = validateBody(['email', 'password']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { email: 'user@example.com', password: 'secret123' } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('responds 400 naming the single missing field', () => {
    const middleware = validateBody(['email', 'password']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { email: 'user@example.com' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: password' });
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 400 listing every missing field, comma separated', () => {
    const middleware = validateBody(['email', 'password']);
    const res = createResponse();

    middleware(createRequest({ body: {} }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: email, password' });
  });

  test('treats an empty string as a missing field', () => {
    const middleware = validateBody(['email']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { email: '' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('treats an explicit undefined as a missing field', () => {
    const middleware = validateBody(['email']);
    const res = createResponse();

    middleware(createRequest({ body: { email: undefined } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('accepts null as present, since only undefined and empty string are rejected', () => {
    const middleware = validateBody(['email']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { email: null } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accepts falsy values such as 0 and false as present', () => {
    const middleware = validateBody(['count', 'enabled']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { count: 0, enabled: false } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('ignores extra fields that were not required', () => {
    const middleware = validateBody(['email']);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: { email: 'user@example.com', nickname: 'yash' } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('calls next when the required field list is empty', () => {
    const middleware = validateBody([]);
    const res = createResponse();
    const next = jest.fn();

    middleware(createRequest({ body: {} }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns a fresh middleware function per call', () => {
    expect(typeof validateBody(['email'])).toBe('function');
    expect(validateBody(['email'])).not.toBe(validateBody(['email']));
  });
});

describe('errorHandler', () => {
  test('responds 500 with a generic message', () => {
    const res = createResponse();

    errorHandler(new Error('boom'), createRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'An unexpected error occurred' });
  });

  test('does not leak the internal error message to the client', () => {
    const res = createResponse();

    errorHandler(new Error('connection string user:hunter2@db'), createRequest(), res, jest.fn());

    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('hunter2');
  });

  test('logs the error with the request method and path', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    errorHandler(
      new Error('boom'),
      createRequest({ method: 'POST', path: '/api/auth/login' }),
      createResponse(),
      jest.fn()
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('POST');
    expect(spy.mock.calls[0][0]).toContain('/api/auth/login');
    expect(spy.mock.calls[0][0]).toContain('boom');
  });

  test('does not delegate to next, since it is the terminal handler', () => {
    const next = jest.fn();

    errorHandler(new Error('boom'), createRequest(), createResponse(), next);

    expect(next).not.toHaveBeenCalled();
  });
});

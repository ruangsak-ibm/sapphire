/**
 * Tests for authentication middleware
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { requireAuth, optionalAuth } = require('./auth');

// Mock request and response objects
function createMockReq(headers = {}) {
  return {
    headers
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

function createMockNext() {
  return {
    called: false,
    call() {
      this.called = true;
    }
  };
}

test('requireAuth - rejects missing authorization header', () => {
  const req = createMockReq({});
  const res = createMockRes();
  const next = createMockNext();

  requireAuth(req, res, next.call.bind(next));

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.jsonData.success, false);
  assert.ok(res.jsonData.error.includes('Authentication required'));
  assert.strictEqual(next.called, false);
});

test('requireAuth - rejects malformed authorization header', () => {
  const req = createMockReq({ authorization: 'Basic xyz' });
  const res = createMockRes();
  const next = createMockNext();

  requireAuth(req, res, next.call.bind(next));

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.jsonData.success, false);
  assert.strictEqual(next.called, false);
});

test('requireAuth - rejects empty bearer token', () => {
  const req = createMockReq({ authorization: 'Bearer ' });
  const res = createMockRes();
  const next = createMockNext();

  requireAuth(req, res, next.call.bind(next));

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.jsonData.success, false);
  assert.strictEqual(next.called, false);
});

test('requireAuth - rejects short token when no API_KEY env var set', () => {
  const originalApiKey = process.env.API_KEY;
  delete process.env.API_KEY;

  const req = createMockReq({ authorization: 'Bearer short' });
  const res = createMockRes();
  const next = createMockNext();

  requireAuth(req, res, next.call.bind(next));

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.jsonData.success, false);
  assert.strictEqual(next.called, false);

  if (originalApiKey) process.env.API_KEY = originalApiKey;
});

test('requireAuth - accepts 8+ char token when no API_KEY env var set', () => {
  const originalApiKey = process.env.API_KEY;
  delete process.env.API_KEY;

  const req = createMockReq({ authorization: 'Bearer 12345678' });
  const res = createMockRes();
  const next = createMockNext();

  requireAuth(req, res, next.call.bind(next));

  assert.strictEqual(res.statusCode, 200); // Should not change
  assert.strictEqual(next.called, true);
  assert.strictEqual(req.clientKey, '12345678');

  if (originalApiKey) process.env.API_KEY = originalApiKey;
});

test('requireAuth - validates against API_KEY env var when set', () => {
  const originalApiKey = process.env.API_KEY;
  process.env.API_KEY = 'configured-api-key';

  // Test with wrong key
  const req1 = createMockReq({ authorization: 'Bearer wrong-key' });
  const res1 = createMockRes();
  const next1 = createMockNext();

  requireAuth(req1, res1, next1.call.bind(next1));

  assert.strictEqual(res1.statusCode, 401);
  assert.strictEqual(res1.jsonData.success, false);
  assert.strictEqual(next1.called, false);

  // Test with correct key
  const req2 = createMockReq({ authorization: 'Bearer configured-api-key' });
  const res2 = createMockRes();
  const next2 = createMockNext();

  requireAuth(req2, res2, next2.call.bind(next2));

  assert.strictEqual(res2.statusCode, 200); // Should not change
  assert.strictEqual(next2.called, true);
  assert.strictEqual(req2.clientKey, 'configured-api-key');

  // Restore
  if (originalApiKey) {
    process.env.API_KEY = originalApiKey;
  } else {
    delete process.env.API_KEY;
  }
});

test('optionalAuth - allows missing authorization header', () => {
  const req = createMockReq({});
  const res = createMockRes();
  const next = createMockNext();

  optionalAuth(req, res, next.call.bind(next));

  assert.strictEqual(next.called, true);
  assert.strictEqual(req.clientKey, undefined);
});

test('optionalAuth - allows malformed authorization header', () => {
  const req = createMockReq({ authorization: 'Basic xyz' });
  const res = createMockRes();
  const next = createMockNext();

  optionalAuth(req, res, next.call.bind(next));

  assert.strictEqual(next.called, true);
  assert.strictEqual(req.clientKey, undefined);
});

test('optionalAuth - extracts valid bearer token', () => {
  const originalApiKey = process.env.API_KEY;
  delete process.env.API_KEY;

  const req = createMockReq({ authorization: 'Bearer 12345678' });
  const res = createMockRes();
  const next = createMockNext();

  optionalAuth(req, res, next.call.bind(next));

  assert.strictEqual(next.called, true);
  assert.strictEqual(req.clientKey, '12345678');

  if (originalApiKey) process.env.API_KEY = originalApiKey;
});

test('optionalAuth - rejects short bearer token', () => {
  const originalApiKey = process.env.API_KEY;
  delete process.env.API_KEY;

  const req = createMockReq({ authorization: 'Bearer short' });
  const res = createMockRes();
  const next = createMockNext();

  optionalAuth(req, res, next.call.bind(next));

  assert.strictEqual(next.called, true);
  assert.strictEqual(req.clientKey, undefined);

  if (originalApiKey) process.env.API_KEY = originalApiKey;
});

/**
 * Tests for utility functions
 */
const { test } = require('node:test');
const assert = require('node:assert');
const utils = require('./utils');

test('generateId - generates valid IDs with prefix', () => {
  const id = utils.generateId('test');
  assert(id.startsWith('test_'), 'ID should start with prefix');
  assert(id.length > 5, 'ID should have sufficient length');
});

test('generateId - throws error without prefix', () => {
  assert.throws(() => {
    utils.generateId(null);
  }, /Prefix is required/);
});

test('generateId - generates unique IDs', () => {
  const id1 = utils.generateId('test');
  const id2 = utils.generateId('test');
  assert.notStrictEqual(id1, id2, 'Generated IDs should be unique');
});

test('validateBloodPressure - accepts valid readings', () => {
  assert.doesNotThrow(() => {
    utils.validateBloodPressure(120, 80);
  });
});

test('validateBloodPressure - rejects non-numeric values', () => {
  assert.throws(() => {
    utils.validateBloodPressure('120', 80);
  }, /must be numbers/);
});

test('validateBloodPressure - rejects out-of-range systolic', () => {
  assert.throws(() => {
    utils.validateBloodPressure(400, 80);
  }, /Systolic must be between/);
});

test('validateBloodPressure - rejects out-of-range diastolic', () => {
  assert.throws(() => {
    utils.validateBloodPressure(120, 250);
  }, /Diastolic must be between/);
});

test('validateBloodPressure - rejects systolic < diastolic', () => {
  assert.throws(() => {
    utils.validateBloodPressure(60, 90);
  }, /Systolic must be greater than/);
});

test('formatBloodPressure - formats correctly', () => {
  const result = utils.formatBloodPressure(120, 80);
  assert.strictEqual(result, '120/80 mmHg');
});

test('formatBloodPressure - includes pulse when provided', () => {
  const result = utils.formatBloodPressure(120, 80, 70);
  assert.strictEqual(result, '120/80 mmHg @ 70 bpm');
});

test('categorizeBP - categorizes normal BP', () => {
  const result = utils.categorizeBP(119, 79);
  assert.strictEqual(result, 'Normal');
});

test('categorizeBP - categorizes elevated BP', () => {
  const result = utils.categorizeBP(125, 79);
  assert.strictEqual(result, 'Elevated');
});

test('categorizeBP - categorizes high BP stage 1', () => {
  const result = utils.categorizeBP(135, 85);
  assert.strictEqual(result, 'High BP Stage 1');
});

test('categorizeBP - categorizes high BP stage 2', () => {
  const result = utils.categorizeBP(150, 95);
  assert.strictEqual(result, 'High BP Stage 2');
});

test('categorizeBP - categorizes hypertensive crisis', () => {
  const result = utils.categorizeBP(200, 130);
  assert.strictEqual(result, 'Hypertensive Crisis');
});

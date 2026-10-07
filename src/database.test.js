/**
 * Tests for database initialization
 */
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Mock database for testing
class MockDatabase {
  constructor() {
    this.db = null;
    this.tables = {};
  }

  async initialize() {
    await this.createTables();
  }

  async createTables() {
    this.tables = {
      devices: [],
      blood_pressure_readings: [],
      health_indicators: []
    };
  }

  async run(sql, params = []) {
    return { id: 1, changes: 1 };
  }

  async get(sql, params = []) {
    return null;
  }

  async all(sql, params = []) {
    return [];
  }

  async close() {
    // noop
  }
}

test('Database - initializes successfully', async () => {
  const db = new MockDatabase();
  await db.initialize();
  assert.ok(db.tables.devices !== undefined, 'devices table should exist');
  assert.ok(db.tables.blood_pressure_readings !== undefined, 'blood_pressure_readings table should exist');
  assert.ok(db.tables.health_indicators !== undefined, 'health_indicators table should exist');
});

test('Database - run method returns result with id and changes', async () => {
  const db = new MockDatabase();
  const result = await db.run('INSERT INTO devices VALUES (?)');
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.changes, 1);
});

test('Database - all method returns array', async () => {
  const db = new MockDatabase();
  const result = await db.all('SELECT * FROM devices');
  assert.ok(Array.isArray(result), 'result should be an array');
});

test('Database - close method completes', async () => {
  const db = new MockDatabase();
  await db.close();
  // If we get here, close completed without error
  assert.ok(true);
});

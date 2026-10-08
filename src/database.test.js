/**
 * Tests for database initialization and management
 */
const { test } = require('node:test');
const assert = require('node:assert');
const database = require('./database');
const path = require('path');
const fs = require('fs');

test('Database - initializes successfully', async () => {
  await database.initialize();
  assert.ok(database.db, 'Database connection should be established');
});

test('Database - creates required tables', async () => {
  await database.initialize();
  
  // Verify devices table exists
  const deviceTable = await database.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='devices'"
  );
  assert.ok(deviceTable, 'devices table should exist');

  // Verify blood_pressure_readings table exists
  const readingsTable = await database.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='blood_pressure_readings'"
  );
  assert.ok(readingsTable, 'blood_pressure_readings table should exist');

  // Verify health_indicators table exists
  const indicatorsTable = await database.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='health_indicators'"
  );
  assert.ok(indicatorsTable, 'health_indicators table should exist');
});

test('Database - run method executes queries', async () => {
  const uniqueSN = 'SN_DB_TEST_' + Date.now();
  const result = await database.run(
    "INSERT INTO devices (id, name, type, serial_number) VALUES (?, ?, ?, ?)",
    ['test_device_db_' + Date.now(), 'Test Device', 'blood_pressure', uniqueSN]
  );
  assert.ok(result, 'run should return result');
  assert.ok(result.changes >= 0, 'result should have changes count');
});

test('Database - get method retrieves single row', async () => {
  const uniqueSN = 'SN_DB_GET_TEST_' + Date.now();
  const deviceId = 'test_device_get_' + Date.now();
  
  await database.run(
    "INSERT INTO devices (id, name, type, serial_number) VALUES (?, ?, ?, ?)",
    [deviceId, 'Test Device 2', 'blood_pressure', uniqueSN]
  );

  const result = await database.get(
    "SELECT * FROM devices WHERE id = ?",
    [deviceId]
  );
  assert.ok(result, 'get should return row');
  assert.strictEqual(result.name, 'Test Device 2');
});

test('Database - all method returns array', async () => {
  const result = await database.all("SELECT * FROM devices");
  assert.ok(Array.isArray(result), 'all should return array');
});

test('Database - close method completes', async () => {
  // Create a new database instance for closing
  const testDb = require('./database');
  await testDb.close();
  assert.ok(true, 'close should complete without error');
});

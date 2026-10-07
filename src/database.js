/**
 * Database initialization and management
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/health.db');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return Promise.all([
      this.run(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          manufacturer TEXT,
          model TEXT,
          serial_number TEXT UNIQUE,
          status TEXT DEFAULT 'active',
          last_sync DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `),
      this.run(`
        CREATE TABLE IF NOT EXISTS blood_pressure_readings (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL,
          systolic INTEGER NOT NULL,
          diastolic INTEGER NOT NULL,
          pulse INTEGER,
          measurement_time DATETIME NOT NULL,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (device_id) REFERENCES devices(id)
        )
      `),
      this.run(`
        CREATE TABLE IF NOT EXISTS health_indicators (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL,
          indicator_type TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (device_id) REFERENCES devices(id)
        )
      `)
    ]);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'mieter.db');

let db;

// Kompatible API (ähnlich better-sqlite3)
function prepare(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      const idRes = db.exec('SELECT last_insert_rowid()');
      const lastInsertRowid = idRes[0]?.values[0][0] ?? null;
      save();
      return { lastInsertRowid };
    },
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }
  };
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT, email TEXT, phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    type TEXT NOT NULL, value REAL NOT NULL,
    unit TEXT NOT NULL, period TEXT NOT NULL, note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS damage_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'offen',
    admin_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  save();

  // Demo-Daten nur beim ersten Start
  const admin = prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    prepare(`INSERT INTO users (username,password,role,name,email) VALUES (?,?,'admin','Vermieter','vermieter@example.com')`).run('admin', bcrypt.hashSync('admin123', 10));
    prepare(`INSERT INTO users (username,password,role,name,unit,email,phone) VALUES (?,?,'tenant','Hans Müller','WE 1 OG','mueller@example.com','0170 1234567')`).run('mueller', bcrypt.hashSync('mieter123', 10));
    prepare(`INSERT INTO users (username,password,role,name,unit,email,phone) VALUES (?,?,'tenant','Maria Schmidt','WE 2 EG','schmidt@example.com','0171 9876543')`).run('schmidt', bcrypt.hashSync('mieter123', 10));

    const m1 = prepare('SELECT id FROM users WHERE username=?').get('mueller');
    const m2 = prepare('SELECT id FROM users WHERE username=?').get('schmidt');

    const periods  = ['2025-10','2025-11','2025-12','2026-01','2026-02','2026-03'];
    const strom    = [210,195,230,245,220,208];
    const wasser   = [8.2,7.9,8.5,9.1,8.8,8.3];
    const heizung  = [120,180,220,240,195,145];

    for (let i = 0; i < periods.length; i++) {
      const ins = `INSERT INTO consumption (tenant_id,type,value,unit,period) VALUES (?,?,?,?,?)`;
      prepare(ins).run(m1.id,'strom',   strom[i],   'kWh', periods[i]);
      prepare(ins).run(m1.id,'wasser',  wasser[i],  'm³',  periods[i]);
      prepare(ins).run(m1.id,'heizung', heizung[i], 'kWh', periods[i]);
      prepare(ins).run(m2.id,'strom',   strom[i]-20,             'kWh', periods[i]);
      prepare(ins).run(m2.id,'wasser',  +(wasser[i]-1.2).toFixed(1),'m³', periods[i]);
      prepare(ins).run(m2.id,'heizung', heizung[i]-15,           'kWh', periods[i]);
    }

    prepare(`INSERT INTO damage_reports (tenant_id,title,description,category,priority,status) VALUES (?,?,?,?,?,?)`).run(m1.id,'Wasserhahn tropft','Der Wasserhahn im Bad tropft kontinuierlich.','sanitaer','normal','in_bearbeitung');
    prepare(`INSERT INTO damage_reports (tenant_id,title,description,category,priority,status,admin_note) VALUES (?,?,?,?,?,?,?)`).run(m2.id,'Heizung heizt nicht','Heizkörper im Wohnzimmer funktioniert nicht.','heizung','hoch','erledigt','Thermostatventil ausgetauscht am 15.03.2026.');
    prepare(`INSERT INTO announcements (title,content,type) VALUES (?,?,?)`).run('Jahresabrechnung 2025','Die Nebenkostenabrechnung für 2025 wird bis Ende April 2026 versandt.','info');

    console.log('Demo-Daten erstellt: admin/admin123, mueller/mieter123, schmidt/mieter123');
  }
}

module.exports = { prepare, init };

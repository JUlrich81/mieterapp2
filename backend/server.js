const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { prepare, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'mietapp-geheim-2026-freyler';

app.use(cors());
app.use(express.json());

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Kein Token' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Nur für Vermieter' });
  next();
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });

  const user = prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, unit: user.unit },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name, unit: user.unit, email: user.email }
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = prepare('SELECT id, username, role, name, unit, email, phone FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── Mieter (Tenant) Routes ────────────────────────────────────────────────────
app.get('/api/tenants', authMiddleware, adminOnly, (req, res) => {
  const tenants = prepare(`
    SELECT u.id, u.username, u.name, u.unit, u.email, u.phone, u.created_at,
      (SELECT COUNT(*) FROM damage_reports WHERE tenant_id = u.id AND status = 'offen') as open_reports
    FROM users u WHERE u.role = 'tenant' ORDER BY u.name
  `).all();
  res.json(tenants);
});

app.post('/api/tenants', authMiddleware, adminOnly, (req, res) => {
  const { username, password, name, unit, email, phone } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Pflichtfelder fehlen' });

  const existing = prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Benutzername bereits vergeben' });

  const hash = bcrypt.hashSync(password, 10);
  const result = prepare(`
    INSERT INTO users (username, password, role, name, unit, email, phone)
    VALUES (?, ?, 'tenant', ?, ?, ?, ?)
  `).run(username, hash, name, unit || null, email || null, phone || null);

  res.status(201).json({ id: result.lastInsertRowid, username, name, unit, email, phone });
});

app.put('/api/tenants/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, unit, email, phone, password } = req.body;
  const { id } = req.params;

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    prepare('UPDATE users SET name=?, unit=?, email=?, phone=?, password=? WHERE id=? AND role="tenant"')
      .run(name, unit, email, phone, hash, id);
  } else {
    prepare('UPDATE users SET name=?, unit=?, email=?, phone=? WHERE id=? AND role="tenant"')
      .run(name, unit, email, phone, id);
  }
  res.json({ success: true });
});

app.delete('/api/tenants/:id', authMiddleware, adminOnly, (req, res) => {
  prepare('DELETE FROM users WHERE id=? AND role="tenant"').run(req.params.id);
  res.json({ success: true });
});

// ─── Verbrauch Routes ──────────────────────────────────────────────────────────
app.get('/api/consumption', authMiddleware, (req, res) => {
  const tenantId = req.user.role === 'admin' ? req.query.tenant_id : req.user.id;
  if (!tenantId) return res.status(400).json({ error: 'Mieter-ID fehlt' });

  const rows = prepare(`
    SELECT * FROM consumption WHERE tenant_id = ? ORDER BY period DESC, type
  `).all(tenantId);
  res.json(rows);
});

app.post('/api/consumption', authMiddleware, adminOnly, (req, res) => {
  const { tenant_id, type, value, unit, period, note } = req.body;
  if (!tenant_id || !type || value === undefined || !unit || !period)
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });

  // Prüfen ob Eintrag für diesen Zeitraum/Typ schon existiert
  const existing = prepare(
    'SELECT id FROM consumption WHERE tenant_id=? AND type=? AND period=?'
  ).get(tenant_id, type, period);

  if (existing) {
    prepare('UPDATE consumption SET value=?, unit=?, note=? WHERE id=?')
      .run(value, unit, note || null, existing.id);
    return res.json({ id: existing.id, updated: true });
  }

  const result = prepare(`
    INSERT INTO consumption (tenant_id, type, value, unit, period, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenant_id, type, value, unit, period, note || null);

  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/consumption/:id', authMiddleware, adminOnly, (req, res) => {
  prepare('DELETE FROM consumption WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Schadensmeldung Routes ────────────────────────────────────────────────────
app.get('/api/reports', authMiddleware, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const rows = isAdmin
    ? prepare(`
        SELECT r.*, u.name as tenant_name, u.unit as tenant_unit
        FROM damage_reports r
        JOIN users u ON r.tenant_id = u.id
        ORDER BY
          CASE r.priority WHEN 'dringend' THEN 1 WHEN 'hoch' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          r.created_at DESC
      `).all()
    : prepare(`
        SELECT * FROM damage_reports WHERE tenant_id = ? ORDER BY created_at DESC
      `).all(req.user.id);

  res.json(rows);
});

app.post('/api/reports', authMiddleware, (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category) return res.status(400).json({ error: 'Pflichtfelder fehlen' });

  const result = prepare(`
    INSERT INTO damage_reports (tenant_id, title, description, category, priority)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, title, description, category, priority || 'normal');

  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/reports/:id', authMiddleware, adminOnly, (req, res) => {
  const { status, admin_note, priority } = req.body;
  prepare(`
    UPDATE damage_reports SET status=?, admin_note=?, priority=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(status, admin_note || null, priority, req.params.id);
  res.json({ success: true });
});

app.delete('/api/reports/:id', authMiddleware, adminOnly, (req, res) => {
  prepare('DELETE FROM damage_reports WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
app.get('/api/stats', authMiddleware, adminOnly, (req, res) => {
  const tenantCount = prepare("SELECT COUNT(*) as c FROM users WHERE role='tenant'").get().c;
  const openReports = prepare("SELECT COUNT(*) as c FROM damage_reports WHERE status='offen'").get().c;
  const urgentReports = prepare("SELECT COUNT(*) as c FROM damage_reports WHERE status IN ('offen','in_bearbeitung') AND priority='dringend'").get().c;
  const inProgressReports = prepare("SELECT COUNT(*) as c FROM damage_reports WHERE status='in_bearbeitung'").get().c;
  res.json({ tenantCount, openReports, urgentReports, inProgressReports });
});

// ─── Ankündigungen Routes ──────────────────────────────────────────────────────
app.get('/api/announcements', authMiddleware, (req, res) => {
  const rows = prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10').all();
  res.json(rows);
});

app.post('/api/announcements', authMiddleware, adminOnly, (req, res) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  const result = prepare('INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)').run(title, content, type || 'info');
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/announcements/:id', authMiddleware, adminOnly, (req, res) => {
  prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── Frontend statisch ausliefern (Production Build) ──────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ─── Server starten (nach DB-Init) ────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✓ Mieterinformationssystem läuft auf http://localhost:${PORT}`);
    console.log('  Anmeldedaten: admin / admin123');
    console.log('  Demo-Mieter: mueller / mieter123, schmidt / mieter123\n');
  });
}).catch(err => {
  console.error('Datenbankfehler:', err);
  process.exit(1);
});

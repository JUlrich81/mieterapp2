import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Zap, AlertTriangle, Megaphone, LogOut,
  Plus, Pencil, Trash2, Check, X, Building2, ChevronDown,
  Droplets, Flame, Wind, TrendingUp, Clock, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const TABS = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'tenants', label: 'Mieter', icon: Users },
  { id: 'consumption', label: 'Verbräuche', icon: Zap },
  { id: 'reports', label: 'Meldungen', icon: AlertTriangle },
  { id: 'announcements', label: 'Ankündigungen', icon: Megaphone },
];

const CATEGORY_LABELS = {
  sanitaer: 'Sanitär', elektro: 'Elektro', heizung: 'Heizung',
  fenster_tuer: 'Fenster/Tür', boeden: 'Böden', sonstige: 'Sonstiges'
};
const PRIORITY_LABELS = { niedrig: 'Niedrig', normal: 'Normal', hoch: 'Hoch', dringend: 'Dringend' };
const STATUS_LABELS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt', abgelehnt: 'Abgelehnt' };
const PRIORITY_COLORS = { niedrig: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-700', hoch: 'bg-orange-100 text-orange-700', dringend: 'bg-red-100 text-red-700' };
const CONSUMPTION_UNITS = { strom: 'kWh', wasser: 'm³', heizung: 'kWh', gas: 'm³' };
const CONSUMPTION_ICONS = { strom: Zap, wasser: Droplets, heizung: Flame, gas: Wind };
const CONSUMPTION_COLORS = { strom: '#f59e0b', wasser: '#3b82f6', heizung: '#ef4444', gas: '#8b5cf6' };

export default function AdminDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [tenants, setTenants] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');

  const load = useCallback(async () => {
    const [s, t, r, a] = await Promise.all([
      apiFetch('/api/stats').then(r => r?.json()),
      apiFetch('/api/tenants').then(r => r?.json()),
      apiFetch('/api/reports').then(r => r?.json()),
      apiFetch('/api/announcements').then(r => r?.json()),
    ]);
    if (s) setStats(s);
    if (t) { setTenants(t); if (!selectedTenant && t.length) setSelectedTenant(String(t[0].id)); }
    if (r) setReports(r);
    if (a) setAnnouncements(a);
  }, [apiFetch, selectedTenant]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedTenant) {
      apiFetch(`/api/consumption?tenant_id=${selectedTenant}`).then(r => r?.json()).then(d => d && setConsumption(d));
    }
  }, [selectedTenant, apiFetch]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">Mieterportal</div>
              <div className="text-xs text-gray-400">Verwaltung</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'reports' && stats.openReports > 0 && (
                <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{stats.openReports}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-medium text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-400">Vermieter</div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </aside>

      {/* Hauptinhalt */}
      <main className="ml-60 flex-1 p-6">
        {tab === 'overview' && <OverviewTab stats={stats} reports={reports} tenants={tenants} />}
        {tab === 'tenants' && <TenantsTab tenants={tenants} apiFetch={apiFetch} onRefresh={load} />}
        {tab === 'consumption' && (
          <ConsumptionTab
            tenants={tenants} consumption={consumption}
            selectedTenant={selectedTenant} setSelectedTenant={setSelectedTenant}
            apiFetch={apiFetch} onRefresh={() => {
              apiFetch(`/api/consumption?tenant_id=${selectedTenant}`).then(r => r?.json()).then(d => d && setConsumption(d));
            }}
          />
        )}
        {tab === 'reports' && <ReportsTab reports={reports} apiFetch={apiFetch} onRefresh={load} />}
        {tab === 'announcements' && <AnnouncementsTab announcements={announcements} apiFetch={apiFetch} onRefresh={load} />}
      </main>
    </div>
  );
}

// ─── Übersicht ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats, reports, tenants }) {
  const urgent = reports.filter(r => r.priority === 'dringend' && r.status !== 'erledigt');
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Übersicht</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Mieter gesamt', value: stats.tenantCount || 0, icon: Users, color: 'blue' },
          { label: 'Offene Meldungen', value: stats.openReports || 0, icon: Clock, color: 'yellow' },
          { label: 'In Bearbeitung', value: stats.inProgressReports || 0, icon: TrendingUp, color: 'blue' },
          { label: 'Dringende Meldungen', value: stats.urgentReports || 0, icon: AlertTriangle, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color === 'blue' ? 'bg-blue-50' : color === 'yellow' ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-600' : color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Dringende Meldungen */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Dringende Meldungen
          </h2>
          {urgent.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm">Keine dringenden Meldungen</p>
            </div>
          ) : urgent.map(r => (
            <div key={r.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
              <span className="badge-offen mt-0.5">{STATUS_LABELS[r.status]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                <div className="text-xs text-gray-400">{r.tenant_name} · {r.tenant_unit}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mieterübersicht */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Mieter
          </h2>
          {tenants.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-medium">
                {t.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">{t.unit}</div>
              </div>
              {t.open_reports > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{t.open_reports} offen</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mieter ────────────────────────────────────────────────────────────────────
function TenantsTab({ tenants, apiFetch, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', unit: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm({ username: '', password: '', name: '', unit: '', email: '', phone: '' }); setEditTenant(null); setShowForm(true); }
  function openEdit(t) { setForm({ username: t.username, password: '', name: t.name, unit: t.unit || '', email: t.email || '', phone: t.phone || '' }); setEditTenant(t); setShowForm(true); }

  async function save() {
    setSaving(true);
    try {
      if (editTenant) {
        await apiFetch(`/api/tenants/${editTenant.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/tenants', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false); onRefresh();
    } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm('Mieter wirklich löschen?')) return;
    await apiFetch(`/api/tenants/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mieter</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Mieter hinzufügen
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">{editTenant ? 'Mieter bearbeiten' : 'Neuer Mieter'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vor- und Nachname" />
            </div>
            <div>
              <label className="label">Benutzername *</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="z.B. mueller" disabled={!!editTenant} />
            </div>
            <div>
              <label className="label">{editTenant ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort *'}</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Passwort" />
            </div>
            <div>
              <label className="label">Wohneinheit</label>
              <input className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="z.B. WE 1 OG" />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0170 1234567" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Wird gespeichert...' : 'Speichern'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {tenants.map(t => (
          <div key={t.id} className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-lg font-semibold">
              {t.name.charAt(0)}
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div>
                <div className="font-medium text-gray-900">{t.name}</div>
                <div className="text-sm text-gray-400">{t.username}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Wohneinheit</div>
                <div className="text-sm font-medium">{t.unit || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">E-Mail</div>
                <div className="text-sm truncate">{t.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Offene Meldungen</div>
                <div className="text-sm font-medium">{t.open_reports || 0}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verbräuche ────────────────────────────────────────────────────────────────
function ConsumptionTab({ tenants, consumption, selectedTenant, setSelectedTenant, apiFetch, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'strom', value: '', period: new Date().toISOString().slice(0, 7), note: '' });
  const [saving, setSaving] = useState(false);

  const grouped = consumption.reduce((acc, c) => {
    if (!acc[c.period]) acc[c.period] = {};
    acc[c.period][c.type] = c;
    return acc;
  }, {});

  const chartData = Object.entries(grouped).slice(0, 6).reverse().map(([period, vals]) => ({
    period: period.slice(2),
    Strom: vals.strom?.value || 0,
    Wasser: vals.wasser?.value || 0,
    Heizung: vals.heizung?.value || 0,
  }));

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/api/consumption', {
        method: 'POST',
        body: JSON.stringify({ ...form, tenant_id: selectedTenant, unit: CONSUMPTION_UNITS[form.type], value: parseFloat(form.value) })
      });
      setShowForm(false); onRefresh();
    } finally { setSaving(false); }
  }

  async function remove(id) {
    await apiFetch(`/api/consumption/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verbräuche</h1>
        <div className="flex items-center gap-3">
          <select className="input w-48" value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} – {t.unit}</option>)}
          </select>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Verbrauch eintragen
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Verbrauch eintragen</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="strom">Strom (kWh)</option>
                <option value="wasser">Wasser (m³)</option>
                <option value="heizung">Heizung (kWh)</option>
                <option value="gas">Gas (m³)</option>
              </select>
            </div>
            <div>
              <label className="label">Zeitraum</label>
              <input type="month" className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
            </div>
            <div>
              <label className="label">Wert ({CONSUMPTION_UNITS[form.type]})</label>
              <input type="number" step="0.1" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.0" />
            </div>
            <div>
              <label className="label">Notiz (optional)</label>
              <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Anmerkung" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || !form.value} className="btn-primary">{saving ? 'Wird gespeichert...' : 'Speichern'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Verbrauchsübersicht (letzte 6 Monate)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Strom" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Wasser" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Heizung" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Zeitraum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Typ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Wert</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Notiz</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {consumption.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Noch keine Verbrauchsdaten</td></tr>
            )}
            {consumption.map(c => {
              const Icon = CONSUMPTION_ICONS[c.type] || Zap;
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.period}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: CONSUMPTION_COLORS[c.type] }} />
                      {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{c.value} {c.unit}</td>
                  <td className="px-4 py-3 text-gray-400">{c.note || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Meldungen ─────────────────────────────────────────────────────────────────
function ReportsTab({ reports, apiFetch, onRefresh }) {
  const [editReport, setEditReport] = useState(null);
  const [form, setForm] = useState({ status: '', priority: '', admin_note: '' });
  const [filter, setFilter] = useState('alle');

  function openEdit(r) {
    setEditReport(r);
    setForm({ status: r.status, priority: r.priority, admin_note: r.admin_note || '' });
  }

  async function save() {
    await apiFetch(`/api/reports/${editReport.id}`, { method: 'PUT', body: JSON.stringify(form) });
    setEditReport(null); onRefresh();
  }

  async function remove(id) {
    if (!confirm('Meldung löschen?')) return;
    await apiFetch(`/api/reports/${id}`, { method: 'DELETE' }); onRefresh();
  }

  const filtered = filter === 'alle' ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schadensmeldungen</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['alle', 'offen', 'in_bearbeitung', 'erledigt'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'alle' ? 'Alle' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {editReport && (
        <div className="card mb-6 border-blue-200">
          <h2 className="font-semibold mb-1">{editReport.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{editReport.tenant_name} · {editReport.tenant_unit}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priorität</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notiz für Mieter</label>
              <input className="input" value={form.admin_note} onChange={e => setForm(f => ({ ...f, admin_note: e.target.value }))} placeholder="Rückmeldung..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="btn-primary">Speichern</button>
            <button onClick={() => setEditReport(null)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-400">Keine Meldungen vorhanden</div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority]}`}>{PRIORITY_LABELS[r.priority]}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[r.category]}</span>
                </div>
                <h3 className="font-medium text-gray-900">{r.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>{r.tenant_name} · {r.tenant_unit}</span>
                  <span>{new Date(r.created_at).toLocaleDateString('de-DE')}</span>
                </div>
                {r.admin_note && (
                  <div className="mt-2 text-xs bg-blue-50 text-blue-700 rounded px-3 py-2">
                    <span className="font-medium">Notiz:</span> {r.admin_note}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(r)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(r.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ankündigungen ─────────────────────────────────────────────────────────────
function AnnouncementsTab({ announcements, apiFetch, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'info' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false); setForm({ title: '', content: '', type: 'info' }); onRefresh();
    setSaving(false);
  }

  const typeStyles = { info: 'bg-blue-50 border-blue-200 text-blue-800', warnung: 'bg-yellow-50 border-yellow-200 text-yellow-800', wichtig: 'bg-red-50 border-red-200 text-red-800' };
  const typeLabels = { info: 'Info', warnung: 'Warnung', wichtig: 'Wichtig' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ankündigungen</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neue Ankündigung
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Neue Ankündigung</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="label">Titel *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Betreff der Ankündigung" />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="info">Info</option>
                <option value="warnung">Warnung</option>
                <option value="wichtig">Wichtig</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Inhalt *</label>
            <textarea className="input h-24 resize-none" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Nachricht an alle Mieter..." />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.title || !form.content} className="btn-primary">{saving ? 'Wird veröffentlicht...' : 'Veröffentlichen'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {announcements.length === 0 && <div className="card text-center py-12 text-gray-400">Noch keine Ankündigungen</div>}
        {announcements.map(a => (
          <div key={a.id} className={`card border ${typeStyles[a.type]}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">{typeLabels[a.type]}</span>
                  <span className="text-xs opacity-60">{new Date(a.created_at).toLocaleDateString('de-DE')}</span>
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm mt-1 opacity-80">{a.content}</p>
              </div>
              <button onClick={async () => { await apiFetch(`/api/announcements/${a.id}`, { method: 'DELETE' }); onRefresh(); }} className="p-1 opacity-50 hover:opacity-100 transition-opacity ml-4">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Zap, AlertTriangle, Megaphone, LogOut,
  Plus, Building2, Droplets, Flame, Wind, CheckCircle2,
  Clock, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const TABS = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'consumption', label: 'Verbräuche', icon: Zap },
  { id: 'reports', label: 'Meldungen', icon: AlertTriangle },
  { id: 'announcements', label: 'Ankündigungen', icon: Megaphone },
];

const STATUS_LABELS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt', abgelehnt: 'Abgelehnt' };
const PRIORITY_LABELS = { niedrig: 'Niedrig', normal: 'Normal', hoch: 'Hoch', dringend: 'Dringend' };
const CATEGORY_LABELS = {
  sanitaer: 'Sanitär', elektro: 'Elektro', heizung: 'Heizung',
  fenster_tuer: 'Fenster/Tür', boeden: 'Böden', sonstige: 'Sonstiges'
};
const CONSUMPTION_COLORS = { strom: '#f59e0b', wasser: '#3b82f6', heizung: '#ef4444', gas: '#8b5cf6' };
const CONSUMPTION_ICONS = { strom: Zap, wasser: Droplets, heizung: Flame, gas: Wind };
const CONSUMPTION_LABELS = { strom: 'Strom', wasser: 'Wasser', heizung: 'Heizung', gas: 'Gas' };

export default function TenantDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [tab, setTab] = useState('overview');
  const [consumption, setConsumption] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  async function loadAll() {
    const [c, r, a] = await Promise.all([
      apiFetch('/api/consumption').then(res => res?.json()),
      apiFetch('/api/reports').then(res => res?.json()),
      apiFetch('/api/announcements').then(res => res?.json()),
    ]);
    if (c) setConsumption(c);
    if (r) setReports(r);
    if (a) setAnnouncements(a);
  }

  useEffect(() => { loadAll(); }, []);

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
              <div className="text-xs text-gray-400">{user?.unit || 'Mein Konto'}</div>
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
              {id === 'reports' && reports.filter(r => r.status === 'offen').length > 0 && (
                <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {reports.filter(r => r.status === 'offen').length}
                </span>
              )}
              {id === 'announcements' && announcements.length > 0 && (
                <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {announcements.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-medium text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-400">{user?.unit}</div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-6">
        {tab === 'overview' && <OverviewTab consumption={consumption} reports={reports} announcements={announcements} user={user} />}
        {tab === 'consumption' && <ConsumptionTab consumption={consumption} />}
        {tab === 'reports' && <ReportsTab reports={reports} apiFetch={apiFetch} onRefresh={loadAll} />}
        {tab === 'announcements' && <AnnouncementsTab announcements={announcements} />}
      </main>
    </div>
  );
}

// ─── Übersicht ─────────────────────────────────────────────────────────────────
function OverviewTab({ consumption, reports, announcements, user }) {
  // Letzten Monat je Typ
  const latestByType = {};
  const prevByType = {};
  const sorted = [...consumption].sort((a, b) => b.period.localeCompare(a.period));
  for (const c of sorted) {
    if (!latestByType[c.type]) { latestByType[c.type] = c; continue; }
    if (!prevByType[c.type]) { prevByType[c.type] = c; }
  }

  const openReports = reports.filter(r => r.status === 'offen').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Willkommen, {user?.name?.split(' ')[0]}!</h1>
      <p className="text-gray-500 mb-6">{user?.unit} · Hier finden Sie alle Informationen zu Ihrer Wohnung</p>

      {/* Stat-Kacheln */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-500 mb-1">{openReports}</div>
          <div className="text-sm text-gray-500">Offene Meldungen</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">{reports.filter(r => r.status === 'in_bearbeitung').length}</div>
          <div className="text-sm text-gray-500">In Bearbeitung</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-500 mb-1">{reports.filter(r => r.status === 'erledigt').length}</div>
          <div className="text-sm text-gray-500">Erledigte Meldungen</div>
        </div>
      </div>

      {/* Aktuelle Verbräuche */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {['strom', 'wasser', 'heizung'].map(type => {
          const latest = latestByType[type];
          const prev = prevByType[type];
          const Icon = CONSUMPTION_ICONS[type];
          const diff = latest && prev ? ((latest.value - prev.value) / prev.value * 100) : null;
          return (
            <div key={type} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: CONSUMPTION_COLORS[type] + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: CONSUMPTION_COLORS[type] }} />
                  </div>
                  <span className="font-medium text-sm text-gray-700">{CONSUMPTION_LABELS[type]}</span>
                </div>
                {diff !== null && (
                  <span className={`text-xs flex items-center gap-0.5 ${diff > 5 ? 'text-red-500' : diff < -5 ? 'text-green-500' : 'text-gray-400'}`}>
                    {diff > 5 ? <TrendingUp className="w-3 h-3" /> : diff < -5 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(diff).toFixed(1)}%
                  </span>
                )}
              </div>
              {latest ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{latest.value} <span className="text-sm font-normal text-gray-400">{latest.unit}</span></div>
                  <div className="text-xs text-gray-400 mt-1">{latest.period}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">Keine Daten</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ankündigungen */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-500" /> Aktuelle Mitteilungen
          </h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Keine aktuellen Mitteilungen</p>
          ) : announcements.slice(0, 3).map(a => {
            const typeStyles = { info: 'bg-blue-50 border-blue-100 text-blue-800', warnung: 'bg-yellow-50 border-yellow-100 text-yellow-800', wichtig: 'bg-red-50 border-red-100 text-red-800' };
            return (
              <div key={a.id} className={`rounded-lg border p-3 mb-2 ${typeStyles[a.type]}`}>
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs opacity-75 mt-1">{a.content}</div>
              </div>
            );
          })}
        </div>

        {/* Letzte Meldungen */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Meine letzten Meldungen
          </h2>
          {reports.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm text-gray-400">Keine Meldungen vorhanden</p>
            </div>
          ) : reports.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className={`badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('de-DE')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Verbräuche ────────────────────────────────────────────────────────────────
function ConsumptionTab({ consumption }) {
  const [activeType, setActiveType] = useState('strom');

  const grouped = consumption.reduce((acc, c) => {
    if (!acc[c.period]) acc[c.period] = {};
    acc[c.period][c.type] = c;
    return acc;
  }, {});

  const periods = Object.keys(grouped).sort().reverse().slice(0, 6).reverse();

  const lineData = periods.map(p => ({
    period: p.slice(2),
    Strom: grouped[p]?.strom?.value || 0,
    Wasser: grouped[p]?.wasser?.value || 0,
    Heizung: grouped[p]?.heizung?.value || 0,
    Gas: grouped[p]?.gas?.value || 0,
  }));

  // Pie: Anteil der Typen am Gesamtverbrauch (Strom+Heizung normiert auf kWh)
  const totals = {
    Strom: consumption.filter(c => c.type === 'strom').reduce((s, c) => s + c.value, 0),
    Wasser: consumption.filter(c => c.type === 'wasser').reduce((s, c) => s + c.value, 0),
    Heizung: consumption.filter(c => c.type === 'heizung').reduce((s, c) => s + c.value, 0),
  };
  const pieData = Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#ef4444'];

  // Typ-spezifische Daten
  const typeData = consumption.filter(c => c.type === activeType).sort((a, b) => a.period.localeCompare(b.period)).slice(-12);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meine Verbräuche</h1>

      {consumption.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Noch keine Verbrauchsdaten vorhanden</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Verbrauchsverlauf */}
            <div className="card col-span-2">
              <h2 className="font-semibold mb-4">Verbrauchsverlauf (letzte 6 Monate)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Strom" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Wasser" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Heizung" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gesamtverteilung */}
            <div className="card">
              <h2 className="font-semibold mb-4">Gesamtverteilung</h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detailansicht */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Detailansicht</h2>
                <div className="flex gap-1">
                  {['strom', 'wasser', 'heizung'].map(t => {
                    const Icon = CONSUMPTION_ICONS[t];
                    return (
                      <button key={t} onClick={() => setActiveType(t)}
                        className={`p-2 rounded-lg transition-colors ${activeType === t ? 'text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                        style={activeType === t ? { backgroundColor: CONSUMPTION_COLORS[t] } : {}}>
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={typeData.map(d => ({ period: d.period.slice(2), Wert: d.value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Wert" fill={CONSUMPTION_COLORS[activeType]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabelle */}
          <div className="card overflow-hidden">
            <h2 className="font-semibold mb-4">Alle Verbrauchsdaten</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Zeitraum</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Strom</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Wasser</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Heizung</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Gas</th>
                </tr>
              </thead>
              <tbody>
                {periods.slice().reverse().map(period => (
                  <tr key={period} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{period}</td>
                    {['strom', 'wasser', 'heizung', 'gas'].map(type => (
                      <td key={type} className="px-4 py-3 text-right text-gray-700">
                        {grouped[period]?.[type] ? `${grouped[period][type].value} ${grouped[period][type].unit}` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Meldungen ─────────────────────────────────────────────────────────────────
function ReportsTab({ reports, apiFetch, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'sanitaer', priority: 'normal' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('alle');

  async function submit() {
    setSaving(true);
    await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ title: '', description: '', category: 'sanitaer', priority: 'normal' });
    onRefresh();
    setSaving(false);
  }

  const filtered = filter === 'alle' ? reports : reports.filter(r => r.status === filter);
  const PRIORITY_COLORS = { niedrig: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-700', hoch: 'bg-orange-100 text-orange-700', dringend: 'bg-red-100 text-red-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meine Meldungen</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Schaden melden
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-blue-200 border">
          <h2 className="font-semibold mb-4">Neue Schadensmeldung</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="label">Betreff *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Kurze Beschreibung des Problems" />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priorität</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Beschreibung *</label>
              <textarea className="input h-28 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Beschreiben Sie das Problem so genau wie möglich..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving || !form.title || !form.description} className="btn-primary">
              {saving ? 'Wird gesendet...' : 'Meldung absenden'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        {['alle', 'offen', 'in_bearbeitung', 'erledigt'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'alle' ? 'Alle' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
            Keine Meldungen vorhanden
          </div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority]}`}>{PRIORITY_LABELS[r.priority]}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[r.category]}</span>
                </div>
                <h3 className="font-medium text-gray-900">{r.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                <div className="text-xs text-gray-400 mt-2">
                  Gemeldet am {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {r.updated_at !== r.created_at && ` · Aktualisiert am ${new Date(r.updated_at).toLocaleDateString('de-DE')}`}
                </div>
                {r.admin_note && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                    <span className="font-medium">Rückmeldung vom Vermieter:</span> {r.admin_note}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ankündigungen ─────────────────────────────────────────────────────────────
function AnnouncementsTab({ announcements }) {
  const typeStyles = { info: 'bg-blue-50 border-blue-200 text-blue-800', warnung: 'bg-yellow-50 border-yellow-200 text-yellow-800', wichtig: 'bg-red-50 border-red-200 text-red-800' };
  const typeLabels = { info: 'Info', warnung: 'Warnung', wichtig: 'Wichtig' };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mitteilungen vom Vermieter</h1>
      {announcements.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Keine aktuellen Mitteilungen</div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className={`rounded-xl border p-5 ${typeStyles[a.type]}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">{typeLabels[a.type]}</span>
                <span className="text-xs opacity-60">{new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <h3 className="text-base font-semibold mb-1">{a.title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

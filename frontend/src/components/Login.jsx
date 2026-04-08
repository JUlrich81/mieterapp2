import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Anmeldung fehlgeschlagen'); return; }
      login(data.token, data.user);
    } catch {
      setError('Server nicht erreichbar. Bitte Backend starten.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Mieterportal</h1>
          <p className="text-blue-200 mt-1">Ihr persönliches Informationssystem</p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Anmelden</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Benutzername</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input pl-9"
                  placeholder="Benutzername eingeben"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="Passwort eingeben"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Demo-Zugangsdaten</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setForm({ username: 'admin', password: 'admin123' })}
                className="border border-gray-200 rounded-lg p-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-700">Vermieter</div>
                <div className="text-gray-400">admin / admin123</div>
              </button>
              <button
                onClick={() => setForm({ username: 'mueller', password: 'mieter123' })}
                className="border border-gray-200 rounded-lg p-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-700">Mieter</div>
                <div className="text-gray-400">mueller / mieter123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

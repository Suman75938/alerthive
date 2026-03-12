import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, LogIn } from 'lucide-react';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error ?? 'Invalid email or password.');
    }
  }

  const demos = [
    { label: 'Admin', email: 'admin@alerthive.com', pass: 'REDACTED_SEED_PASSWORD' },
    { label: 'Developer', email: 'mike@alerthive.com', pass: 'dev123' },
    { label: 'End User', email: 'jordan@example.com', pass: 'user123' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#4D148C] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-2xl font-bold text-text-primary tracking-tight">Alert<span className="text-accent">Hive</span></span>
        </div>

        <div className="bg-surface rounded-2xl border border-border-light p-8">
          <h1 className="text-xl font-semibold text-text-primary mb-3">Sign in to your account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="��������"
                className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-critical bg-critical/10 border border-critical/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" /> {loading ? 'Signing in�' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-sm text-text-secondary text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-surface rounded-xl border border-border-light p-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Demo credentials</p>
          <div className="space-y-2">
            {demos.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => { setEmail(d.email); setPassword(d.pass); setError(''); }}
                className="w-full flex justify-between items-center text-left px-3 py-2 rounded-lg bg-surface-light hover:bg-surface-highlight transition-colors"
              >
                <span className="text-xs font-medium text-text-primary">{d.label}</span>
                <span className="text-xs text-text-muted">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



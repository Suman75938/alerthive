import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { UserRole } from '../types';

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('end_user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = await signup(name.trim(), email.trim().toLowerCase(), password, role);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error ?? 'An account with this email already exists.');
    }
  }

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
          <h1 className="text-xl font-semibold text-text-primary mb-3">Create an account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>
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
                placeholder="Min. 6 characters"
                className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            {/* Role Picker */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'end_user', label: 'End User', desc: 'Raise and track tickets' },
                  { value: 'developer', label: 'Developer', desc: 'Work on and resolve tickets' },
                ] as { value: UserRole; label: string; desc: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`text-left px-3 py-3 rounded-lg border transition-colors ${
                      role === opt.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border-light bg-surface-light hover:border-border-light'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-primary">{opt.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-critical bg-critical/10 border border-critical/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" /> {loading ? 'Creating accountâ€¦' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-sm text-text-secondary text-center">
            Already have an account?{' '}
            <Link to="/signin" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



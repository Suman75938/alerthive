import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Search,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Code2,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Tooltip } from '../components/Tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = 'admin' | 'developer' | 'end_user';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  timezone?: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  timezone: string;
  isActive: boolean;
}

const EMPTY_FORM: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'end_user',
  phone: '',
  timezone: 'America/Chicago',
  isActive: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function roleBadge(role: UserRole) {
  const map: Record<UserRole, { label: string; cls: string; Icon: React.ElementType }> = {
    admin:     { label: 'Admin',     cls: 'bg-primary/15 text-primary border border-primary/30',   Icon: ShieldCheck },
    developer: { label: 'Developer', cls: 'bg-info/15 text-info border border-info/30',            Icon: Code2 },
    end_user:  { label: 'End User',  cls: 'bg-surface-highlight text-text-secondary border border-border', Icon: User },
  };
  const { label, cls, Icon } = map[role];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function statusBadge(active: boolean) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs text-low font-medium">
      <CheckCircle2 size={12} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted font-medium">
      <XCircle size={12} /> Inactive
    </span>
  );
}

function timeAgo(iso?: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface UserModalProps {
  mode: 'create' | 'edit';
  initial?: ManagedUser;
  onClose: () => void;
  onSave: (data: Partial<UserFormData>) => Promise<void>;
  saving: boolean;
  error?: string;
}

function UserModal({ mode, initial, onClose, onSave, saving, error }: UserModalProps) {
  const [form, setForm] = useState<UserFormData>({
    name:     initial?.name     ?? '',
    email:    initial?.email    ?? '',
    password: '',
    role:     initial?.role     ?? 'end_user',
    phone:    initial?.phone    ?? '',
    timezone: initial?.timezone ?? 'America/Chicago',
    isActive: initial?.isActive ?? true,
  });
  const [showPw, setShowPw] = useState(false);

  const set = (key: keyof UserFormData, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<UserFormData> = {
      name:     form.name,
      email:    form.email,
      role:     form.role,
      phone:    form.phone || undefined,
      timezone: form.timezone,
      isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;
    if (mode === 'create') payload.password = form.password; // required for create
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              {mode === 'create' ? <UserPlus size={16} className="text-primary" /> : <Pencil size={16} className="text-primary" />}
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              {mode === 'create' ? 'Add New User' : `Edit — ${initial?.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-2">
          {error && (
            <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="John Doe"
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5 font-medium">
                {mode === 'create' ? 'Password *' : 'New Password (leave blank to keep current)'}
              </label>
              <div className="relative">
                <input
                  required={mode === 'create'}
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={mode === 'create' ? 'Min. 8 characters' : '••••••••'}
                  className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Role *</label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value as UserRole)}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="end_user">End User</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Status</label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => set('isActive', e.target.value === 'active')}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1-555-0100"
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Timezone</label>
              <input
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                placeholder="America/Chicago"
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirm({
  user,
  onConfirm,
  onCancel,
  deleting,
  error,
}: {
  user: ManagedUser;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  error?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-critical/40 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-critical/15 flex items-center justify-center">
            <Trash2 size={18} className="text-critical" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Delete User</h3>
            <p className="text-xs text-text-muted">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          Are you sure you want to permanently delete{' '}
          <span className="text-text-primary font-medium">{user.name}</span>{' '}
          ({user.email})?
        </p>
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-critical hover:bg-critical/80 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { user: loggedInUser, refreshUser } = useAuth();
  const [users, setUsers]       = useState<ManagedUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<ManagedUser | null>(null);
  const [deleting, setDeleting]     = useState<ManagedUser | null>(null);

  // Loading/error states
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      const { data } = await api.get<{ success: boolean; data: ManagedUser[] }>('/users');
      if (data.success) setUsers(data.data);
    } catch {
      // silently fail — seed data shown as fallback already
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (payload: Partial<UserFormData>) => {
    setSaving(true);
    setModalError('');
    try {
      const { data } = await api.post<{ success: boolean; data: ManagedUser; error?: string }>('/users', payload);
      if (!data.success) { setModalError(data.error ?? 'Failed to create user'); return; }
      setUsers((u) => [...u, data.data]);
      setShowCreate(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create user';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────
  const handleUpdate = async (payload: Partial<UserFormData>) => {
    if (!editing) return;
    setSaving(true);
    setModalError('');
    // Remove empty password from payload
    if ('password' in payload && !payload.password) delete payload.password;
    try {
      const { data } = await api.patch<{ success: boolean; data: ManagedUser; error?: string }>(`/users/${editing.id}`, payload);
      if (!data.success) { setModalError(data.error ?? 'Failed to update user'); return; }
      setUsers((u) => u.map((x) => (x.id === editing.id ? { ...x, ...data.data } : x)));
      if (loggedInUser?.id === editing.id) await refreshUser();
      setEditing(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update user';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingId(true);
    setDeleteError('');
    try {
      const { data } = await api.delete<{ success: boolean; error?: string }>(`/users/${deleting.id}`);
      if (!data.success) { setDeleteError(data.error ?? 'Failed to delete user'); return; }
      setUsers((u) => u.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete user';
      setDeleteError(msg);
    } finally {
      setDeletingId(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    developer: users.filter((u) => u.role === 'developer').length,
    end_user: users.filter((u) => u.role === 'end_user').length,
    active: users.filter((u) => u.isActive).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">User Management</h1>
            <p className="text-sm text-text-muted">Create, edit and manage all user accounts</p>
          </div>
        </div>
        <Tooltip text="Add a new user to the system" side="bottom">
          <button
            onClick={() => { setModalError(''); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Users',  value: counts.total,     cls: 'text-text-primary' },
          { label: 'Admins',       value: counts.admin,     cls: 'text-primary' },
          { label: 'Developers',   value: counts.developer, cls: 'text-info' },
          { label: 'End Users',    value: counts.end_user,  cls: 'text-text-secondary' },
          { label: 'Active',       value: counts.active,    cls: 'text-low' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="developer">Developer</option>
          <option value="end_user">End User</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
              <th className="text-left px-5 py-3.5 font-medium">User</th>
              <th className="text-left px-4 py-3.5 font-medium">Role</th>
              <th className="text-left px-4 py-3.5 font-medium">Status</th>
              <th className="text-left px-4 py-3.5 font-medium hidden md:table-cell">Phone</th>
              <th className="text-left px-4 py-3.5 font-medium hidden lg:table-cell">Last Login</th>
              <th className="text-left px-4 py-3.5 font-medium hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Loading users…</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Users size={32} className="text-text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-text-muted text-sm">No users found</p>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface-light transition-colors group">
                  {/* User info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{u.name}</div>
                        <div className="text-xs text-text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">{roleBadge(u.role)}</td>
                  <td className="px-4 py-4">{statusBadge(u.isActive)}</td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-sm text-text-secondary">{u.phone ?? '—'}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-text-secondary">{timeAgo(u.lastLoginAt)}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-text-muted">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip text="Edit user details" side="top">
                      <button
                        onClick={() => { setModalError(''); setEditing(u); }}
                        className="p-1.5 rounded-md bg-surface-highlight hover:bg-primary/20 text-text-muted hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      </Tooltip>
                      <Tooltip text="Delete this user" side="top">
                      <button
                        onClick={() => { setDeleteError(''); setDeleting(u); }}
                        className="p-1.5 rounded-md bg-surface-highlight hover:bg-critical/20 text-text-muted hover:text-critical transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border text-xs text-text-muted">
            Showing {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <UserModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          saving={saving}
          error={modalError}
        />
      )}
      {editing && (
        <UserModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          saving={saving}
          error={modalError}
        />
      )}
      {deleting && (
        <DeleteConfirm
          user={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          deleting={deletingId}
          error={deleteError}
        />
      )}
    </div>
  );
}



import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Shield,
  Settings,
  Activity,
  Ticket,
  BarChart2,
  Clock,
  PlusCircle,
  LogOut,
  Bug,
  GitBranch,
  BookOpen,
  LayoutGrid,
  Columns2,
  FileText,
  Zap,
  Radio,
  Wrench,
  Route,
  Plug,
  SquareStack,
  Users,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './Tooltip';
import { apiGet } from '../lib/api';

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const [openAlertCount, setOpenAlertCount] = useState(0);
  const [openProblemCount, setOpenProblemCount] = useState(0);
  const [pendingChangeCount] = useState(0);

  useEffect(() => {
    const fetchCounts = () => {
      apiGet<unknown>('/alerts', { status: 'open', pageSize: 1 })
        .then((r) => setOpenAlertCount((r as { meta?: { total?: number } }).meta?.total ?? 0))
        .catch(() => setOpenAlertCount(0));
      apiGet<unknown>('/problems', { status: 'OPEN', pageSize: 1 })
        .then((r) => setOpenProblemCount((r as { meta?: { total?: number } }).meta?.total ?? 0))
        .catch(() => setOpenProblemCount(0));
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);
  const location = useLocation();
  const { user, isAdmin, isDeveloper, isEndUser, logout } = useAuth();
  const { tickets } = useTickets();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const savedScrollPos = useRef(0);
  const pendingScrollRestore = useRef<number | null>(null);

  // Save scroll position on scroll
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => { savedScrollPos.current = nav.scrollTop; };
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => nav.removeEventListener('scroll', onScroll);
  }, []);

  // Restore scroll position after each navigation
  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = savedScrollPos.current;
    }
  }, [location.pathname]);

  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({
    itsm: true, self: true, insights: true, alerting: false, ops: false, admin: true, system: true,
  });

  // Restore scroll after a group is toggled — snapshot before state update, apply after DOM mutation
  useLayoutEffect(() => {
    if (pendingScrollRestore.current !== null && navRef.current) {
      navRef.current.scrollTop = pendingScrollRestore.current;
      pendingScrollRestore.current = null;
    }
  }, [groupOpen]);

  const toggleGroup = (id: string) => {
    if (navRef.current) pendingScrollRestore.current = navRef.current.scrollTop;
    setGroupOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Role-based nav groups
  const mainNav = [
    ...(isEndUser
      ? []
      : [{ path: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of active alerts, incidents, and system health' }]),
    ...(isEndUser
      ? []
      : [{ path: '/alerts', label: 'Alerts', icon: Bell, badge: openAlertCount, description: 'View and manage all incoming monitoring alerts' }]),
    ...(isEndUser
      ? []
      : [{ path: '/incidents', label: 'Incidents', icon: AlertTriangle, description: 'Track and coordinate active incident response' }]),
    ...(isEndUser
      ? []
      : [{ path: '/oncall', label: 'On-Call', icon: Shield, description: 'Manage on-call schedules and team coverage' }]),
    ...(isEndUser
      ? [
          { path: '/tickets', label: 'My Tickets', icon: Ticket, badge: 0, description: 'View and manage support tickets' },
          { path: '/tickets/new', label: 'Raise Ticket', icon: PlusCircle, description: 'Submit a new support or service request' },
        ]
      : [{ path: '/kanban', label: 'Kanban Board', icon: Columns2, badge: openTickets, description: 'Drag-and-drop board with sprint, team, and assignee filters' }]),
  ];

  const itsmNav = (isAdmin || isDeveloper)
    ? [
        { path: '/problems', label: 'Problems', icon: Bug, badge: openProblemCount, description: 'Track root-cause problems and known errors' },
        { path: '/changes', label: 'Changes', icon: GitBranch, badge: pendingChangeCount, description: 'Review and approve pending change requests' },
        { path: '/postmortems', label: 'Postmortems', icon: FileText, description: 'Post-incident analysis and improvement actions' },
      ]
    : [];

  const adminDevNav = (isAdmin || isDeveloper)
    ? [
        { path: '/analytics', label: 'Analytics', icon: BarChart2, description: 'Performance metrics, SLA trends, and team insights' },
        { path: '/sla', label: 'SLA Policies', icon: Clock, description: 'Configure and monitor service level agreements' },
      ]
    : [];

  const alertingNav = (isAdmin || isDeveloper)
    ? [
        { path: '/escalation', label: 'Escalation Policies', icon: Zap, description: 'Define automated escalation paths for unacknowledged alerts' },
        { path: '/routing', label: 'Alert Routing', icon: Route, description: 'Route alerts to the right team based on rules' },
        { path: '/heartbeats', label: 'Heartbeats', icon: Radio, description: 'Monitor scheduled tasks via periodic check-ins' },
        { path: '/maintenance', label: 'Maintenance', icon: Wrench, description: 'Schedule windows to suppress alerts during planned work' },
        { path: '/channels', label: 'Notification Channels', icon: Bell, description: 'Configure where alerts are delivered (email, Slack, etc.)' },
      ]
    : [];

  const opsToolsNav = (isAdmin || isDeveloper)
    ? [
        { path: '/playbooks', label: 'Playbooks', icon: SquareStack, description: 'Step-by-step runbooks for common incident scenarios' },
        { path: '/integrations', label: 'Integrations', icon: Plug, description: 'Connect external monitoring tools and webhooks' },
      ]
    : [];

  const bottomNav = [
    { path: '/settings', label: 'Settings', icon: Settings, description: 'Configure account, notifications, and preferences' },
  ];

  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const roleLabel = user
    ? { admin: 'Administrator', developer: 'Developer', end_user: 'End User' }[user.role]
    : '';

  function NavItem({ path, label, icon: Icon, badge }: { path: string; label: string; icon: React.ElementType; badge?: number; description?: string }) {
    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    const link = (
      <NavLink
        to={path}
        onClick={onMobileClose}
        className={[
          collapsed
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full lg:relative lg:justify-center lg:p-2.5 lg:gap-0'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-secondary hover:bg-surface-light hover:text-text-primary',
        ].join(' ')}
      >
        <Icon size={18} className="shrink-0" />
        <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
        {badge != null && badge > 0 && (
          <>
            <span className={`ml-auto bg-critical text-white text-xs font-bold px-2 py-0.5 rounded-full ${collapsed ? 'lg:hidden' : ''}`}>
              {badge}
            </span>
            {collapsed && (
              <span className="hidden lg:flex absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-critical text-white text-[8px] font-bold rounded-full items-center justify-center">
                {badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
    if (collapsed) {
      return <Tooltip text={label} side="right" wrapperClass="block">{link}</Tooltip>;
    }
    return link;
  }

  function NavGroup({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    const open = groupOpen[id] ?? true;
    return (
      <>
        <button
          onClick={() => toggleGroup(id)}
          className={`w-full flex items-center justify-between pt-3 pb-1 px-3 group/hdr ${collapsed ? 'lg:hidden' : ''}`}
        >
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider group-hover/hdr:text-text-secondary transition-colors">{label}</span>
          <ChevronDown size={11} className={`text-text-muted transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
        </button>
        <div className={collapsed && !open ? 'hidden lg:block' : !collapsed && !open ? 'hidden' : collapsed ? '' : 'pl-2'}>
          {children}
        </div>
      </>
    );
  }

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto flex flex-col h-full lg:h-screen bg-surface border-r border-border shrink-0 transition-all duration-300 w-60 ${collapsed ? 'lg:w-14' : ''} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-border gap-3 px-4 py-5 ${collapsed ? 'lg:flex-col lg:gap-2 lg:px-2 lg:py-4' : ''}`}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md shrink-0">
          <Activity size={20} className="text-accent" />
        </div>
        <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-text-primary">Alert</span><span className="text-accent">Hive</span>
          </span>
          <p className="text-xs text-text-muted leading-none mt-0.5">Incident Management</p>
        </div>
        {/* Desktop: collapse/expand toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden lg:flex p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        {/* Mobile: close drawer button */}
        <button
          onClick={onMobileClose}
          className="flex lg:hidden p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors shrink-0"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav ref={navRef} className={`flex-1 py-4 space-y-1 overflow-y-auto px-3 ${collapsed ? 'lg:px-1' : ''}`}>
        {mainNav.map((item) => <NavItem key={item.path} {...item} />)}

        {(isAdmin || isDeveloper) && (
          <NavGroup id="itsm" label="ITSM">
            {itsmNav.map((item) => <NavItem key={item.path} {...item} />)}
            <NavItem path="/knowledge" label="Knowledge Base" icon={BookOpen} />
            <NavItem path="/catalog" label="Service Catalog" icon={LayoutGrid} />
          </NavGroup>
        )}
        {isEndUser && (
          <NavGroup id="self" label="Self-Service">
            <NavItem path="/knowledge" label="Knowledge Base" icon={BookOpen} />
            <NavItem path="/catalog" label="Service Catalog" icon={LayoutGrid} />
          </NavGroup>
        )}
        {adminDevNav.length > 0 && (
          <NavGroup id="insights" label="Insights">
            {adminDevNav.map((item) => <NavItem key={item.path} {...item} />)}
          </NavGroup>
        )}
        {alertingNav.length > 0 && (
          <NavGroup id="alerting" label="Alerting">
            {alertingNav.map((item) => <NavItem key={item.path} {...item} />)}
          </NavGroup>
        )}
        {opsToolsNav.length > 0 && (
          <NavGroup id="ops" label="Operations">
            {opsToolsNav.map((item) => <NavItem key={item.path} {...item} />)}
          </NavGroup>
        )}
        {isAdmin && (
          <NavGroup id="admin" label="Admin">
            <NavItem path="/admin/users" label="User Management" icon={Users} />
          </NavGroup>
        )}
        <NavGroup id="system" label="System">
          {bottomNav.map((item) => <NavItem key={item.path} {...item} />)}
        </NavGroup>
      </nav>

      {/* User footer */}
      <div className={`border-t border-border px-4 py-4 ${collapsed ? 'lg:px-2 lg:py-3' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'lg:flex-col lg:gap-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-medium text-text-primary truncate">{user?.name ?? 'Guest'}</p>
            <p className="text-xs text-text-muted truncate">{roleLabel}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => { logout(); navigate('/signin'); }}
            className="text-text-muted hover:text-text-primary transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

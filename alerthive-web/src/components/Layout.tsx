import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface border-b border-border lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-semibold">
            <span className="text-text-primary">Alert</span><span className="text-accent">Hive</span>
          </span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Search, Clock, CheckCircle2, ChevronRight, Filter, ShieldCheck } from 'lucide-react';
import { mockServiceCatalog } from '../data/mockData';
import { ServiceCatalogCategory } from '../types';
import { Tooltip } from '../components/Tooltip';

const CATEGORY_CONFIG: Record<ServiceCatalogCategory, { label: string; color: string; bg: string }> = {
  access:   { label: 'Access',    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  hardware: { label: 'Hardware',  color: 'text-orange-400', bg: 'bg-orange-400/10' },
  software: { label: 'Software',  color: 'text-purple-400', bg: 'bg-purple-400/10' },
  network:  { label: 'Network',   color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  security: { label: 'Security',  color: 'text-red-400',    bg: 'bg-red-400/10' },
  data:     { label: 'Data',      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  other:    { label: 'Other',     color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCatalogCategory | 'all'>('all');

  const filtered = mockServiceCatalog.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Sort by popularity desc
  const sorted = [...filtered].sort((a, b) => b.popularity - a.popularity);

  return (
    <div className="p-6 space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <LayoutGrid size={24} className="text-primary" /> Service Catalog
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Request IT services, access, hardware, and more through our self-service catalog.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Services', value: mockServiceCatalog.length },
          { label: 'Categories', value: Object.keys(CATEGORY_CONFIG).length },
          { label: 'Approval Required', value: mockServiceCatalog.filter((i) => i.approvalRequired).length },
          { label: 'Avg SLA', value: `${Math.round(mockServiceCatalog.reduce((s, i) => s + i.slaHours, 0) / mockServiceCatalog.length)}h` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-border">
            <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
            <p className="text-xs text-text-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-text-muted" />
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'}`}
          >
            All
          </button>
          {(Object.entries(CATEGORY_CONFIG) as [ServiceCatalogCategory, typeof CATEGORY_CONFIG[ServiceCatalogCategory]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === key ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {sorted.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <LayoutGrid size={40} className="mx-auto mb-3 opacity-30" />
          <p>No services match your search.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {sorted.map((item) => {
          const cat = CATEGORY_CONFIG[item.category];
          return (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-3 hover:border-primary/50 transition-colors flex flex-col gap-3 group"
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center text-xl shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-text-primary text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${cat.bg} ${cat.color}`}>
                    {cat.label}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-text-muted text-xs line-clamp-2">{item.description}</p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {item.slaHours}h SLA
                </span>
                {item.approvalRequired && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <ShieldCheck size={11} /> Approval
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-green-400" /> {item.popularity} req
                </span>
              </div>

              {/* Tags */}
              <div className="flex gap-1 flex-wrap">
                {item.tags.slice(0, 3).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 bg-surface-light text-text-muted text-xs rounded">{t}</span>
                ))}
              </div>

              {/* CTA */}
              <Tooltip text="Submit a service request" side="top">
              <button
                onClick={() => navigate('/tickets/new', { state: { prefill: item.title } })}
                className="mt-auto w-full py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                Request Service <ChevronRight size={13} />
              </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}



import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, Eye, ThumbsUp, ChevronRight, Filter } from 'lucide-react';
import { KBArticle, KBCategory } from '../types';
import { apiGet } from '../lib/api';
import { Tooltip } from '../components/Tooltip';

const CATEGORY_CONFIG: Record<KBCategory, { label: string; color: string; bg: string; icon: string }> = {
  'how-to':         { label: 'How-To',         color: 'text-info',        bg: 'bg-info/10',        icon: '\uD83D\uDCD8' },
  'troubleshooting':{ label: 'Troubleshooting', color: 'text-high',       bg: 'bg-high/10',        icon: '\uD83D\uDD27' },
  'known-error':    { label: 'Known Error',     color: 'text-critical',   bg: 'bg-critical/10',   icon: '\u26A0\uFE0F' },
  'runbook':        { label: 'Runbook',         color: 'text-primary',    bg: 'bg-primary/10',    icon: '\uD83D\uDCCB' },
  'policy':         { label: 'Policy',          color: 'text-medium',     bg: 'bg-medium/10',     icon: '\uD83D\uDCDC' },
  'faq':            { label: 'FAQ',             color: 'text-low',        bg: 'bg-low/10',        icon: '\u2753' },
  'template':       { label: 'Template',        color: 'text-medium',     bg: 'bg-medium/10',     icon: '\uD83D\uDCDD' },
};
const DEFAULT_CAT = CATEGORY_CONFIG['how-to'];

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<KBCategory | 'all'>('all');

  useEffect(() => {
    apiGet<KBArticle[]>('/knowledge', { pageSize: 200 }).then((r) => setArticles(r.data ?? []));
  }, []);

  const filtered = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      (a.author ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalViews = articles.reduce((sum, a) => sum + (a.views ?? 0), 0);
  const totalHelpful = articles.reduce((sum, a) => sum + (a.helpful ?? 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={24} className="text-primary" /> Knowledge Base
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Self-service documentation, runbooks, known-error workarounds, and how-to guides.
          </p>
        </div>
        <Tooltip text="Create a new knowledge base article" side="bottom">
          <button className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New Article
          </button>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Articles', value: articles.length },
          { label: 'Total Views', value: totalViews.toLocaleString() },
          { label: 'Helpful Votes', value: totalHelpful },
          { label: 'Categories', value: Object.keys(CATEGORY_CONFIG).length },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-border">
            <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
            <p className="text-xs text-text-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, tags, authors…"
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
          {(Object.entries(CATEGORY_CONFIG) as [KBCategory, typeof CATEGORY_CONFIG[KBCategory]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === key ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'}`}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Article Grid */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No articles match your search.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 [grid-auto-rows:1fr]">
        {filtered.map((article) => {
          const cat = CATEGORY_CONFIG[article.category] ?? DEFAULT_CAT;
          return (
            <div
              key={article.id}
              onClick={() => navigate('/knowledge/' + article.id)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.color}`}>
                  {cat.icon} {cat.label}
                </span>
                <ChevronRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-text-primary font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 flex-1">
                {article.title}
              </h3>
              <p className="text-text-muted text-xs mt-2 line-clamp-2">{article.summary}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><Eye size={11} /> {article.views}</span>
                <span className="flex items-center gap-1"><ThumbsUp size={11} /> {article.helpful}</span>
                <span className="ml-auto">{article.author}</span>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {article.tags.slice(0, 3).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 bg-surface-light text-text-muted text-xs rounded">#{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, Eye, ThumbsUp, Hash, ChevronRight, Filter } from 'lucide-react';
import { mockKBArticles } from '../data/mockData';
import { KBArticle, KBCategory } from '../types';
import { Tooltip } from '../components/Tooltip';

const CATEGORY_CONFIG: Record<KBCategory, { label: string; color: string; bg: string; icon: string }> = {
  'how-to':         { label: 'How-To',         color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: '\uD83D\uDCD8' },
  'troubleshooting':{ label: 'Troubleshooting', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: '\uD83D\uDD27' },
  'known-error':    { label: 'Known Error',     color: 'text-red-400',    bg: 'bg-red-400/10',    icon: '\u26A0\uFE0F' },
  'runbook':        { label: 'Runbook',         color: 'text-purple-400', bg: 'bg-purple-400/10', icon: '\uD83D\uDCCB' },
  'policy':         { label: 'Policy',          color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '\uD83D\uDCDC' },
  'faq':            { label: 'FAQ',             color: 'text-green-400',  bg: 'bg-green-400/10',  icon: '\u2753' },
};

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<KBCategory | 'all'>('all');
  const [selected, setSelected] = useState<KBArticle | null>(null);

  const filtered: KBArticle[] = mockKBArticles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      a.author.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalViews = mockKBArticles.reduce((sum, a) => sum + a.views, 0);
  const totalHelpful = mockKBArticles.reduce((sum, a) => sum + a.helpful, 0);

  if (selected) {
    const cat = CATEGORY_CONFIG[selected.category];
    return (
      <div className="p-6 space-y-5 max-w-4xl">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          â† Back to Knowledge Base
        </button>
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs font-mono text-text-muted">{selected.id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
            {selected.status === 'published' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-400/10 text-green-400">Published</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">{selected.title}</h1>
          <div className="flex items-center gap-4 text-xs text-text-muted mb-5">
            <span>Author: {selected.author}</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {selected.views} views</span>
            <span className="flex items-center gap-1"><ThumbsUp size={12} /> {selected.helpful} helpful</span>
            <span>Updated: {new Date(selected.updatedAt).toLocaleDateString()}</span>
          </div>
          <hr className="border-border mb-5" />
          <div className="prose prose-invert max-w-none text-sm">
            {selected.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-text-primary text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-text-primary text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-text-secondary font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
              if (line.startsWith('- ')) return <li key={i} className="text-text-secondary ml-4 list-disc">{line.slice(2)}</li>;
              if (line.match(/^\d+\. /)) return <li key={i} className="text-text-secondary ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
              if (line.startsWith('```') || line === '') return <div key={i} className="my-1" />;
              return <p key={i} className="text-text-secondary leading-relaxed">{line}</p>;
            })}
          </div>
          <div className="flex gap-1.5 mt-6 pt-4 border-t border-border flex-wrap">
            {selected.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-surface-light text-text-muted text-xs rounded flex items-center gap-1">
                <Hash size={10} /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
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
          { label: 'Articles', value: mockKBArticles.length },
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
            placeholder="Search articles, tags, authorsâ€¦"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((article) => {
          const cat = CATEGORY_CONFIG[article.category];
          return (
            <div
              key={article.id}
              onClick={() => setSelected(article)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors group flex flex-col"
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



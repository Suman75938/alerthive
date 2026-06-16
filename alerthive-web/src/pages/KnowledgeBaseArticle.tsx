import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, ThumbsUp, Hash } from 'lucide-react';
import { KBArticle, KBCategory } from '../types';
import { apiGet } from '../lib/api';

const CATEGORY_CONFIG: Record<KBCategory, { label: string; color: string; bg: string; icon: string }> = {
  'how-to':         { label: 'How-To',         color: 'text-info',      bg: 'bg-info/10',      icon: '📘' },
  'troubleshooting':{ label: 'Troubleshooting', color: 'text-high',     bg: 'bg-high/10',      icon: '🔧' },
  'known-error':    { label: 'Known Error',     color: 'text-critical', bg: 'bg-critical/10',  icon: '⚠️' },
  'runbook':        { label: 'Runbook',         color: 'text-primary',  bg: 'bg-primary/10',   icon: '📋' },
  'policy':         { label: 'Policy',          color: 'text-medium',   bg: 'bg-medium/10',    icon: '📜' },
  'faq':            { label: 'FAQ',             color: 'text-low',      bg: 'bg-low/10',       icon: '❓' },
  'template':       { label: 'Template',        color: 'text-medium',   bg: 'bg-medium/10',    icon: '📝' },
};

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre key={`code-${codeKey++}`} className="bg-surface-light border border-border rounded-lg p-3 my-2 overflow-x-auto text-xs text-text-secondary font-mono">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line === '') {
      elements.push(<div key={i} className="my-1" />);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-text-primary text-xl font-bold mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-text-primary text-lg font-semibold mt-4 mb-2">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-text-secondary font-semibold mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('- ')) {
      elements.push(<li key={i} className="text-text-secondary ml-4 list-disc">{renderInline(line.slice(2))}</li>);
    } else if (line.match(/^\d+\. /)) {
      elements.push(<li key={i} className="text-text-secondary ml-4 list-decimal">{renderInline(line.replace(/^\d+\. /, ''))}</li>);
    } else if (line.startsWith('|')) {
      // Table row — render as a pre-formatted line
      elements.push(<p key={i} className="text-text-secondary text-xs font-mono leading-relaxed">{line}</p>);
    } else {
      elements.push(<p key={i} className="text-text-secondary leading-relaxed">{renderInline(line)}</p>);
    }
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and `code` inline
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-light text-info text-xs font-mono px-1.5 py-0.5 rounded">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function KnowledgeBaseArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<KBArticle>(`/knowledge/${id}`)
      .then((r) => setArticle(r.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-4 max-w-7xl mx-auto text-text-muted">Loading…</div>;
  if (!article) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/knowledge')}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Knowledge Base
        </button>
        <div className="text-center py-16 text-text-muted">Article not found.</div>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[article.category];

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <button
        onClick={() => navigate('/knowledge')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to Knowledge Base
      </button>
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs font-mono text-text-muted">{article.id}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
          {article.status === 'published' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-low/10 text-low">Published</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">{article.title}</h1>
        <div className="flex items-center gap-4 text-xs text-text-muted mb-5">
          <span>Author: {article.author}</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {article.views} views</span>
          <span className="flex items-center gap-1"><ThumbsUp size={12} /> {article.helpful} helpful</span>
          <span>Updated: {new Date(article.updatedAt).toLocaleDateString()}</span>
        </div>
        <hr className="border-border mb-5" />
        <div className="text-sm space-y-0.5">
          {renderContent(article.content)}
        </div>
        <div className="flex gap-1.5 mt-6 pt-4 border-t border-border flex-wrap">
          {article.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-surface-light text-text-muted text-xs rounded flex items-center gap-1">
              <Hash size={10} /> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

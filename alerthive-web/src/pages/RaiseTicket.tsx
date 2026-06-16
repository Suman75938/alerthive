import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { AlertPriority, IssueCategory } from '../types';
import { Send, Tag, X } from 'lucide-react';

const PRIORITIES: { value: AlertPriority; label: string; desc: string; color: string }[] = [
  { value: 'critical', label: 'Critical', desc: 'Service completely down',      color: 'border-critical text-critical' },
  { value: 'high',     label: 'High',     desc: 'Major functionality broken',   color: 'border-high text-high' },
  { value: 'medium',   label: 'Medium',   desc: 'Partial impact or degraded',   color: 'border-medium text-medium' },
  { value: 'low',      label: 'Low',      desc: 'Minor inconvenience',          color: 'border-low text-low' },
  { value: 'info',     label: 'Info',     desc: 'Question or feedback',         color: 'border-info text-info' },
];

const CATEGORIES: { value: IssueCategory; label: string; desc: string }[] = [
  { value: 'system_issue',      label: 'System Issue',      desc: 'Infrastructure, servers, networking' },
  { value: 'application_issue', label: 'Application Issue', desc: 'Code, bugs, feature defects' },
  { value: 'others',            label: 'Others',            desc: 'General queries or requests' },
];

export default function RaiseTicket() {
  const { createTicket } = useTickets();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AlertPriority>('medium');
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('others');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const ticket = createTicket({
      title: title.trim(),
      description: description.trim(),
      priority,
      issueCategory,
      raisedBy: user.id,
      raisedByName: user.name,
      tags,
    });
    navigate(`/tickets/${ticket.id}`);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Raise a Ticket</h1>
        <p className="text-sm text-text-secondary mt-1">Describe the issue and our team will take a look.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Description */}
        <div className="bg-surface rounded-xl border border-border-light p-3 space-y-2">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Title <span className="text-critical">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description <span className="text-critical">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, expected vs. actual behaviour, screenshots if applicable..."
              className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent text-sm resize-none"
            />
          </div>
        </div>

        {/* Issue Category */}
        <div className="bg-surface rounded-xl border border-border-light p-3">
          <label className="block text-sm font-medium text-text-primary mb-3">Issue Category</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setIssueCategory(c.value)}
                className={`text-left px-3 py-3 rounded-lg border transition-all ${
                  issueCategory === c.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-light text-text-secondary hover:border-primary/50 hover:text-text-primary'
                }`}
              >
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-text-muted mt-0.5 leading-tight">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="bg-surface rounded-xl border border-border-light p-3">
          <label className="block text-sm font-medium text-text-primary mb-3">Priority</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                  priority === p.value
                    ? `${p.color} bg-current/10`
                    : 'border-border-light text-text-secondary hover:border-border-light hover:text-text-primary'
                }`}
              >
                <div className={`text-sm font-medium ${priority === p.value ? '' : 'text-text-primary'}`}>{p.label}</div>
                <div className="text-xs text-text-muted mt-0.5 leading-tight">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-surface rounded-xl border border-border-light p-3">
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-3">
            <Tag className="w-3.5 h-3.5" /> Tags <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div className="flex gap-2 mb-3 flex-wrap">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs bg-surface-light border border-border-light text-text-secondary px-2.5 py-1 rounded-full">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="text-text-muted hover:text-text-primary">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Type a tag and press Enter"
              className="flex-1 bg-surface-light border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 bg-surface-light border border-border-light rounded-lg text-sm text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-5 py-2.5 bg-surface-light border border-border-light text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" /> Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}




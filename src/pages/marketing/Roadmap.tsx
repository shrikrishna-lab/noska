import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronDown, 
  Plus, 
  Mail, 
  Check, 
  Send,
  ThumbsUp,
  Clock,
  User,
  AlertCircle,
  BarChart3,
  Globe,
  Smartphone,
  WifiOff,
  Layers,
  Shield,
  Zap,
  Code,
  Database,
  Cloud,
  GitBranch,
  Package,
  LayoutGrid,
  ExternalLink,
  X,
  Flag
} from 'lucide-react';
import { Reveal } from './components/Reveal';
import { useRoadmap } from '../../hooks/useRoadmap';
import './Roadmap.css';

const STATUS_MAP: Record<string, string> = {
  shipped: 'Shipped',
  in_progress: 'In Progress',
  review: 'In Progress',
  backlog: 'Planned',
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusDisplayOrder = ['Shipped', 'In Progress', 'Planned'];

function getItemIcon(title: string, category: string | null) {
  const t = (title + ' ' + (category || '')).toLowerCase();
  if (t.includes('email') || t.includes('mail') || t.includes('notification')) return <Mail />;
  if (t.includes('pay') || t.includes('billing') || t.includes('subscription') || t.includes('credit') || t.includes('card')) return <Package />;
  if (t.includes('vote') || t.includes('poll') || t.includes('feedback') || t.includes('feature request') || t.includes('thumb') || t.includes('community')) return <ThumbsUp />;
  if (t.includes('cms') || t.includes('content') || t.includes('layout') || t.includes('grid')) return <LayoutGrid />;
  if (t.includes('analytics') || t.includes('stat') || t.includes('metric') || t.includes('bar') || t.includes('chart')) return <BarChart3 />;
  if (t.includes('language') || t.includes('local') || t.includes('translat') || t.includes('i18n') || t.includes('global') || t.includes('globe')) return <Globe />;
  if (t.includes('mobile') || t.includes('app') || t.includes('phone') || t.includes('ios') || t.includes('android') || t.includes('smartphone')) return <Smartphone />;
  if (t.includes('offline') || t.includes('wifi') || t.includes('sync') || t.includes('cache')) return <WifiOff />;
  if (t.includes('api') || t.includes('webhook') || t.includes('rest') || t.includes('sdk')) return <Code />;
  if (t.includes('search') || t.includes('ai') || t.includes('intelligence') || t.includes('graph')) return <Zap />;
  if (t.includes('sso') || t.includes('auth') || t.includes('security') || t.includes('enterprise') || t.includes('shield')) return <Shield />;
  if (t.includes('template') || t.includes('marketplace')) return <Package />;
  if (t.includes('database') || t.includes('storage') || t.includes('data')) return <Database />;
  if (t.includes('cloud') || t.includes('deploy') || t.includes('host')) return <Cloud />;
  if (t.includes('integration') || t.includes('calendar') || t.includes('github') || t.includes('git')) return <GitBranch />;
  return <Layers />;
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return priority;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return '#e74c3c';
    case 'high': return '#f39c12';
    case 'medium': return '#4a9eff';
    case 'low': return '#94a3b8';
    default: return '#94a3b8';
  }
}

export default function Roadmap() {
  const { items: dbItems, voteCounts, loading, submitVote, submitFeatureRequest, subscribeToNewsletter } = useRoadmap();
  const [filter, setFilter] = useState<'All' | 'Shipped' | 'In Progress' | 'Planned'>('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [email, setEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState('');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestIdea, setRequestIdea] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [requestError, setRequestError] = useState('');

  const [detailItem, setDetailItem] = useState<string | null>(null);
  const [detailVoteEmail, setDetailVoteEmail] = useState('');
  const [detailVoteStatus, setDetailVoteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [detailVoteMsg, setDetailVoteMsg] = useState('');
  const [detailVoteEmailError, setDetailVoteEmailError] = useState('');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const items = dbItems.map(item => ({
    ...item,
    displayStatus: STATUS_MAP[item.status] || 'Planned',
  }));

  const sortedItems = [...items].sort((a, b) => {
    const aOrder = statusDisplayOrder.indexOf(a.displayStatus);
    const bOrder = statusDisplayOrder.indexOf(b.displayStatus);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
  });

  const filteredItems = sortedItems.filter(item => {
    if (filter === 'All') return true;
    return item.displayStatus === filter;
  });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeStatus('idle');
    if (!email) return;
    if (!isValidEmail(email)) {
      setSubscribeError('Please enter a valid email address.');
      setSubscribeStatus('error');
      return;
    }
    if (!showNameField) {
      setShowNameField(true);
      return;
    }
    setSubmitting(true);
    const result = await subscribeToNewsletter(email, subName || undefined);
    setSubmitting(false);
    if (result.success) {
      setSubscribeStatus('success');
      setEmail('');
      setSubName('');
      setShowNameField(false);
      setTimeout(() => setSubscribeStatus('idle'), 5000);
    } else {
      setSubscribeError(result.error || 'Failed to subscribe');
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 4000);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus('idle');
    if (!requestName || !requestEmail || !requestIdea) return;
    if (!isValidEmail(requestEmail)) {
      setRequestError('Please enter a valid email address.');
      setRequestStatus('error');
      return;
    }
    setSubmitting(true);
    const result = await submitFeatureRequest({
      user_name: requestName,
      email: requestEmail,
      message: requestIdea,
    });
    setSubmitting(false);
    if (result.success) {
      setRequestStatus('success');
      setTimeout(() => {
        setRequestStatus('idle');
        setShowRequestModal(false);
        setRequestName('');
        setRequestEmail('');
        setRequestIdea('');
      }, 2500);
    } else {
      setRequestError(result.error || 'Failed to submit');
      setRequestStatus('error');
    }
  };

  const handleDetailVote = async () => {
    setDetailVoteEmailError('');
    if (!detailItem || !detailVoteEmail) return;
    if (!isValidEmail(detailVoteEmail)) {
      setDetailVoteEmailError('Please enter a valid email address.');
      return;
    }
    setDetailVoteStatus('idle');
    const result = await submitVote(detailItem, detailVoteEmail);
    if (result.success) {
      setDetailVoteStatus('success');
      setDetailVoteMsg('Vote recorded!');
      setTimeout(() => {
        setDetailVoteStatus('idle');
        setDetailVoteMsg('');
      }, 3000);
    } else {
      setDetailVoteStatus('error');
      setDetailVoteMsg(result.error || 'Failed to vote');
      setTimeout(() => {
        setDetailVoteStatus('idle');
        setDetailVoteMsg('');
      }, 4000);
    }
  };

  const openDetail = (id: string) => {
    setDetailItem(id);
    setDetailVoteEmail('');
    setDetailVoteStatus('idle');
    setDetailVoteMsg('');
  };

  const detailData = detailItem ? items.find(i => i.id === detailItem) : null;

  return (
    <div className="roadmap-wrapper">
      <div className="roadmap-radial-glow" />

      <div className="roadmap-top-bar mkt-container">
        <div className="roadmap-brand font-bold text-xl tracking-tight">Noska</div>
        <button 
          className="roadmap-notify-link"
          onClick={() => {
            document.getElementById('subscribe-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Get Notifications &rarr;
        </button>
      </div>

      <section className="roadmap-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="roadmap-eyebrow">
            <Sparkles size={13} /> Project Horizon
          </span>
          <h1 className="roadmap-title">
            <span className="roadmap-title-serif">Road</span> MAP
          </h1>
          <p className="roadmap-subtitle">See what's on the horizon at Noska.</p>
        </motion.div>
      </section>

      <section className="roadmap-filters-wrapper mkt-container">
        <div className="filter-dropdown-container">
          <button 
            className={`filter-dropdown-btn ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{filter === 'All' ? 'All features' : filter}</span>
            <ChevronDown size={16} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>
          
          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setDropdownOpen(false)} />
                <motion.div 
                  className="filter-dropdown-menu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {(['All', 'Shipped', 'In Progress', 'Planned'] as const).map(option => (
                    <button
                      key={option}
                      className={`dropdown-item ${filter === option ? 'selected' : ''}`}
                      onClick={() => {
                        setFilter(option);
                        setDropdownOpen(false);
                      }}
                    >
                      {option === 'All' ? 'All features' : option}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="roadmap-grid mkt-container">
        {filteredItems.length === 0 ? (
          <div className="roadmap-empty">
            <p>No features match this filter.</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isExpanded = !!expandedItems[item.id];
            const voteCount = voteCounts[item.id] || 0;
            return (
              <Reveal key={item.id} delay={Math.min(idx * 0.04, 0.3)}>
                <motion.div 
                  className={`roadmap-card ${isExpanded ? 'expanded' : ''}`}
                  layout="position"
                >
                  <div className="card-header-row">
                    <div className="icon-wrapper">
                      {getItemIcon(item.title, item.category)}
                    </div>
                    <div className="badge-and-toggle">
                      <span className={`status-badge badge-${item.status}`}>
                        {item.displayStatus}
                      </span>
                      <button className="expand-toggle-btn" onClick={(e) => toggleExpand(item.id, e)} aria-label="Toggle details">
                        <Plus className={`toggle-icon ${isExpanded ? 'rotate-45' : ''}`} size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="card-content-area">
                    <h3 className="card-item-title">{item.title}</h3>

                    <div className="card-previews">
                      {item.description && (
                        <p className="card-preview-text">
                          {item.description.length > 90
                            ? item.description.slice(0, 90) + '...'
                            : item.description}
                        </p>
                      )}
                      <div className="card-sub-meta">
                        {item.eta && <span className="card-sub-meta-item">{item.eta}</span>}
                        {item.owner && <span className="card-sub-meta-item">{item.owner}</span>}
                        {(voteCounts[item.id] || 0) > 0 && (
                          <span className="card-sub-meta-item card-sub-votes">
                            <ThumbsUp size={10} /> {voteCounts[item.id]}
                          </span>
                        )}
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          className="card-expanded-content"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {item.description && (
                            <p className="card-description-text">{item.description}</p>
                          )}
                          {!item.description && (
                            <p className="card-description-text card-desc-muted">No description available.</p>
                          )}
                          <button
                            className="view-details-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(item.id);
                            }}
                          >
                            <ExternalLink size={13} />
                            View Details
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </Reveal>
            );
          })
        )}
      </section>

      <section className="roadmap-cta-section mkt-container">
        <div className="cta-grid">
          <Reveal delay={0.1}>
            <div className="cta-card">
              <div>
                <h2>Request a feature</h2>
                <p>
                  Let's build Noska together. If you have an idea for our next best feature, we want to hear it.
                </p>
              </div>
              <button className="cta-btn primary" onClick={() => setShowRequestModal(true)}>
                Request Feature
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div id="subscribe-section" className="cta-card">
              <div>
                <h2>Get Notifications</h2>
                <p>
                  Enter your email below to be the first to get notified on new features and releases.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="cta-subscribe-form">
                {subscribeStatus === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="subscribe-success-card"
                  >
                    <div className="subscribe-success-icon"><Check size={20} /></div>
                    <div className="subscribe-success-text">
                      <strong>You're subscribed!</strong>
                      <span>Check your inbox for a confirmation — we'll keep you posted on new features.</span>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {showNameField && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="name-field-wrapper"
                      >
                        <input
                          type="text"
                          placeholder="Your name (optional)"
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          className="subscribe-name-input"
                        />
                      </motion.div>
                    )}
                    <div className="input-group">
                      <Mail size={16} className="mail-icon" />
                      <input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (subscribeStatus === 'error') setSubscribeStatus('idle');
                        }}
                        required
                      />
                      <button type="submit" className="cta-submit-btn" disabled={submitting}>
                        {submitting ? <span className="btn-loading" /> : showNameField ? 'Confirm' : 'Subscribe'}
                      </button>
                    </div>
                    {showNameField && (
                      <p className="subscribe-hint">
                        Nearly there! Optionally tell us your name, then click Confirm.
                      </p>
                    )}
                    {subscribeStatus === 'error' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="error-text">
                        {subscribeError}
                      </motion.div>
                    )}
                  </>
                )}
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      <AnimatePresence>
        {showRequestModal && (
          <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
            <motion.div 
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <div className="modal-header">
                <h2>
                  <span className="roadmap-title-serif italic font-normal">Request</span> FEATURE
                </h2>
                <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
              </div>

              <p className="modal-subtitle">
                If you have an idea for our next best feature, we want to hear it.
              </p>

              <form onSubmit={handleRequestSubmit} className="modal-form">
                <div className="form-group">
                  <label>Your Name</label>
                  <input 
                    type="text" 
                    placeholder="Your Name"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Email</label>
                  <input 
                    type="email" 
                    placeholder="Your Email Address"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Idea</label>
                  <textarea 
                    rows={4}
                    placeholder="Your Idea"
                    value={requestIdea}
                    onChange={(e) => setRequestIdea(e.target.value)}
                    required
                  />
                </div>
                
                {requestStatus === 'success' ? (
                  <div className="form-success">
                    <Check size={18} /> Message Sent! Thank you for helping us build Noska.
                  </div>
                ) : requestStatus === 'error' ? (
                  <div className="form-error">
                    <AlertCircle size={18} /> {requestError}
                  </div>
                ) : (
                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowRequestModal(false)}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={submitting}>
                      <Send size={14} className="inline mr-1" /> {submitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && detailData && (
          <div className="modal-overlay detail-overlay" onClick={() => setDetailItem(null)}>
            <motion.div 
              className="detail-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="detail-modal-header">
                <div className="detail-modal-icon">
                  {getItemIcon(detailData.title, detailData.category)}
                </div>
                <div className="detail-modal-title-area">
                  <div className="detail-modal-badges">
                    <span className={`status-badge badge-${detailData.status}`}>
                      {detailData.displayStatus}
                    </span>
                    <span className="priority-badge" style={{ backgroundColor: getPriorityColor(detailData.priority) + '20', color: getPriorityColor(detailData.priority) }}>
                      <Flag size={11} /> {getPriorityLabel(detailData.priority)}
                    </span>
                  </div>
                  <h2 className="detail-modal-title">{detailData.title}</h2>
                </div>
                <button className="modal-close" onClick={() => setDetailItem(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="detail-modal-body">
                {detailData.description && (
                  <div className="detail-section">
                    <h3>Description</h3>
                    <p>{detailData.description}</p>
                  </div>
                )}

                <div className="detail-meta-grid">
                  {detailData.owner && (
                    <div className="detail-meta-item">
                      <User size={14} />
                      <span className="detail-meta-label">Owner</span>
                      <span className="detail-meta-value">{detailData.owner}</span>
                    </div>
                  )}
                  {detailData.eta && (
                    <div className="detail-meta-item">
                      <Clock size={14} />
                      <span className="detail-meta-label">Target</span>
                      <span className="detail-meta-value">{detailData.eta}</span>
                    </div>
                  )}
                  {detailData.target_version && (
                    <div className="detail-meta-item">
                      <Package size={14} />
                      <span className="detail-meta-label">Version</span>
                      <span className="detail-meta-value">v{detailData.target_version}</span>
                    </div>
                  )}
                  {detailData.progress > 0 && detailData.progress < 100 && (
                    <div className="detail-meta-item detail-progress-item">
                      <BarChart3 size={14} />
                      <span className="detail-meta-label">Progress</span>
                      <div className="detail-progress-row">
                        <div className="progress-bar detail-progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${detailData.progress}%`, background: getPriorityColor(detailData.priority) }}
                          />
                        </div>
                        <span className="detail-progress-text">{detailData.progress}%</span>
                      </div>
                    </div>
                  )}
                  {detailData.progress === 100 && (
                    <div className="detail-meta-item">
                      <Check size={14} />
                      <span className="detail-meta-label">Status</span>
                      <span className="detail-meta-value detail-complete">Completed</span>
                    </div>
                  )}
                </div>

                  <div className="detail-vote-section">
                  <h3>Vote for this feature</h3>
                  <p>Let us know you're interested. Each vote helps us prioritize.</p>
                  <div className="detail-vote-row">
                    <div className="detail-vote-input-wrap">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={detailVoteEmail}
                        onChange={(e) => {
                          setDetailVoteEmail(e.target.value);
                          if (detailVoteEmailError) setDetailVoteEmailError('');
                        }}
                        className={`detail-vote-input ${detailVoteEmailError ? 'input-error' : ''}`}
                      />
                      {detailVoteEmailError && (
                        <span className="detail-vote-input-error">{detailVoteEmailError}</span>
                      )}
                    </div>
                    <button
                      className="detail-vote-btn"
                      onClick={handleDetailVote}
                      disabled={!detailVoteEmail || detailVoteStatus === 'success'}
                    >
                      <ThumbsUp size={14} />
                      Vote ({voteCounts[detailData.id] || 0})
                    </button>
                  </div>
                  {detailVoteMsg && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`detail-vote-msg ${detailVoteStatus === 'error' ? 'vote-error-msg' : 'vote-success-msg'}`}
                    >
                      {detailVoteMsg}
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

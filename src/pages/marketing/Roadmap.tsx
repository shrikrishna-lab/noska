import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronDown, 
  Plus, 
  Mail, 
  Check, 
  CreditCard, 
  Package, 
  ThumbsUp, 
  LayoutGrid, 
  BarChart3, 
  Globe, 
  Smartphone, 
  WifiOff, 
  Send 
} from 'lucide-react';
import { Reveal } from './components/Reveal';
import './Roadmap.css';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'Shipped' | 'In Progress' | 'Planned';
  date: string;
  icon: React.ReactNode;
}

const roadmapItemsData: RoadmapItem[] = [
  {
    id: '1',
    title: 'Email Templates',
    description: 'Customize transactional emails and notifications with pre-built responsive templates and custom HTML/CSS editing.',
    status: 'Shipped',
    date: 'Estimated: Jan 19, 2024',
    icon: <Mail className="h-5 w-5" />
  },
  {
    id: '2',
    title: 'PayPal Subscriptions',
    description: 'Accept global recurring payments, manage billing cycles, and automatically sync subscriber permissions.',
    status: 'Shipped',
    date: 'Estimated: Feb 2, 2024',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    id: '3',
    title: 'Product Bundles',
    description: 'Package multiple workspace templates or features together with custom tier discounts and simplified checkout.',
    status: 'In Progress',
    date: 'Estimated: May 4, 2024',
    icon: <Package className="h-5 w-5" />
  },
  {
    id: '4',
    title: 'Voting System',
    description: 'Drive engagement and gather community feedback. Express preferences, vote on features, and participate in open polls.',
    status: 'In Progress',
    date: 'Estimated: Jul 11, 2024',
    icon: <ThumbsUp className="h-5 w-5" />
  },
  {
    id: '5',
    title: 'Randomized CMS',
    description: 'Dynamically shuffle and serve structured content blocks, dynamic database views, and personalized workspace layouts.',
    status: 'In Progress',
    date: 'Estimated: Aug 29, 2024',
    icon: <LayoutGrid className="h-5 w-5" />
  },
  {
    id: '6',
    title: 'Extended Analytics',
    description: 'Track document engagement, read times, export history, and workspace active member stats in real-time dashboards.',
    status: 'Planned',
    date: 'Estimated: Sep 5, 2024',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    id: '7',
    title: 'Language Localization',
    description: 'Expand global reach with full multi-language localization. Seamlessly switch interface strings and content blocks.',
    status: 'Planned',
    date: 'Estimated: Oct 17, 2024',
    icon: <Globe className="h-5 w-5" />
  },
  {
    id: '8',
    title: 'Smart Notifications',
    description: 'Intelligent push and in-app alerts powered by activity filters, workspace digest schedules, and mobile notifications.',
    status: 'Planned',
    date: 'Estimated: Nov 15, 2024',
    icon: <Smartphone className="h-5 w-5" />
  },
  {
    id: '9',
    title: 'Offline Mode',
    description: 'Work seamlessly offline with local SQLite database caching. Changes automatically merge when connection restores.',
    status: 'Planned',
    date: 'Estimated: Dec 20, 2024',
    icon: <WifiOff className="h-5 w-5" />
  }
];

export default function Roadmap() {
  const [items] = useState<RoadmapItem[]>(roadmapItemsData);
  const [filter, setFilter] = useState<'All' | 'Shipped' | 'In Progress' | 'Planned'>('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Notification form states
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Feature Request Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestIdea, setRequestIdea] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredItems = items.filter(item => {
    if (filter === 'All') return true;
    return item.status === filter;
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 4000);
    }, 800);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName || !requestEmail || !requestIdea) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setRequestSubmitted(true);
      setTimeout(() => {
        setRequestSubmitted(false);
        setShowRequestModal(false);
        setRequestName('');
        setRequestEmail('');
        setRequestIdea('');
      }, 2500);
    }, 800);
  };

  return (
    <div className="roadmap-wrapper">
      {/* Background radial soft light gradient */}
      <div className="roadmap-radial-glow" />

      {/* Top Banner Navigation bar to match Framer top bar */}
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

      {/* Hero Header */}
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

      {/* Filters section */}
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

      {/* Grid of Roadmap Feature Cards */}
      <section className="roadmap-grid mkt-container">
        {filteredItems.map((item, idx) => {
          const isExpanded = !!expandedItems[item.id];
          return (
            <Reveal key={item.id} delay={Math.min(idx * 0.04, 0.3)}>
              <motion.div 
                className={`roadmap-card ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => toggleExpand(item.id, e)}
                layout="position"
              >
                <div className="card-header-row">
                  <div className="icon-wrapper">
                    {item.icon}
                  </div>
                  <div className="badge-and-toggle">
                    <span className={`status-badge badge-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.status}
                    </span>
                    <button className="expand-toggle-btn" aria-label="Toggle details">
                      <Plus className={`toggle-icon ${isExpanded ? 'rotate-45' : ''}`} size={16} />
                    </button>
                  </div>
                </div>

                <div className="card-content-area">
                  <h3 className="card-item-title">{item.title}</h3>
                  <div className="estimated-date">{item.date}</div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.p
                        className="card-description"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {item.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </Reveal>
          );
        })}
      </section>

      {/* Double Column Call to Action (CTA) Cards */}
      <section className="roadmap-cta-section mkt-container">
        <div className="cta-grid">
          {/* Request Feature Card */}
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

          {/* Email Subscription Card */}
          <Reveal delay={0.2}>
            <div id="subscribe-section" className="cta-card">
              <div>
                <h2>Get Notifications</h2>
                <p>
                  Enter your email below to be the first to get notified on new features.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="cta-subscribe-form">
                <div className="input-group">
                  <Mail size={16} className="mail-icon" />
                  <input 
                    type="email" 
                    placeholder="Your email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="cta-submit-btn" disabled={submitting}>
                    {submitted ? <Check size={16} /> : 'Subscribe'}
                  </button>
                </div>
                {submitted && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="success-text">
                    You're subscribed! We will keep you updated.
                  </motion.div>
                )}
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Request Feature Modal */}
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
                
                {requestSubmitted ? (
                  <div className="form-success">
                    <Check size={18} /> Message Sent! Thank you for helping us build Noska.
                  </div>
                ) : (
                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowRequestModal(false)}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={submitting}>
                      <Send size={14} className="inline mr-1" /> Send Message
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

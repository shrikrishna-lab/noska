import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowRight, Tag, Search, Clock, Sparkles, Mail, Check, BookOpen, TrendingUp, X } from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import { supabase } from '../../lib/supabase';
import './Blog.css';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author: string;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
  read_time?: string;
  featured?: boolean;
}

// Fallback high-quality blog posts when database is empty
const fallbackPosts: BlogPost[] = [
  {
    id: 'f1',
    title: 'Designing Spatial Note-Taking Systems for Complex Thinking',
    slug: 'spatial-note-taking-systems',
    excerpt: 'How spatial positioning, infinite canvas boards, and contextual backlinks transform raw ideas into structured mental models.',
    author: 'Krishna H.',
    cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tags: ['Engineering', 'Design', 'Canvas'],
    published_at: '2026-07-20T10:00:00Z',
    read_time: '6 min read',
    featured: true,
  },
  {
    id: 'f2',
    title: 'How We Built Instant Local-First Sync with SQLite & WebSockets',
    slug: 'local-first-sync-architecture',
    excerpt: 'A deep dive into our CRDT sync engine, offline storage layers, and how we achieve under 15ms latency across devices.',
    author: 'Noska Engineering',
    cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    tags: ['Architecture', 'Performance'],
    published_at: '2026-07-15T14:30:00Z',
    read_time: '9 min read',
  },
  {
    id: 'f3',
    title: 'Introducing Co-Thinking AI Nodes on Canvas',
    slug: 'co-thinking-ai-canvas-nodes',
    excerpt: 'Generate dynamic flowcharts, summarize nested note trees, and brainstorm visually right inside your workspace.',
    author: 'AI Research Team',
    cover_image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
    tags: ['AI', 'Product', 'Feature'],
    published_at: '2026-07-10T09:15:00Z',
    read_time: '4 min read',
  },
  {
    id: 'f4',
    title: 'Zero-Knowledge End-to-End Encryption for Personal Workspaces',
    slug: 'zero-knowledge-encryption',
    excerpt: 'Why client-side key derivation and WebCrypto API ensure your private notes never leak to servers or third-parties.',
    author: 'Security Lab',
    cover_image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    tags: ['Security', 'Privacy'],
    published_at: '2026-07-04T16:00:00Z',
    read_time: '7 min read',
  },
  {
    id: 'f5',
    title: 'Optimizing Infinite Canvas Rendering to 120 FPS in React',
    slug: 'optimizing-canvas-rendering-120fps',
    excerpt: 'Techniques for viewport virtualization, spatial index quad-trees, and WebGL hardware acceleration in browser environments.',
    author: 'Frontend Team',
    cover_image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    tags: ['Performance', 'Frontend'],
    published_at: '2026-06-28T11:20:00Z',
    read_time: '8 min read',
  },
  {
    id: 'f6',
    title: 'The Psychology of Visual Knowledge Graphs & Memory Retrieval',
    slug: 'psychology-visual-knowledge-graphs',
    excerpt: 'Exploring active recall, spatial memory palaces, and why networked notes outperform linear hierarchies.',
    author: 'Product Research',
    cover_image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    tags: ['Design', 'Productivity'],
    published_at: '2026-06-20T08:45:00Z',
    read_time: '5 min read',
  }
];

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setPosts(data);
        } else {
          setPosts(fallbackPosts);
        }
      } catch {
        setPosts(fallbackPosts);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)));
    return ['All', ...Array.from(set).sort()];
  }, [posts]);

  const featuredPost = useMemo(() => {
    return posts.find((p) => p.featured) || posts[0];
  }, [posts]);

  const nonFeaturedPosts = useMemo(() => {
    if (!featuredPost) return posts;
    return posts.filter((p) => p.id !== featuredPost.id);
  }, [posts, featuredPost]);

  const filteredPosts = useMemo(() => {
    return nonFeaturedPosts.filter((post) => {
      const matchesTag = activeTag === 'All' || post.tags?.includes(activeTag);
      const matchesSearch =
        searchQuery.trim() === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTag && matchesSearch;
    });
  }, [nonFeaturedPosts, activeTag, searchQuery]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubscribed(true);
    setTimeout(() => {
      setNewsletterEmail('');
    }, 2000);
  };

  return (
    <div className="blog-wrapper">
      {/* Background Soft Glow & Grid Accent */}
      <div className="blog-ambient-glow" />

      {/* Hero Header */}
      <section className="blog-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="blog-eyebrow">
            <Sparkles size={13} /> The Noska Journal
          </span>
          <h1 className="blog-hero-title">
            Thoughts, Systems & <span className="blog-title-italic">Craft</span>.
          </h1>
          <p className="blog-hero-subtitle">
            Deep-dives into software architecture, spatial UI design, local-first data systems, and the future of creative thought.
          </p>
        </motion.div>
      </section>

      {/* Featured Main Article Card */}
      {featuredPost && (
        <section className="blog-featured-section mkt-container">
          <Reveal delay={0.1}>
            <Link to={`/blog/${featuredPost.slug}`} className="blog-featured-card">
              <div className="featured-image-container">
                <img 
                  src={featuredPost.cover_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'} 
                  alt={featuredPost.title} 
                  loading="eager"
                />
                <span className="featured-pill-badge">
                  <TrendingUp size={12} /> Featured Article
                </span>
              </div>
              <div className="featured-card-content">
                <div className="featured-meta">
                  <span className="meta-tag">{featuredPost.tags?.[0] || 'Article'}</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-time">
                    <Clock size={12} /> {featuredPost.read_time || '5 min read'}
                  </span>
                  {featuredPost.published_at && (
                    <>
                      <span className="meta-dot">•</span>
                      <span className="meta-date">
                        {new Date(featuredPost.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="featured-card-title">{featuredPost.title}</h2>
                <p className="featured-card-excerpt">{featuredPost.excerpt}</p>
                <div className="featured-card-footer">
                  <div className="author-info">
                    <div className="author-avatar">{featuredPost.author.charAt(0)}</div>
                    <span className="author-name">{featuredPost.author}</span>
                  </div>
                  <span className="read-more-btn">
                    Read Story <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      {/* Filter Tabs & Search Bar Header */}
      <section className="blog-controls-section mkt-container">
        <div className="controls-bar">
          {/* Category Tabs */}
          <div className="category-pills">
            {allTags.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  className={`pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="active-pill-bg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Realtime Search Input */}
          <div className="search-input-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid of Blog Posts */}
      <section className="blog-grid-section mkt-container">
        {loading ? (
          <div className="blog-loading-state">
            <div className="blog-spinner" />
            <p>Loading journal entries...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="blog-empty-state">
            <BookOpen size={36} className="text-zinc-400 mb-3" />
            <h3>No articles found</h3>
            <p>Try searching for a different keyword or select another tag.</p>
            <button className="btn-reset-filters" onClick={() => { setActiveTag('All'); setSearchQuery(''); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <Stagger className="blog-grid">
            {filteredPosts.map((post) => (
              <motion.div key={post.id} variants={staggerItem}>
                <Link to={`/blog/${post.slug}`} className="blog-post-card">
                  <div className="card-image-wrap">
                    <img
                      src={post.cover_image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'}
                      alt={post.title}
                      loading="lazy"
                    />
                    {post.tags?.[0] && (
                      <span className="card-tag-badge">{post.tags[0]}</span>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="meta-read-time">
                        <Clock size={12} /> {post.read_time || '5 min read'}
                      </span>
                      {post.published_at && (
                        <span className="meta-date">
                          {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 className="card-title">{post.title}</h3>
                    {post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
                    
                    <div className="card-footer">
                      <span className="author-label">By {post.author}</span>
                      <span className="card-link">
                        Read <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </Stagger>
        )}
      </section>

      {/* Newsletter Subscription Box */}
      <section className="blog-newsletter-section mkt-container">
        <Reveal delay={0.2}>
          <div className="newsletter-card">
            <div className="newsletter-content">
              <span className="newsletter-eyebrow"><Mail size={14} /> Newsletter</span>
              <h2>Stay updated with Noska engineering & design.</h2>
              <p>Get our latest deep-dives, architectural breakdowns, and product updates delivered straight to your inbox.</p>
            </div>
            <form onSubmit={handleSubscribe} className="newsletter-form">
              <div className="form-field-wrap">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn-subscribe" disabled={newsletterSubscribed}>
                  {newsletterSubscribed ? <Check size={16} /> : 'Subscribe'}
                </button>
              </div>
              {newsletterSubscribed && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="subscription-success">
                  Thanks for subscribing! Check your inbox soon.
                </motion.p>
              )}
            </form>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowLeft, User, Clock, Heart, Bookmark, Share2, Check, Copy, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './BlogPost.css';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  author: string;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
  read_time?: string;
}

// Fallback Articles with full Markdown content when DB records aren't populated
const fallbackArticles: Record<string, BlogPostData> = {
  'spatial-note-taking-systems': {
    id: 'f1',
    title: 'Designing Spatial Note-Taking Systems for Complex Thinking',
    slug: 'spatial-note-taking-systems',
    excerpt: 'How spatial positioning, infinite canvas boards, and contextual backlinks transform raw ideas into structured mental models.',
    author: 'Krishna H.',
    cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tags: ['Engineering', 'Design', 'Canvas'],
    published_at: '2026-07-20T10:00:00Z',
    read_time: '6 min read',
    content: `Traditional note-taking apps force thoughts into rigid linear folders. But human thinking isn't linear—it's **spatial, interconnected, and multidimensional**.

## The Problem with Folder Hierarchies
When notes live in isolated folders, knowledge quickly becomes fragmented:
- **Out of Sight, Out of Mind**: Deeply nested files get forgotten.
- **Artificial Boundaries**: Ideas often span multiple domains (e.g. Design + Code + Strategy).
- **Context Loss**: Individual notes lack visual relationships with adjacent concepts.

## Introducing Spatial Knowledge Canvas
In Noska, we treat notes as **2D nodes on an infinite canvas**. By anchoring notes spatially, your brain uses spatial memory to quickly navigate complex project architectures.

### Key Principles of Spatial UI:
1. **Fluid Canvas Zooming**: Pinch to zoom out for high-level ecosystem views or zoom in for individual document blocks.
2. **Contextual Edge Connectors**: Draw visual relationships between documents to map cause and effect.
3. **Bi-directional Backlinks**: Link any text block to another canvas card with zero friction.

> "Spatial positioning leverages human visual memory, making knowledge retrieval 3x faster than searching nested folder trees."

## What's Next?
We are actively building **Multiplayer Spatial Presence** so teams can edit and arrange canvas nodes together in real-time. Try out the canvas view in your Noska workspace today!`
  },
  'local-first-sync-architecture': {
    id: 'f2',
    title: 'How We Built Instant Local-First Sync with SQLite & WebSockets',
    slug: 'local-first-sync-architecture',
    excerpt: 'A deep dive into our CRDT sync engine, offline storage layers, and how we achieve under 15ms latency across devices.',
    author: 'Noska Engineering',
    cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    tags: ['Architecture', 'Performance'],
    published_at: '2026-07-15T14:30:00Z',
    read_time: '9 min read',
    content: `Local-first software combines the **instant speed and reliability** of local data with the **seamless collaboration** of cloud web applications.

## Why Local-First Matters
Users should never wait for a spinning loader just to type a sentence. Every keystroke must feel instant.

### Core Architecture Components:
- **IndexedDB & Local SQLite Cache**: Reads and writes complete in under **2ms** on-device.
- **CRDT (Conflict-free Replicated Data Type)**: Enables offline editing with zero merge conflicts.
- **Supabase Realtime WebSockets**: Streams delta changes across browser windows in **15ms**.

\`\`\`ts
// Synchronizing document state via CRDT deltas
const syncDelta = (localState: DocState, delta: ChangeSet) => {
  const merged = applyCRDTChange(localState, delta);
  saveToIndexedDB(merged);
  broadcastToPeers(delta);
};
\`\`\`

## Offline Reliability
When connection drops, changes are cached locally. Once back online, Noska automatically replays missing deltas seamlessly.`
  },
  'co-thinking-ai-canvas-nodes': {
    id: 'f3',
    title: 'Introducing Co-Thinking AI Nodes on Canvas',
    slug: 'co-thinking-ai-canvas-nodes',
    excerpt: 'Generate dynamic flowcharts, summarize nested note trees, and brainstorm visually right inside your workspace.',
    author: 'AI Research Team',
    cover_image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    tags: ['AI', 'Product', 'Feature'],
    published_at: '2026-07-10T09:15:00Z',
    read_time: '4 min read',
    content: `Artificial intelligence shouldn't replace human thought—it should **amplify visual reasoning**.

## How Co-Thinking Nodes Work
Select any group of notes or canvas blocks and trigger **AI Co-Think**:
- **Automatic Mindmaps**: Turn unstructured brainstorms into clear visual flowcharts.
- **Key Takeaway Cards**: Synthesize 5,000-word documents into structured summary cards.
- **Cross-Reference Suggestions**: AI dynamically suggests relevant notes across your workspace.

\`\`\`json
{
  "nodeType": "ai-summary",
  "sourceBlocks": ["b101", "b102"],
  "insights": ["Automated indexing", "Instant visual graphing"]
}
\`\`\`

Experience the power of Co-Thinking AI nodes directly inside your canvas editor.`
  }
};

// Inline Markdown Parser to properly parse **bold**, *italic*, `code`, and links
function parseInlineMarkdown(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)/);
    // Check for inline code `text`
    const codeMatch = remaining.match(/^([\s\S]*?)`(.+?)`([\s\S]*)/);
    // Check for italic *text*
    const italicMatch = remaining.match(/^([\s\S]*?)\*(.+?)\*([\s\S]*)/);

    let firstType: 'bold' | 'code' | 'italic' | null = null;
    let minIndex = Infinity;

    if (boldMatch && boldMatch[1].length < minIndex) {
      minIndex = boldMatch[1].length;
      firstType = 'bold';
    }
    if (codeMatch && codeMatch[1].length < minIndex) {
      minIndex = codeMatch[1].length;
      firstType = 'code';
    }
    if (italicMatch && italicMatch[1].length < minIndex) {
      minIndex = italicMatch[1].length;
      firstType = 'italic';
    }

    if (!firstType) {
      parts.push(remaining);
      break;
    }

    if (firstType === 'bold' && boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={`b-${key++}`} className="blog-bold">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (firstType === 'code' && codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={`c-${key++}`} className="blog-inline-code">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
    } else if (firstType === 'italic' && italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={`i-${key++}`} className="blog-italic">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
    }
  }

  return parts;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(42);
  const [hasLiked, setHasLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('published', true)
          .single();

        if (!error && data) {
          setPost(data as BlogPostData);
        } else if (fallbackArticles[slug]) {
          setPost(fallbackArticles[slug]);
        } else {
          // Default fallback if unknown slug
          setPost(fallbackArticles['spatial-note-taking-systems']);
        }
      } catch {
        if (slug && fallbackArticles[slug]) {
          setPost(fallbackArticles[slug]);
        } else {
          setPost(fallbackArticles['spatial-note-taking-systems']);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  // Track scroll progress for top indicator bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
    } else {
      setLikes(prev => prev - 1);
      setHasLiked(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-loading">
          <div className="blog-spinner" />
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-not-found mkt-container">
          <h1>Post Not Found</h1>
          <p>The blog article you are looking for does not exist or has been moved.</p>
          <Link to="/blog" className="btn-back-home">
            <ArrowLeft size={14} /> Back to Journal
          </Link>
        </div>
      </div>
    );
  }

  // Parse markdown content lines cleanly
  const renderFormattedContent = () => {
    if (!post.content) return null;

    const lines = post.content.replace(/\\n/g, '\n').split('\n');
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // Code block handling ```
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-block-${index}`} className="blog-code-container">
              <div className="code-header">
                <span className="code-lang">Code Snippet</span>
                <button 
                  className="code-copy-btn" 
                  onClick={() => navigator.clipboard?.writeText(codeBlockLines.join('\n'))}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <pre><code>{codeBlockLines.join('\n')}</code></pre>
            </div>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote-${index}`} className="blog-blockquote">
            {parseInlineMarkdown(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Headings
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${index}`} className="blog-heading-2">
            {parseInlineMarkdown(line.slice(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="blog-heading-3">
            {parseInlineMarkdown(line.slice(4))}
          </h3>
        );
        return;
      }

      // Bullet List Items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={`li-${index}`} className="blog-list-item">
            {parseInlineMarkdown(line.slice(2))}
          </li>
        );
        return;
      }

      // Empty Lines
      if (line.trim() === '') {
        elements.push(<div key={`space-${index}`} className="h-4" />);
        return;
      }

      // Standard Paragraph
      elements.push(
        <p key={`p-${index}`} className="blog-paragraph">
          {parseInlineMarkdown(line)}
        </p>
      );
    });

    return elements;
  };

  return (
    <div className="blog-post-wrapper">
      {/* Scroll Progress Bar */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      <article className="blog-post-article mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Back Button & Share Controls Top Header */}
          <div className="blog-post-top-nav">
            <Link to="/blog" className="blog-post-back">
              <ArrowLeft size={15} /> Back to Journal
            </Link>
            
            <div className="top-action-btns">
              <button 
                className={`action-btn ${isBookmarked ? 'active' : ''}`}
                onClick={() => setIsBookmarked(!isBookmarked)}
                title="Bookmark article"
              >
                <Bookmark size={15} />
              </button>
              <button 
                className="action-btn"
                onClick={handleCopyLink}
                title="Copy link"
              >
                {copiedLink ? <Check size={15} className="text-teal-600" /> : <Share2 size={15} />}
              </button>
            </div>
          </div>

          {/* Article Header Meta */}
          <div className="post-header-meta">
            <div className="post-meta-badges">
              {post.tags?.map((t) => (
                <span key={t} className="post-tag-pill">{t}</span>
              ))}
            </div>
            
            <h1 className="blog-post-title">{post.title}</h1>
            
            {post.excerpt && (
              <p className="blog-post-subtitle">{post.excerpt}</p>
            )}

            <div className="author-bar">
              <div className="author-detail">
                <div className="author-avatar-lg">{post.author.charAt(0)}</div>
                <div>
                  <div className="author-name-lg">{post.author}</div>
                  <div className="post-date-row">
                    {post.published_at && (
                      <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    <span className="dot">•</span>
                    <span><Clock size={12} className="inline mr-1" /> {post.read_time || '5 min read'}</span>
                  </div>
                </div>
              </div>

              {/* Reaction Like Count Button */}
              <button 
                className={`like-reaction-btn ${hasLiked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                <Heart size={16} className={`heart-icon ${hasLiked ? 'fill-current' : ''}`} />
                <span>{likes}</span>
              </button>
            </div>
          </div>

          {/* Cover Image */}
          {post.cover_image && (
            <div className="blog-post-cover">
              <img src={post.cover_image} alt={post.title} />
            </div>
          )}

          {/* Formatted Article Body */}
          <div className="blog-post-content">
            {renderFormattedContent()}
          </div>

          {/* Article Footer & Share Card */}
          <div className="blog-post-footer-card">
            <div className="footer-card-content">
              <h3>Enjoyed this read?</h3>
              <p>Share it with your team or save it to your reading list.</p>
            </div>
            <div className="footer-actions">
              <button className={`like-btn-lg ${hasLiked ? 'liked' : ''}`} onClick={handleLike}>
                <Heart size={18} className={hasLiked ? 'fill-current' : ''} />
                <span>{likes} Likes</span>
              </button>
              <button className="share-btn-lg" onClick={handleCopyLink}>
                {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Article'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </article>
    </div>
  );
}

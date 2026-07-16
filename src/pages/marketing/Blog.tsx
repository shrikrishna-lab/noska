import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Tag } from 'lucide-react';
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
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      if (!error) setPosts(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const allTags = [...new Set(posts.flatMap((p) => p.tags ?? []))].sort();
  const filtered = activeTag ? posts.filter((p) => p.tags?.includes(activeTag)) : posts;

  return (
    <div className="blog-wrapper">
      <section className="blog-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="blog-eyebrow">Blog</span>
          <h1>Thoughts on building Noska.</h1>
          <p>Product updates, engineering deep-dives, and the thinking behind the tools we're making.</p>
        </motion.div>
      </section>

      {allTags.length > 0 && (
        <section className="blog-tags mkt-container">
          <div className="blog-tags-scroll">
            <button className={`blog-tag-btn ${activeTag === null ? 'active' : ''}`} onClick={() => setActiveTag(null)}>All</button>
            {allTags.map((t) => (
              <button key={t} className={`blog-tag-btn ${activeTag === t ? 'active' : ''}`} onClick={() => setActiveTag(t)}>{t}</button>
            ))}
          </div>
        </section>
      )}

      <section className="blog-list mkt-container">
        {loading ? (
          <div className="blog-loading">
            <div className="blog-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="blog-empty">No posts yet. Check back soon.</p>
        ) : (
          <Stagger className="blog-grid">
            {filtered.map((post) => (
              <motion.div key={post.id} variants={staggerItem}>
                <Link to={`/blog/${post.slug}`} className="blog-card">
                  {post.cover_image && (
                    <div className="blog-card-image">
                      <img src={post.cover_image} alt={post.title} loading="lazy" />
                    </div>
                  )}
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      {post.published_at && (
                        <span className="blog-card-date"><Calendar size={12} /> {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                      <span className="blog-card-author">{post.author}</span>
                    </div>
                    <h3 className="blog-card-title">{post.title}</h3>
                    {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                    <div className="blog-card-footer">
                      {post.tags && post.tags.length > 0 && (
                        <div className="blog-card-tags">
                          {post.tags.slice(0, 3).map((t) => (
                            <span key={t} className="blog-card-tag"><Tag size={10} /> {t}</span>
                          ))}
                        </div>
                      )}
                      <span className="blog-card-read">Read <ArrowRight size={12} /></span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}

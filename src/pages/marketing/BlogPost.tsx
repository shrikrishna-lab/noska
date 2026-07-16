import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './BlogPost.css';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  author: string;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (!error) setPost(data as BlogPost | null);
      setLoading(false);
    }
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-loading"><div className="blog-spinner" /></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-not-found mkt-container">
          <h1>Post not found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <Link to="/blog" className="btn btn-primary">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-post-wrapper">
      <article className="blog-post-article mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/blog" className="blog-post-back"><ArrowLeft size={14} /> Back to Blog</Link>

          {post.cover_image && (
            <div className="blog-post-cover">
              <img src={post.cover_image} alt={post.title} />
            </div>
          )}

          <h1 className="blog-post-title">{post.title}</h1>

          <div className="blog-post-info">
            {post.published_at && (
              <span className="blog-post-date"><Calendar size={14} /> {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            )}
            <span className="blog-post-author"><User size={14} /> {post.author}</span>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="blog-post-tags">
              {post.tags.map((t) => <span key={t} className="blog-post-tag">{t}</span>)}
            </div>
          )}

          <div className="blog-post-content">
            {post.content?.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
              if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>;
              if (line.trim() === '') return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </div>
        </motion.div>
      </article>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Legal.css';

interface LegalPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
}

export default function Legal() {
  const params = useParams();
  const location = useLocation();
  const slug = params.slug ?? location.pathname.replace('/', '');
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('legal_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (!error) setPage(data as LegalPage | null);
      setLoading(false);
    }
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="legal-wrapper">
        <div className="legal-loading"><div className="legal-spinner" /></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="legal-wrapper">
        <div className="legal-not-found mkt-container">
          <h1>Page not found</h1>
          <p>The page you're looking for isn't available yet.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-wrapper">
      <motion.section
        className="legal-content mkt-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link to="/" className="legal-back"><ArrowLeft size={14} /> Back to Home</Link>
        <h1>{page.title}</h1>
        <div className="legal-body">
          {page.content?.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i}>{line}</p>;
          })}
        </div>
      </motion.section>
    </div>
  );
}

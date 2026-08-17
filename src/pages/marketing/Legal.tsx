import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { supabaseAnon } from '../../lib/supabase';
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
      const { data, error } = await (supabaseAnon as any)
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

  function renderInline(text: string) {
    const parts: Array<{ type: 'text' | 'strong' | 'link'; value: string; href?: string }> = [];
    const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
      const token = m[0];
      if (token.startsWith('**')) {
        parts.push({ type: 'strong', value: token.slice(2, -2) });
      } else {
        const inner = token.slice(1, -1);
        const split = inner.indexOf('](');
        parts.push({ type: 'link', value: inner.slice(0, split), href: inner.slice(split + 2) });
      }
      last = m.index + token.length;
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts.map((p, i) =>
      p.type === 'strong' ? <strong key={i}>{p.value}</strong>
      : p.type === 'link' ? <a key={i} href={p.href} target="_blank" rel="noreferrer">{p.value}</a>
      : <span key={i}>{p.value}</span>
    );
  }

  const lines = page.content?.replace(/\\n/g, '\n').split('\n') ?? [];
  const blocks: ReactNode[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flushList = (key: number) => {
    if (!list) return;
    blocks.push(list.type === 'ul'
      ? <ul key={key}>{list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}</ul>
      : <ol key={key}>{list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}</ol>);
    list = null;
  };
  lines.forEach((line, i) => {
    if (line.startsWith('## ')) { flushList(i); blocks.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>); }
    else if (line.startsWith('### ')) { flushList(i); blocks.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>); }
    else if (/^\s*[-*] /.test(line)) {
      if (!list) list = { type: 'ul', items: [] };
      list.items.push(line.replace(/^\s*[-*] /, ''));
    }
    else if (/^\s*\d+\.\s+/.test(line)) {
      if (!list) list = { type: 'ol', items: [] };
      list.items.push(line.replace(/^\s*\d+\.\s+/, ''));
    }
    else if (line.trim() === '') { flushList(i); }
    else { flushList(i); blocks.push(<p key={i}>{renderInline(line)}</p>); }
  });
  flushList(lines.length);

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
        <div className="legal-body">{blocks}</div>
      </motion.section>
    </div>
  );
}

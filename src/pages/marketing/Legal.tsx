import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { supabaseAnon } from '../../lib/supabase';
import { getCachedOrFetch } from '../../lib/staticContentCache';
import { EgressMonitor } from '../../lib/egressMonitor';
import './Legal.css';

interface LegalPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
}

const DEFAULT_LEGAL_PAGES: Record<string, LegalPage> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    content: `## 1. Introduction
At Noska, we take your privacy with absolute seriousness. This Privacy Policy describes how Noska Inc. collects, uses, protects, and handles your personal data when you use our desktop and web workspace applications, APIs, and connected cloud services.

## 2. Information We Collect
We only collect data strictly necessary to deliver a world-class workspace experience:
- **Account Information**: Your email address, authentication credentials (managed via Clerk / enterprise SSO), and display name.
- **Workspace Content**: Notes, blocks, pages, canvases, databases, and assets you create. Everything is encrypted at rest and in transit.
- **Connected Ecosystems & Integrations**: When you connect external apps (such as Google Workspace, GitHub, Slack, Notion, or custom MCP servers), tokens and keys are stored securely in encrypted credential stores and used strictly on-demand.
- **Operational Telemetry**: Minimal anonymized crash reports and performance metrics (which can be opted out at any time).

## 3. How We Use Your Information
- To maintain and synchronize your workspaces across devices.
- To execute AI assistance and context queries strictly upon your invocation (we never train generalized public models on your private data).
- To prevent abuse and enforce enterprise security guarantees.

## 4. Data Security & Storage
Your data is encrypted using industry-standard TLS 1.3 in transit and AES-256 at rest. Local desktop workspaces maintain local-first caches that function fully offline.

## 5. Your Rights & Data Export
You retain full ownership of all content you create in Noska. You may export all your notes, databases, and workspace archives in standard Markdown, JSON, and SQLite formats at any time.

## 6. Contact Us
For privacy questions or data deletion requests, contact our privacy team at [support@noska.app](mailto:support@noska.app).`
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    content: `## 1. Acceptance of Terms
By downloading, accessing, or using Noska (including our web app, desktop client, and API services), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.

## 2. Use of Service
- You must be at least 13 years old (or the legal minimum age in your jurisdiction) to use Noska.
- You are responsible for maintaining the security of your account and credentials.
- You agree not to misuse Noska, reverse-engineer proprietary protocols without authorization, or violate applicable laws and regulations.

## 3. Intellectual Property & User Content
- **Your Content**: You retain 100% ownership, copyright, and intellectual property rights to all notes, databases, diagrams, and files you create in Noska.
- **Noska Software**: All rights, title, and interest in and to the Noska platform, trademarks, and user interfaces remain the exclusive property of Noska Inc.

## 4. Subscription & Billing
- Subscriptions are billed in advance on a recurring monthly or annual basis.
- You may cancel your subscription at any time via your Account Settings. Cancellation takes effect at the end of the current billing period.

## 5. Service Availability & Warranties
Noska is provided "as is" and "as available". We strive for 99.9% uptime and implement redundant distributed architecture, but we make no express warranties regarding uninterrupted operation.

## 6. Limitation of Liability
To the maximum extent permitted by law, Noska Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.`
  },
  policy: {
    id: 'policy',
    title: 'Cookie & Tracking Policy',
    slug: 'policy',
    content: `## 1. What Are Cookies
Cookies and local browser storage are small data files placed on your device to enable core website and app functionality, preserve authentication sessions, and remember your interface preferences.

## 2. Types of Cookies We Use
- **Essential Cookies**: Required for login, security, token exchange, and workspace routing.
- **Preference Storage**: Remembers your theme (light/dark mode), canvas zoom, split-pane layout, and active workspace views.
- **Telemetry & Performance**: Aggregated and anonymized diagnostics to monitor server load and fix application errors.

## 3. Managing Your Cookies
You can manage or disable cookies through your browser settings. Note that disabling essential cookies may prevent login and cross-device workspace syncing.`
  },
  refund: {
    id: 'refund',
    title: 'Refund Policy',
    slug: 'refund',
    content: `## 1. 14-Day Money-Back Guarantee
We want you to be completely satisfied with Noska. If you upgrade to a paid subscription (Plus, Business, or Pro) and decide it does not meet your needs, you are eligible for a full refund within **14 days** of your initial purchase.

## 2. How to Request a Refund
To request a refund:
1. Contact our support team at [billing@noska.app](mailto:billing@noska.app) with your account email and invoice receipt.
2. Our billing team will process your refund within 3–5 business days to the original payment method.

## 3. Subscription Renewals
Annual subscription renewals can be refunded within **7 days** of the renewal charge upon request. Monthly renewals are non-refundable once the billing cycle has started, but you can cancel anytime to prevent future charges.`
  }
};

export default function Legal() {
  const params = useParams();
  const location = useLocation();
  const slug = params.slug ?? location.pathname.replace('/', '');
  const [page, setPage] = useState<LegalPage | null>(DEFAULT_LEGAL_PAGES[slug] ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchPage() {
      setLoading(true);
      try {
        const pageData = await getCachedOrFetch<LegalPage | null>(
          `marketing_legal_${slug}`,
          async () => {
            EgressMonitor.logEvent('query', 'legal_pages', { slug });
            const { data, error } = await (supabaseAnon as any)
              .from('legal_pages')
              .select('*')
              .eq('slug', slug)
              .eq('published', true)
              .single();
            if (!error && data) return data as LegalPage;
            return DEFAULT_LEGAL_PAGES[slug] ?? null;
          },
          10 * 60 * 1000
        );
        if (isMounted) setPage(pageData ?? DEFAULT_LEGAL_PAGES[slug] ?? null);
      } catch {
        if (isMounted) setPage(DEFAULT_LEGAL_PAGES[slug] ?? null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPage();
    return () => {
      isMounted = false;
    };
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

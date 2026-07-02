import { useState } from 'react';
import {
  Sparkles, FileText, Database, CheckSquare,
  Zap, Code, ShieldCheck
} from 'lucide-react';
import './Product.css';

export default function Product() {
  const [selectedFeature, setSelectedFeature] = useState('ai');

  const featureDetails = {
    ai: {
      title: 'Noska AI: Your custom assistant.',
      subtitle: 'Write faster. Think bigger. Get answers instantly.',
      desc: 'Noska AI works directly inside your workspace to automate tasks, refine drafting, extract core insights, and answer cross-database queries.',
      points: [
        'Q&A: Ask questions and search across all company documents.',
        'Autofill: Fill database tables automatically using AI extractors.',
        'Writer: Summarize PDFs, rewrite drafts, edit tone, or translate.'
      ]
    },
    docs: {
      title: 'Docs: Simple, beautiful documents.',
      subtitle: 'Draft alone, then co-author together.',
      desc: 'Create documents containing styled headings, tables, embedded files, videos, code boxes, and interactive checkmarks.',
      points: [
        'Slash commands: Type "/" to insert list, checkmark, or code block.',
        'Real-time collab: Edit concurrently with live cursor markers.',
        'Export formats: Export pages to PDF, HTML, or Markdown.'
      ]
    },
    wikis: {
      title: 'Wikis: Centralize your information.',
      subtitle: 'Clear paths to any document.',
      desc: 'Turn folders of documents into clean Wiki hubs, and use the Thought Graph to see how everything connects instead of guessing.',
      points: [
        'Page nesting: Keep folders and articles organized in trees, as deep as you need.',
        'Thought Graph: A force-directed map of every page and its real connections.',
        'Backlinks: Every mention links back, so context is never one-directional.'
      ]
    },
    projects: {
      title: 'Projects: Connected roadmaps.',
      subtitle: 'Task management inside your notes.',
      desc: 'Track tasks, launch sprints, and monitor roadmaps. Connect project boards directly to document specs and meetings.',
      points: [
        'Custom views: Pivot between Kanban board, List, or Timeline.',
        'Properties: Tag assignees, due dates, state, or priority.',
        'Relations: Link tasks directly to meeting minutes or specifications.'
      ]
    }
  };

  return (
    <div className="product-wrapper">
      {/* Product Hero */}
      <section className="product-hero mkt-container">
        <span className="product-badge">Product Showcase</span>
        <h1>The suite for all team collaboration.</h1>
        <p>A connected set of tools for writing documents, establishing knowledge wikis, organizing projects, and executing AI actions.</p>
      </section>

      {/* Feature Selector Section */}
      <section className="showcase-selector-section mkt-container">
        <div className="showcase-grid-controls">
          <button
            className={`control-card ${selectedFeature === 'ai' ? 'active' : ''}`}
            onClick={() => setSelectedFeature('ai')}
          >
            <div className="control-icon purple"><Sparkles size={20} /></div>
            <h4>Noska AI</h4>
            <p>Write & search documents</p>
          </button>
          <button
            className={`control-card ${selectedFeature === 'docs' ? 'active' : ''}`}
            onClick={() => setSelectedFeature('docs')}
          >
            <div className="control-icon blue"><FileText size={20} /></div>
            <h4>Docs</h4>
            <p>Beautiful documents</p>
          </button>
          <button
            className={`control-card ${selectedFeature === 'wikis' ? 'active' : ''}`}
            onClick={() => setSelectedFeature('wikis')}
          >
            <div className="control-icon red"><Database size={20} /></div>
            <h4>Wikis</h4>
            <p>Knowledge database</p>
          </button>
          <button
            className={`control-card ${selectedFeature === 'projects' ? 'active' : ''}`}
            onClick={() => setSelectedFeature('projects')}
          >
            <div className="control-icon yellow"><CheckSquare size={20} /></div>
            <h4>Projects</h4>
            <p>Roadmaps & sprint tasks</p>
          </button>
        </div>

        {/* Selected Feature Deep Dive Panel */}
        <div className="selected-feature-panel">
          <div className="panel-info">
            <span className={`panel-badge ${selectedFeature}`}>
              {selectedFeature === 'ai' && <Sparkles size={12} />}
              {selectedFeature === 'docs' && <FileText size={12} />}
              {selectedFeature === 'wikis' && <Database size={12} />}
              {selectedFeature === 'projects' && <CheckSquare size={12} />}
              {selectedFeature.toUpperCase()}
            </span>
            <h2>{featureDetails[selectedFeature].title}</h2>
            <p className="panel-subtitle">{featureDetails[selectedFeature].subtitle}</p>
            <p className="panel-desc">{featureDetails[selectedFeature].desc}</p>
            <ul className="panel-bullets">
              {featureDetails[selectedFeature].points.map((point, index) => (
                <li key={index}>
                  <span className="bullet-indicator"></span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-visual">
            <div className="visual-display">
              {selectedFeature === 'ai' && (
                <div className="product-mini-mockup ai-card">
                  <div className="mock-title">⚡ Summarize Report</div>
                  <hr />
                  <div className="mock-text-area">
                    <p className="text-original">Original text: The team completed the migration to Azure. Latency decreased by 30% and throughput improved by 15%.</p>
                    <p className="text-summary">✨ AI Summary: Successful Azure cloud migration lowered server latencies by 30% and increased data throughput by 15%.</p>
                  </div>
                </div>
              )}
              {selectedFeature === 'docs' && (
                <div className="product-mini-mockup docs-card">
                  <div className="mock-title">📝 Slash Commands</div>
                  <hr />
                  <div className="command-selector">
                    <div className="selector-item active">📝 Add Heading 1</div>
                    <div className="selector-item">☑️ Add Todo Checklist</div>
                    <div className="selector-item">📊 Add Database Table</div>
                  </div>
                </div>
              )}
              {selectedFeature === 'wikis' && (
                <div className="product-mini-mockup wikis-card">
                  <div className="mock-title">🕸️ Thought Graph</div>
                  <hr />
                  <div className="verified-row">
                    <span>Employee Handbook</span>
                    <span className="badge-verified">6 linked pages</span>
                  </div>
                  <div className="verified-row">
                    <span>Engineering Onboarding</span>
                    <span className="badge-draft">2 linked pages</span>
                  </div>
                </div>
              )}
              {selectedFeature === 'projects' && (
                <div className="product-mini-mockup projects-card">
                  <div className="mock-title">📊 Property Fields</div>
                  <hr />
                  <div className="properties-list">
                    <div className="prop-row"><span>Assignee</span> <span>John Doe</span></div>
                    <div className="prop-row"><span>Priority</span> <span className="p-high">High</span></div>
                    <div className="prop-row"><span>Status</span> <span className="p-status">In Progress</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Specifications / Core integrations */}
      <section className="product-specs mkt-container">
        <div className="specs-header">
          <h2>Engineered for developers & teams</h2>
          <p>Integrated with API access, security logs, and custom markdown support.</p>
        </div>
        <div className="specs-grid">
          <div className="spec-card">
            <Code size={24} className="spec-icon" />
            <h4>Markdown & Code Snippets</h4>
            <p>Write easily in Markdown. Insert syntax-highlighted code panels supporting over 40 programming languages.</p>
          </div>
          <div className="spec-card">
            <Zap size={24} className="spec-icon" />
            <h4>Built-in API console</h4>
            <p>Every page and block route is documented in-app. Generate a token and run live requests against your own workspace, no external API portal required.</p>
          </div>
          <div className="spec-card">
            <ShieldCheck size={24} className="spec-icon" />
            <h4>Real encryption, real scoping</h4>
            <p>Lock pages with client-side AES-GCM encryption, and rely on Postgres row-level security scoped to your account on every table — not a shared policy.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

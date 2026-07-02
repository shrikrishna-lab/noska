import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, FileText, Database, CheckSquare,
  ArrowRight, Check, Star
} from 'lucide-react';
import './Home.css';

export default function Home() {
  const [activeTab, setActiveTab] = useState('docs');
  const [aiText, setAiText] = useState('Generate brainstorming ideas...');
  const [aiTyping, setAiTyping] = useState(false);
  const [todoItems, setTodoItems] = useState([
    { id: 1, text: 'Design new landing page layout', completed: true },
    { id: 2, text: 'Write product specifications for Q3', completed: false },
    { id: 3, text: 'Review security compliance policy', completed: false },
  ]);
  const [kanbanTasks, setKanbanTasks] = useState([
    { id: 101, title: 'Hero Illustration', status: 'todo', priority: 'Medium' },
    { id: 102, title: 'Database Schema', status: 'progress', priority: 'High' },
    { id: 103, title: 'Billing Integration', status: 'done', priority: 'High' },
  ]);

  // Trigger AI typing simulation
  const handleGenerateAi = () => {
    if (aiTyping) return;
    setAiTyping(true);
    setAiText('');
    const fullText = "✨ Brainstorming: 1. Launch landing page marketing campaign. 2. Implement collaborative editor in real-time. 3. Deploy AI agent workspace features.";
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setAiText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setAiTyping(false);
      }
    }, 35);
  };

  // Toggle todo item
  const toggleTodo = (id) => {
    setTodoItems(todoItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // Move task in kanban board
  const moveTask = (id) => {
    setKanbanTasks(kanbanTasks.map(task => {
      if (task.id === id) {
        const nextStatus = task.status === 'todo' ? 'progress' : task.status === 'progress' ? 'done' : 'todo';
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  return (
    <div className="home-wrapper">
      {/* 1. Hero Section */}
      <section className="hero-section mkt-container">
        <h1 className="hero-title">
          Where teams & <span className="highlight-text">agents</span> Jam together.
        </h1>
        <p className="hero-subtitle">
          Noska is the connected workspace where better, faster work happens. Now with AI actions and interactive agent setups built right in.
        </p>
        <div className="hero-cta-group">
          <Link to="/login" className="btn btn-primary btn-lg">
            Get Noska free <ArrowRight size={18} />
          </Link>
          <Link to="/enterprise" className="btn btn-secondary btn-lg">
            Request a demo
          </Link>
        </div>

        {/* Hero Vector Graphic Mockup */}
        <div className="hero-preview-container">
          <div className="preview-top-bar">
            <div className="dots-group">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="address-bar">🚀 Team Workspace / Home</div>
          </div>
          <div className="preview-layout">
            <aside className="preview-sidebar">
              <div className="sidebar-header">🏢 Workspace</div>
              <ul className="sidebar-list">
                <li className="active">🏠 Home</li>
                <li>📝 Meeting Notes</li>
                <li>🛠️ Project Roadmap</li>
                <li>🧠 Knowledge Base</li>
                <li>✨ Noska AI Assistant</li>
              </ul>
            </aside>
            <div className="preview-content">
              <h2>🏠 Workspace Home</h2>
              <p className="intro">Welcome back, Team! Here's what's happening across your projects today.</p>

              <div className="preview-grid">
                <div className="preview-card">
                  <h3>📝 Quick Notes</h3>
                  <p>Read specifications from the Q3 kickoff meeting.</p>
                  <span className="badge">Updated 2h ago</span>
                </div>
                <div className="preview-card">
                  <h3>🛠️ Projects In Flight</h3>
                  <p>Design reviews are currently in progress.</p>
                  <span className="badge warning">2 Tasks Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Client Logo Marquee */}
      <section className="marquee-section">
        <p className="marquee-title">Powering the world's best teams</p>
        <div className="marquee-container">
          <div className="marquee-content">
            <span className="brand-logo-text">Toyota</span>
            <span className="brand-logo-text">Pinterest</span>
            <span className="brand-logo-text">Figma</span>
            <span className="brand-logo-text">Pixar</span>
            <span className="brand-logo-text">Uber</span>
            <span className="brand-logo-text">Spotify</span>
            <span className="brand-logo-text">Pipedrive</span>
            <span className="brand-logo-text">Slack</span>
            {/* Duplicate for infinite effect */}
            <span className="brand-logo-text">Toyota</span>
            <span className="brand-logo-text">Pinterest</span>
            <span className="brand-logo-text">Figma</span>
            <span className="brand-logo-text">Pixar</span>
            <span className="brand-logo-text">Uber</span>
            <span className="brand-logo-text">Spotify</span>
            <span className="brand-logo-text">Pipedrive</span>
            <span className="brand-logo-text">Slack</span>
          </div>
        </div>
      </section>

      {/* 3. Interactive Bento Grid / Feature Section */}
      <section className="features-section mkt-container">
        <div className="section-header">
          <h2>Every team, side-by-side.</h2>
          <p>Consolidate your tools into one cohesive, interactive interface.</p>
        </div>

        {/* Feature Tabs */}
        <div className="features-tab-group">
          <button
            className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <FileText size={18} />
            <span>Docs</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'wikis' ? 'active' : ''}`}
            onClick={() => setActiveTab('wikis')}
          >
            <Database size={18} />
            <span>Wikis</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <CheckSquare size={18} />
            <span>Projects</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={18} />
            <span>Noska AI</span>
          </button>
        </div>

        {/* Interactive Feature Panel */}
        <div className="features-showcase-panel">
          <div className="showcase-info">
            {activeTab === 'docs' && (
              <>
                <span className="category-label text-blue">Docs</span>
                <h3>Simple, powerful, and collaborative.</h3>
                <p>Add lists, checkmarks, tables, and media embed headers. Work together live with comments and annotations.</p>
                <div className="interactive-hint">👉 Try clicking the tasks below to check them off!</div>
              </>
            )}
            {activeTab === 'wikis' && (
              <>
                <span className="category-label text-red">Wikis</span>
                <h3>Centralize your team knowledge base.</h3>
                <p>No more searching through drive folders. Nest pages inside pages, search instantly, and assign owners to files.</p>
              </>
            )}
            {activeTab === 'projects' && (
              <>
                <span className="category-label text-yellow">Projects</span>
                <h3>Manage complex projects easily.</h3>
                <p>Track sprints, roadmap priorities, and custom task workflows. View your board as Kanban, Table, or Calendar.</p>
                <div className="interactive-hint">👉 Try clicking a task card to move it to the next column!</div>
              </>
            )}
            {activeTab === 'ai' && (
              <>
                <span className="category-label text-purple">Noska AI</span>
                <h3>Supercharge your mind and writing.</h3>
                <p>Brainstorm new features, summarize lengthy papers, translate docs, and search your entire workspace automatically.</p>
                <div className="interactive-hint">👉 Click "Brainstorm" below to run the AI assistant!</div>
              </>
            )}
          </div>

          <div className="showcase-visual">
            {activeTab === 'docs' && (
              <div className="interactive-docs-mockup">
                <div className="mockup-header">
                  <span className="emoji">📝</span>
                  <h4>Product Specs: Q3 Landing Page</h4>
                </div>
                <hr className="divider" />
                <p className="mockup-p">We are building a highly aesthetic, responsive user experience mimicking the Noska site. Here is the checklist:</p>
                <div className="todo-list">
                  {todoItems.map(item => (
                    <div
                      key={item.id}
                      className={`todo-item ${item.completed ? 'completed' : ''}`}
                      onClick={() => toggleTodo(item.id)}
                    >
                      <div className={`checkbox ${item.completed ? 'checked' : ''}`}>
                        {item.completed && <Check size={12} />}
                      </div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'wikis' && (
              <div className="interactive-wikis-mockup">
                <div className="wiki-sidebar">
                  <div className="sidebar-title">📚 Company Wiki</div>
                  <div className="wiki-links">
                    <span className="wiki-link active">📖 Employee Handbook</span>
                    <span className="wiki-link">🎨 Brand Identity Guidelines</span>
                    <span className="wiki-link">🖥️ Engineering Best Practices</span>
                    <span className="wiki-link">📊 Office Policies</span>
                  </div>
                </div>
                <div className="wiki-body">
                  <h4>📖 Employee Handbook</h4>
                  <p>Welcome to our central handbook. Everything you need to know about working with us is right here.</p>
                  <div className="wiki-grid">
                    <div className="wiki-grid-card">
                      <h5>🏢 Office Info</h5>
                      <p>Locations, maps, schedules</p>
                    </div>
                    <div className="wiki-grid-card">
                      <h5>🎁 Benefits</h5>
                      <p>Healthcare, holidays, setup allowances</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="interactive-projects-mockup">
                <div className="kanban-board">
                  {['todo', 'progress', 'done'].map(status => (
                    <div key={status} className="kanban-column">
                      <div className="column-header">
                        <span className="status-dot"></span>
                        <span className="status-title">{status.toUpperCase()}</span>
                      </div>
                      <div className="column-cards">
                        {kanbanTasks.filter(task => task.status === status).map(task => (
                          <div
                            key={task.id}
                            className="kanban-card"
                            onClick={() => moveTask(task.id)}
                          >
                            <h5>{task.title}</h5>
                            <div className="card-footer">
                              <span className={`priority-tag ${task.priority.toLowerCase()}`}>
                                {task.priority}
                              </span>
                              <span className="task-id">#{task.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="interactive-ai-mockup">
                <div className="ai-chat-header">
                  <Sparkles size={16} className="sparkle-icon" />
                  <span>Noska AI Writer</span>
                </div>
                <div className="ai-chat-body">
                  <div className="ai-prompt-box">
                    <p className="prompt-label">Ask AI to write:</p>
                    <div className="prompt-input">"Brainstorm launch ideas for landing page..."</div>
                  </div>
                  <div className="ai-response-box">
                    <p className="response-text">{aiText}</p>
                    {aiTyping && <span className="typing-cursor">|</span>}
                  </div>
                  <button
                    className="btn btn-primary ai-action-btn"
                    onClick={handleGenerateAi}
                    disabled={aiTyping}
                  >
                    <Sparkles size={14} /> {aiTyping ? 'Thinking...' : 'Brainstorm Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Testimonials Section */}
      <section className="testimonials-section mkt-container">
        <div className="section-header">
          <h2>Loved by builders worldwide.</h2>
          <p>Read reviews from professionals who build on Noska every single day.</p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="card-header">
              <div className="user-info">
                <span className="user-avatar">AD</span>
                <div>
                  <h4 className="user-name">Andrew Chen</h4>
                  <p className="user-handle">General Partner, Andreessen Horowitz</p>
                </div>
              </div>
              <div className="rating">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
            </div>
            <p className="testimonial-quote">
              "We run our entire investment thesis, pipeline, and startup database inside Noska. The database relations are unmatched."
            </p>
          </div>

          <div className="testimonial-card">
            <div className="card-header">
              <div className="user-info">
                <span className="user-avatar">SL</span>
                <div>
                  <h4 className="user-name">Sarah Lim</h4>
                  <p className="user-handle">Lead Designer, Figma</p>
                </div>
              </div>
              <div className="rating">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
            </div>
            <p className="testimonial-quote">
              "As a designer, I care about structure and typography. Noska gives us complete flexibility without cluttering the interface."
            </p>
          </div>

          <div className="testimonial-card">
            <div className="card-header">
              <div className="user-info">
                <span className="user-avatar">MK</span>
                <div>
                  <h4 className="user-name">Michael Koenig</h4>
                  <p className="user-handle">CTO, Pipedrive</p>
                </div>
              </div>
              <div className="rating">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
            </div>
            <p className="testimonial-quote">
              "Connecting our engineering roadmaps with our product spec wikis cut down meeting overhead by 40%. Highly recommended."
            </p>
          </div>
        </div>
      </section>

      {/* 5. Community Statistics */}
      <section className="stats-section mkt-container">
        <div className="stats-header">
          <h2>Join a global community.</h2>
          <p>Our global network of creators, designers, and guides build alongside us.</p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-num">10M+</p>
            <p className="stat-label">Community members</p>
          </div>
          <div className="stat-card">
            <p className="stat-num">150K+</p>
            <p className="stat-label">Free starter templates</p>
          </div>
          <div className="stat-card">
            <p className="stat-num">1M+</p>
            <p className="stat-label">Active integrations built</p>
          </div>
        </div>
      </section>

      {/* 6. Final CTA Section */}
      <section className="final-cta-section mkt-container">
        <div className="cta-banner">
          <h2>Get started for free today.</h2>
          <p>Play around with templates, connect your tools, or invite your team to collaborate.</p>
          <div className="cta-btn-group">
            <Link to="/login" className="btn btn-primary btn-lg">
              Get Noska free
            </Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg">
              View all plans <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

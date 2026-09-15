/**
 * Built-in Interactive Block Starter Templates
 * 
 * 15 rich, fully-functional interactive templates ready for instant preview,
 * AI completion, or manual coding.
 * All templates adapt dynamically to Noska's Light and Dark themes.
 */

export interface InteractiveTemplate {
  id: string;
  name: string;
  tagline: string;
  iconName: string;
  color: string;
  promptSample: string;
  html: string;
  css: string;
  javascript: string;
}

export const INTERACTIVE_TEMPLATES: InteractiveTemplate[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    tagline: "Live metrics, KPI stat cards & interactive progress",
    iconName: "LayoutDashboard",
    color: "#38bdf8",
    promptSample: "Create an interactive project dashboard with live metric gauges and activity logs",
    html: `<div class="dashboard">
  <header class="dash-header">
    <div>
      <h1>Workspace Performance</h1>
      <p class="subtitle">Real-time team throughput and completion metrics</p>
    </div>
    <button id="refresh-btn" class="pill-btn">⚡ Simulate Traffic</button>
  </header>

  <div class="kpi-grid">
    <div class="kpi-card">
      <span class="kpi-label">Active Users</span>
      <div class="kpi-val" id="users-count">2,845</div>
      <span class="badge positive">+14.2% this week</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Task Velocity</span>
      <div class="kpi-val" id="velocity-count">94.8%</div>
      <span class="badge positive">+4.1% efficiency</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">Avg Response Time</span>
      <div class="kpi-val" id="response-count">48ms</div>
      <span class="badge neutral">Optimal</span>
    </div>
  </div>

  <div class="card chart-card">
    <div class="card-head">
      <h3>Weekly Throughput</h3>
      <span class="caption">Click bars to inspect daily loads</span>
    </div>
    <div class="bar-chart" id="chart">
      <div class="bar-col" data-day="Mon" data-val="65"><div class="bar" style="height: 65%;"></div><span>Mon</span></div>
      <div class="bar-col" data-day="Tue" data-val="88"><div class="bar" style="height: 88%;"></div><span>Tue</span></div>
      <div class="bar-col" data-day="Wed" data-val="92"><div class="bar" style="height: 92%;"></div><span>Wed</span></div>
      <div class="bar-col" data-day="Thu" data-val="78"><div class="bar" style="height: 78%;"></div><span>Thu</span></div>
      <div class="bar-col" data-day="Fri" data-val="95"><div class="bar" style="height: 95%;"></div><span>Fri</span></div>
      <div class="bar-col" data-day="Sat" data-val="40"><div class="bar" style="height: 40%;"></div><span>Sat</span></div>
      <div class="bar-col" data-day="Sun" data-val="30"><div class="bar" style="height: 30%;"></div><span>Sun</span></div>
    </div>
    <div id="chart-info" class="chart-info">Hover or click a day above</div>
  </div>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  padding: 1.5rem;
  box-sizing: border-box;
}
.dashboard { width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
.dash-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
h1 { margin: 0; font-size: 1.45rem; font-weight: 700; color: var(--noska-text, #0F172A); letter-spacing: -0.02em; }
.subtitle { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--noska-text-secondary, #64748B); }
.pill-btn {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}
.pill-btn:hover { transform: translateY(-1px); opacity: 0.95; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.kpi-card {
  background: var(--noska-surface-1, #F8FAFC);
  border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: var(--noska-shadow-sm, 0 1px 3px rgba(0,0,0,0.04));
}
.kpi-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--noska-text-secondary, #64748B); letter-spacing: 0.05em; }
.kpi-val { font-size: 1.75rem; font-weight: 800; color: #0284c7; font-variant-numeric: tabular-nums; }
.badge { font-size: 0.75rem; font-weight: 600; width: fit-content; padding: 0.2rem 0.5rem; border-radius: 6px; }
.badge.positive { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.badge.neutral { background: var(--noska-surface-2, #F1F5F9); color: var(--noska-text-secondary, #64748B); }
.card { background: var(--noska-surface-1, #F8FAFC); border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08)); border-radius: 14px; padding: 1.25rem; box-shadow: var(--noska-shadow-sm, 0 1px 3px rgba(0,0,0,0.04)); }
.card-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
.card-head h3 { margin: 0; font-size: 1.05rem; color: var(--noska-text, #0F172A); }
.caption { font-size: 0.75rem; color: var(--noska-text-secondary, #64748B); }
.bar-chart { display: flex; justify-content: space-between; align-items: flex-end; height: 140px; padding-top: 10px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; cursor: pointer; gap: 0.5rem; }
.bar { width: 60%; background: linear-gradient(180deg, #38bdf8 0%, #0284c7 100%); border-radius: 6px 6px 0 0; transition: all 0.3s ease; }
.bar-col:hover .bar { background: linear-gradient(180deg, #67e8f9 0%, #38bdf8 100%); transform: scaleY(1.05); }
.bar-col span { font-size: 0.75rem; color: var(--noska-text-secondary, #64748B); }
.chart-info { margin-top: 0.75rem; font-size: 0.8rem; color: #0284c7; font-weight: 600; text-align: center; min-height: 1.2rem; }`,
    javascript: `const btn = document.getElementById('refresh-btn');
const usersEl = document.getElementById('users-count');
const chartInfo = document.getElementById('chart-info');
const bars = document.querySelectorAll('.bar-col');

bars.forEach(col => {
  col.addEventListener('click', () => {
    const day = col.getAttribute('data-day');
    const val = col.getAttribute('data-val');
    chartInfo.textContent = \`📊 \${day}: \${val}% capacity utilization\`;
    console.log(\`[Dashboard] Inspected \${day}: \${val}%\`);
  });
});

if (btn) {
  btn.addEventListener('click', () => {
    const randomUsers = Math.floor(2500 + Math.random() * 800);
    usersEl.textContent = randomUsers.toLocaleString();
    bars.forEach(col => {
      const newHeight = Math.floor(30 + Math.random() * 65);
      col.setAttribute('data-val', newHeight);
      const bar = col.querySelector('.bar');
      if (bar) bar.style.height = newHeight + '%';
    });
    console.log('[Dashboard] Simulated live metrics refresh');
  });
}`
  },
  {
    id: "slides",
    name: "Slides",
    tagline: "Interactive slide presentation with smooth deck transitions",
    iconName: "Presentation",
    color: "#f59e0b",
    promptSample: "Create an interactive slide presentation with bullet points and slide navigation",
    html: `<div class="deck-container">
  <div class="deck">
    <div class="slide active" data-index="1">
      <span class="slide-badge">01 / 03</span>
      <h2>⚡ Product Vision 2026</h2>
      <p class="lead">Accelerating frictionless collaboration across distributed knowledge teams.</p>
      <ul class="bullet-list">
        <li>Unified canvas + document intelligence</li>
        <li>Instant offline synchronization</li>
        <li>Custom interactive micro-apps</li>
      </ul>
    </div>
    <div class="slide" data-index="2">
      <span class="slide-badge">02 / 03</span>
      <h2>🚀 Key Architecture Pillars</h2>
      <p class="lead">Built on modern sandboxed web technologies.</p>
      <ul class="bullet-list">
        <li>Zero latency local-first state</li>
        <li>Isolated runtime sandboxing</li>
        <li>Dynamic theme propagation</li>
      </ul>
    </div>
    <div class="slide" data-index="3">
      <span class="slide-badge">03 / 03</span>
      <h2>🎯 Next Milestones</h2>
      <p class="lead">Q3 Release Roadmap and Global Rollout.</p>
      <ul class="bullet-list">
        <li>Self-hosted enterprise bridge</li>
        <li>Multiplayer real-time canvas</li>
        <li>Plugin ecosystem expansion</li>
      </ul>
    </div>
  </div>
  <footer class="deck-controls">
    <button id="prev-btn" class="nav-btn">← Prev</button>
    <div class="dots" id="dots"></div>
    <button id="next-btn" class="nav-btn">Next →</button>
  </footer>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.25rem;
  box-sizing: border-box;
}
.deck-container {
  width: 100%;
  max-width: 580px;
  background: var(--noska-card, #FFFFFF);
  border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08));
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.04);
}
.slide { display: none; min-height: 200px; animation: fadeIn 0.25s ease-out; }
.slide.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.slide-badge {
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  display: inline-block;
}
h2 { margin: 0.85rem 0 0.4rem; font-size: 1.5rem; font-weight: 800; color: var(--noska-text, #0F172A); letter-spacing: -0.02em; }
.lead { color: var(--noska-text-secondary, #64748B); font-size: 0.95rem; margin-bottom: 1.25rem; line-height: 1.5; }
.bullet-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.bullet-list li { position: relative; padding-left: 1.4rem; font-size: 0.92rem; color: var(--noska-text, #334155); font-weight: 500; }
.bullet-list li::before { content: "•"; position: absolute; left: 0.2rem; color: #f59e0b; font-size: 1.2rem; line-height: 1; }
.deck-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 1.75rem; border-top: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08)); padding-top: 1.25rem; }
.nav-btn {
  background: var(--noska-surface-1, #F8FAFC);
  color: var(--noska-text, #0F172A);
  border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.1));
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.nav-btn:hover { background: var(--noska-surface-2, #F1F5F9); border-color: var(--noska-border-strong, rgba(0,0,0,0.2)); transform: translateY(-1px); }
.dots { display: flex; gap: 0.45rem; align-items: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--noska-surface-3, #CBD5E1); cursor: pointer; transition: all 0.25s ease; }
.dot.active { background: #f59e0b; width: 22px; border-radius: 9999px; }`,
    javascript: `let current = 0;
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dots');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

slides.forEach((_, i) => {
  const dot = document.createElement('div');
  dot.className = \`dot \${i === 0 ? 'active' : ''}\`;
  dot.addEventListener('click', () => showSlide(i));
  dotsContainer.appendChild(dot);
});

function showSlide(index) {
  slides[current].classList.remove('active');
  dotsContainer.children[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
  dotsContainer.children[current].classList.add('active');
  console.log('[Slides] Navigated to slide:', current + 1);
}

prevBtn.addEventListener('click', () => showSlide(current - 1));
nextBtn.addEventListener('click', () => showSlide(current + 1));`
  },
  {
    id: "calculator",
    name: "Calculator",
    tagline: "Custom mathematical, grade or financial calculator",
    iconName: "Calculator",
    color: "#10b981",
    promptSample: "Create a loan amortization and student attendance calculator with live breakdown",
    html: `<div class="calc-card">
  <h2>🧮 Smart Attendance & Grade Estimator</h2>
  <div class="input-group">
    <label>Total Classes Held</label>
    <input type="number" id="total" value="40" min="1" />
  </div>
  <div class="input-group">
    <label>Classes Attended</label>
    <input type="number" id="attended" value="34" min="0" />
  </div>
  <div class="input-group">
    <label>Target Minimum Attendance (%)</label>
    <input type="number" id="target" value="75" min="1" max="100" />
  </div>

  <div class="result-box" id="result-box">
    <div class="pct-display" id="pct-val">85.0%</div>
    <div class="status-msg" id="status-msg">You are comfortably above target!</div>
  </div>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  box-sizing: border-box;
}
.calc-card {
  width: 100%;
  max-width: 440px;
  background: var(--noska-card, #FFFFFF);
  border: 1px solid var(--noska-border, rgba(16, 185, 129, 0.2));
  border-radius: 18px;
  padding: 1.75rem;
  box-shadow: 0 10px 30px -5px rgba(16, 185, 129, 0.08), 0 2px 8px rgba(0,0,0,0.04);
}
h2 { margin: 0 0 1.25rem; font-size: 1.2rem; color: #059669; text-align: center; font-weight: 700; }
.input-group { margin-bottom: 1rem; }
label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--noska-text-secondary, #475569); margin-bottom: 0.35rem; }
input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.12));
  background: var(--noska-surface-1, #F8FAFC);
  color: var(--noska-text, #0F172A);
  font-size: 1rem;
  font-weight: 600;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}
input:focus { border-color: #10b981; }
.result-box {
  margin-top: 1.25rem;
  padding: 1.25rem;
  background: rgba(16, 185, 129, 0.08);
  border-radius: 14px;
  text-align: center;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.pct-display { font-size: 2.2rem; font-weight: 800; color: #059669; }
.status-msg { font-size: 0.85rem; color: var(--noska-text, #0F172A); margin-top: 0.35rem; font-weight: 500; }`,
    javascript: `const totalInput = document.getElementById('total');
const attendedInput = document.getElementById('attended');
const targetInput = document.getElementById('target');
const pctVal = document.getElementById('pct-val');
const statusMsg = document.getElementById('status-msg');

function calculate() {
  const total = parseFloat(totalInput.value) || 1;
  const attended = parseFloat(attendedInput.value) || 0;
  const target = parseFloat(targetInput.value) || 75;

  const pct = ((attended / total) * 100).toFixed(1);
  pctVal.textContent = pct + '%';

  if (pct >= target) {
    const canBunk = Math.floor((attended - (target / 100) * total) / (target / 100));
    statusMsg.textContent = canBunk > 0 
      ? \`✅ Safe! You can miss up to \${canBunk} more class\${canBunk === 1 ? '' : 'es'}.\`
      : '✅ On track! Do not miss the next class.';
  } else {
    const needAttend = Math.ceil(((target / 100) * total - attended) / (1 - target / 100));
    statusMsg.textContent = \`⚠️ Behind target. You must attend the next \${needAttend} classes straight.\`;
  }
}

[totalInput, attendedInput, targetInput].forEach(inp => inp.addEventListener('input', calculate));
calculate();`
  },
  {
    id: "quiz",
    name: "Quiz",
    tagline: "Interactive assessment with multiple choice scoring",
    iconName: "HelpCircle",
    color: "#8b5cf6",
    promptSample: "Create an interactive knowledge check quiz with instant feedback and score summary",
    html: `<div class="quiz-box">
  <header class="quiz-head">
    <h3>🧠 Knowledge Check</h3>
    <span class="q-count" id="q-count">Question 1 of 3</span>
  </header>
  
  <div class="q-card" id="q-card">
    <p class="question" id="q-text">What is the default isolation model for Noska Interactive blocks?</p>
    <div class="options" id="options"></div>
  </div>

  <div class="quiz-footer" id="footer" style="display: none;">
    <div id="feedback" class="feedback"></div>
    <button id="next-btn" class="btn">Next Question →</button>
  </div>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  box-sizing: border-box;
}
.quiz-box {
  width: 100%;
  max-width: 480px;
  background: var(--noska-card, #FFFFFF);
  border: 1px solid var(--noska-border, rgba(139, 92, 246, 0.2));
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px -5px rgba(139, 92, 246, 0.08), 0 2px 8px rgba(0,0,0,0.04);
}
.quiz-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08)); padding-bottom: 0.75rem; margin-bottom: 1rem; }
h3 { margin: 0; color: #7c3aed; font-size: 1.1rem; font-weight: 700; }
.q-count { font-size: 0.75rem; color: var(--noska-text-secondary, #64748B); font-family: monospace; }
.question { font-size: 1.05rem; font-weight: 700; color: var(--noska-text, #0F172A); margin-bottom: 1.25rem; line-height: 1.4; }
.options { display: flex; flex-direction: column; gap: 0.5rem; }
.opt-btn {
  background: var(--noska-surface-1, #F8FAFC);
  border: 1px solid var(--noska-border, rgba(0, 0, 0, 0.08));
  color: var(--noska-text, #0F172A);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.opt-btn:hover { background: rgba(139, 92, 246, 0.08); border-color: #8b5cf6; }
.opt-btn.correct { background: #ecfdf5; border-color: #10b981; color: #065f46; font-weight: 600; }
.opt-btn.incorrect { background: #fef2f2; border-color: #ef4444; color: #991b1b; font-weight: 600; }
.quiz-footer { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.feedback { font-size: 0.95rem; font-weight: 700; }
.btn { background: #7c3aed; color: #fff; border: none; padding: 0.55rem 1.35rem; border-radius: 9999px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.btn:hover { opacity: 0.9; }`,
    javascript: `const questions = [
  { q: "What is the default isolation model for Noska Interactive blocks?", opts: ["Direct parent DOM injection", "Sandboxed <iframe> runtime", "Server-side rendering only"], ans: 1 },
  { q: "Which format is supported for multi-file bundle imports?", opts: [".tar.gz", ".zip and .html", ".rar only"], ans: 1 },
  { q: "How is console logging routed to the parent editor?", opts: ["Controlled postMessage bridge", "Polling window.console", "WebSockets"], ans: 0 }
];

let idx = 0;
let score = 0;
const qText = document.getElementById('q-text');
const qCount = document.getElementById('q-count');
const optionsEl = document.getElementById('options');
const footer = document.getElementById('footer');
const feedback = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');

function renderQ() {
  const current = questions[idx];
  qCount.textContent = \`Question \${idx + 1} of \${questions.length}\`;
  qText.textContent = current.q;
  optionsEl.innerHTML = '';
  footer.style.display = 'none';

  current.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.onclick = () => choose(i);
    optionsEl.appendChild(btn);
  });
}

function choose(selected) {
  const current = questions[idx];
  const buttons = optionsEl.querySelectorAll('.opt-btn');
  buttons.forEach(b => b.disabled = true);

  if (selected === current.ans) {
    buttons[selected].classList.add('correct');
    feedback.textContent = '🎉 Correct!';
    feedback.style.color = '#10b981';
    score++;
  } else {
    buttons[selected].classList.add('incorrect');
    buttons[current.ans].classList.add('correct');
    feedback.textContent = '❌ Incorrect!';
    feedback.style.color = '#ef4444';
  }
  footer.style.display = 'flex';
}

nextBtn.onclick = () => {
  idx++;
  if (idx < questions.length) {
    renderQ();
  } else {
    qText.textContent = \`🏆 Quiz Complete! You scored \${score} / \${questions.length}\`;
    optionsEl.innerHTML = '';
    footer.style.display = 'none';
  }
};

renderQ();`
  },
  {
    id: "game",
    name: "Game",
    tagline: "Interactive 2D physics or retro mini-game",
    iconName: "Gamepad2",
    color: "#ec4899",
    promptSample: "Create an interactive mini-game with score tracking and keyboard controls",
    html: `<div class="game-wrap">
  <div class="game-header">
    <span>Score: <b id="score">0</b></span>
    <span>High: <b id="high">0</b></span>
  </div>
  <canvas id="canvas" width="360" height="240"></canvas>
  <p class="help">Tap canvas or press SPACE to jump!</p>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}
.game-wrap { text-align: center; background: var(--noska-card, #FFFFFF); border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); border-radius: 20px; padding: 1.5rem; box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06)); }
.game-header { display: flex; justify-content: space-between; max-width: 360px; margin: 0 auto 0.5rem; font-family: monospace; font-size: 1rem; color: #db2777; font-weight: 700; }
canvas { background: var(--noska-surface-1, #F8FAFC); border: 2px solid #ec4899; border-radius: 12px; display: block; margin: 0 auto; box-shadow: 0 8px 20px rgba(236,72,153,0.15); cursor: pointer; }
.help { font-size: 0.8rem; color: var(--noska-text-secondary, #64748B); margin-top: 0.6rem; font-weight: 500; }`,
    javascript: `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

let player = { y: 120, vy: 0, size: 16 };
let pipes = [];
let score = 0;
let gameOver = false;

function reset() {
  player.y = 120;
  player.vy = 0;
  pipes = [];
  score = 0;
  scoreEl.textContent = '0';
  gameOver = false;
}

function jump() {
  if (gameOver) { reset(); return; }
  player.vy = -5.5;
}

window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
canvas.addEventListener('pointerdown', jump);

function update() {
  if (!gameOver) {
    player.vy += 0.28;
    player.y += player.vy;

    if (player.y > canvas.height - player.size || player.y < 0) {
      gameOver = true;
    }

    if (Math.random() < 0.02) {
      pipes.push({ x: canvas.width, top: Math.random() * 100 + 20, gap: 80 });
    }

    pipes.forEach((p, i) => {
      p.x -= 2;
      if (p.x + 20 < 0) {
        pipes.splice(i, 1);
        score++;
        scoreEl.textContent = score;
      }
      if (
        player.y < p.top ||
        player.y + player.size > p.top + p.gap
      ) {
        if (p.x < 50 + player.size && p.x + 20 > 50) {
          gameOver = true;
        }
      }
    });
  }

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pipes
  ctx.fillStyle = '#10b981';
  pipes.forEach(p => {
    ctx.fillRect(p.x, 0, 20, p.top);
    ctx.fillRect(p.x, p.top + p.gap, 20, canvas.height - p.top - p.gap);
  });

  // Player
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(50, player.y, player.size, player.size);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Game Over! Tap to restart', 60, 120);
  }

  requestAnimationFrame(update);
}
requestAnimationFrame(update);`
  },
  {
    id: "explainer",
    name: "Explainer",
    tagline: "Interactive concept breakdown with step-by-step visual tabs",
    iconName: "HelpCircle",
    color: "#3b82f6",
    promptSample: "Create an interactive step-by-step visual explainer of distributed databases",
    html: `<div class="explainer-card">
  <h2>🔍 How Raft Consensus Works</h2>
  <div class="steps-nav">
    <button class="step-btn active" data-step="1">1. Leader Election</button>
    <button class="step-btn" data-step="2">2. Log Replication</button>
    <button class="step-btn" data-step="3">3. Safety Commit</button>
  </div>
  <div class="step-body" id="step-body">
    <h4>Step 1: Leader Election</h4>
    <p>Nodes start in follower state. If a heartbeat times out, a candidate requests votes across the cluster.</p>
    <div class="vis-box">👑 Node A elected Leader with quorum of 3/5 votes.</div>
  </div>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}
.explainer-card { background: var(--noska-card, #FFFFFF); border-radius: 18px; padding: 1.75rem; max-width: 520px; width: 100%; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06)); }
h2 { margin: 0 0 1rem; font-size: 1.25rem; color: #2563eb; font-weight: 700; }
.steps-nav { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
.step-btn { flex: 1; padding: 0.5rem; background: var(--noska-surface-1, #F8FAFC); border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); color: var(--noska-text-secondary, #64748B); border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.step-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.step-body h4 { margin: 0 0 0.4rem; color: var(--noska-text, #0F172A); font-size: 1rem; }
.step-body p { font-size: 0.9rem; color: var(--noska-text-secondary, #475569); line-height: 1.45; margin-bottom: 1rem; }
.vis-box { background: var(--noska-surface-1, #F8FAFC); border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); border-radius: 10px; padding: 1rem; font-family: monospace; font-size: 0.85rem; color: #0284c7; text-align: center; }`,
    javascript: `const steps = {
  1: { title: "Step 1: Leader Election", text: "Nodes start in follower state. If a heartbeat times out, a candidate requests votes across the cluster.", vis: "👑 Node A elected Leader with quorum of 3/5 votes." },
  2: { title: "Step 2: Log Replication", text: "Clients send state updates to the Leader. The Leader writes to its uncommitted log and propagates entries to Followers.", vis: "📝 Entry #104 replicated to Nodes B & C." },
  3: { title: "Step 3: Safety Commit", text: "Once a majority of followers acknowledge receipt, the Leader commits the entry and applies it to the state machine.", vis: "🔒 Entry #104 permanently committed." }
};

document.querySelectorAll('.step-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const s = steps[btn.getAttribute('data-step')];
    document.getElementById('step-body').innerHTML = \`<h4>\${s.title}</h4><p>\${s.text}</p><div class="vis-box">\${s.vis}</div>\`;
  };
});`
  },
  {
    id: "prototype",
    name: "Prototype",
    tagline: "Clickable mobile UI prototype with state transitions",
    iconName: "Smartphone",
    color: "#06b6d4",
    promptSample: "Create an interactive mobile music player prototype with playlist navigation",
    html: `<div class="phone-frame">
  <div class="screen">
    <div class="status-bar"><span>9:41</span><span>●●●</span></div>
    <div class="player">
      <div class="album-art">🎵</div>
      <h3>Midnight Reverie</h3>
      <p>Noska Ambient Soundscapes</p>
      <div class="progress-bar"><div class="fill"></div></div>
      <div class="player-controls">
        <button id="play-btn">▶ Play</button>
      </div>
    </div>
  </div>
</div>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
}
.phone-frame { width: 260px; height: 380px; background: var(--noska-card, #FFFFFF); border: 4px solid var(--noska-surface-3, #E2E8F0); border-radius: 32px; padding: 10px; box-shadow: 0 16px 36px -8px rgba(0,0,0,0.12); }
.screen { height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
.status-bar { display: flex; justify-content: space-between; font-size: 10px; color: var(--noska-text-secondary, #64748B); padding: 4px 8px; font-weight: 600; }
.player { text-align: center; padding: 12px; }
.album-art { width: 100px; height: 100px; background: linear-gradient(135deg, #06b6d4, #3b82f6); border-radius: 16px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 8px 16px rgba(6, 182, 212, 0.25); }
h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--noska-text, #0F172A); }
p { margin: 4px 0 12px; font-size: 11px; color: var(--noska-text-secondary, #64748B); }
.progress-bar { height: 4px; background: var(--noska-surface-2, #F1F5F9); border-radius: 2px; overflow: hidden; margin-bottom: 16px; }
.fill { width: 45%; height: 100%; background: #06b6d4; }
.player-controls button { background: #06b6d4; border: none; color: #fff; font-weight: bold; border-radius: 20px; padding: 6px 20px; font-size: 12px; cursor: pointer; box-shadow: 0 4px 10px rgba(6, 182, 212, 0.3); }`,
    javascript: `let playing = false;
const btn = document.getElementById('play-btn');
btn.onclick = () => {
  playing = !playing;
  btn.textContent = playing ? '⏸ Pause' : '▶ Play';
  console.log('[Prototype] Player state changed:', playing);
};`
  },
  {
    id: "report",
    name: "Report",
    tagline: "Interactive executive summary with tabbed filters",
    iconName: "FileSpreadsheet",
    color: "#6366f1",
    promptSample: "Create an interactive quarterly financial report with toggleable breakdowns",
    html: `<div class="report-box">
  <div class="report-header">
    <div><h2>Q3 Operations Report</h2><span class="muted">Fiscal Year 2026</span></div>
    <span class="tag">Audited</span>
  </div>
  <table class="report-table">
    <thead><tr><th>Department</th><th>Budget</th><th>Actual</th><th>Variance</th></tr></thead>
    <tbody>
      <tr><td>Engineering</td><td>$450,000</td><td>$432,000</td><td class="pos">-$18,000</td></tr>
      <tr><td>Design & UI</td><td>$180,000</td><td>$174,000</td><td class="pos">-$6,000</td></tr>
      <tr><td>Marketing</td><td>$220,000</td><td>$228,000</td><td class="neg">+$8,000</td></tr>
    </tbody>
  </table>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); padding: 1.5rem; margin: 0; }
.report-box { max-width: 580px; margin: 0 auto; background: var(--noska-card, #FFFFFF); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-sm, 0 1px 3px rgba(0,0,0,0.04)); }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
h2 { margin: 0; font-size: 1.2rem; font-weight: 700; }
.muted { font-size: 0.8rem; color: var(--noska-text-secondary, #64748B); }
.tag { font-size: 0.75rem; background: rgba(99, 102, 241, 0.12); color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600; }
.report-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--noska-border, rgba(0,0,0,0.06)); }
th { color: var(--noska-text-secondary, #64748B); font-weight: 600; }
.pos { color: #16a34a; font-weight: bold; }
.neg { color: #dc2626; font-weight: bold; }`,
    javascript: `console.log('[Report] Loaded financial variance matrix');`
  },
  {
    id: "form",
    name: "Form",
    tagline: "Interactive form with live input feedback and validation",
    iconName: "FormInput",
    color: "#14b8a6",
    promptSample: "Create an interactive feedback form with validation and rating buttons",
    html: `<div class="form-card">
  <h2>💬 User Feedback Survey</h2>
  <form id="feedback-form">
    <div class="field">
      <label>Overall Experience</label>
      <div class="ratings" id="ratings">
        <button type="button" class="star" data-val="1">⭐</button>
        <button type="button" class="star" data-val="2">⭐</button>
        <button type="button" class="star" data-val="3">⭐</button>
        <button type="button" class="star" data-val="4">⭐</button>
        <button type="button" class="star" data-val="5">⭐</button>
      </div>
    </div>
    <div class="field">
      <label>Comments & Suggestions</label>
      <textarea id="comment" rows="3" placeholder="What can we improve?"></textarea>
    </div>
    <button type="submit" class="submit-btn">Send Feedback</button>
  </form>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
.form-card { max-width: 420px; width: 100%; background: var(--noska-card, #FFFFFF); padding: 1.75rem; border-radius: 18px; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06)); }
h2 { margin: 0 0 1rem; font-size: 1.25rem; color: #0d9488; font-weight: 700; }
.field { margin-bottom: 1rem; }
label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--noska-text-secondary, #475569); margin-bottom: 0.4rem; }
.ratings { display: flex; gap: 0.35rem; }
.star { background: transparent; border: none; font-size: 1.35rem; cursor: pointer; opacity: 0.35; transition: transform 0.15s, opacity 0.15s; }
.star.active { opacity: 1; transform: scale(1.15); }
textarea { width: 100%; padding: 0.6rem; background: var(--noska-surface-1, #F8FAFC); border: 1px solid var(--noska-border, rgba(0,0,0,0.1)); border-radius: 8px; color: var(--noska-text, #0F172A); box-sizing: border-box; outline: none; }
textarea:focus { border-color: #14b8a6; }
.submit-btn { width: 100%; background: #0d9488; color: #fff; font-weight: 700; border: none; padding: 0.65rem; border-radius: 9999px; cursor: pointer; transition: opacity 0.15s; }
.submit-btn:hover { opacity: 0.9; }`,
    javascript: `let rating = 5;
document.querySelectorAll('.star').forEach(s => {
  s.onclick = () => {
    rating = parseInt(s.getAttribute('data-val'));
    document.querySelectorAll('.star').forEach(st => {
      st.classList.toggle('active', parseInt(st.getAttribute('data-val')) <= rating);
    });
  };
});
document.getElementById('feedback-form').onsubmit = e => {
  e.preventDefault();
  alert('Thank you for your feedback! Rating: ' + rating);
};`
  },
  {
    id: "chart",
    name: "Chart",
    tagline: "Dynamic SVG pie & spline chart with hover tooltips",
    iconName: "PieChart",
    color: "#a855f7",
    promptSample: "Create an interactive interactive pie breakdown chart",
    html: `<div class="chart-wrapper">
  <h3>Project Budget Allocation</h3>
  <div class="pie-container">
    <svg viewBox="0 0 100 100" class="pie-svg">
      <circle cx="50" cy="50" r="40" stroke="#3b82f6" stroke-width="20" fill="transparent" stroke-dasharray="125 250" />
      <circle cx="50" cy="50" r="40" stroke="#10b981" stroke-width="20" fill="transparent" stroke-dasharray="65 250" stroke-dashoffset="-125" />
      <circle cx="50" cy="50" r="40" stroke="#f59e0b" stroke-width="20" fill="transparent" stroke-dasharray="60 250" stroke-dashoffset="-190" />
    </svg>
  </div>
  <div class="legend">
    <span><i style="background:#3b82f6"></i> Core Dev (50%)</span>
    <span><i style="background:#10b981"></i> Infrastructure (25%)</span>
    <span><i style="background:#f59e0b"></i> Design (25%)</span>
  </div>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.chart-wrapper { text-align: center; background: var(--noska-card, #FFFFFF); padding: 1.75rem; border-radius: 18px; width: 340px; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06)); }
h3 { margin: 0 0 1.25rem; font-size: 1.1rem; font-weight: 700; color: var(--noska-text, #0F172A); }
.pie-container { width: 140px; height: 140px; margin: 0 auto; }
.pie-svg { transform: rotate(-90deg); border-radius: 50%; }
.legend { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; text-align: left; }
.legend span { display: flex; align-items: center; gap: 0.5rem; color: var(--noska-text-secondary, #475569); font-weight: 500; }
.legend i { width: 10px; height: 10px; border-radius: 3px; }`,
    javascript: `console.log('[Chart] Initialized SVG ring chart');`
  },
  {
    id: "data-visualizer",
    name: "Data Visualizer",
    tagline: "Sortable, searchable data matrix with instant filter pills",
    iconName: "Table",
    color: "#0284c7",
    promptSample: "Create an interactive sortable employee directory data table",
    html: `<div class="table-wrap">
  <input type="text" id="search" placeholder="Search members..." />
  <table id="data-table">
    <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Sarah Chen</td><td>Lead Architect</td><td><span class="tag green">Active</span></td></tr>
      <tr><td>Alex Rivera</td><td>UI Designer</td><td><span class="tag green">Active</span></td></tr>
      <tr><td>David Kim</td><td>Backend Dev</td><td><span class="tag gray">Offline</span></td></tr>
    </tbody>
  </table>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); padding: 1.25rem; margin: 0; }
.table-wrap { max-width: 520px; margin: 0 auto; background: var(--noska-card, #FFFFFF); padding: 1.25rem; border-radius: 16px; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); }
input { width: 100%; padding: 0.6rem 0.8rem; background: var(--noska-surface-1, #F8FAFC); border: 1px solid var(--noska-border, rgba(0,0,0,0.1)); border-radius: 8px; color: var(--noska-text, #0F172A); margin-bottom: 0.75rem; box-sizing: border-box; outline: none; }
input:focus { border-color: #0284c7; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th, td { padding: 0.6rem; text-align: left; border-bottom: 1px solid var(--noska-border, rgba(0,0,0,0.06)); }
th { color: var(--noska-text-secondary, #64748B); font-weight: 600; }
.tag { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 600; }
.tag.green { background: #dcfce7; color: #15803d; }
.tag.gray { background: var(--noska-surface-2, #F1F5F9); color: var(--noska-text-secondary, #64748B); }`,
    javascript: `const s = document.getElementById('search');
s.oninput = () => {
  const q = s.value.toLowerCase();
  document.querySelectorAll('#data-table tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};`
  },
  {
    id: "portfolio",
    name: "Portfolio",
    tagline: "Showcase grid with interactive modal project cards",
    iconName: "FolderGit2",
    color: "#e11d48",
    promptSample: "Create an interactive creative portfolio showcase with work samples",
    html: `<div class="portfolio">
  <h2>Design Projects</h2>
  <div class="grid">
    <div class="item"><span>🎨</span><h4>Nebula Design System</h4></div>
    <div class="item"><span>⚡</span><h4>Noska Core Engine</h4></div>
  </div>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); margin: 0; padding: 1.5rem; }
.portfolio { max-width: 480px; margin: 0 auto; }
h2 { margin: 0 0 1rem; font-size: 1.25rem; color: #e11d48; font-weight: 700; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.item { background: var(--noska-card, #FFFFFF); padding: 1.25rem; border-radius: 14px; text-align: center; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-sm, 0 1px 3px rgba(0,0,0,0.04)); transition: transform 0.15s; cursor: pointer; }
.item:hover { transform: translateY(-2px); }
.item span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
h4 { margin: 0; font-size: 0.9rem; color: var(--noska-text, #0F172A); }`,
    javascript: `console.log('[Portfolio] Initialized creative showcase');`
  },
  {
    id: "landing-page",
    name: "Landing Page",
    tagline: "Hero banner with CTA button and social proof",
    iconName: "Sparkle",
    color: "#ca8a04",
    promptSample: "Create an interactive hero landing page with call to action",
    html: `<div class="hero">
  <span class="pill">Noska V1.1 Release</span>
  <h1>The Workspace of Thought</h1>
  <p>Where AI meets structured document craft.</p>
  <button class="cta">Get Started Free →</button>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 1.5rem; }
.hero { max-width: 460px; background: var(--noska-card, #FFFFFF); padding: 2rem; border-radius: 20px; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06)); }
.pill { font-size: 0.75rem; font-weight: 700; background: #fef08a; padding: 0.3rem 0.85rem; border-radius: 9999px; color: #854d0e; }
h1 { margin: 1.25rem 0 0.5rem; font-size: 1.65rem; font-weight: 800; color: var(--noska-text, #0F172A); letter-spacing: -0.02em; }
p { color: var(--noska-text-secondary, #64748B); font-size: 0.95rem; margin-bottom: 1.5rem; }
.cta { background: #eab308; color: #000; border: none; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 9999px; cursor: pointer; transition: transform 0.15s, opacity 0.15s; }
.cta:hover { transform: translateY(-1px); opacity: 0.95; }`,
    javascript: `console.log('[Landing Page] Interactive hero ready');`
  },
  {
    id: "documentation",
    name: "Documentation",
    tagline: "API documentation card with copyable code snippets",
    iconName: "BookOpen",
    color: "#059669",
    promptSample: "Create an interactive API reference docs card with code copy helper",
    html: `<div class="docs-card">
  <h3>noska.storage.get(key)</h3>
  <p>Retrieves a scoped key-value pair from the block's local storage.</p>
  <pre><code>const val = noska.storage.get("theme");</code></pre>
</div>`,
    css: `body { font-family: -apple-system, sans-serif; background: var(--noska-bg, #FFFFFF); color: var(--noska-text, #0F172A); padding: 1.5rem; margin: 0; }
.docs-card { background: var(--noska-card, #FFFFFF); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--noska-border, rgba(0,0,0,0.08)); max-width: 480px; margin: 0 auto; box-shadow: var(--noska-shadow-sm, 0 1px 3px rgba(0,0,0,0.04)); }
h3 { margin: 0 0 0.5rem; font-family: monospace; color: #059669; font-size: 1.05rem; font-weight: 700; }
p { font-size: 0.85rem; color: var(--noska-text-secondary, #64748B); margin: 0 0 1rem; }
pre { background: #0f172a; padding: 0.85rem; border-radius: 10px; font-size: 0.82rem; overflow-x: auto; color: #38bdf8; margin: 0; }`,
    javascript: `console.log('[Documentation] Interactive API block loaded');`
  },
  {
    id: "blank",
    name: "Blank Canvas",
    tagline: "Clean slate with empty HTML5, CSS and JavaScript",
    iconName: "Square",
    color: "#71717a",
    promptSample: "Create an interactive custom block",
    html: `<div class="app-container">
  <h1>✨ My Interactive Block</h1>
  <p>Start editing HTML, CSS, and JavaScript in Write Code mode!</p>
</div>`,
    css: `body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--noska-bg, #FFFFFF);
  color: var(--noska-text, #0F172A);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
}
.app-container {
  text-align: center;
  max-width: 420px;
  padding: 2rem;
  background: var(--noska-card, #FFFFFF);
  border-radius: 18px;
  border: 1px solid var(--noska-border, rgba(0,0,0,0.08));
  box-shadow: var(--noska-shadow-md, 0 4px 14px rgba(0,0,0,0.06));
}
h1 { margin: 0 0 0.5rem; font-size: 1.35rem; color: #0284c7; font-weight: 700; }
p { color: var(--noska-text-secondary, #64748B); font-size: 0.95rem; margin: 0; }`,
    javascript: `console.log('[Interactive] Blank canvas initialized');`
  }
];

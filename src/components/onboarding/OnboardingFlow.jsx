import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uid, now, textToBlocks } from "../../utils/helpers";
import { savePage, saveSetting, setOnboardingComplete } from "../../lib/supabaseService";
import { realtimeCollab } from "../../lib/realtimeCollab";
import { auditEngine } from "../../lib/auditEngine";

const useCaseOptions = [
  { id: "student", label: "Student", icon: "🎓", desc: "Notes, assignments, study plans" },
  { id: "developer", label: "Developer", icon: "💻", desc: "Sprints, docs, project tracking" },
  { id: "founder", label: "Founder", icon: "🚀", desc: "Business plans, pitches, roadmaps" },
  { id: "writer", label: "Writer", icon: "✍️", desc: "Drafts, research, editorial calendars" },
  { id: "team", label: "Team", icon: "🤝", desc: "Wikis, meetings, dashboards" },
  { id: "personal", label: "Personal Knowledge", icon: "🧠", desc: "Notes, highlights, journaling" }
];

const aiProviders = [
  { id: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini"] },
  { id: "anthropic", label: "Anthropic", models: ["claude-3.5-sonnet", "claude-3-haiku"] },
  { id: "nvidia", label: "NVIDIA NIM", models: ["llama-3.1-70b", "mixtral-8x22b"] }
];

const creationStages = [
  { id: "workspace", label: "Setting up your workspace..." },
  { id: "pages", label: "Creating starter pages..." },
  { id: "ai", label: "Configuring AI..." },
  { id: "finalize", label: "Almost ready..." }
];

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.07 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const stepVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 28 } },
  exit: { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.15 } }
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -4, boxShadow: "0 12px 40px rgba(0,102,255,0.15)" }
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 }
};

function starterPagesFor(useCase) {
  const u = uid;
  const n = now;
  const base = { favorite: false, trashed: false, tags: [], parentId: null, lineage: [{ action: "created", timestamp: n(), detail: "Starter page from onboarding" }] };
  const sets = {
    student: [
      { ...base, id: u(), title: "Study Notes", icon: "📖", blocks: textToBlocks("# Study Notes\n\nCentral hub for all your course materials.\n\n## Current Courses\n\n- \n\n## Exam Schedule\n\n- [ ] Midterm — \n- [ ] Final — \n\n## Study Resources\n\n") },
      { ...base, id: u(), title: "Assignment Tracker", icon: "✅", blocks: textToBlocks("# Assignment Tracker\n\n## Upcoming\n\n- [ ] \n- [ ] \n- [ ] \n\n## Completed\n\n") },
      { ...base, id: u(), title: "Course Schedule", icon: "📅", blocks: textToBlocks("# Course Schedule\n\n## Weekly Schedule\n\n| Time | Monday | Tuesday | Wednesday | Thursday | Friday |\n|------|--------|---------|-----------|----------|--------|\n|      |        |         |           |          |        |\n\n## Important Dates\n\n") }
    ],
    developer: [
      { ...base, id: u(), title: "Project Plan", icon: "📋", blocks: textToBlocks("# Project Plan\n\n## Goals\n\n- \n- \n- \n\n## Milestones\n\n- [ ] \n- [ ] \n- [ ] \n\n## Tech Stack\n\n") },
      { ...base, id: u(), title: "Sprint Backlog", icon: "🎯", blocks: textToBlocks("# Sprint Backlog\n\n## To Do\n\n- [ ] \n- [ ] \n\n## In Progress\n\n- [ ] \n\n## Done\n\n- [x] \n") },
      { ...base, id: u(), title: "API Reference", icon: "🔌", blocks: textToBlocks("# API Reference\n\n## Endpoints\n\n### GET /\n\n### POST /\n\n### PUT /\n\n## Authentication\n\n## Error Codes\n\n") }
    ],
    founder: [
      { ...base, id: u(), title: "Business Plan", icon: "📈", blocks: textToBlocks("# Business Plan\n\n## Executive Summary\n\n## Problem\n\n## Solution\n\n## Market Size\n\n## Business Model\n\n## Team\n\n") },
      { ...base, id: u(), title: "Meeting Notes", icon: "📝", blocks: textToBlocks("# Meeting Notes\n\n## Attendees\n\n## Agenda\n\n1. \n2. \n3. \n\n## Notes\n\n## Action Items\n\n- [ ] \n- [ ] \n") },
      { ...base, id: u(), title: "Product Roadmap", icon: "🗺️", blocks: textToBlocks("# Product Roadmap\n\n## Q1\n\n- [ ] \n- [ ] \n\n## Q2\n\n- [ ] \n- [ ] \n\n## Future\n\n") }
    ],
    writer: [
      { ...base, id: u(), title: "Draft Ideas", icon: "✏️", blocks: textToBlocks("# Draft Ideas\n\n## Active Projects\n\n### \n\n## Ideas\n\n- \n- \n- \n\n## Notes & Inspiration\n\n") },
      { ...base, id: u(), title: "Research Notes", icon: "🔍", blocks: textToBlocks("# Research Notes\n\n## Sources\n\n- \n- \n\n## Key Findings\n\n## Questions\n\n- [ ] \n- [ ] \n") },
      { ...base, id: u(), title: "Editorial Calendar", icon: "📆", blocks: textToBlocks("# Editorial Calendar\n\n## This Week\n\n- [ ] \n- [ ] \n\n## Next Week\n\n- [ ] \n- [ ] \n\n## Pitches\n\n") }
    ],
    team: [
      { ...base, id: u(), title: "Team Wiki", icon: "📚", blocks: textToBlocks("# Team Wiki\n\n## About Us\n\n## Team Members\n\n- \n- \n\n## Processes\n\n### \n\n## Guidelines\n\n") },
      { ...base, id: u(), title: "Meeting Notes", icon: "📝", blocks: textToBlocks("# Meeting Notes\n\n## Date\n\n## Attendees\n\n## Agenda\n\n1. \n2. \n\n## Decisions\n\n## Action Items\n\n- [ ] @ \n- [ ] @ \n") },
      { ...base, id: u(), title: "Project Dashboard", icon: "📊", blocks: textToBlocks("# Project Dashboard\n\n## Active Projects\n\n### \n\nStatus: \nOwner: \n\n## Health\n\n- Velocity: \n- Blockers: \n") }
    ],
    personal: [
      { ...base, id: u(), title: "Quick Notes", icon: "📓", blocks: textToBlocks("# Quick Notes\n\nCapture anything that comes to mind.\n\n## Today\n\n- \n- \n\n## Ideas\n\n") },
      { ...base, id: u(), title: "Book Highlights", icon: "📕", blocks: textToBlocks("# Book Highlights\n\n## Currently Reading\n\n### \n\n## Key Takeaways\n\n- \n- \n- \n\n## Quotes\n\n> \n") },
      { ...base, id: u(), title: "Journal", icon: "📔", blocks: textToBlocks("# Journal\n\n## \n\n") }
    ]
  };
  return sets[useCase] || sets.personal;
}

function ProgressDots({ total, current }) {
  return (
    <div className="flex gap-2" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= current ? 'bg-noska-blue w-6' : 'bg-white/10 w-1.5'}`} />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-16 h-16 mb-6 bg-white/5 rounded-2xl border border-white/[0.08] flex items-center justify-center">
        <img src="/logo.png" alt="Noska" className="w-10 h-10 object-contain" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Noska</h1>
      <p className="text-[var(--text-secondary)] mt-3 leading-relaxed">
        Your AI-powered workspace for thinking, writing, and building. 
        Let's set up your space in under two minutes.
      </p>
      <button
        onClick={onNext}
        className="mt-10 px-8 py-3 rounded-xl bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        autoFocus
      >
        Get Started
      </button>
    </motion.div>
  );
}

function UseCaseStep({ value, onChange, onNext, onBack }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">What brings you to Noska?</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">Choose your primary use case. You can always change this later.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Use case selection">
        {useCaseOptions.map(opt => (
          <motion.button
            key={opt.id}
            variants={cardVariants}
            whileHover="hover"
            onClick={() => onChange(opt.id)}
            role="radio"
            aria-checked={value === opt.id}
            className={`relative flex flex-col items-center gap-2 p-5 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307] ${value === opt.id ? 'border-noska-blue bg-noska-blue/10 shadow-[0_0_20px_rgba(0,102,255,0.15)]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]'}`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="font-medium text-sm text-white">{opt.label}</span>
            <span className="text-[10px] text-[var(--text-secondary)] text-center leading-tight">{opt.desc}</span>
            {value === opt.id && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-noska-blue" />}
          </motion.button>
        ))}
      </div>
      <div className="flex gap-3 mt-10 justify-center">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">Back</button>
        <button
          onClick={onNext}
          disabled={!value}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

function WorkspaceNameStep({ value, onChange, onNext, onBack }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="max-w-md mx-auto w-full text-center">
      <h2 className="text-2xl font-bold text-white">Name your workspace</h2>
      <p className="text-[var(--text-secondary)] mt-2 text-sm">Give your workspace a name that reflects what you're building.</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onNext(); }}
        placeholder="My Workspace"
        className="mt-8 w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base placeholder:text-white/20 focus:outline-none focus:border-noska-blue focus:ring-1 focus:ring-noska-blue/30 transition-all"
        autoFocus
        aria-label="Workspace name"
      />
      <div className="flex gap-3 mt-8 justify-center">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">Back</button>
        <button
          onClick={onNext}
          disabled={!value.trim()}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

function StartFreshStep({ value, onChange, onNext, onBack }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="max-w-lg mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">How would you like to start?</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">Begin fresh with starter pages tailored to your use case, or import existing content.</p>
      </div>
      <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Start method">
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => onChange('fresh')}
          role="radio"
          aria-checked={value === 'fresh'}
          className={`flex flex-col items-center gap-3 p-8 rounded-xl border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307] ${value === 'fresh' ? 'border-noska-blue bg-noska-blue/10 shadow-[0_0_20px_rgba(0,102,255,0.15)]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'}`}
        >
          <span className="text-3xl">🌱</span>
          <span className="font-semibold text-white">Start Fresh</span>
          <span className="text-xs text-[var(--text-secondary)]">Begin with a clean workspace and starter pages</span>
        </motion.button>
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => onChange('import')}
          role="radio"
          aria-checked={value === 'import'}
          className={`flex flex-col items-center gap-3 p-8 rounded-xl border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307] ${value === 'import' ? 'border-noska-blue bg-noska-blue/10 shadow-[0_0_20px_rgba(0,102,255,0.15)]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'}`}
        >
          <span className="text-3xl">📥</span>
          <span className="font-semibold text-white">Import Content</span>
          <span className="text-xs text-[var(--text-secondary)]">Bring your notes from Markdown, Notion, or other tools</span>
        </motion.button>
      </div>
      <div className="flex gap-3 mt-10 justify-center">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">Back</button>
        <button
          onClick={onNext}
          disabled={!value}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

function AIProviderStep({ provider, apiKey, onProviderChange, onApiKeyChange, onNext, onSkip, onBack }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="max-w-md mx-auto w-full text-center">
      <h2 className="text-2xl font-bold text-white">Connect your AI provider</h2>
      <p className="text-[var(--text-secondary)] mt-2 text-sm">Optional. Add an API key to unlock AI-powered features across your workspace.</p>
      <div className="mt-8 text-left">
        <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Provider</label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="AI provider">
          {aiProviders.map(p => (
            <button
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              role="radio"
              aria-checked={provider === p.id}
              className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue ${provider === p.id ? 'border-noska-blue bg-noska-blue/10 text-white' : 'border-white/[0.06] bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="text-xs font-medium text-[var(--text-secondary)] mt-5 mb-2 block">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-noska-blue focus:ring-1 focus:ring-noska-blue/30 transition-all"
          aria-label="API key"
        />
      </div>
      <div className="flex gap-3 mt-10 justify-center">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">Back</button>
        <button onClick={onSkip} className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 underline underline-offset-2">Skip</button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          {apiKey ? 'Connect' : 'Continue without API'}
        </button>
      </div>
    </motion.div>
  );
}

function CreationStep({ stage, stageIndex, totalStages, onComplete }) {
  useEffect(() => {
    if (stageIndex >= totalStages) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [stageIndex, totalStages, onComplete]);

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center text-center max-w-sm mx-auto">
      <div className="w-20 h-20 mb-8 relative">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <motion.circle
            cx="40" cy="40" r="34" fill="none" stroke="#0066FF" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - stageIndex / totalStages) }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.img
            key={stage?.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            src="/logo.png" alt="" className="w-8 h-8 object-contain"
          />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={stage?.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-white font-medium">
          {stage?.label || 'Almost ready...'}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

function WelcomePanel({ userName, useCase, onFinish }) {
  const label = useCaseOptions.find(o => o.id === useCase)?.label || '';
  const actions = [
    { id: "project", label: "Create Project Plan", icon: "📋" },
    { id: "meeting", label: "Meeting Notes", icon: "📝" },
    { id: "study", label: "Study Notes", icon: "📖" },
    { id: "blank", label: "Blank Page", icon: "📄" }
  ];
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" className="max-w-lg mx-auto w-full text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}>
        <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-noska-blue to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-2xl">🎉</span>
        </div>
      </motion.div>
      <h1 className="text-2xl font-bold text-white">Your workspace is ready, {userName}!</h1>
      <p className="text-[var(--text-secondary)] mt-2 text-sm">
        We've set up starter pages for <span className="text-white font-medium">{label}</span>. 
        Noska AI is here to help you write, organize, and create.
      </p>
      <div className="mt-8 text-left">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Suggested first actions</p>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map(a => (
            <motion.button
              key={a.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFinish(a.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue"
            >
              <span className="text-lg">{a.icon}</span>
              <span className="text-sm font-medium text-white">{a.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-xs text-[var(--text-secondary)] italic"
      >
        "Hi, I'm Noska AI. Feel free to ask me anything or use the AI panel on the right."
      </motion.p>
      <button
        onClick={() => onFinish('go')}
        className="mt-6 px-8 py-3 rounded-xl bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
      >
        Start using Noska
      </button>
    </motion.div>
  );
}

export default function OnboardingFlow({ initialWorkspaceName, onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState({
    useCase: '',
    workspaceName: initialWorkspaceName || 'My Workspace',
    startMethod: '',
    aiProvider: 'openai',
    apiKey: ''
  });
  const [creationStage, setCreationStage] = useState(0);
  const [creating, setCreating] = useState(false);
  const userName = realtimeCollab?.getUser?.()?.userName || 'there';

  const goTo = (s) => { setDirection(s > step ? 1 : -1); setStep(s); };

  const handleCreateWorkspace = useCallback(async () => {
    setCreating(true);
    setStep(5);
    const pages = starterPagesFor(form.useCase);
    try {
      setCreationStage(1);
      await saveSetting("workspaceName", form.workspaceName);
      await saveSetting("onboarding_complete", true);
      await new Promise(r => setTimeout(r, 300));

      setCreationStage(2);
      const user = realtimeCollab?.getUser?.();
      for (const page of pages) {
        await savePage(page, user?.userId);
        await auditEngine.log({
          pageId: page.id, userId: user.userId, userName: user.userName,
          action: 'created', detail: `Starter page: ${page.title}`
        });
      }
      await new Promise(r => setTimeout(r, 300));

      setCreationStage(3);
      if (form.apiKey) {
        await saveSetting("aiProvider", form.aiProvider);
        await saveSetting("apiKey", form.apiKey);
      }
      await setOnboardingComplete(user.userId, form.useCase, form.workspaceName);
      await new Promise(r => setTimeout(r, 400));

      setCreationStage(4);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.warn("Onboarding: workspace creation error", e);
    }
  }, [form]);

  const handleFinish = (action) => {
    onComplete({ ...form, firstAction: action, starterPages: starterPagesFor(form.useCase) });
  };

  const totalSteps = 6;
  const steps = [
    <WelcomeStep key="welcome" onNext={() => goTo(1)} />,
    <UseCaseStep key="usecase" value={form.useCase} onChange={v => setForm(f => ({ ...f, useCase: v }))} onNext={() => goTo(2)} onBack={() => goTo(0)} />,
    <WorkspaceNameStep key="wsname" value={form.workspaceName} onChange={v => setForm(f => ({ ...f, workspaceName: v }))} onNext={() => goTo(3)} onBack={() => goTo(1)} />,
    <StartFreshStep key="startfresh" value={form.startMethod} onChange={v => setForm(f => ({ ...f, startMethod: v }))} onNext={form.startMethod === 'fresh' ? () => goTo(4) : () => goTo(4)} onBack={() => goTo(2)} />,
    <AIProviderStep key="aiprovider" provider={form.aiProvider} apiKey={form.apiKey} onProviderChange={v => setForm(f => ({ ...f, aiProvider: v }))} onApiKeyChange={v => setForm(f => ({ ...f, apiKey: v }))} onNext={handleCreateWorkspace} onSkip={handleCreateWorkspace} onBack={() => goTo(3)} />,
    <CreationStep key="creation" stage={creationStages[Math.min(creationStage, creationStages.length - 1)]} stageIndex={creationStage} totalStages={creationStages.length} onComplete={() => goTo(6)} />,
    <WelcomePanel key="welcomepanel" userName={userName} useCase={form.useCase} onFinish={handleFinish} />
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex flex-col bg-[#030307] overflow-hidden"
    >
      {step < 5 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <ProgressDots total={totalSteps} current={step} />
        </div>
      )}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <AnimatePresence mode="wait" custom={direction}>
          {React.cloneElement(steps[step] || steps[0], { key: `step-${step}` })}
        </AnimatePresence>
      </div>
      {step < 5 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">Step {step + 1} / {totalSteps}</span>
        </div>
      )}
    </motion.div>
  );
}

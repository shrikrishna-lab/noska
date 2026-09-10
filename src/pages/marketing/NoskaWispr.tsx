import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import Lenis from 'lenis';
import {
  Sparkles,
  MessageCircle,
  Menu,
  Play,
  Pause,
  Mic,
  MicOff,
  Volume2,
  Scan,
  Lightbulb,
  Plus,
  Settings,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Monitor,
  Copy,
  Check,
  Zap,
  Globe,
  Shield,
  Layers,
  FileText,
  SlidersHorizontal,
  BookOpen,
  RotateCcw,
  Fingerprint,
  Download,
  Bot,
  Languages,
  Terminal,
  Command,
  Cpu,
  Keyboard,
  Activity,
  Radio,
  Workflow,
  Briefcase,
  MessageSquare,
  Crown,
  Bell,
  Moon,
  Search,
  FolderPlus,
  Layout
} from 'lucide-react';
import './NoskaWispr.css';
import HowItWorks from '@/components/ui/how-it-works';
import NoskaMeadowFooter from './components/NoskaMeadowFooter';

// Self-contained animated badge text to prevent top-level full-page re-renders
function CleanupBadgeText() {
  const cleanupBadges = ['Removed Umm', 'Fixed Grammar', 'Auto Punctuation', '4x Velocity'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return <>{cleanupBadges[index]}</>;
}

// Framer AnimatedSVGUnderlink Parity Component (Hand-drawn dynamic animated SVG strokes)
const UNDERLINE_SVG_VARIANTS = [
  "M5 20.9999C26.7762 16.2245 49.5532 11.5572 71.7979 14.6666C84.9553 16.5057 97.0392 21.8432 109.987 24.3888C116.413 25.6523 123.012 25.5143 129.042 22.6388C135.981 19.3303 142.586 15.1422 150.092 13.3333C156.799 11.7168 161.702 14.6225 167.887 16.8333C181.562 21.7212 194.975 22.6234 209.252 21.3888C224.678 20.0548 239.912 17.991 255.42 18.3055C272.027 18.6422 288.409 18.867 305 17.9999",
  "M5 24.2592C26.233 20.2879 47.7083 16.9968 69.135 13.8421C98.0469 9.5853 128.407 4.02322 158.059 5.14674C172.583 5.69708 187.686 8.66104 201.598 11.9696C207.232 13.3093 215.437 14.9471 220.137 18.3619C224.401 21.4596 220.737 25.6575 217.184 27.6168C208.309 32.5097 197.199 34.281 186.698 34.8486C183.159 35.0399 147.197 36.2657 155.105 26.5837C158.11 22.9053 162.993 20.6229 167.764 18.7924C178.386 14.7164 190.115 12.1115 201.624 10.3984C218.367 7.90626 235.528 7.06127 252.521 7.49276C258.455 7.64343 264.389 7.92791 270.295 8.41825C280.321 9.25056 296 10.8932 305 13.0242",
  "M5 29.5014C9.61174 24.4515 12.9521 17.9873 20.9532 17.5292C23.7742 17.3676 27.0987 17.7897 29.6575 19.0014C33.2644 20.7093 35.6481 24.0004 39.4178 25.5014C48.3911 29.0744 55.7503 25.7731 63.3048 21.0292C67.9902 18.0869 73.7668 16.1366 79.3721 17.8903C85.1682 19.7036 88.2173 26.2464 94.4121 27.2514C102.584 28.5771 107.023 25.5064 113.276 20.6125C119.927 15.4067 128.83 12.3333 137.249 15.0014C141.418 16.3225 143.116 18.7528 146.581 21.0014C149.621 22.9736 152.78 23.6197 156.284 24.2514C165.142 25.8479 172.315 17.5185 179.144 13.5014C184.459 10.3746 191.785 8.74853 195.868 14.5292C199.252 19.3205 205.597 22.9057 211.621 22.5014C215.553 22.2374 220.183 17.8356 222.979 15.5569C225.4 13.5845 227.457 11.1105 230.742 10.5292C232.718 10.1794 234.784 12.9691 236.164 14.0014C238.543 15.7801 240.717 18.4775 243.356 19.8903C249.488 23.1729 255.706 21.2551 261.079 18.0014C266.571 14.6754 270.439 11.5202 277.146 13.6125C280.725 14.7289 283.221 17.209 286.393 19.0014C292.321 22.3517 298.255 22.5014 305 22.5014",
  "M17.0039 32.6826C32.2307 32.8412 47.4552 32.8277 62.676 32.8118C67.3044 32.807 96.546 33.0555 104.728 32.0775C113.615 31.0152 104.516 28.3028 102.022 27.2826C89.9573 22.3465 77.3751 19.0254 65.0451 15.0552C57.8987 12.7542 37.2813 8.49399 44.2314 6.10216C50.9667 3.78422 64.2873 5.81914 70.4249 5.96641C105.866 6.81677 141.306 7.58809 176.75 8.59886C217.874 9.77162 258.906 11.0553 300 14.4892",
  "M4.99805 20.9998C65.6267 17.4649 126.268 13.845 187.208 12.8887C226.483 12.2723 265.751 13.2796 304.998 13.9998",
  "M5 29.8857C52.3147 26.9322 99.4329 21.6611 146.503 17.1765C151.753 16.6763 157.115 15.9505 162.415 15.6551C163.28 15.6069 165.074 15.4123 164.383 16.4275C161.704 20.3627 157.134 23.7551 153.95 27.4983C153.209 28.3702 148.194 33.4751 150.669 34.6605C153.638 36.0819 163.621 32.6063 165.039 32.2029C178.55 28.3608 191.49 23.5968 204.869 19.5404C231.903 11.3436 259.347 5.83254 288.793 5.12258C294.094 4.99476 299.722 4.82265 305 5.45025"
];

function AnimatedSVGUnderline({
  text,
  textColor = "inherit",
  underlineColor = "#5b8266",
  strokeWidth = 3.5,
  gap = 2,
  autoAnimate = true
}: {
  text: string;
  textColor?: string;
  underlineColor?: string;
  strokeWidth?: number;
  gap?: number;
  autoAnimate?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(autoAnimate);
  const [svgIndex, setSvgIndex] = useState(0);

  const handleHoverStart = () => {
    setSvgIndex((prev) => (prev + 1) % UNDERLINE_SVG_VARIANTS.length);
    setIsHovered(true);
  };

  const handleHoverEnd = () => {
    if (!autoAnimate) setIsHovered(false);
  };

  return (
    <span
      className="inline-flex flex-col items-center relative cursor-pointer select-none"
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      style={{ color: textColor }}
    >
      <span>{text}</span>
      <span
        className="w-full relative overflow-visible"
        style={{ color: underlineColor, height: '14px', marginTop: `${gap}px` }}
      >
        <AnimatePresence>
          {isHovered && (
            <motion.svg
              key={svgIndex}
              viewBox="0 0 310 40"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full absolute top-0 left-0 pointer-events-none overflow-visible"
            >
              <motion.path
                d={UNDERLINE_SVG_VARIANTS[svgIndex]}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}

export default function NoskaWispr() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Interactive UI States
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<'slack' | 'claude' | 'gmail'>('slack');
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [liveWpm, setLiveWpm] = useState(220);
  const [studioMode, setStudioMode] = useState<'raw' | 'polished' | 'code'>('polished');
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [advantageIndex, setAdvantageIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeNav, setActiveNav] = useState<'home' | 'dictation'>('dictation');

  // Authentic Speech-to-Text Personalization States
  const [activeTone, setActiveTone] = useState<'formal' | 'casual' | 'executive' | 'technical'>('formal');
  const [customWords, setCustomWords] = useState<string[]>(['Sarah', 'Aditya', 'Noska', 'Supabase', 'GraphQL', 'PostgreSQL']);
  const [newWordInput, setNewWordInput] = useState('');
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);
  const [isRewindActive, setIsRewindActive] = useState(false);

  // Step Carousel Tab in Why Flow section ('agent' | 'translate' | 'tone' | 'rewind')
  const [bentoTab, setBentoTab] = useState<'agent' | 'translate' | 'tone' | 'rewind'>('agent');

  // Translate Mode State (Hinglish, Spanish, Japanese, German)
  const [activeTranslateLang, setActiveTranslateLang] = useState<'hinglish' | 'spanish' | 'japanese' | 'german'>('hinglish');

  // Agent Mode State (Autonomous Voice-to-Action)
  const [activeAgentCommand, setActiveAgentCommand] = useState<number>(0);
  const [agentRunning, setAgentRunning] = useState<boolean>(false);
  const [agentStep, setAgentStep] = useState<number>(2);

  const handleRunAgentCommand = (index: number) => {
    setActiveAgentCommand(index);
    setAgentRunning(true);
    setAgentStep(0);
    setTimeout(() => {
      setAgentStep(1);
      setTimeout(() => {
        setAgentStep(2);
        setAgentRunning(false);
      }, 700);
    }, 550);
  };

  const recognitionRef = useRef<any>(null);

  // StepsFlow State (Real-World Noska Flow Usage Steps)
  const [activeStepFlow, setActiveStepFlow] = useState<number>(0);

  const realStepsFlow = [
    {
      num: '01',
      title: 'Global Shortcut Summon',
      hotkey: 'Ctrl+Shift+Space',
      macHotkey: '⌥ + Space',
      badge: 'Zero Focus Loss',
      tagline: 'Summon floating pill anywhere in 0.05s',
      desc: 'Hit the universal shortcut from any app—VS Code, Slack, Notion, Chrome, Linear, Figma, or Terminal. Noska’s floating voice HUD instantly glides into view directly over your active workspace without stealing focus.',
      details: [
        'Floats atop any active native desktop window',
        'Cursor stays in place inside your text editor or app',
        'Works offline via lightweight background daemon'
      ],
      interactiveType: 'hud_summon',
      appContext: 'VS Code & Slack Desktop'
    },
    {
      num: '02',
      title: 'Speak Naturally at 220 WPM',
      hotkey: '4x Typing Speed',
      macHotkey: 'Raw Voice Flow',
      badge: 'Unfiltered Thoughts',
      tagline: 'Talk stream-of-consciousness, code, or mixed languages',
      desc: 'Don’t slow down to structure thoughts. Speak naturally at 220 WPM. Say messy sentences, technical acronyms, mixed Hindi/English (Hinglish), or direct agent commands like "create a Linear issue for auth timeout".',
      details: [
        'Captures continuous speech at 220+ words per minute',
        'Handles background cafe noise & whispered speech',
        'Multi-lingual & multi-dialect auto-detection'
      ],
      interactiveType: 'voice_stream',
      appContext: 'Natural Speech Stream'
    },
    {
      num: '03',
      title: 'On-Device Whisper & Tone Intelligence',
      hotkey: '⚡ 0.18s Local Latency',
      macHotkey: '100% Private',
      badge: 'Local AI Processing',
      tagline: 'Instant filler removal, grammar formatting & tone matching',
      desc: 'Local Whisper v3 and on-device neural parser instantly strip vocal fillers ("um", "uh", "you know"), calibrate tone for the active app, capitalize jargon correctly, and structure markdown bullets in milliseconds.',
      details: [
        'Vocal filler purging with zero semantic loss',
        'App-aware tone adaptation (Casual Slack vs Formal Email)',
        '100% On-device privacy with zero cloud audio upload'
      ],
      interactiveType: 'ai_cleaning',
      appContext: 'Whisper v3 Neural Engine'
    },
    {
      num: '04',
      title: 'Direct Cursor Injection & MCP Action',
      hotkey: 'Zero Copy-Paste',
      macHotkey: 'Autonomous Execution',
      badge: 'Instant Result',
      tagline: 'Direct typing at cursor or background tool execution',
      desc: 'Your polished words type instantly right where your cursor blinks in your editor or document. For agent commands, Noska executes MCP tools across GitHub, Linear, Supabase, and Slack autonomously in the background.',
      details: [
        'Native OS Accessibility API direct cursor paste',
        'MCP Model Context Protocol background tool trigger',
        'Hands-free voice rewind ("scratch that") correction'
      ],
      interactiveType: 'cursor_injection',
      appContext: 'Active Target Application'
    }
  ];

  // Roundelpro Ecosystem Orbit Data
  const [activeOrbitApp, setActiveOrbitApp] = useState<string>('vscode');

  const roundelApps = [
    {
      id: 'vscode',
      name: 'VS Code & Cursor',
      role: 'Code & Terminal Edits',
      spoken: '“Refactor this auth hook to use Supabase session cache and handle 401”',
      result: 'export const useAuth = () => useSession({ retryOn401: true });',
      color: 'from-blue-500/20 to-indigo-500/20',
      badge: 'Development',
      angle: 0,
      ring: 'outer'
    },
    {
      id: 'slack',
      name: 'Slack & Discord',
      role: 'Async Team Comms',
      spoken: '“Hey team PR 142 is merged to staging deploying in 5 minutes”',
      result: 'Hey team, PR #142 is merged to staging. Deploying in ~5 minutes! 🚀',
      color: 'from-[#5b8266]/20 to-[#edf5ef]',
      badge: 'Team Chat',
      angle: 45,
      ring: 'inner'
    },
    {
      id: 'linear',
      name: 'Linear & Jira',
      role: 'Autonomous Issue Creation',
      spoken: '“Create high priority bug for mobile navbar overflow assign to Sarah”',
      result: '✓ Created LIN-892: Mobile navbar overflow [High Priority] -> Sarah',
      color: 'from-amber-500/20 to-orange-500/20',
      badge: 'Project Mgmt',
      angle: 90,
      ring: 'outer'
    },
    {
      id: 'claude',
      name: 'Claude & ChatGPT',
      role: 'Voice Prompting & Reasoning',
      spoken: '“Analyze this error stack and suggest an idempotent retry strategy”',
      result: 'Prompt injected: Synthesizing exponential backoff with jitter...',
      color: 'from-[#f48574]/20 to-[#fdeee9]',
      badge: 'AI Assistants',
      angle: 135,
      ring: 'inner'
    },
    {
      id: 'notion',
      name: 'Notion & Docs',
      role: 'Structured Documentation',
      spoken: '“Meeting notes with Aditya on Q3 voice latency benchmarks and release plan”',
      result: '### Q3 Voice Latency Benchmarks\n• Aditya & team targets < 180ms\n• Release date: Oct 12',
      color: 'from-neutral-500/20 to-stone-500/20',
      badge: 'Docs & Wikis',
      angle: 180,
      ring: 'outer'
    },
    {
      id: 'supabase',
      name: 'Supabase & SQL',
      role: 'Natural Voice Queries',
      spoken: '“Select count of voice events where duration is greater than 30 seconds”',
      result: 'SELECT COUNT(*) FROM voice_events WHERE duration_seconds > 30;',
      color: 'from-[#5b8266]/20 to-[#c1dfd4]/30',
      badge: 'Database',
      angle: 225,
      ring: 'inner'
    },
    {
      id: 'github',
      name: 'GitHub & Git CLI',
      role: 'Voice Commit & PRs',
      spoken: '“Git commit message add voice rewind engine with multi-buffer rollback”',
      result: 'git commit -m "feat(voice): add voice rewind engine with multi-buffer rollback"',
      color: 'from-slate-600/20 to-neutral-700/20',
      badge: 'Version Control',
      angle: 270,
      ring: 'outer'
    },
    {
      id: 'gmail',
      name: 'Gmail & Superhuman',
      role: 'Executive Communication',
      spoken: '“Send pilot partnership update to Marc at Sequoia with latest metrics”',
      result: 'Subject: Noska Flow Pilot Update — Latest Metrics & Roadmap',
      color: 'from-rose-500/20 to-red-500/20',
      badge: 'Email Client',
      angle: 315,
      ring: 'inner'
    }
  ];

  // 1. Initialize Lenis buttery-smooth inertial momentum scroll on the container
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const lenis = new Lenis({
      wrapper: container,
      content: content,
      duration: 1.05, // Instantaneous, silky responsive glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0, // Natural 1:1 scroll speed
      touchMultiplier: 1.5,
      infinite: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Scroll state tracking via Lenis + native container scroll backup with state bailout
    const handleScroll = () => {
      if (container) {
        const scrolled = container.scrollTop > 25;
        setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
      }
    };
    lenis.on('scroll', (e: any) => {
      const scrolled = e.scroll > 25;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    });
    container.addEventListener('scroll', handleScroll, { passive: true });

    const handleResize = () => lenis.resize();
    window.addEventListener('resize', handleResize);

    // Force recalculation after layout settles & fonts/images render
    const t1 = setTimeout(() => lenis.resize(), 100);
    const t2 = setTimeout(() => lenis.resize(), 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // 2. Smooth scroll helper targeting inner sections
  const scrollToSection = (id: string) => {
    const elem = document.getElementById(id);
    if (!elem) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(elem, { offset: -30, duration: 1.15 });
    } else if (containerRef.current) {
      const elemRect = elem.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const offsetTop = elemRect.top - containerRect.top + containerRef.current.scrollTop - 30;
      containerRef.current.scrollTo({ top: offsetTop, behavior: 'smooth' });
    } else {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 3. Scroll transforms for interactive hero ribbon & celestial cloudscape
  const { scrollYProgress: heroScrollProgress } = useScroll({
    container: containerRef,
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Spring physics: responsive, low-inertia, lag-free momentum
  const smoothHeroProgress = useSpring(heroScrollProgress, {
    stiffness: 220,
    damping: 32,
    mass: 0.1,
    restDelta: 0.0001
  });

  // Hero headline parallax
  const heroTextY = useTransform(smoothHeroProgress, [0, 0.45], [0, -40]);
  const heroTextOpacity = useTransform(smoothHeroProgress, [0, 0.4], [1, 0.2]);

  // Voice stream ribbon 3D perspective tilt & drift on scroll
  const ribbonRotateX = useTransform(smoothHeroProgress, [0, 0.5], [0, 8]);
  const ribbonY = useTransform(smoothHeroProgress, [0, 0.5], [0, -25]);
  const ribbonScale = useTransform(smoothHeroProgress, [0, 0.5], [1, 0.98]);

  // Celestial cloudscape dynamic parting and rising on scroll
  // Left pink clouds glide outward to left and rise
  const cloudLeftX = useTransform(smoothHeroProgress, [0, 0.85], [0, -180]);
  const cloudLeftY = useTransform(smoothHeroProgress, [0, 0.85], [0, -45]);
  const cloudLeftScale = useTransform(smoothHeroProgress, [0, 0.85], [1, 1.08]);
  const cloudLeftRotate = useTransform(smoothHeroProgress, [0, 0.85], [0, -3.5]);

  // Right sage clouds glide outward to right and rise
  const cloudRightX = useTransform(smoothHeroProgress, [0, 0.85], [0, 180]);
  const cloudRightY = useTransform(smoothHeroProgress, [0, 0.85], [0, -45]);
  const cloudRightScale = useTransform(smoothHeroProgress, [0, 0.85], [1, 1.08]);
  const cloudRightRotate = useTransform(smoothHeroProgress, [0, 0.85], [0, 3.5]);

  // Central sunrise dome rises up and expands
  const domeY = useTransform(smoothHeroProgress, [0, 0.85], [0, -85]);
  const domeScale = useTransform(smoothHeroProgress, [0, 0.85], [1, 1.35]);
  const beamScaleX = useTransform(smoothHeroProgress, [0, 0.85], [1, 1.45]);
  const beamOpacity = useTransform(smoothHeroProgress, [0, 0.5, 0.85], [0.95, 1, 0.8]);

  // Midground ivory clouds part gently
  const cloudMidLeftX = useTransform(smoothHeroProgress, [0, 0.85], [0, -95]);
  const cloudMidRightX = useTransform(smoothHeroProgress, [0, 0.85], [0, 95]);
  const cloudMidY = useTransform(smoothHeroProgress, [0, 0.85], [0, -28]);

  // Foreground white cumulus clouds part downward and outward to reveal content below
  const cloudFrontLeftX = useTransform(smoothHeroProgress, [0, 0.85], [0, -70]);
  const cloudFrontRightX = useTransform(smoothHeroProgress, [0, 0.85], [0, 70]);
  const cloudFrontY = useTransform(smoothHeroProgress, [0, 0.85], [0, 55]);
  const cloudFrontScale = useTransform(smoothHeroProgress, [0, 0.85], [1, 1.04]);
  const cloudFrontOpacity = useTransform(smoothHeroProgress, [0, 0.7, 0.95], [1, 0.98, 0.85]);

  // Section 9 ("Built around how you speak") — Framer Horiscroll Pinned Track
  const howYouWorkRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxTrackScroll, setMaxTrackScroll] = useState(2300);

  useEffect(() => {
    const measureTrack = () => {
      if (trackRef.current) {
        const scrollW = trackRef.current.scrollWidth;
        const viewW = window.innerWidth;
        const targetScroll = Math.max(0, scrollW - viewW + 120);
        setMaxTrackScroll(targetScroll);
      }
    };
    measureTrack();
    window.addEventListener('resize', measureTrack);
    const t1 = setTimeout(measureTrack, 250);
    const t2 = setTimeout(measureTrack, 1000);
    return () => {
      window.removeEventListener('resize', measureTrack);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const { scrollYProgress: cardsScrollProgress } = useScroll({
    container: containerRef,
    target: howYouWorkRef,
    offset: ["start start", "end end"]
  });

  // Calculate dynamic pixel travel across all 6 cards so Card 06 is 100% visible on any zoom & screen width
  const horiTrackX = useTransform(cardsScrollProgress, [0, 0.82, 1], [0, -maxTrackScroll, -maxTrackScroll]);
  const horiProgressBar = useTransform(cardsScrollProgress, [0, 0.82, 1], ["0%", "100%", "100%"]);

  // 4. Speech Recognition & Voice Simulator
  useEffect(() => {
    if (!isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { }
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          if (interim.trim()) {
            setTranscriptionText(interim);
            setLiveWpm(Math.floor(205 + Math.random() * 35));
          }
        };

        recog.onerror = () => { };
        recog.start();
        recognitionRef.current = recog;
      } catch (_) { }
    }

    const simPhrases = [
      "Listening to your natural voice stream...",
      "Capturing brainstorm flow at 220 WPM without friction...",
      "Purging filler syllables: 'um', 'uh', 'you know' automatically cleaned...",
      "Synthesizing structured Markdown blocks into active editor...",
      "Action items: 1. Deploy Wispr edge pipeline, 2. Notify early access tier!",
      "Voice synthesized with 99.8% precision at 0.18s latency ✨"
    ];
    let step = 0;
    if (!transcriptionText) setTranscriptionText(simPhrases[0]);
    const timer = setInterval(() => {
      step = (step + 1) % simPhrases.length;
      setTranscriptionText(simPhrases[step]);
      setLiveWpm(Math.floor(212 + Math.random() * 26));
    }, 2200);

    return () => {
      clearInterval(timer);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { }
      }
    };
  }, [isRecording]);

  const appTransformations = {
    slack: {
      appName: 'Slack',
      target: '#product-launch • Slack',
      badge: 'Channel Message',
      latency: '0.18s',
      fillersRemoved: 4,
      rawAudio: (
        <>
          <span className="wispr-type-filler">Hey so um</span>{' '}
          <span className="wispr-type-correction">can you actually wait</span>{' '}
          can you tell the team that{' '}
          <span className="wispr-type-repetition">the the</span>{' '}
          launch is gonna slip I think to like not{' '}
          <span className="wispr-type-correction">Friday the following Monday</span>{' '}
          because we're still waiting on{' '}
          <span className="wispr-type-filler">uh</span>{' '}
          legal to sign off on{' '}
          <span className="wispr-type-repetition">the the</span>{' '}
          new terms page and{' '}
          <span className="wispr-type-filler">uh yeah</span>{' '}
          just let them know we'll have a real timeline{' '}
          <span className="wispr-type-repetition">by by</span>{' '}
          end of day Thursday.
        </>
      ),
      polished: "Can you let the team know the launch is slipping to Monday? We're still waiting on legal to sign off on the new terms page. We'll have a firm timeline by end of day Thursday.",
      legend: 'Stripped syllables highlighted with red strikethrough',
      toolbarType: 'slack' as const,
    },
    claude: {
      appName: 'Claude',
      target: 'Claude 3.5 Sonnet • AI Prompt',
      badge: 'Code & Reasoning',
      latency: '0.14s',
      fillersRemoved: 6,
      rawAudio: (
        <>
          <span className="wispr-type-filler">so basically like</span>{' '}
          write a React custom hook{' '}
          <span className="wispr-type-filler">uh you know</span>{' '}
          for infinite scroll with IntersectionObserver{' '}
          <span className="wispr-type-correction">wait no make it TypeScript</span>{' '}
          with generic type T{' '}
          <span className="wispr-type-repetition">and and</span>{' '}
          include loading states, error handling,{' '}
          <span className="wispr-type-filler">and like</span>{' '}
          automatic observer disconnect on unmount{' '}
          <span className="wispr-type-correction">scratch that, add debounce too</span>.
        </>
      ),
      polished: "Create a production-ready TypeScript React custom hook `useInfiniteScroll<T>` utilizing the IntersectionObserver API. Include full generic type support, debounce handling, loading & error state management, and automatic observer cleanup on unmount.",
      legend: 'Voice Rewind captured "scratch that" & "wait no"',
      toolbarType: 'claude' as const,
    },
    gmail: {
      appName: 'Gmail',
      target: 'Gmail • Marcus Chen <marcus@acme.co>',
      badge: 'Executive Reply',
      latency: '0.21s',
      fillersRemoved: 7,
      rawAudio: (
        <>
          <span className="wispr-type-filler">hi Marcus um</span>{' '}
          thanks for the follow up on the enterprise licensing agreement{' '}
          <span className="wispr-type-filler">uh let me check</span>{' '}
          <span className="wispr-type-correction">actually scratch that</span>{' '}
          our finance committee already cleared the PO yesterday afternoon{' '}
          <span className="wispr-type-repetition">so so</span>{' '}
          I've attached the counter-signed PDF{' '}
          <span className="wispr-type-filler">and like yeah</span>{' '}
          we are excited to kick off onboarding next Tuesday.
        </>
      ),
      polished: "Hi Marcus,\n\nThank you for following up on the enterprise licensing agreement. Our finance committee cleared the purchase order yesterday afternoon, and I've attached the countersigned PDF.\n\nWe look forward to kicking off onboarding next Tuesday.\n\nBest regards,\nAlex",
      legend: 'Auto-formatted formal email structure with signature',
      toolbarType: 'gmail' as const,
    },
  };

  const studioPresets = [
    {
      title: "Founder Brainstorm",
      raw: "so um basically we need to like launch the new noska voice speech-to-text engine uh you know with local whisper so users can speak naturally at 220 words per minute with zero punctuation overhead",
      polished: "### Noska Speech-to-Text Engine\n• 100% On-device Whisper inference with zero cloud latency (<180ms)\n• Universal desktop injection across Slack, Cursor, Notion & Chrome\n• Hands-free Voice Rewind (\"scratch that\", \"no wait, make it...\")\n• Native multilingual auto-detect supporting English, Hindi & Hinglish",
      code: "// Noska Speech-to-Text Local Whisper Engine\nexport const dispatchSpeechToText = async (audioStream: MediaStream) => {\n  const whisper = await NoskaVoice.loadLocalWhisperEngine({ model: 'multilingual-v3' });\n  return whisper.transcribe(audioStream, {\n    fillerRemoval: true,\n    voiceRewind: true,\n    format: 'markdown'\n  });\n};"
    },
    {
      title: "Team Meeting Intelligence",
      raw: "hey everyone so uh Alex mentioned the edge whisper sync is ready for production and Sarah said we should definitely test the Windows installer before Friday",
      polished: "### Q3 Engineering Sync — Voice Core Rollout\n• **Decision**: 100% on-device local Whisper engine approved for production\n• **Speed Metric**: 220+ WPM confirmed with <180ms local latency\n• **Rewind Engine**: Hands-free 'scratch that' voice self-correction enabled\n• **Action Item**: Sarah & Alex to test Windows installer before Friday",
      code: "interface NoskaVoiceConfig {\n  latencyTarget: '<180ms';\n  onDeviceWhisper: true;\n  voiceRewindTrigger: 'scratch that' | 'wait actually';\n  multilingualSupport: ['en', 'hi', 'hinglish'];\n}"
    },
    {
      title: "Late-Night Faint Whisper",
      raw: "whispering quiet notes for tomorrow morning remember to follow up on the enterprise contract with acme corp and verify local whisper zero-cloud privacy guarantees",
      polished: "### Morning Priority Action Items\n• Follow up on Acme Corp enterprise contract\n• Verify 100% on-device privacy guarantee (zero audio packets leave device)\n• Review whisper inference latency metrics (<180ms)",
      code: "const session = await NoskaVoice.createLocalSession({\n  sensitivity: 'ultra-high',\n  ambientDampening: true,\n  whisperModel: 'on-device'\n});"
    }
  ];

  const tonePresets = {
    formal: "“Hey, are you free for lunch tomorrow? Let's do 12:00 PM if that works for your schedule.”",
    casual: "“Hey are you free for lunch tomorrow? Let's do 12 if that works for you”",
    executive: "“Let's connect over lunch tomorrow at 12:00 PM to review strategic priorities. Let me know if that aligns with your calendar.”",
    technical: "“Scheduling sync @ 12:00 tomorrow for sprint review. Ping me if any blocker on your side.”"
  };

  const translatePresets = {
    hinglish: {
      lang: "Hindi / Hinglish",
      flag: "🇮🇳",
      spoken: "“Yaar team ko update kar do ki launch Monday ko shift ho gaya hai, legal approval pending hai.”",
      translated: "“Please let the team know that the launch has slipped to Monday pending final legal approval.”",
      detected: "Hindi (Devanagari / Latin)",
      latency: "0.19s",
      targetLang: "English (Polished Prose)"
    },
    spanish: {
      lang: "Spanish",
      flag: "🇪🇸",
      spoken: "“Hola equipo, por favor revisen la documentación de arquitectura antes de las cinco de la tarde.”",
      translated: "“Hello team, please review the architecture documentation before 5:00 PM.”",
      detected: "Spanish (Castilian)",
      latency: "0.17s",
      targetLang: "English (Polished Prose)"
    },
    japanese: {
      lang: "Japanese",
      flag: "🇯🇵",
      spoken: "“来週月曜日のリリース計画について、エンジニアリングチームと確認をお願いします。”",
      translated: "“Please coordinate with the engineering team regarding the release schedule for next Monday.”",
      detected: "Japanese (Nihongo)",
      latency: "0.22s",
      targetLang: "English (Polished Prose)"
    },
    german: {
      lang: "German",
      flag: "🇩🇪",
      spoken: "“Bitte senden Sie das aktualisierte Angebot für das Unternehmensprojekt bis heute Nachmittag.”",
      translated: "“Please send the updated enterprise project proposal by this afternoon.”",
      detected: "German (Standard)",
      latency: "0.18s",
      targetLang: "English (Polished Prose)"
    }
  };

  const agentCommands = [
    {
      title: "Open Notifications",
      voiceInput: "“Open notifications and mark all as read”",
      intent: "noska.ui.openPanel",
      toolCall: 'noska.ui.openPanel("notifications", { markRead: true })',
      result: "✓ Notifications drawer opened • 3 unread cleared",
      category: "In-App UI"
    },
    {
      title: "Switch Dark Mode",
      voiceInput: "“Switch interface theme to Obsidian Dark mode”",
      intent: "noska.theme.set",
      toolCall: 'noska.theme.set("obsidian-dark")',
      result: "✓ Workspace theme updated to Obsidian Dark",
      category: "Appearance"
    },
    {
      title: "Search Notes",
      voiceInput: "“Search notes for Q4 Product Roadmap & open canvas”",
      intent: "noska.search.open",
      toolCall: 'noska.search.open({ query: "Q4 Roadmap", type: "canvas" })',
      result: "✓ Located & opened 'Q4 Product Roadmap' in 40ms",
      category: "Navigation"
    },
    {
      title: "Create Canvas",
      voiceInput: "“Create a new infinite canvas titled Sprint Retrospective”",
      intent: "noska.canvas.create",
      toolCall: 'noska.canvas.create({ title: "Sprint Retrospective", template: "retro" })',
      result: "✓ Created canvas 'Sprint Retrospective' with retro template",
      category: "Workspace"
    },
    {
      title: "Export to PDF",
      voiceInput: "“Export the current active canvas as a high-res PDF”",
      intent: "noska.canvas.export",
      toolCall: 'noska.canvas.export({ format: "pdf", dpi: 300 })',
      result: "✓ Rendered vector PDF & saved to Downloads folder",
      category: "Export & Share"
    },
    {
      title: "Split Screen View",
      voiceInput: "“Split screen to view API documentation side by side”",
      intent: "noska.layout.split",
      toolCall: 'noska.layout.split({ pane: "right", target: "/docs/api" })',
      result: "✓ Split pane activated with live API reference",
      category: "Layout"
    }
  ];

  const snippetPresets = [
    {
      title: "Calendar Link",
      trigger: "“my calendar link”",
      expansion: "https://cal.com/noska/voice-sync",
      tag: "Scheduling"
    },
    {
      title: "Executive Sign-Off",
      trigger: "“standard sign off”",
      expansion: "Best regards,\nAlex Chen\nCo-Founder & Head of Product • Noska Flow",
      tag: "Email Signature"
    },
    {
      title: "GitHub Repo",
      trigger: "“github repo”",
      expansion: "https://github.com/noska-lab/noska-flow-core",
      tag: "Developer Link"
    },
    {
      title: "Standup Update",
      trigger: "“daily standup update”",
      expansion: "Yesterday: Shipped on-device Whisper v3 pipeline.\nToday: Benchmarking MCP background runner.\nBlockers: None.",
      tag: "Workflows"
    }
  ];

  const clientLogos = [
    { name: "Microsoft", symbol: "⊞ Microsoft" },
    { name: "Amazon", symbol: "amazon" },
    { name: "Notion", symbol: "N Notion" },
    { name: "Klarna", symbol: "Klarna." },
    { name: "Groupon", symbol: "GROUPON" },
    { name: "Vercel", symbol: "▲ Vercel" },
    { name: "Mercury", symbol: "MERCURY" }
  ];

  const advantages = [
    {
      title: "Comprehensive Voice Synthesis",
      subtitle: "Instant AI speech polishing for team brainstorms, code notes & strategy sessions.",
      tag: "#WisprFlow"
    },
    {
      title: "Targeted Whisper Mode",
      subtitle: "Accurate dictation even when speaking in a faint whisper in quiet rooms or late calls.",
      tag: "#WhisperMode"
    },
    {
      title: "Autonomous Knowledge Capture",
      subtitle: "Transforms raw speech into linked knowledge graph entities and database rows.",
      tag: "#Intelligence"
    }
  ];

  const faqs = [
    {
      q: "Will Flow work in my messages, notes, email, or AI tools?",
      a: "Yes. Flow types wherever your cursor is, so it works in every app on your computer with no setup or integrations. Gmail, Slack, iMessage, Notion, your terminal, your code editor, and AI tools like ChatGPT, Claude, and Cursor. If you can type there, you can Flow there."
    },
    {
      q: "How is Flow different from Siri or Google voice typing?",
      a: "Built-in dictation transcribes what you say, word for word, including every 'um,' false start, and mid-sentence correction. Then you spend time cleaning it up. Flow uses the most advanced voice technology available to turn what you say into what you meant to write:\n• Catches your corrections automatically.\n• Formats as you speak with numbered lists, paragraphs, and structured notes.\n• Gets uncommon names and technical terms right with your personal dictionary.\n• Works seamlessly across Windows, Mac, iOS, and Android."
    },
    {
      q: "Does Flow work in other languages?",
      a: "Yes, Flow supports 100+ languages. For the best accuracy, select the specific language you're speaking at that moment rather than relying on auto-detect. If you switch between languages during the day, the language picker lives right in the Flow bar, so changing is one click away."
    },
    {
      q: "Does it work if I have an accent?",
      a: "Yes. Flow is built to handle a wide range of accents and speaking styles. Selecting just the language you're speaking gives you noticeably better accuracy, and switching takes one second in the Flow bar."
    },
    {
      q: "What if I talk fast, speak quietly, or work somewhere noisy?",
      a: "Flow easily keeps up with fast talkers up to 250 WPM and can handle speech as quiet as a faint whisper. With on-device acoustic dampening, background noise is filtered out so your dictation stays crystal clear."
    },
    {
      q: "Do I need a special microphone or extra hardware?",
      a: "No. Your built-in computer or phone microphone is all you need. If you want to dictate very quietly, sitting naturally at your desk works perfectly."
    },
    {
      q: "Is my voice data private?",
      a: "We never sell your data. Flow is independently certified to the world's top security standards: SOC 2 Type II, ISO 27001, and HIPAA compliance, with 100% on-device Whisper options."
    },
    {
      q: "Is Flow free?",
      a: "Yes. Flow is free, with no trial countdown or credit card required, for up to 2,000 words per week. If you want unlimited dictation, upgrade to Flow Pro."
    },
    {
      q: "Can my whole team use it?",
      a: "Yes. Flow Pro for Teams gives everyone unlimited dictation under one plan, with centralized billing and an admin portal to manage seats. Flow Enterprise adds enforced SSO, audit logs, and custom retention."
    }
  ];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="wispr-page-root">
      {/* Scrollable Shell */}
      <div ref={contentRef} className="w-full">

        {/* Soft Background Sky Ambiance (Hardware Accelerated) */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 will-change-transform transform-gpu">
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-[#dbe8dd]/60 blur-2xl transform-gpu will-change-transform" />
          <div className="absolute top-10 right-0 w-[680px] h-[680px] rounded-full bg-[#fde9e3]/65 blur-2xl transform-gpu will-change-transform" />
          <div className="absolute bottom-20 left-1/3 w-[720px] h-[720px] rounded-full bg-[#edf6ee]/50 blur-2xl transform-gpu will-change-transform" />
        </div>

        {/* ==========================================================================
            1. TOP NAVIGATION HEADER (Official Wispr Flow Design - Full Width Edge-to-Edge)
           ========================================================================== */}
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled
          ? 'py-3 bg-white/90 backdrop-blur-2xl border-b border-black/[0.06] shadow-xs'
          : 'py-4.5 bg-[#faf9f0]/85 backdrop-blur-md border-b border-black/[0.04]'
          }`}>
          <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">

            {/* Brand Logo & Wispr Flow Segmented Switcher */}
            <div className="flex items-center gap-4 sm:gap-7">
              <div
                onClick={() => navigate('/')}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
              >
                {/* Wispr Flow Sound Wave Symbol */}
                <div className="flex items-center gap-[3px] h-6 px-1">
                  <span className="w-1.5 h-3 rounded-full bg-[#5b8266] transition-all group-hover:h-4" />
                  <span className="w-1.5 h-5 rounded-full bg-[#f48574] transition-all group-hover:h-6" />
                  <span className="w-1.5 h-3 rounded-full bg-[#5b8266] transition-all group-hover:h-4" />
                </div>
                <span className="text-[20px] font-bold tracking-tight text-neutral-900">
                  Flow
                </span>
              </div>

              {/* Home & Dictation Switcher */}
              <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.05]">
                <button
                  onClick={() => navigate('/')}
                  className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-200 cursor-pointer text-neutral-600 hover:text-neutral-950 hover:bg-white/60"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('hero')}
                  className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 cursor-pointer bg-white text-neutral-900 shadow-xs"
                >
                  Dictation
                </button>
              </div>
            </div>

            {/* Right CTA Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex text-[13px] font-medium text-neutral-700 hover:text-neutral-950 px-3 py-2 transition cursor-pointer"
              >
                Sign in
              </button>

              {/* Iconic Wispr Flow Download CTA Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="wispr-btn-windows px-4 sm:px-5 py-2 sm:py-2.5 text-[12.5px] sm:text-[13px] gap-2 cursor-pointer active:scale-95"
              >
                <Download size={14} strokeWidth={2.2} className="shrink-0" />
                <span>Download</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="md:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 transition"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white/95 backdrop-blur-xl px-6 py-4 border-b border-neutral-100 flex flex-col gap-3 text-[14px] shadow-lg sticky top-[60px] z-40"
            >
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-neutral-100">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                  className="flex-1 py-1.5 rounded-lg text-center font-medium bg-neutral-100 text-neutral-700"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); scrollToSection('hero'); }}
                  className="flex-1 py-1.5 rounded-lg text-center font-semibold bg-neutral-900 text-white"
                >
                  Dictation
                </button>
              </div>
              <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="text-left py-1.5 font-medium text-neutral-700">Sign in</button>
              <button onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }} className="text-left py-1.5 font-semibold text-neutral-900">Download</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================================================
            2. HERO SECTION: "Don't type, just speak." with Speech-to-Text Loop Animation
           ========================================================================== */}
        <section id="hero" ref={heroRef} className="relative pt-6 sm:pt-10 pb-16 sm:pb-24 px-4 sm:px-8 text-center overflow-hidden">

          {/* Grand Headline: Don't type, just speak. */}
          <motion.div
            style={{ y: heroTextY, opacity: heroTextOpacity }}
            className="max-w-4xl mx-auto mb-4 relative z-20"
          >
            <h1 className="text-[48px] sm:text-[76px] md:text-[88px] font-extrabold tracking-[-0.035em] text-neutral-900 leading-[1.02] select-none">
              Don't type,<br />
              <span className="wispr-serif-italic text-neutral-800 font-normal">just speak.</span>
            </h1>
            <p className="text-[15.5px] sm:text-[18px] text-neutral-600 max-w-lg mx-auto mt-3.5 sm:mt-4 font-normal leading-relaxed">
              The voice-to-text AI that turns speech into clear, polished writing in Noska all over.
            </p>
          </motion.div>


          {/* ==========================================================================
              AUTHENTIC WISPR FLOW SPEECH-TO-TEXT LOOP ANIMATION SUITE
              - Looping raw text path with fillers on left
              - Center animated waveform equalizer pill
              - Floating [ ✓ Removed Umm ] badge
              - Angled black ribbon with polished white text on right
              - Lavender fingerprint node at bottom-left
             ========================================================================== */}
          <motion.div
            style={{ y: ribbonY, scale: ribbonScale }}
            className="relative w-full max-w-[1440px] mx-auto select-none my-2 sm:my-4 z-20"
          >
            <svg
              viewBox="0 0 2080 640"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto block overflow-visible"
            >
              <defs>
                {/* Metallic Dark Gradient for Proprietary Noska Recording Pill Bar */}
                <linearGradient id="noska-dark-pill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#26282f" />
                  <stop offset="100%" stopColor="#141518" />
                </linearGradient>

                {/* Path 1: Authentic Looping Flight Path with Clear Spatial Clearance */}
                <path
                  id="rawSpeechLoopPath"
                  d="M 0.6 50.9 C 17.5 143.3, 61.9 299.9, 398.6 360.3 C 594.0 395.3, 772.8 285.9, 668.7 149.3 C 564.7 12.6, 340.7 271.0, 667.0 470.4 C 719.7 496.6, 817.5 521.0, 1046.4 521.0"
                  fill="none"
                />

                {/* Path 2: Authentic Wispr Flow Polished Output Ribbon Track (gentle S-curve emerging from behind the pill) */}
                <path
                  id="polishedRibbonPath"
                  d="M 1046.4 521.0 C 1156.0 515.4, 1360.9 511.1, 1562.4 447.2 C 1747.4 388.4, 1919.7 401.6, 2066.3 410.3"
                  fill="none"
                />

                {/* Clip paths to ensure clean streaming into and out of the Noska processor pill with zero letter clipping */}
                <clipPath id="wispr-raw-text-clip">
                  <rect x="0" y="0" width="926" height="640" />
                </clipPath>
                <clipPath id="wispr-polished-text-clip">
                  <rect x="1166" y="0" width="1000" height="640" />
                </clipPath>
              </defs>

              {/* 1. RAW SPOKEN STREAM: Faint Gray Text Streaming Along Flight Loop (clipped before entering pill) */}
              <text
                fill="#8a8a86"
                fontSize="18"
                fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif"
                fontWeight="500"
                letterSpacing="0.015em"
                clipPath="url(#wispr-raw-text-clip)"
              >
                <textPath href="#rawSpeechLoopPath" startOffset="0%">
                  Umm, hope your week has started well… I was talking to Cheyene earlier but reception was really bad and I think they're going to handle the first part of the project, but I'm not totally sure. Also, I told the team the new timeline should be ready by Friday, although it's probably going to slip. There's been a lot of back and forth and honestly the whole thing's been kind of chaotic, like nobody really knows what's going on so can you check in with them and see if the notes from yesterday's meeting were sent out, or if they're still waiting. I think Cheyene mentioned it but didn't confirm, and now I'm a little lost.
                  <animate
                    attributeName="startOffset"
                    from="0%"
                    to="-100%"
                    dur="36s"
                    repeatCount="indefinite"
                  />
                </textPath>
              </text>

              {/* 2. POLISHED STREAM: Bold Obsidian Black Ribbon with Soft Rounded Cap */}
              <path
                d="M 1046.4 521.0 C 1156.0 515.4, 1360.9 511.1, 1562.4 447.2 C 1747.4 388.4, 1919.7 401.6, 2066.3 410.3"
                stroke="#111111"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3. POLISHED TEXT: Crisp White Text Streaming Along Ribbon (clipped so letters only emerge cleanly past pill edge) */}
              <text
                fill="#ffffeb"
                fontSize="19"
                fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif"
                fontWeight="600"
                dy="6.5"
                letterSpacing="0.01em"
                clipPath="url(#wispr-polished-text-clip)"
              >
                <textPath href="#polishedRibbonPath" startOffset="140">
                  Hope your week is off to a good start. I was talking to Cheyene earlier, and they are going to handle the first part of the project. The new timeline is confirmed for Monday! Can you check in with them and see if the launch is on track? Sending update to Slack in 3... 2... 1... All set!
                  <animate
                    attributeName="startOffset"
                    from="140"
                    to="-100%"
                    dur="26s"
                    repeatCount="indefinite"
                  />
                </textPath>
              </text>

              {/* 4. NOSKA DARK RECORDING PILL BAR: [ ⏹  ••••••••••••  00 : 02 ] */}
              <g
                transform="translate(922, 486)"
                onClick={() => scrollToSection('live-studio')}
                className="cursor-pointer group"
              >
                {/* Outer Capsule Container with Specular Metallic Gradient (Shadow Removed) */}
                <rect
                  x="0"
                  y="0"
                  width="248"
                  height="58"
                  rx="29"
                  fill="url(#noska-dark-pill-grad)"
                  stroke="#2f323a"
                  strokeWidth="1.6"
                />

                {/* Subtle Top Specular Glass Reflection */}
                <path
                  d="M 29 2 Q 124 3 219 2"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeLinecap="round"
                />

                {/* Left Element: Stop Button [ ⏹ ] */}
                <rect
                  x="18"
                  y="14"
                  width="30"
                  height="30"
                  rx="8"
                  fill="#ffffff"
                />
                <rect
                  x="27"
                  y="23"
                  width="12"
                  height="12"
                  rx="2.5"
                  fill="#151619"
                />

                {/* Middle Element: 12 Live Pulsating Voice Dots */}
                <g>
                  {[
                    { cx: 68, delay: '0.0s' },
                    { cx: 77, delay: '0.08s' },
                    { cx: 86, delay: '0.16s' },
                    { cx: 95, delay: '0.24s' },
                    { cx: 104, delay: '0.32s' },
                    { cx: 113, delay: '0.40s' },
                    { cx: 122, delay: '0.48s' },
                    { cx: 131, delay: '0.56s' },
                    { cx: 140, delay: '0.64s' },
                    { cx: 149, delay: '0.72s' },
                    { cx: 158, delay: '0.80s' },
                    { cx: 167, delay: '0.88s' },
                  ].map((dot, i) => (
                    <circle key={i} cx={dot.cx} cy="29" r="2.8" fill="#ffffff" opacity="0.85">
                      <animate
                        attributeName="opacity"
                        values="0.35;1;0.35"
                        dur="1.2s"
                        begin={dot.delay}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>

                {/* Right Element: Digital Elapsed Monospace Timer [ 00 : 02 ] */}
                <text
                  x="184"
                  y="35.5"
                  fill="#ffffff"
                  fontSize="16"
                  fontFamily="'SF Mono', 'JetBrains Mono', 'Roboto Mono', 'Fira Code', monospace"
                  fontWeight="700"
                  letterSpacing="0.04em"
                >
                  <tspan fill="#ffffff">00</tspan>
                  <tspan fill="#ffffff">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" /> :
                  </tspan>
                  <tspan fill="#ffffff">02</tspan>
                </text>
              </g>

              {/* 5. FLOATING TRANSFORMATION BADGE: [ ✓ Removed Umm ] */}
              <g transform="translate(966, 434)" className="pointer-events-none">
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="38"
                  rx="19"
                  fill="#0c4333"
                />
                {/* Checkmark Icon */}
                <path
                  d="M 18 19 L 23 24 L 33 14"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <text
                  x="42"
                  y="24"
                  fill="#ffffff"
                  fontSize="14"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="600"
                  letterSpacing="0.01em"
                >
                  <CleanupBadgeText />
                </text>
              </g>

            </svg>
          </motion.div>

          {/* BILLOWING CELESTIAL CLOUD HORIZON with Dynamic Scroll Parting */}
          <div className="relative w-full -mt-8 sm:-mt-12 pointer-events-none select-none z-10">

            {/* Master Responsive Cloudscape Vector with Scroll Parallax (Hardware-Accelerated Zero-Lag Render) */}
            <svg
              viewBox="0 0 1440 540"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto min-h-[340px] sm:min-h-[440px] block overflow-visible will-change-transform"
            >
              <defs>
                {/* Celestial Sunrise Radiant Radial Glow */}
                <radialGradient id="wispr-sunrise-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f89c8d" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#fcaaa0" stopOpacity="0.75" />
                  <stop offset="78%" stopColor="#fde0d8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#faf9f0" stopOpacity="0" />
                </radialGradient>

                {/* Celestial Sun Plume Light Beam */}
                <linearGradient id="wispr-light-beam" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#ffffff" stopOpacity="0.75" />
                  <stop offset="80%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Left Pink Cloud Gradients */}
                <linearGradient id="wispr-pink-grad-1" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#fdbdb4" />
                  <stop offset="100%" stopColor="#f8988a" />
                </linearGradient>
                <linearGradient id="wispr-pink-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fdd2ca" />
                  <stop offset="100%" stopColor="#fcaaa0" />
                </linearGradient>
                <linearGradient id="wispr-pink-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Right Sage Green Cloud Gradients */}
                <linearGradient id="wispr-sage-grad-1" x1="80%" y1="0%" x2="20%" y2="100%">
                  <stop offset="0%" stopColor="#d2e6da" />
                  <stop offset="100%" stopColor="#a9caa9" />
                </linearGradient>
                <linearGradient id="wispr-sage-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e3f0e8" />
                  <stop offset="100%" stopColor="#c1dcce" />
                </linearGradient>
                <linearGradient id="wispr-sage-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Warm Ivory Cloud Gradients for Dimensional Midground */}
                <linearGradient id="wispr-ivory-grad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f5efe4" />
                </linearGradient>

                {/* Pearlescent Cumulus Cloud Gradient for Volumetric Foreground */}
                <linearGradient id="wispr-cumulus-grad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="75%" stopColor="#fbf9f6" />
                  <stop offset="100%" stopColor="#f4ede2" />
                </linearGradient>

                {/* Seamless Base Mist Gradient into White Section Below */}
                <linearGradient id="wispr-cloud-base-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* 1. Center Back: Glowing Sunrise Arch & Radiant Light Plume */}
              <motion.g style={{ y: domeY, scale: domeScale, opacity: beamOpacity, transformOrigin: '720px 220px' }}>
                <ellipse cx="720" cy="220" rx="380" ry="220" fill="url(#wispr-sunrise-glow)" />
                {/* Diffused light halo */}
                <motion.polygon
                  style={{ scaleX: beamScaleX, transformOrigin: '720px 220px' }}
                  points="650,280 790,280 830,10 610,10"
                  fill="url(#wispr-light-beam)"
                  opacity="0.6"
                />
                {/* Radiant central plume */}
                <motion.polygon
                  style={{ scaleX: beamScaleX, transformOrigin: '720px 220px' }}
                  points="685,280 755,280 780,20 660,20"
                  fill="url(#wispr-light-beam)"
                  opacity="0.95"
                />
              </motion.g>

              {/* 2. Left Flank: Voluptuous Soft Blush Pink Clouds with Parallax Glide */}
              <motion.g
                style={{
                  x: cloudLeftX,
                  y: cloudLeftY,
                  scale: cloudLeftScale,
                  rotate: cloudLeftRotate,
                  transformOrigin: '240px 240px'
                }}
              >
                {/* Ambient Soft Shadow Layer */}
                <circle cx="120" cy="246" r="145" fill="#f48574" opacity="0.12" />
                <circle cx="260" cy="206" r="135" fill="#f48574" opacity="0.12" />
                <circle cx="390" cy="236" r="120" fill="#f48574" opacity="0.1" />

                {/* Deep layer */}
                <circle cx="120" cy="240" r="145" fill="url(#wispr-pink-grad-1)" opacity="0.92" />
                <circle cx="260" cy="200" r="135" fill="url(#wispr-pink-grad-1)" opacity="0.92" />
                <circle cx="390" cy="230" r="120" fill="url(#wispr-pink-grad-1)" opacity="0.88" />

                {/* Fore layer */}
                <circle cx="50" cy="270" r="130" fill="url(#wispr-pink-grad-2)" />
                <circle cx="190" cy="230" r="140" fill="url(#wispr-pink-grad-2)" />
                <circle cx="330" cy="255" r="130" fill="url(#wispr-pink-grad-2)" />
                <circle cx="460" cy="300" r="105" fill="url(#wispr-pink-grad-2)" opacity="0.92" />

                {/* Specular curved highlights */}
                <path d="M 110 125 Q 190 115 250 140" stroke="url(#wispr-pink-highlight)" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 250 160 Q 320 150 375 180" stroke="url(#wispr-pink-highlight)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </motion.g>

              {/* 3. Right Flank: Voluptuous Soft Sage Mint Clouds with Parallax Glide */}
              <motion.g
                style={{
                  x: cloudRightX,
                  y: cloudRightY,
                  scale: cloudRightScale,
                  rotate: cloudRightRotate,
                  transformOrigin: '1200px 240px'
                }}
              >
                {/* Ambient Soft Shadow Layer */}
                <circle cx="1320" cy="246" r="145" fill="#5b8266" opacity="0.1" />
                <circle cx="1180" cy="206" r="135" fill="#5b8266" opacity="0.1" />
                <circle cx="1050" cy="236" r="120" fill="#5b8266" opacity="0.08" />

                {/* Deep layer */}
                <circle cx="1320" cy="240" r="145" fill="url(#wispr-sage-grad-1)" opacity="0.92" />
                <circle cx="1180" cy="200" r="135" fill="url(#wispr-sage-grad-1)" opacity="0.92" />
                <circle cx="1050" cy="230" r="120" fill="url(#wispr-sage-grad-1)" opacity="0.88" />

                {/* Fore layer */}
                <circle cx="1390" cy="270" r="130" fill="url(#wispr-sage-grad-2)" />
                <circle cx="1250" cy="230" r="140" fill="url(#wispr-sage-grad-2)" />
                <circle cx="1110" cy="255" r="130" fill="url(#wispr-sage-grad-2)" />
                <circle cx="980" cy="300" r="105" fill="url(#wispr-sage-grad-2)" opacity="0.92" />

                {/* Specular curved highlights */}
                <path d="M 1330 125 Q 1250 115 1190 140" stroke="url(#wispr-sage-highlight)" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 1190 160 Q 1120 150 1065 180" stroke="url(#wispr-sage-highlight)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </motion.g>

              {/* 4. Mid-Ground: Warm Ivory Pillows for 3D Layered Depth */}
              <motion.g style={{ y: cloudMidY, transformOrigin: '720px 320px' }}>
                {/* Mid-Left Ivory Cluster */}
                <motion.g style={{ x: cloudMidLeftX }}>
                  <circle cx="280" cy="326" r="135" fill="#000000" opacity="0.03" />
                  <circle cx="480" cy="316" r="125" fill="#000000" opacity="0.03" />
                  <circle cx="280" cy="320" r="135" fill="url(#wispr-ivory-grad)" />
                  <circle cx="480" cy="310" r="125" fill="url(#wispr-ivory-grad)" />
                  <circle cx="640" cy="340" r="110" fill="url(#wispr-ivory-grad)" />
                </motion.g>
                {/* Mid-Right Ivory Cluster */}
                <motion.g style={{ x: cloudMidRightX }}>
                  <circle cx="960" cy="316" r="125" fill="#000000" opacity="0.03" />
                  <circle cx="1160" cy="326" r="135" fill="#000000" opacity="0.03" />
                  <circle cx="800" cy="340" r="110" fill="url(#wispr-ivory-grad)" />
                  <circle cx="960" cy="310" r="125" fill="url(#wispr-ivory-grad)" />
                  <circle cx="1160" cy="320" r="135" fill="url(#wispr-ivory-grad)" />
                </motion.g>
              </motion.g>

              {/* 5. Foreground: Dynamic Parting Cumulus Billows with Ethereal Mist Foundation */}
              <motion.g
                style={{
                  y: cloudFrontY,
                  scale: cloudFrontScale,
                  opacity: cloudFrontOpacity,
                  transformOrigin: '720px 420px'
                }}
              >
                {/* Left Parting Cumulus Cluster */}
                <motion.g style={{ x: cloudFrontLeftX }}>
                  <circle cx="150" cy="358" r="160" fill="#000000" opacity="0.035" />
                  <circle cx="320" cy="343" r="150" fill="#000000" opacity="0.035" />
                  <circle cx="-10" cy="380" r="175" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="150" cy="350" r="160" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="320" cy="335" r="150" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="490" cy="345" r="140" fill="url(#wispr-cumulus-grad)" />
                  {/* Subtle rim highlight */}
                  <path d="M 100 230 Q 160 210 220 220" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M 270 205 Q 330 195 390 210" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" strokeLinecap="round" />
                </motion.g>

                {/* Central Valley Crests framing the sunrise beam */}
                <circle cx="630" cy="380" r="125" fill="url(#wispr-cumulus-grad)" />
                <circle cx="720" cy="400" r="115" fill="url(#wispr-cumulus-grad)" />
                <circle cx="810" cy="380" r="125" fill="url(#wispr-cumulus-grad)" />

                {/* Right Parting Cumulus Cluster */}
                <motion.g style={{ x: cloudFrontRightX }}>
                  <circle cx="1120" cy="343" r="150" fill="#000000" opacity="0.035" />
                  <circle cx="1290" cy="358" r="160" fill="#000000" opacity="0.035" />
                  <circle cx="950" cy="345" r="140" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="1120" cy="335" r="150" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="1290" cy="350" r="160" fill="url(#wispr-cumulus-grad)" />
                  <circle cx="1450" cy="380" r="175" fill="url(#wispr-cumulus-grad)" />
                  {/* Subtle rim highlight */}
                  <path d="M 1050 210 Q 1110 195 1170 205" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M 1220 220 Q 1280 210 1340 230" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" strokeLinecap="round" />
                </motion.g>

                {/* Organic Cumulus Rolling Foundation Base (Smoothly dissolves into #ffffff below) */}
                <path
                  d="M -40 430 Q 180 400 360 415 Q 540 425 720 440 Q 900 425 1080 415 Q 1260 400 1480 430 L 1480 540 L -40 540 Z"
                  fill="url(#wispr-cloud-base-fade)"
                />
              </motion.g>
            </svg>

          </div>
        </section>

        {/* ==========================================================================
                3. CLIENTS LOGO TICKER ("Used by professionals at")
               ========================================================================== */}
        <section className="relative px-6 sm:px-12 pt-8 pb-12 bg-white">
          <div className="max-w-5xl mx-auto text-center mb-7">
            <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-widest">
              Used by professionals at
            </span>
          </div>

          {/* Infinite Horizontal Logo Marquee */}
          <div className="relative overflow-hidden w-full max-w-5xl mx-auto py-2">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            <div className="wispr-logo-ticker flex items-center justify-around gap-12 select-none">
              {[...clientLogos, ...clientLogos, ...clientLogos].map((logo, idx) => (
                <div
                  key={`${logo.name}-${idx}`}
                  className="flex items-center gap-2 text-[17px] font-medium tracking-tight text-neutral-400 hover:text-neutral-800 transition duration-200 cursor-default shrink-0 px-4"
                >
                  <span className="font-semibold text-[18px]">{logo.symbol}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================================================
                4. "4x FASTER THAN TYPING" SPEED SUITE (Exact Wispr Flow Anatomy)
               ========================================================================== */}
        <section id="benchmarks" className="relative px-4 sm:px-8 md:px-12 py-16 bg-[#faf9f0]">
          <div className="wispr-speed-container bg-[#faf8fd] text-neutral-900 rounded-[36px] sm:rounded-[48px] p-6 sm:p-12 md:p-16 relative overflow-hidden border-2 border-black shadow-[4px_5px_0px_#000000]">

            {/* Soft pastel ambient blurs inside container (matching Image 2 palette) */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#fbb4ae]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#c1dfd4]/35 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[#f3e8ff]/50 blur-3xl pointer-events-none" />

            {/* Section Header */}
            <div className="max-w-3xl mx-auto text-center relative z-10 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f3e8ff] border-2 border-black text-[12px] font-bold text-neutral-900 uppercase tracking-wider mb-4 shadow-[2px_2px_0px_#000000]">
                <Zap size={12} className="text-[#3d6148]" />
                <span>Velocity Benchmark</span>
              </div>
              <h2 className="text-[38px] sm:text-[58px] font-extrabold tracking-tight text-neutral-900 leading-[1.08]">
                4x faster <em className="italic font-serif font-light text-[#5b8266]">than typing</em>
              </h2>
              <p className="text-[14.5px] sm:text-[16.5px] text-neutral-600 max-w-xl mx-auto mt-4 font-normal leading-relaxed">
                Voice that finally works is here. Flow lets you create, code, message, and write at the speed of thought, 4x faster than your keyboard.
              </p>
            </div>

            {/* Dual Velocity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto relative z-10 mb-12">

              {/* Keyboard 45 WPM Card */}
              <div className="rounded-[28px] bg-white border-2 border-black/15 shadow-[2px_2px_0px_#000000]/10 p-6 sm:p-8 flex flex-col justify-between min-h-[190px]">
                <div className="flex items-center justify-between pb-3 border-b border-black/10">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-neutral-500">Keyboard</span>
                  <span className="text-[20px] font-mono font-bold text-neutral-700">45 wpm</span>
                </div>

                <div className="my-4 overflow-hidden relative h-10 flex items-center">
                  <svg width="100%" height="32" viewBox="0 0 600 32" className="overflow-visible">
                    <path id="curve-keyboard" d="M0 16 H1200" fill="transparent" />
                    <text className="text-[13.5px] font-medium fill-neutral-400">
                      <textPath xlinkHref="#curve-keyboard">
                        I'm getting started with the project. How would you like to set up the file? Typing one sluggish keystroke at a time...
                      </textPath>
                      <animate attributeName="x" dur="28s" values="0; -600" repeatCount="indefinite" />
                    </text>
                  </svg>
                </div>

                <div className="text-[12px] text-neutral-500 font-medium">
                  Standard keyboard typing speed with typing fatigue
                </div>
              </div>

              {/* Wispr Flow 220 WPM Card */}
              <div className="rounded-[28px] bg-[#f3e8ff] border-2 border-black shadow-[3.5px_4px_0px_#000000] p-6 sm:p-8 flex flex-col justify-between min-h-[190px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c1dfd4]/40 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-black/15 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5b8266] animate-pulse border border-black/20" />
                    <span className="text-[13px] font-extrabold uppercase tracking-wider text-neutral-900">Flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-mono font-black text-neutral-900">220 wpm</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border-2 border-black text-neutral-900 shadow-[1.5px_1.5px_0px_#000000]">4.9x speed</span>
                  </div>
                </div>

                <div className="my-4 overflow-hidden relative h-12 flex items-center">
                  <svg width="100%" height="48" viewBox="0 0 700 48" className="overflow-visible">
                    <path id="curve-flow-fast" d="M 0 32 Q 175 0 350 32 T 700 32 T 1050 32" fill="transparent" stroke="rgba(91, 130, 102, 0.35)" strokeWidth="1.5" />
                    <text className="text-[14px] font-bold fill-neutral-900">
                      <textPath xlinkHref="#curve-flow-fast">
                        Instant speech dictation at the speed of thought. Zero punctuation delays, automatic cleanup, full velocity!
                      </textPath>
                      <animate attributeName="x" dur="12s" values="0; -700" repeatCount="indefinite" />
                    </text>
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[12px] text-neutral-800 font-semibold relative z-10">
                  <span>Conversational speaking velocity</span>
                  <div className="flex items-center gap-1">
                    <span className="wispr-eq-bar bg-[#5b8266]" />
                    <span className="wispr-eq-bar bg-[#5b8266]" />
                    <span className="wispr-eq-bar bg-[#5b8266]" />
                    <span className="wispr-eq-bar bg-[#5b8266]" />
                  </div>
                </div>
              </div>

            </div>

            {/* Application Switcher & Real-Time Transformation Stage */}
            <div className="max-w-4xl mx-auto relative z-10 pt-4">

              {/* App Tab Switcher */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-8">
                <button
                  onClick={() => setActiveApp('slack')}
                  className={`px-5 py-2.5 rounded-full text-[13px] flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'slack'
                    ? 'bg-[#f3e8ff] text-neutral-900 border-2 border-black shadow-[2.5px_3px_0px_#000000] font-bold scale-105'
                    : 'bg-white text-neutral-700 hover:text-neutral-950 border border-black/15 hover:border-black/30 hover:bg-neutral-50 font-medium shadow-xs'
                    }`}
                >
                  <MessageCircle size={15} className={activeApp === 'slack' ? 'text-[#36C5F0]' : 'text-neutral-500'} />
                  <span>Slack</span>
                </button>
                <button
                  onClick={() => setActiveApp('claude')}
                  className={`px-5 py-2.5 rounded-full text-[13px] flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'claude'
                    ? 'bg-[#f3e8ff] text-neutral-900 border-2 border-black shadow-[2.5px_3px_0px_#000000] font-bold scale-105'
                    : 'bg-white text-neutral-700 hover:text-neutral-950 border border-black/15 hover:border-black/30 hover:bg-neutral-50 font-medium shadow-xs'
                    }`}
                >
                  <Sparkles size={15} className={activeApp === 'claude' ? 'text-[#D97706]' : 'text-neutral-500'} />
                  <span>Claude</span>
                </button>
                <button
                  onClick={() => setActiveApp('gmail')}
                  className={`px-5 py-2.5 rounded-full text-[13px] flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'gmail'
                    ? 'bg-[#f3e8ff] text-neutral-900 border-2 border-black shadow-[2.5px_3px_0px_#000000] font-bold scale-105'
                    : 'bg-white text-neutral-700 hover:text-neutral-950 border border-black/15 hover:border-black/30 hover:bg-neutral-50 font-medium shadow-xs'
                    }`}
                >
                  <Monitor size={15} className={activeApp === 'gmail' ? 'text-[#EA4335]' : 'text-neutral-500'} />
                  <span>Gmail</span>
                </button>
              </div>

              {/* Two-Pane Transformation Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

                {/* Left Pane: Raw Spoken Audio with Filler Word Purging */}
                <motion.div
                  key={`raw-${activeApp}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[24px] bg-[#fff5f3] border-2 border-black/15 shadow-[2px_2px_0px_#000000]/10 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f48574] animate-pulse" />
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#d9483b]">
                          What You Said (Raw Audio)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-neutral-700 bg-white border border-black/15 px-2.5 py-0.5 rounded-full shadow-xs">
                        {appTransformations[activeApp].fillersRemoved} vocal fillers removed
                      </span>
                    </div>
                    <div className="text-[14px] leading-relaxed text-neutral-800 font-mono py-1">
                      {appTransformations[activeApp].rawAudio}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] text-neutral-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f48574]" />
                      <span>{appTransformations[activeApp].legend}</span>
                    </div>
                    <span className="font-mono text-neutral-400 text-[10px]">
                      MIC IN • 16kHz
                    </span>
                  </div>
                </motion.div>

                {/* Right Pane: Polished Application Composer Preview */}
                <motion.div
                  key={`polished-${activeApp}`}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[24px] bg-white text-neutral-900 p-6 flex flex-col justify-between shadow-[3.5px_4px_0px_#000000] border-2 border-black"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#5b8266]" />
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-neutral-900">
                          {appTransformations[activeApp].target}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#3d6148] bg-[#edf5ef] px-2.5 py-0.5 rounded-full font-bold border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                        Polished in {appTransformations[activeApp].latency}
                      </span>
                    </div>

                    <div className="text-[14px] leading-relaxed text-neutral-800 font-sans font-normal py-1 whitespace-pre-line">
                      {appTransformations[activeApp].polished}
                    </div>
                  </div>

                  {/* Mock Composer Action Toolbar */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      {appTransformations[activeApp].toolbarType === 'slack' && (
                        <>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] font-bold">B</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] italic font-serif">I</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px]">🔗</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px]">😀</button>
                        </>
                      )}
                      {appTransformations[activeApp].toolbarType === 'claude' && (
                        <>
                          <span className="text-[11px] font-mono bg-[#f3e8ff] text-neutral-900 px-2 py-0.5 rounded border border-black/20 font-bold">Markdown Mode</span>
                          <span className="text-[11px] font-mono text-neutral-500">42 tokens</span>
                        </>
                      )}
                      {appTransformations[activeApp].toolbarType === 'gmail' && (
                        <>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] font-bold">B</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] italic font-serif">I</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px]">📎</button>
                          <span className="text-[11px] text-neutral-500 font-medium">To: Marcus Chen</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyText(appTransformations[activeApp].polished)}
                      className="px-4 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-neutral-900 border-2 border-black text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-[2px_2px_0px_#000000]"
                    >
                      {copied ? <Check size={12} className="text-[#5b8266]" /> : <Copy size={12} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </motion.div>

              </div>

            </div>

          </div>
        </section>

        {/* ==========================================================================
                5. LIVE INTERACTIVE VOICE STUDIO ("Speak Naturally, Write Perfectly")
               ========================================================================== */}
        <section id="live-studio" className="relative px-6 sm:px-12 py-20 bg-[#fbfbf9] border-t border-black/[0.04]">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3e8ff] border-2 border-black text-[12px] font-bold text-neutral-900 tracking-wide mb-3 shadow-[2px_2px_0px_#000000]">
              <Sparkles size={13} className="text-[#3d6148]" />
              <span>Noska Speech-to-Text Interactive Studio</span>
            </div>
            <h2 className="text-[36px] sm:text-[48px] font-extrabold tracking-tight text-neutral-900 leading-tight">
              Speak Naturally. Write Perfectly.
            </h2>
            <p className="text-[15px] sm:text-[16.5px] text-neutral-600 max-w-xl mx-auto mt-3 font-normal leading-relaxed">
              No need to say "period" or edit hesitation. Noska Voice understands your natural cadence, strips vocal fillers, executes hands-free Voice Rewind, and delivers clean, ready-to-share writing.
            </p>

            {/* Preset Scenario Tabs */}
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              {studioPresets.map((preset, idx) => (
                <button
                  key={preset.title}
                  onClick={() => setActivePromptIndex(idx)}
                  className={`px-4 py-1.5 rounded-full text-[12.5px] transition-all cursor-pointer ${activePromptIndex === idx
                    ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black shadow-[2px_2px_0px_#000000] font-bold scale-105'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-black/10 font-medium'
                    }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-full border-2 border-black/15 shadow-xs mt-4">
              <button
                onClick={() => setStudioMode('raw')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] transition cursor-pointer ${studioMode === 'raw' ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] font-bold' : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
              >
                Raw Spoken Audio
              </button>
              <button
                onClick={() => setStudioMode('polished')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] transition cursor-pointer flex items-center gap-1.5 ${studioMode === 'polished' ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] font-bold' : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
              >
                <Sparkles size={11} className="text-[#9333ea]" />
                <span>Noska Voice Polished</span>
              </button>
              <button
                onClick={() => setStudioMode('code')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] transition cursor-pointer ${studioMode === 'code' ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black shadow-[1.5px_1.5px_0px_#000000] font-bold' : 'text-neutral-600 hover:text-neutral-900 font-medium'
                  }`}
              >
                Code / Markdown
              </button>
            </div>
          </div>

          {/* Interactive Output Showcase / Live Mic Console */}
          {isRecording ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto bg-white text-neutral-900 rounded-3xl p-6 sm:p-8 border-2 border-black shadow-[4px_4px_0px_#000000] text-left"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[12.5px] font-bold uppercase tracking-wider text-red-600">
                    Live Microphone Active
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 h-3 px-1">
                    {[40, 90, 60, 100, 70, 30, 80].map((h, i) => (
                      <motion.span
                        key={i}
                        animate={{ height: ['4px', `${h * 0.18}px`, '4px'] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                        className="w-[3px] bg-[#9333ea] rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-mono text-[#1e3325] font-bold bg-[#f3e8ff] px-2.5 py-0.5 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                    {liveWpm} WPM
                  </span>
                </div>
              </div>

              {/* Live Streaming Speech Transcript */}
              <div className="min-h-[110px] p-4 rounded-2xl bg-[#faf8fd] border-2 border-black/15 font-mono text-[14px] leading-relaxed text-neutral-900">
                {transcriptionText || (
                  <span className="text-neutral-500 italic">
                    Listening to your microphone... speak naturally now (e.g. "so um basically we need to ship the update by Friday")
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-black/10 flex-wrap gap-3">
                <span className="text-[11.5px] text-neutral-600 font-medium">
                  Real-time audio processing via Web Speech & Local Whisper engine
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (transcriptionText.trim()) {
                        // Polish raw transcript
                        const cleaned = transcriptionText
                          .replace(/\b(um|uh|you know|basically|like)\b/gi, '')
                          .replace(/\s+/g, ' ')
                          .trim();
                        setTranscriptionText(`### Noska Speech-to-Text Result\n• ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}.`);
                      }
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-neutral-950 border-2 border-black text-[12px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000]"
                  >
                    <Sparkles size={12} className="text-[#9333ea]" />
                    <span>Polish with AI</span>
                  </button>
                  <button
                    onClick={() => setIsRecording(false)}
                    className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border-2 border-black/20 text-[12px] font-semibold transition cursor-pointer"
                  >
                    Stop Recording
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`${studioMode}-${activePromptIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.05)] text-left"
            >
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${studioMode === 'polished' ? 'bg-[#9333ea]' : studioMode === 'code' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-800">
                    {studioMode === 'polished'
                      ? 'Structured Markdown Synthesis'
                      : studioMode === 'code'
                        ? 'TypeScript Code Generation'
                        : 'Verbatim Spoken Transcript'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono text-[#3d6148] bg-[#edf5ef] px-2.5 py-0.5 rounded-md font-semibold border border-[#5b8266]/20">
                    ⚡ 0.18s • On-Device Whisper
                  </span>
                  <button
                    onClick={() => handleCopyText(studioPresets[activePromptIndex][studioMode])}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition cursor-pointer flex items-center gap-1.5 text-[12px] font-medium"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-[#9333ea]" /> : <Copy size={14} />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="font-mono text-[13.5px] sm:text-[14px] leading-relaxed text-neutral-800 whitespace-pre-line bg-[#faf9f5] p-5 rounded-2xl border border-black/[0.04] shadow-inner">
                {studioPresets[activePromptIndex][studioMode]}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 text-[12px] text-neutral-500 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#9333ea] shrink-0" />
                  {studioMode === 'polished'
                    ? 'Punctuation, bullet points & grammar formatted automatically'
                    : studioMode === 'code'
                      ? 'Synthesizes code blocks directly from voice commands'
                      : 'Contains vocal fillers and repeated syllables'}
                </span>
                <button
                  onClick={() => setIsRecording(true)}
                  className="text-neutral-900 font-semibold hover:text-[#7c3aed] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Mic size={13} className="text-red-500" />
                  <span>Test your live microphone</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* ==========================================================================
                6. "WHY FLOW?" INTERACTIVE BENTO GRID SHOWCASE
                Features: Autonomous Agent Mode, Real-Time Voice Translate, Adaptive Tone & Voice Rewind
               ========================================================================== */}
        <section id="why-us" className="relative px-4 sm:px-8 md:px-12 py-20 bg-gradient-to-b from-white via-[#faf8fd] to-white border-t border-black/[0.03]">

          <div className="max-w-7xl mx-auto">

            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f3e8ff] border-2 border-black text-[12px] font-bold text-neutral-900 shadow-[2px_2px_0px_#000000] mb-3.5 hover:shadow-[3px_3px_0px_#000000] transition-shadow cursor-default">
                  <Sparkles size={13} className="text-[#3d6148]" />
                  <span>Next-Gen Voice Intelligence</span>
                </div>
                <h2 className="text-[38px] sm:text-[54px] font-extrabold tracking-tight text-neutral-900 leading-[1.05]">
                  Why Flow?
                </h2>
                <p className="text-[15px] sm:text-[16.5px] text-neutral-600 mt-3 font-normal leading-relaxed">
                  Flow merges autonomous voice-to-action agent workflows, real-time multilingual translation, adaptive tone calibration, and zero-latency desktop injection.
                </p>
              </div>

              {/* Framer Steps Component Header Navigation */}
              <div className="relative flex items-center justify-between gap-3">
                {/* Horizontal Baseline Axis Connector Line */}
                <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-purple-200 -translate-y-1/2 z-0 hidden sm:block pointer-events-none" />

                {/* Numbered Step Buttons (01, 02, 03, 04) */}
                <div className="relative z-10 flex items-center gap-2 sm:gap-3 flex-wrap">
                  {[
                    { id: 'agent', num: '01', title: 'Agent Mode', icon: Bot },
                    { id: 'translate', num: '02', title: 'Translate', icon: Globe },
                    { id: 'tone', num: '03', title: 'Tone Engine', icon: SlidersHorizontal },
                    { id: 'rewind', num: '04', title: 'Voice Rewind', icon: RotateCcw }
                  ].map((step) => {
                    const StepIcon = step.icon;
                    const isActive = bentoTab === step.id;
                    return (
                      <button
                        key={step.id}
                        onClick={() => {
                          setBentoTab(step.id as any);
                          if (step.id === 'agent') handleRunAgentCommand(activeAgentCommand);
                        }}
                        className={`group relative h-[45px] px-4 sm:px-5 rounded-[18px] text-[13px] font-medium transition-all duration-300 cursor-pointer flex items-center gap-2.5 select-none ${
                          isActive
                            ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black shadow-[2px_2px_0px_#000000] font-bold'
                            : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-black/[0.08] hover:border-black/20 shadow-xs'
                        }`}
                      >
                        {/* Step Number */}
                        <span
                          className={`font-mono text-[12.5px] font-semibold ${
                            isActive ? 'text-[#3d6148]' : 'text-neutral-500 group-hover:text-neutral-900'
                          }`}
                        >
                          {step.num}
                        </span>

                        <span className={`w-1 h-3 rounded-full ${isActive ? 'bg-[#5b8266]/40' : 'bg-black/10'}`} />

                        {/* Step Icon & Title */}
                        <div className="flex items-center gap-1.5">
                          <StepIcon
                            size={14}
                            className={isActive ? 'text-[#3d6148]' : 'text-neutral-600'}
                          />
                          <span className={`font-semibold text-[13px] ${isActive ? 'text-neutral-950' : 'text-neutral-800'}`}>
                            {step.title}
                          </span>
                        </div>
                        {isActive && (
                          <motion.span
                            layoutId="activeStepDot"
                            className="w-2 h-2 rounded-full bg-[#5b8266] animate-pulse ml-0.5"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dynamic Animated Bento Grid Content (Framer Steps Format) */}
            <AnimatePresence mode="wait">
              {bentoTab === 'agent' ? (
                /* ==========================================================================
                   STEP 01: IN-APP NOSKA VOICE CONTROL AGENT
                   ========================================================================== */
                <motion.div
                  key="step-agent"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch"
                >
                  {/* CARD 1 (Col 1-7): Interactive In-App Voice Controller */}
                  <div className="md:col-span-7 bg-white text-neutral-900 rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between relative overflow-hidden">
                    <div>
                      <div className="flex items-center justify-between mb-3.5 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                            <Bot size={16} className="text-[#3d6148]" />
                          </div>
                          <div>
                            <div className="text-[16px] font-bold text-neutral-900 flex items-center gap-2">
                              Noska In-App Voice Agent
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#f3e8ff] text-neutral-900 border border-black font-bold">Step 01</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-900 bg-[#f3e8ff] px-2.5 py-1 rounded-full border border-black flex items-center gap-1.5 font-bold shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266] animate-pulse" />
                          Voice Armed
                        </span>
                      </div>

                      <p className="text-[12.5px] text-neutral-600 mb-4 leading-relaxed font-normal">
                        Control the entire Noska App using only your voice. Speak commands naturally to open notifications, switch themes, search notes, create canvases, and trigger actions.
                      </p>

                      {/* Tool Selector Buttons */}
                      <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
                        {agentCommands.map((cmd, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleRunAgentCommand(idx)}
                            className={`px-3 py-1.5 rounded-xl text-[11.5px] transition cursor-pointer flex items-center gap-1.5 ${
                              activeAgentCommand === idx
                                ? 'bg-neutral-900 text-white border-2 border-black font-bold shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-black/10 font-medium'
                            }`}
                          >
                            <span>{cmd.title}</span>
                          </button>
                        ))}
                      </div>

                      {/* Terminal Console */}
                      <div className="bg-[#faf8fd] rounded-2xl p-4 sm:p-5 border-2 border-black/10 space-y-3 font-mono text-[12px] shadow-inner text-neutral-900">
                        <div className="flex items-center justify-between text-[10.5px] text-neutral-500">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Mic size={11} className="text-[#3d6148]" />
                            SPOKEN IN-APP COMMAND
                          </span>
                          <span className="text-[#3d6148] font-bold">{agentCommands[activeAgentCommand].category}</span>
                        </div>

                        <div className="text-neutral-900 text-[13px] font-sans font-bold">
                          {agentCommands[activeAgentCommand].voiceInput}
                        </div>

                        <div className="p-3 rounded-xl bg-[#edf5ef] border border-[#5b8266]/20 text-[#1e3325] overflow-x-auto font-semibold">
                          <code>&gt; {agentCommands[activeAgentCommand].toolCall}</code>
                        </div>

                        {/* Step State */}
                        <div className="flex items-center justify-between pt-1 border-t border-black/5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${agentRunning ? 'bg-amber-500 animate-ping' : 'bg-[#5b8266]'}`} />
                            <span className="text-[12px] text-neutral-800 font-medium">
                              {agentRunning
                                ? agentStep === 0
                                ? "Parsing spoken in-app intent..."
                                : "Executing native Noska UI action..."
                                : agentCommands[activeAgentCommand].result}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRunAgentCommand(activeAgentCommand)}
                            className="px-4 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-neutral-900 border-2 border-black shadow-[2px_2px_0px_#000000] text-[11px] font-bold transition cursor-pointer active:scale-95"
                          >
                            {agentRunning ? "Executing..." : "Simulate Voice"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500">
                      <span>Native In-App Dispatcher</span>
                      <span className="text-[#3d6148] font-bold flex items-center gap-1">
                        <Zap size={11} /> 0.04s Execution Speed
                      </span>
                    </div>
                  </div>

                  {/* CARD 2 (Col 8-12): In-App Voice Action Architecture */}
                  <div className="md:col-span-5 bg-[#faf8fd] rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                            <Layers size={16} className="text-[#3d6148]" />
                          </div>
                          <span className="text-[16px] font-bold text-neutral-900">In-App Voice Architecture</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-neutral-900 border border-black font-mono">
                          Native
                        </span>
                      </div>

                      <p className="text-[12.5px] text-neutral-600 mb-4 leading-relaxed font-normal">
                        How Noska translates natural spoken requests into direct in-app UI and state modifications:
                      </p>

                      {/* Architecture Steps */}
                      <div className="space-y-2.5">
                        <div className="p-3 rounded-2xl bg-white border border-black/[0.08] flex items-center gap-3 shadow-xs">
                          <div className="w-6 h-6 rounded-full bg-[#edf5ef] text-[#3d6148] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#5b8266]/30">1</div>
                          <div>
                            <div className="text-[12px] font-bold text-neutral-900">Spoken Voice Trigger</div>
                            <div className="text-[11px] text-neutral-500">"Open notifications", "Search notes"</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-black/[0.08] flex items-center gap-3 shadow-xs">
                          <div className="w-6 h-6 rounded-full bg-[#edf5ef] text-[#3d6148] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#5b8266]/30">2</div>
                          <div>
                            <div className="text-[12px] font-bold text-neutral-900">On-Device Semantic Parser</div>
                            <div className="text-[11px] text-neutral-500">Extracts target panel, filter, or query</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-black/[0.08] flex items-center gap-3 shadow-xs">
                          <div className="w-6 h-6 rounded-full bg-[#edf5ef] text-[#3d6148] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#5b8266]/30">3</div>
                          <div>
                            <div className="text-[12px] font-bold text-neutral-900">Direct UI State Dispatcher</div>
                            <div className="text-[11px] text-neutral-500">Triggers modal, drawer, or canvas view</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white border border-black/[0.08] flex items-center gap-3 shadow-xs">
                          <div className="w-6 h-6 rounded-full bg-[#edf5ef] text-[#3d6148] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#5b8266]/30">4</div>
                          <div>
                            <div className="text-[12px] font-bold text-neutral-900">Instant Execution Feedback</div>
                            <div className="text-[11px] text-neutral-500">Immediate screen update with 0ms latency</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                      <span>Zero Cloud Latency</span>
                      <span className="text-[#3d6148] font-bold">✓ 100% Local Execution</span>
                    </div>
                  </div>

                  {/* CARD 3 (Col 1-4): Hands-Free App Navigation */}
                  <div className="md:col-span-4 bg-[#faf8fd] rounded-[32px] p-6 border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col justify-between hover:translate-y-[-1px] transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border border-black">
                          <Layout size={14} className="text-[#3d6148]" />
                        </div>
                        <span className="text-[15px] font-bold text-neutral-900">Hands-Free Navigation</span>
                      </div>
                      <p className="text-[12px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Jump between canvases, open split screen views, or summon the search bar with simple voice prompts.
                      </p>
                      <div className="bg-white p-3.5 rounded-2xl border border-black/[0.08] text-[11.5px] space-y-1.5 font-mono shadow-xs">
                        <div className="text-neutral-500">“Split screen with API docs”</div>
                        <div className="text-[#3d6148] font-bold">1. `noska.layout.split("right")`</div>
                        <div className="text-neutral-700 font-bold">2. `noska.docs.load("/api")`</div>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-black/[0.06] text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Instant UI Layout Switch</span>
                      <span className="text-neutral-900 font-bold">0 Mouse Clicks</span>
                    </div>
                  </div>

                  {/* CARD 4 (Col 5-8): Voice Safety & Confirmation */}
                  <div className="md:col-span-4 bg-[#faf8fd] rounded-[32px] p-6 border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col justify-between hover:translate-y-[-1px] transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border border-black">
                          <Shield size={14} className="text-[#3d6148]" />
                        </div>
                        <span className="text-[15px] font-bold text-neutral-900">Safety & Confirmation</span>
                      </div>
                      <p className="text-[12px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Critical actions like deleting canvases or archiving workspaces require explicit voice confirmation.
                      </p>
                      <div className="bg-white p-3 rounded-2xl border border-black/[0.08] flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5b8266]" />
                          <span className="text-[12px] font-bold text-neutral-900">Confirmation Guard</span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-900 bg-[#f3e8ff] px-2 py-0.5 rounded-md font-bold border border-black">Active</span>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-black/[0.06] text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>100% On-Device Privacy</span>
                      <span className="text-[#3d6148] font-bold">✓ Zero Cloud Leak</span>
                    </div>
                  </div>

                  {/* CARD 5 (Col 9-12): Canvas Voice Actions */}
                  <div className="md:col-span-4 bg-[#faf8fd] rounded-[32px] p-6 border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col justify-between hover:translate-y-[-1px] transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border border-black">
                          <FolderPlus size={14} className="text-[#3d6148]" />
                        </div>
                        <span className="text-[15px] font-bold text-neutral-900">Instant Canvas Actions</span>
                      </div>
                      <p className="text-[12px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Create new infinite boards, add sticky notes, or export high-resolution assets directly via speech.
                      </p>
                      <div className="bg-white p-3 rounded-2xl border border-black/[0.08] font-mono text-[11.5px] text-[#1e3325] shadow-xs font-semibold">
                        <code>noska.canvas.export(&#123; format: "pdf" &#125;)</code>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-black/[0.06] text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Workflow Speed</span>
                      <span className="text-[#3d6148] font-bold">4x Faster</span>
                    </div>
                  </div>
                </motion.div>
              ) : bentoTab === 'translate' ? (
                /* ==========================================================================
                   STEP 02: DEDICATED REAL-TIME VOICE TRANSLATION SUITE
                   ========================================================================== */
                <motion.div
                  key="step-translate"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch"
                >
                  {/* Translate Card 1: Live Dialect Stream */}
                  <div className="md:col-span-7 bg-[#faf8fd] rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                            <Globe size={16} className="text-[#3d6148]" />
                          </div>
                          <span className="text-[16px] font-bold text-neutral-900">Real-Time Dialect Translation</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-neutral-900 font-mono border border-black">
                          Step 02 • 100+ Dialects
                        </span>
                      </div>

                      <p className="text-[12.5px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Speak naturally in Hinglish, Spanish, or Japanese. Noska translates and formats fluent, polished English in real time.
                      </p>

                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        {(['hinglish', 'spanish', 'japanese', 'german'] as const).map((langKey) => (
                          <button
                            key={langKey}
                            onClick={() => setActiveTranslateLang(langKey)}
                            className={`px-3 py-1.5 rounded-xl text-[11.5px] transition cursor-pointer flex items-center gap-1.5 ${
                              activeTranslateLang === langKey
                                ? 'bg-[#f3e8ff] text-neutral-950 border-2 border-black font-bold shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-black/10'
                            }`}
                          >
                            <span>{translatePresets[langKey].flag}</span>
                            <span>{translatePresets[langKey].lang}</span>
                          </button>
                        ))}
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] space-y-2 text-[12px] shadow-xs">
                        <div className="text-neutral-500 font-mono text-[11px] flex items-center justify-between">
                          <span>SPOKEN ({translatePresets[activeTranslateLang].detected})</span>
                          <span className="text-[#3d6148] font-bold">Detected</span>
                        </div>
                        <p className="text-neutral-700 italic font-mono text-[12px]">
                          {translatePresets[activeTranslateLang].spoken}
                        </p>
                        <div className="pt-2 border-t border-black/5">
                          <div className="text-[#3d6148] font-mono text-[11px] font-bold mb-0.5 flex items-center justify-between">
                            <span>TRANSLATED PROSE</span>
                            <span className="text-neutral-400 font-normal">{translatePresets[activeTranslateLang].latency}</span>
                          </div>
                          <p className="text-neutral-900 font-medium text-[13px]">
                            {translatePresets[activeTranslateLang].translated}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] text-[11.5px] text-neutral-500 flex items-center justify-between">
                      <span>Zero latency translation pipeline</span>
                      <span className="text-[#3d6148] font-bold">✓ Sub-200ms latency</span>
                    </div>
                  </div>

                  {/* Translate Card 2: Dialect Coverage */}
                  <div className="md:col-span-5 bg-white text-neutral-900 rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Languages size={16} className="text-[#3d6148]" />
                        <span className="text-[16px] font-bold text-neutral-900">Supported Dialects</span>
                      </div>
                      <p className="text-[12.5px] text-neutral-600 mb-4 leading-relaxed font-normal">
                        Pre-trained phonetic models support code-switching, colloquial idioms, and regional inflections.
                      </p>

                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-[#faf8fd] border border-black/10 text-[11.5px] flex items-center justify-between font-medium">
                          <span>🇮🇳 Hindi & Hinglish</span>
                          <span className="text-[#3d6148] font-mono font-bold">0.19s</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#faf8fd] border border-black/10 text-[11.5px] flex items-center justify-between font-medium">
                          <span>🇪🇸 Spanish & Castilian</span>
                          <span className="text-[#3d6148] font-mono font-bold">0.17s</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#faf8fd] border border-black/10 text-[11.5px] flex items-center justify-between font-medium">
                          <span>🇯🇵 Japanese & Nihongo</span>
                          <span className="text-[#3d6148] font-mono font-bold">0.22s</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#faf8fd] border border-black/10 text-[11.5px] flex items-center justify-between font-medium">
                          <span>🇩🇪 German & Austrian</span>
                          <span className="text-[#3d6148] font-mono font-bold">0.18s</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/10 text-[11px] text-neutral-600 flex items-center justify-between">
                      <span>Full Multilingual Support</span>
                      <span className="text-neutral-900 font-bold">100+ Accents</span>
                    </div>
                  </div>
                </motion.div>
              ) : bentoTab === 'tone' ? (
                /* ==========================================================================
                   STEP 03: DEDICATED TONE MATCHING SUITE
                   ========================================================================== */
                <motion.div
                  key="step-tone"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch"
                >
                  {/* Tone Card 1 */}
                  <div className="md:col-span-7 bg-[#faf8fd] rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                            <SlidersHorizontal size={16} className="text-[#3d6148]" />
                          </div>
                          <span className="text-[16px] font-bold text-neutral-900">Adaptive Tone Calibration</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-neutral-900 font-mono border border-black">
                          Step 03 • App-Specific
                        </span>
                      </div>

                      <p className="text-[12.5px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Speak once. Noska formats formality, structure, and diction to match your recipient whether in Slack, Gmail, or Notion.
                      </p>

                      {/* Improved Tone Selector Buttons with Lucide Icons */}
                      <div className="grid grid-cols-4 gap-1 mb-3 bg-white p-1 rounded-xl border border-black/10 w-full">
                        {[
                          { id: 'formal', label: 'Formal', icon: Briefcase },
                          { id: 'casual', label: 'Casual', icon: MessageSquare },
                          { id: 'executive', label: 'Executive', icon: Crown },
                          { id: 'technical', label: 'Technical', icon: Terminal }
                        ].map((t) => {
                          const Icon = t.icon;
                          const isActive = activeTone === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setActiveTone(t.id as any)}
                              className={`w-full py-2 px-1 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-center relative select-none ${
                                isActive
                                  ? 'bg-neutral-900 text-white shadow-[1.5px_1.5px_0px_#000000] border border-black font-bold'
                                  : 'bg-transparent hover:bg-neutral-100 text-neutral-600 hover:text-neutral-950 font-medium'
                              }`}
                            >
                              <Icon size={13} className={`shrink-0 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                              <span className="truncate">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <motion.div
                        key={activeTone}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-2xl p-4 border border-black/[0.08] min-h-[90px] flex items-center shadow-xs"
                      >
                        <p className="text-[13px] text-neutral-900 leading-relaxed font-medium">
                          {tonePresets[activeTone]}
                        </p>
                      </motion.div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] text-[11.5px] text-neutral-500 flex items-center justify-between">
                      <span>Matches Slack, Gmail & Notion style</span>
                      <span className="text-[#3d6148] font-bold">✓ Auto-calibrated</span>
                    </div>
                  </div>

                  {/* Tone Card 2: Personal Dictionary */}
                  <div className="md:col-span-5 bg-white text-neutral-900 rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={16} className="text-[#3d6148]" />
                        <span className="text-[16px] font-bold text-neutral-900">Personal Vocabulary Engine</span>
                      </div>
                      <p className="text-[12.5px] text-neutral-600 mb-4 leading-relaxed font-normal">
                        Never misspells teammate names, internal code repositories, or uncommon industry terminology.
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {customWords.map((w, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#f3e8ff] border border-black/20 text-[11.5px] font-mono text-neutral-900 font-bold shadow-2xs">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/10 text-[11px] text-neutral-600 flex items-center justify-between">
                      <span>Instant Phonetic Binding</span>
                      <span className="text-neutral-900 font-bold">100% Accuracy</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ==========================================================================
                   STEP 04: DEDICATED VOICE REWIND & SELF-CORRECTION SUITE
                   ========================================================================== */
                <motion.div
                  key="step-rewind"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch"
                >
                  {/* Rewind Card 1: Interactive Rewind Simulator */}
                  <div className="md:col-span-7 bg-[#faf8fd] rounded-[32px] p-6 sm:p-7 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                            <RotateCcw size={16} className="text-[#3d6148]" />
                          </div>
                          <span className="text-[16px] font-bold text-neutral-900">Voice Rewind</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-neutral-900 font-mono border border-black">
                          Step 04 • "Scratch That"
                        </span>
                      </div>

                      <p className="text-[12.5px] text-neutral-600 mb-3.5 leading-relaxed font-normal">
                        Change your mind mid-sentence? Say <em>"scratch that"</em> and Noska automatically deletes & rewrites the phrase in-place.
                      </p>

                      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] min-h-[95px] flex flex-col justify-between shadow-xs">
                        <div className="text-[13px] text-neutral-800 leading-relaxed">
                          {isRewindActive ? (
                            <div>
                              <span className="text-neutral-400 line-through decoration-red-400">Release on Friday afternoon</span>{' '}
                              <span className="text-[#1e3325] font-bold bg-[#f3e8ff] border border-black/20 px-1.5 py-0.5 rounded">make it Tuesday morning at 10 AM.</span>
                            </div>
                          ) : (
                            <div>Let's schedule the release on Friday afternoon...</div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={() => setIsRewindActive(prev => !prev)}
                            className="px-4 py-1.5 rounded-full text-[11.5px] font-bold bg-[#f3e8ff] text-neutral-900 border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] transition cursor-pointer active:scale-95"
                          >
                            {isRewindActive ? "Reset Simulation" : "Simulate 'Scratch That'"}
                          </button>
                          <span className="text-[11px] text-[#3d6148] font-mono font-bold">
                            {isRewindActive ? "✓ Deleted & replaced in-place" : "Waiting for voice trigger"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] text-[11.5px] text-neutral-500 flex items-center justify-between">
                      <span>Hands-free voice self-correction</span>
                      <span className="text-neutral-900 font-bold">Zero backspaces</span>
                    </div>
                  </div>

                  {/* Rewind Card 2: Universal Desktop Layer */}
                  <div className="md:col-span-5 bg-white text-neutral-900 rounded-[32px] p-6 border-2 border-black shadow-[3px_3px_0px_#000000] flex flex-col justify-between relative overflow-hidden">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-neutral-900 flex items-center justify-center border border-black">
                            <Monitor size={14} className="text-[#3d6148]" />
                          </div>
                          <span className="text-[14.5px] font-bold text-neutral-900">Universal Desktop Layer</span>
                        </div>
                        <kbd className="text-[10px] bg-[#f3e8ff] px-2 py-0.5 rounded font-mono text-neutral-900 border border-black font-bold">
                          Ctrl+Shift+Space
                        </kbd>
                      </div>

                      <p className="text-[12px] text-neutral-600 mb-3 leading-relaxed font-normal">
                        Types wherever your cursor blinks across macOS & Windows.
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium text-neutral-800">
                        <div className="bg-[#faf8fd] p-2 rounded-lg flex items-center gap-1.5 border border-black/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266]" />
                          Slack & Discord
                        </div>
                        <div className="bg-[#faf8fd] p-2 rounded-lg flex items-center gap-1.5 border border-black/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266]" />
                          Cursor & VS Code
                        </div>
                        <div className="bg-[#faf8fd] p-2 rounded-lg flex items-center gap-1.5 border border-black/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266]" />
                          Notion & Docs
                        </div>
                        <div className="bg-[#faf8fd] p-2 rounded-lg flex items-center gap-1.5 border border-black/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266]" />
                          Gmail & Chrome
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-black/10 text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Native OS Accessibility API</span>
                      <span className="text-neutral-900 font-bold">100% Native</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

        {/* ==========================================================================
                7. "HOW IT WORKS" — REAL-WORLD NOSKA FLOW STEPS (Pastel Lilac & Lavender Pin Flow)
               ========================================================================== */}
        <section id="how-it-works" className="relative bg-[#faf8fd] text-neutral-900 pt-24 pb-12 border-t border-black/[0.04] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
            {/* Section Header with Pastel Lilac Pill Badge */}
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f3e8ff] border-2 border-black text-[12px] font-bold text-neutral-900 shadow-[2px_2px_0px_#000000] mb-3.5 hover:shadow-[3px_3px_0px_#000000] transition-shadow cursor-default">
                <Workflow size={13} className="text-neutral-900" />
                <span>Real-World Desktop Workflow</span>
              </div>
              <h2 className="text-[38px] sm:text-[54px] font-extrabold tracking-tight text-neutral-900 leading-[1.08] font-sans">
                How to use Flow in <em className="italic font-serif font-light text-[#5b8266]">real life.</em>
              </h2>
              <p className="text-[15px] sm:text-[16.5px] text-neutral-600 mt-3.5 font-normal leading-relaxed">
                From raw vocal stream to zero-latency cursor typing and background MCP tool executions across your daily toolstack.
              </p>
            </div>

            {/* Interactive Pastel Pinned-Card Scrolling Canvas */}
            <HowItWorks
              features={[
                {
                  title: "Global Shortcut Summon",
                  description: "Hit Ctrl+Shift+Space anywhere. Noska's floating voice HUD glides into view directly over your active workspace without stealing focus.",
                  colorTheme: "purple",
                },
                {
                  title: "Speak Naturally at 220 WPM",
                  description: "Speak raw stream-of-consciousness thoughts, code snippets, or Hinglish at 220+ WPM with zero typing overhead.",
                  colorTheme: "blue",
                },
                {
                  title: "On-Device Whisper Intelligence",
                  description: "Local Whisper v3 and on-device neural engine instantly strip vocal fillers ('um', 'uh') and calibrate tone in 0.18s.",
                  colorTheme: "orange",
                },
                {
                  title: "Direct Cursor Injection & MCP",
                  description: "Your polished words type right where your cursor blinks, while MCP tools trigger actions in Linear, GitHub, and Slack.",
                  colorTheme: "purple",
                },
                {
                  title: "100% Private On-Device Execution",
                  description: "Zero audio packets leave your machine. Experience pure local inference with sub-second execution speed.",
                  colorTheme: "blue",
                },
              ]}
              className="bg-transparent py-4 md:py-8"
            />
          </div>
        </section>

        {/* ==========================================================================
                8. FRAMER FEATURE SECTION ("WORKFLOWS THAT STAY IN MOTION")
                Exact Parity with framer.com/m/feature-section-fiqG0T.js@St9XDFnEWd046Gm5Ktoh
                Integrated with AnimatedSVGUnderlink
               ========================================================================== */}
        <section id="feature-section" className="relative px-4 sm:px-8 md:px-12 py-24 bg-[#faf9f5] border-t border-black/[0.04]">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center">

            {/* Header: [FEATURES] Badge with left & right gradient lines */}
            <div className="flex flex-col items-center text-center mb-16 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-4">
                {/* Left Line SVG with Pin */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 266 7" className="w-[100px] sm:w-[220px] md:w-[266px] h-[7px]">
                  <g>
                    <g transform="translate(259 0)">
                      <circle cx="3.5" cy="3.5" r="3" fill="#ffffff" stroke="#acacac" strokeWidth="1" />
                    </g>
                    <defs>
                      <linearGradient id="fs-line-left" x1="0" x2="1" y1="0.5" y2="0.5">
                        <stop offset="0" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
                        <stop offset="1" stopColor="#acacac" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="2.5" width="259" height="2" fill="url(#fs-line-left)" />
                  </g>
                </svg>

                {/* Central Monospace FEATURES Badge */}
                <div className="bg-white rounded-[6px] px-2.5 py-1 shadow-[0px_1px_2px_rgba(0,0,0,0.18)] border border-black/[0.04]">
                  <span className="font-mono text-[11px] font-semibold text-neutral-600 tracking-wider uppercase">
                    FEATURES
                  </span>
                </div>

                {/* Right Line SVG with Pin */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 266 7" className="w-[100px] sm:w-[220px] md:w-[266px] h-[7px]">
                  <g>
                    <g transform="translate(0 0)">
                      <circle cx="3.5" cy="3.5" r="3" fill="#ffffff" stroke="#acacac" strokeWidth="1" />
                    </g>
                    <defs>
                      <linearGradient id="fs-line-right" x1="0" x2="1" y1="0.5" y2="0.5">
                        <stop offset="0" stopColor="#acacac" stopOpacity="1" />
                        <stop offset="1" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <rect x="7" y="2.5" width="259" height="2" fill="url(#fs-line-right)" />
                  </g>
                </svg>
              </div>

              {/* Title with AnimatedSVGUnderlink */}
              <h2 className="text-[34px] sm:text-[52px] font-[500] tracking-tight text-neutral-900 leading-[1.1] font-sans">
                Workflows That Stay{' '}
                <AnimatedSVGUnderline text="in Motion" underlineColor="#5b8266" />
              </h2>

              <p className="text-[15px] sm:text-[17px] text-neutral-500 font-[500] mt-3 font-sans max-w-xl">
                From creation to collaboration to delivery — without breaking context.
              </p>
            </div>

            {/* 3-Card Grid (Speech to Text, Translate, Agent Mode) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

              {/* CARD 1: SPEECH TO TEXT */}
              <div className="group bg-white rounded-[24px] p-6 border border-black/[0.08] shadow-[0px_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                <div>
                  <div className="text-[13px] font-[500] text-neutral-400 mb-3 font-sans flex items-center justify-between">
                    <span>Speech to Text</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      0.2s Latency
                    </span>
                  </div>

                  {/* Illustrator Preview: Voice to Text Engine & Connected Apps */}
                  <div className="h-[220px] rounded-[18px] bg-[#faf9f0]/70 border border-black/[0.05] p-3.5 relative overflow-hidden flex flex-col items-center justify-center mb-6">
                    {/* Orbiting Satellite Dashed Ring */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="w-[180px] h-[180px] rounded-full border border-dashed border-neutral-300/80"
                      />
                    </div>

                    {/* Central Flow Voice Hub with Waveform */}
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="relative z-20 w-14 h-14 rounded-2xl bg-white text-neutral-900 flex flex-col items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.08)] border-2 border-black cursor-pointer mb-2"
                    >
                      <Mic size={18} className="text-[#16241b]" />
                      <span className="text-[8.5px] font-mono font-bold tracking-widest text-[#2d4d36] mt-0.5">FLOW</span>
                    </motion.div>

                    {/* 4 Connected Satellite App Chips */}
                    <div className="grid grid-cols-4 gap-1.5 w-full relative z-10 mt-1">
                      {[
                        { name: 'VS Code', tag: 'IDE', bg: 'bg-[#f0f7ff]', text: 'text-[#0369a1]', border: 'border-[#bae6fd]' },
                        { name: 'Slack', tag: 'Chat', bg: 'bg-[#edf5ef]', text: 'text-[#2d4d36]', border: 'border-[#5b8266]/30' },
                        { name: 'Linear', tag: 'Issues', bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]', border: 'border-[#fed7aa]' },
                        { name: 'Notion', tag: 'Docs', bg: 'bg-[#fefce8]', text: 'text-[#854d0e]', border: 'border-[#fef08a]' }
                      ].map((item, idx) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * idx, duration: 0.3 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          className={`p-1.5 rounded-xl border text-center ${item.bg} ${item.border} shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer transition-transform`}
                        >
                          <div className={`text-[10.5px] font-bold leading-tight ${item.text}`}>{item.name}</div>
                          <div className={`text-[8px] font-mono opacity-75 ${item.text}`}>{item.tag}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card 1 Text Content */}
                <div className="text-center pt-1">
                  <h3 className="text-[20px] font-[500] text-neutral-900 font-sans tracking-tight">
                    Speech to Text Engine
                  </h3>

                  {/* Subtle Divider */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 2" className="w-[158px] h-[2px] mx-auto my-2.5">
                    <defs>
                      <linearGradient id="card1-div" x1="0" x2="1" y1="0.5" y2="0.5">
                        <stop offset="0" stopColor="rgba(255, 255, 255, 0)" />
                        <stop offset="0.5" stopColor="#d8d8d8" />
                        <stop offset="1" stopColor="rgba(255, 255, 255, 0)" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="158" height="2" fill="url(#card1-div)" />
                  </svg>

                  <p className="text-[13px] font-[400] text-neutral-500 font-sans leading-relaxed">
                    Speak at 200+ WPM with automatic punctuation, filler word removal, and direct paste into any app.
                  </p>
                </div>
              </div>

              {/* CARD 2: TRANSLATE */}
              <div className="group bg-white rounded-[24px] p-6 border border-black/[0.08] shadow-[0px_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                <div>
                  <div className="text-[13px] font-[500] text-neutral-400 mb-3 font-sans flex items-center justify-between">
                    <span>Translate</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      100+ Languages
                    </span>
                  </div>

                  {/* Illustrator Preview: Live Cross-Language Voice Translation */}
                  <div className="h-[220px] rounded-[18px] bg-[#edf5ef] border border-[#5b8266]/30 p-3.5 relative overflow-hidden flex flex-col justify-between mb-6 shadow-inner">
                    {/* Header Pill */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-700 bg-white/90 px-3 py-1 rounded-lg backdrop-blur-xs border border-black/5 shadow-2xs">
                      <span className="flex items-center gap-1.5">
                        <Globe size={13} className="text-[#3d6148]" />
                        <span>Live Translation</span>
                      </span>
                      <span className="text-[#3d6148] font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300">
                        HI ➔ EN
                      </span>
                    </div>

                    {/* Translation Speech Bubbles */}
                    <div className="space-y-2 relative z-10">
                      {/* Native Speech Input Bubble */}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        className="bg-white rounded-xl p-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-black/10 max-w-[92%]"
                      >
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mb-0.5">
                          <span className="font-bold text-neutral-800">🗣️ Voice Input (Hindi)</span>
                          <span>10:42 AM</span>
                        </div>
                        <p className="text-[11.5px] text-neutral-700 leading-snug font-sans">
                          "यह नया फीचर बहुत तेज़ी से काम करता है"
                        </p>
                      </motion.div>

                      {/* Clean English Output Bubble */}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.25 }}
                        className="bg-white text-neutral-900 rounded-xl p-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)] ml-auto max-w-[92%] border border-[#5b8266]/30"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#3d6148] font-mono mb-0.5">
                          <span className="font-bold">✨ Clean English Output</span>
                          <span>10:42 AM</span>
                        </div>
                        <p className="text-[11.5px] text-neutral-800 leading-snug font-sans">
                          "This new feature works blazingly fast."
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Card 2 Text Content */}
                <div className="text-center pt-1">
                  <h3 className="text-[20px] font-[500] text-neutral-900 font-sans tracking-tight">
                    Live Voice Translation
                  </h3>

                  {/* Subtle Divider */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 2" className="w-[158px] h-[2px] mx-auto my-2.5">
                    <defs>
                      <linearGradient id="card2-div" x1="0" x2="1" y1="0.5" y2="0.5">
                        <stop offset="0" stopColor="rgba(255, 255, 255, 0)" />
                        <stop offset="0.5" stopColor="#d8d8d8" />
                        <stop offset="1" stopColor="rgba(255, 255, 255, 0)" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="158" height="2" fill="url(#card2-div)" />
                  </svg>

                  <p className="text-[13px] font-[400] text-neutral-500 font-sans leading-relaxed">
                    Speak naturally in your native language and output polished, fluent English or global translations on the fly.
                  </p>
                </div>
              </div>

              {/* CARD 3: AGENT MODE */}
              <div className="group bg-white rounded-[24px] p-6 border border-black/[0.08] shadow-[0px_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                <div>
                  <div className="text-[13px] font-[500] text-neutral-400 mb-3 font-sans flex items-center justify-between">
                    <span>Agent Mode</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      In-App Control
                    </span>
                  </div>

                  {/* Illustrator Preview: In-App Voice Agent Execution */}
                  <div className="h-[220px] rounded-[18px] bg-[#faf9f0]/70 border border-black/[0.05] p-3.5 text-neutral-900 relative overflow-hidden flex flex-col justify-between mb-6">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2.5">
                        <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                          <Bot size={13} className="text-purple-600" />
                          <span>Voice Agent Runner</span>
                        </span>
                        <span className="text-neutral-400 font-mono text-[10px]">0.18s</span>
                      </div>

                      {/* Action Command Box */}
                      <div className="p-3 rounded-xl bg-neutral-700 dark:bg-neutral-800 text-white space-y-1 font-mono shadow-sm">
                        <div className="text-[9px] text-neutral-300 uppercase tracking-wider font-semibold">
                          🗣️ Voice Prompt: "Open notifications"
                        </div>
                        <div className="text-[11px] text-emerald-300 flex items-center">
                          <span>&gt; execute_in_app("notifications.open")</span>
                          <span className="w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Done Status Pill */}
                    <div className="p-2.5 rounded-xl bg-[#edf5ef] border border-[#5b8266]/30 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#3d6148]" />
                        <span className="text-[11px] font-mono font-medium text-[#2d4d36]">Notifications Opened in Noska</span>
                      </div>
                      <span className="text-[9.5px] font-mono font-bold bg-[#5b8266]/20 text-[#2d4d36] px-1.5 py-0.5 rounded">
                        DONE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3 Text Content */}
                <div className="text-center pt-1">
                  <h3 className="text-[20px] font-[500] text-neutral-900 font-sans tracking-tight">
                    In-App Voice Agent
                  </h3>

                  {/* Subtle Divider */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 2" className="w-[158px] h-[2px] mx-auto my-2.5">
                    <defs>
                      <linearGradient id="card3-div" x1="0" x2="1" y1="0.5" y2="0.5">
                        <stop offset="0" stopColor="rgba(255, 255, 255, 0)" />
                        <stop offset="0.5" stopColor="#d8d8d8" />
                        <stop offset="1" stopColor="rgba(255, 255, 255, 0)" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="158" height="2" fill="url(#card3-div)" />
                  </svg>

                  <p className="text-[13px] font-[400] text-neutral-500 font-sans leading-relaxed">
                    Control Noska App completely hands-free — trigger in-app navigation, toggle modes, create canvases, and run agent actions.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ==========================================================================
                9. "BUILT AROUND HOW YOU SPEAK" — LUXURY FRAMER HORISCROLL PINNED SUITE
                Exact Parity with framer.com/m/Horiscroll-FREmZl.js@kdW0E6c4vSHouxoooSlD
                Pins viewport & scrolls 6 luxury cards horizontally with zero flicker & 60fps GPU acceleration
               ========================================================================== */}
        <section
          ref={howYouWorkRef}
          id="how-you-work"
          className="relative bg-[#faf9f6] border-t border-black/[0.04] h-[380vh]"
        >
          {/* Sticky Viewport Stage: Pinned inside viewport while user scrolls vertically */}
          <div className="sticky top-0 h-screen w-full flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-8 md:px-12 overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#5b8266]/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#5b8266]/8 rounded-full blur-3xl pointer-events-none" />

            {/* Top Pinned Stage Header & Horiscroll Progress HUD */}
            <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f3e8ff] border-2 border-black text-[11px] font-bold text-neutral-900 uppercase tracking-wider mb-2.5 shadow-[2px_2px_0px_#000000]">
                  <Sparkles size={12} className="text-[#3d6148] animate-pulse" />
                  <span>Proprietary Noska Voice Suite</span>
                </div>
                <h2 className="text-[28px] sm:text-[38px] md:text-[44px] font-extrabold tracking-tight text-neutral-900 leading-[1.08] font-sans">
                  Built around{' '}
                  <AnimatedSVGUnderline text="how you speak," underlineColor="#5b8266" />
                  <span className="text-neutral-500 font-light italic font-serif ml-2 sm:ml-3">not keyboards.</span>
                </h2>
              </div>

              {/* Real-Time Horiscroll Progress HUD */}
              <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-black/[0.06] shadow-xs shrink-0">
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span className="font-bold text-neutral-700">HORISCROLL</span>
                    <span className="text-[#3d6148] font-bold">6 DIMENSIONS</span>
                  </div>
                  {/* Progress Meter Bar */}
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div 
                      style={{ width: horiProgressBar }}
                      className="h-full bg-gradient-to-r from-[#5b8266] via-[#7ca087] to-[#5b8266] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Horiscroll Horizontal Sliding Train (Zero Flicker, GPU Accelerated) */}
            <div className="w-full relative z-10 my-auto overflow-visible py-2">
              <motion.div 
                ref={trackRef}
                style={{ x: horiTrackX }}
                className="flex flex-row flex-nowrap gap-6 sm:gap-8 will-change-transform pr-24 sm:pr-44 pb-4"
              >

                {/* CARD 01: Adaptive Tone Calibration */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf5ef] text-[#2d4d36] border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <SlidersHorizontal size={13} className="text-[#3d6148]" />
                        <span className="text-[12px] font-bold text-neutral-900">Adaptive Tone</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        01
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      Context-Aware Tone Calibration
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Speak the same raw thought once. Noska formats it with the exact right tone whether you're writing a client proposal, replying to an executive, or messaging a teammate.
                    </p>

                    {/* Inner Recessed Interactive Container */}
                    <div className="rounded-2xl p-4 space-y-3.5 bg-[#faf8fd] border-2 border-black/15 shadow-inner">
                      {/* Top Tone Equalizer Bar Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.08]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#5b8266] animate-pulse" />
                          <span className="text-[10.5px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
                            Frequency Spectrum
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[10, 22, 14, 28, 18, 24, 12, 26, 16, 20].map((h, i) => (
                            <motion.span
                              key={i}
                              animate={{ 
                                height: activeTone === 'formal' 
                                  ? ['4px', `${h * 0.75}px`, '4px']
                                  : activeTone === 'casual'
                                  ? ['4px', `${(h % 15 + 6)}px`, '4px']
                                  : activeTone === 'executive'
                                  ? ['6px', `${h * 0.6}px`, '6px']
                                  : ['4px', `${h}px`, '4px']
                              }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.06 }}
                              className="w-[2.5px] bg-[#5b8266] rounded-full"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tone Selector Buttons */}
                      <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-black/10 w-full">
                        {[
                          { id: 'formal', label: 'Formal', icon: Briefcase },
                          { id: 'casual', label: 'Casual', icon: MessageSquare },
                          { id: 'executive', label: 'Executive', icon: Crown },
                          { id: 'technical', label: 'Technical', icon: Terminal }
                        ].map((t) => {
                          const Icon = t.icon;
                          const isActive = activeTone === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setActiveTone(t.id as any)}
                              className={`w-full py-1.5 px-1 rounded-lg text-[10.5px] sm:text-[11px] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 text-center relative select-none font-semibold ${
                                isActive
                                  ? 'bg-neutral-900 text-white font-bold border border-black shadow-[1px_1px_0px_#000000]'
                                  : 'bg-transparent hover:bg-neutral-100 text-neutral-600 hover:text-neutral-950 font-medium'
                              }`}
                            >
                              <Icon size={12} className={`shrink-0 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                              <span className="truncate">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Transformed Output Preview Box */}
                      <motion.div
                        key={activeTone}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="min-h-[85px] p-3.5 rounded-xl bg-white border-2 border-black/10 text-[12.5px] text-neutral-800 leading-relaxed font-sans shadow-xs relative flex flex-col justify-between"
                      >
                        <div className="font-sans leading-relaxed text-neutral-900 font-medium">
                          {tonePresets[activeTone]}
                        </div>
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/5 text-[10.5px] font-mono">
                          <span className="flex items-center gap-1 font-bold text-[#2d4d36] bg-[#edf5ef] px-2 py-0.5 rounded-full border border-[#5b8266]/20">
                            <CheckCircle2 size={11} className="text-[#5b8266]" /> 99.8% Context Fit
                          </span>
                          <span className="text-neutral-500 font-medium">Latency: 0.12s</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>Matches Slack, Gmail & Notion</span>
                    <span className="text-[#2d4d36] font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-[#5b8266]" /> Auto-Calibrated
                    </span>
                  </div>
                </div>

                {/* CARD 02: Voice Rewind ("Scratch That") */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fdeee9] text-[#9c382b] border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <RotateCcw size={13} className="text-[#9c382b]" />
                        <span className="text-[12px] font-bold text-neutral-900">Voice Rewind</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        02
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      Hands-Free Self-Correction
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Change your mind mid-sentence? Say <em>"scratch that"</em> or <em>"wait, I meant..."</em> and Noska automatically deletes and rewrites the prior phrase in-place.
                    </p>

                    {/* Inner Recessed Interactive Container */}
                    <div className="rounded-2xl p-4 space-y-3.5 bg-[#faf8fd] border-2 border-black/15 shadow-inner">
                      {/* Scrubber Tape Timeline Visualizer */}
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.08]">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={12} className="text-[#9c382b] animate-spin" />
                          <span className="text-[10.5px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
                            Audio Buffer Tape
                          </span>
                        </div>
                        <span className="text-[10.5px] font-mono text-[#2d4d36] font-bold px-2 py-0.5 rounded-full bg-[#edf5ef] border border-[#5b8266]/20">
                          {isRewindActive ? "REWOUND 00:02.1" : "LIVE BUFFER 00:04.8"}
                        </span>
                      </div>

                      {/* Scrubber Track Visual */}
                      <div className="relative h-2.5 bg-neutral-200 rounded-full overflow-hidden border border-black/10">
                        <motion.div 
                          animate={{ width: isRewindActive ? '40%' : '100%' }}
                          transition={{ duration: 0.4 }}
                          className={`h-full rounded-full ${isRewindActive ? 'bg-gradient-to-r from-[#5b8266] to-[#7ca087]' : 'bg-[#5b8266] animate-pulse'}`} 
                        />
                      </div>

                      {/* Spoken phrase box with dynamic strikethrough animation */}
                      <div className="text-[12.5px] leading-relaxed text-neutral-800 min-h-[58px] p-3.5 rounded-xl bg-white border-2 border-black/10 flex items-center shadow-xs">
                        {isRewindActive ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                          >
                            <span className="text-neutral-400 line-through decoration-red-500 decoration-2 font-mono text-[11.5px]">
                              Let's schedule release for Friday afternoon
                            </span>{' '}
                            <span className="text-[#1e3325] font-bold bg-[#edf5ef] px-1.5 py-0.5 rounded border border-[#5b8266]/30 inline-block mt-0.5">
                              make it Tuesday morning at 10 AM.
                            </span>
                          </motion.div>
                        ) : (
                          <div className="font-mono text-[12px] text-neutral-700">
                            “Let's schedule release for Friday afternoon...”
                            <span className="inline-block w-1.5 h-3.5 bg-[#5b8266] ml-1 animate-pulse" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-0.5 flex-wrap gap-2">
                        <button
                          onClick={() => setIsRewindActive(prev => !prev)}
                          className="px-4 py-2 rounded-xl text-[11.5px] font-bold bg-neutral-900 hover:bg-neutral-800 text-white border-2 border-black shadow-[2px_2px_0px_#000000] transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                          <RotateCcw size={11} className={isRewindActive ? 'animate-spin' : ''} />
                          <span>{isRewindActive ? "Reset Stream" : "Simulate 'Scratch That'"}</span>
                        </button>
                        <span className="text-[11px] font-mono text-[#2d4d36] font-bold">
                          {isRewindActive ? "✓ Replaced in 180ms" : "Voice armed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>Powered by `rewind-engine.ts`</span>
                    <span className="text-neutral-900 font-bold">Zero backspace touches</span>
                  </div>
                </div>

                {/* CARD 03: Real-Time Multilingual Translation */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf5ef] text-[#2d4d36] border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <Globe size={13} className="text-[#3d6148]" />
                        <span className="text-[12px] font-bold text-neutral-900">Voice Translate</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        03
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      100+ Dialect Speech Translation
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Speak in your native dialect or natural Hinglish. Noska auto-detects conversational nuances and translates speech into polished English in real time.
                    </p>

                    {/* Inner Recessed Interactive Container */}
                    <div className="rounded-2xl p-4 space-y-3.5 bg-[#faf8fd] border-2 border-black/15 shadow-inner">
                      {/* Language Selector Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: 'hinglish', code: 'IN', label: 'Hindi / Hinglish' },
                          { id: 'spanish', code: 'ES', label: 'Spanish' },
                          { id: 'japanese', code: 'JP', label: 'Japanese' },
                          { id: 'german', code: 'DE', label: 'German' }
                        ].map((l) => (
                          <button
                            key={l.id}
                            onClick={() => setActiveTranslateLang(l.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                              activeTranslateLang === l.id
                                ? 'bg-neutral-900 text-white font-bold border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-black/10 font-medium'
                            }`}
                          >
                            <span className="font-mono text-[9.5px] opacity-70 uppercase">{l.code}</span>
                            <span>{l.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Dual Channel Translation Stream */}
                      <div className="p-3.5 rounded-xl bg-white border-2 border-black/10 space-y-2.5 shadow-xs">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                            <span className="font-bold text-neutral-700">Spoken ({translatePresets[activeTranslateLang].detected})</span>
                            <span className="text-[#3d6148] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5b8266] animate-pulse" />
                              Audio Input
                            </span>
                          </div>
                          <p className="text-[12px] text-neutral-700 font-mono italic leading-relaxed">
                            {translatePresets[activeTranslateLang].spoken}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-black/5">
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#2d4d36] font-bold mb-1">
                            <span>Output ({translatePresets[activeTranslateLang].targetLang})</span>
                            <span className="text-[#2d4d36] font-bold px-2 py-0.5 rounded-full bg-[#edf5ef] border border-[#5b8266]/30">
                              {translatePresets[activeTranslateLang].latency}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-neutral-950 font-bold font-sans leading-snug">
                            {translatePresets[activeTranslateLang].translated}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>100% On-Device Whisper v3</span>
                    <span className="text-[#2d4d36] font-bold">Zero cloud audio leak</span>
                  </div>
                </div>

                {/* CARD 04: In-App Voice Control Agent */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f3e8ff] text-neutral-900 border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <Bot size={13} className="text-[#3d6148]" />
                        <span className="text-[12px] font-bold text-neutral-900">In-App Agent</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        04
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      In-App Voice Control Agent
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Control the entire Noska App hands-free. Speak naturally to open notifications, switch themes, search notes, toggle split views, or manage boards.
                    </p>

                    {/* Inner Recessed Interactive Container (In-App Terminal) */}
                    <div className="bg-[#0e1117] text-white rounded-2xl p-4.5 border-2 border-black shadow-xl space-y-3 font-mono text-[11.5px] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5b8266]/10 rounded-full blur-2xl pointer-events-none" />

                      {/* macOS Terminal Dots & Action Selector */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-1.5 relative z-10">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#5b8266]" />
                          <span className="ml-1 text-[10px] text-neutral-400 font-mono">noska-in-app-agent</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {agentCommands.slice(0, 3).map((cmd, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRunAgentCommand(idx)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                activeAgentCommand === idx
                                  ? 'bg-[#5b8266] text-white font-bold'
                                  : 'bg-white/10 hover:bg-white/20 text-neutral-300'
                              }`}
                            >
                              {cmd.title}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-[11.5px] text-neutral-200 relative z-10 leading-snug">
                        <span className="text-[#a8cca8] font-bold">&gt; Voice Input:</span> {agentCommands[activeAgentCommand].voiceInput}
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/60 border border-[#5b8266]/30 text-[10.5px] text-[#c1dcce] relative z-10">
                        <span className="text-neutral-500">// In-App Dispatch:</span><br />
                        <code>{agentCommands[activeAgentCommand].toolCall}</code>
                      </div>

                      <div className="flex items-center justify-between text-[#a8cca8] text-[11px] pt-0.5 relative z-10">
                        <span className="flex items-center gap-1.5 truncate mr-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${agentRunning ? 'bg-amber-400 animate-ping' : 'bg-[#5b8266]'}`} />
                          <span className="truncate">{agentRunning ? "Executing in Noska App..." : agentCommands[activeAgentCommand].result}</span>
                        </span>
                        <button
                          onClick={() => handleRunAgentCommand(activeAgentCommand)}
                          className="px-3 py-1 rounded-lg bg-[#f3e8ff] hover:bg-[#e9d5ff] text-neutral-900 border-2 border-black text-[10.5px] cursor-pointer font-bold shadow-[1.5px_1.5px_0px_#000000] active:scale-95 transition shrink-0"
                        >
                          {agentRunning ? "..." : "Simulate"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>100% In-App Voice Control</span>
                    <span className="text-neutral-900 font-bold">Zero-Click UI Speed</span>
                  </div>
                </div>

                {/* CARD 05: Personal Vocabulary */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fef3c7] text-[#78350f] border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <BookOpen size={13} className="text-[#78350f]" />
                        <span className="text-[12px] font-bold text-neutral-900">Custom Jargon</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        05
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      Personal Dictionary Sync
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Add teammates' names, client brands, internal codenames, and complex technical terms. Noska prioritizes your custom dictionary so uncommon words are never misspelled.
                    </p>

                    {/* Inner Recessed Interactive Container */}
                    <div className="rounded-2xl p-4 space-y-3.5 bg-[#faf8fd] border-2 border-black/15 shadow-inner">
                      {/* Floating Tag Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap min-h-[40px]">
                        {customWords.map((word) => (
                          <motion.div
                            key={word}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-black text-[11.5px] font-bold text-neutral-900 shadow-[1.5px_1.5px_0px_#000000]"
                          >
                            <span>{word}</span>
                            <button
                              onClick={() => setCustomWords(words => words.filter(w => w !== word))}
                              className="text-neutral-400 hover:text-red-500 cursor-pointer text-[13px] font-bold ml-0.5"
                              title="Remove word"
                            >
                              ×
                            </button>
                          </motion.div>
                        ))}
                      </div>

                      {/* Add Custom Word Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newWordInput}
                          onChange={(e) => setNewWordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newWordInput.trim()) {
                              if (!customWords.includes(newWordInput.trim())) {
                                setCustomWords(words => [...words, newWordInput.trim()]);
                              }
                              setNewWordInput('');
                            }
                          }}
                          placeholder="Add custom jargon (e.g. AcmeCorp)..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white border-2 border-black/20 text-[12px] font-medium focus:outline-none focus:border-black"
                        />
                        <button
                          onClick={() => {
                            if (newWordInput.trim() && !customWords.includes(newWordInput.trim())) {
                              setCustomWords(words => [...words, newWordInput.trim()]);
                              setNewWordInput('');
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] text-[#78350f] border-2 border-black text-[12px] font-bold transition cursor-pointer active:scale-95 shadow-[1.5px_1.5px_0px_#000000]"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>Synchronized locally in `dictionary.ts`</span>
                    <span className="text-[#78350f] font-bold">Zero Phonetic Errors</span>
                  </div>
                </div>

                {/* CARD 06: Smart Voice Snippets */}
                <div className="w-[360px] sm:w-[440px] md:w-[480px] shrink-0 bg-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between group border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:-translate-y-1 transition-all duration-300">
                  <div>
                    {/* Top Pinned Service Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fdeee9] text-[#9c382b] border-2 border-black font-bold shadow-[2px_2px_0px_#000000]">
                        <Zap size={13} className="text-[#9c382b]" />
                        <span className="text-[12px] font-bold text-neutral-900">Voice Snippets</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-black text-[11px] font-mono font-bold flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] text-neutral-800">
                        06
                      </div>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-neutral-900 mb-2 font-sans tracking-tight">
                      Instant Semantic Expansion
                    </h3>

                    <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed font-normal">
                      Never dictate long links, bios, or repetitive signatures. Speak a short voice trigger and Noska expands it into complete formatted text instantly.
                    </p>

                    {/* Inner Recessed Interactive Container */}
                    <div className="rounded-2xl p-4 space-y-3.5 bg-[#faf8fd] border-2 border-black/15 shadow-inner">
                      {/* Trigger Selector Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {snippetPresets.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveSnippetIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                              activeSnippetIndex === idx
                                ? 'bg-neutral-900 text-white font-bold border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-black/10 font-medium'
                            }`}
                          >
                            <span>⚡ {item.title}</span>
                          </button>
                        ))}
                      </div>

                      {/* Trigger vs Expansion Preview Box */}
                      <motion.div
                        key={activeSnippetIndex}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3.5 rounded-xl bg-white border-2 border-black/10 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[10.5px] font-mono text-neutral-500">
                          <span>Trigger: <strong className="text-neutral-900 font-bold">{snippetPresets[activeSnippetIndex].trigger}</strong></span>
                          <span className="text-[#9c382b] font-bold bg-[#fdeee9] px-2 py-0.5 rounded-full border border-[#f48574]/20">{snippetPresets[activeSnippetIndex].tag}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#faf8fd] border border-black/10 font-mono text-[11.5px] text-neutral-800 whitespace-pre-line leading-relaxed shadow-inner font-medium">
                          {snippetPresets[activeSnippetIndex].expansion}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between text-[11.5px] text-neutral-500 font-medium">
                    <span>Expands in 0.04s</span>
                    <span className="text-[#9c382b] font-bold flex items-center gap-1">
                      <Sparkles size={12} className="text-[#f48574]" /> Global Keyboard Hook
                    </span>
                  </div>
                </div>

              </motion.div>
            </div>

            {/* Bottom Runway Indicator & Jump Buttons */}
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between pt-4 border-t border-black/10 relative z-10 text-[11px] font-mono text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5b8266] animate-pulse" />
                <span className="font-bold text-neutral-800">Live Pinned Runway</span>
                <span className="text-neutral-400 hidden sm:inline">• 6 Architectural Dimensions</span>
              </div>

              {/* Jump Navigation Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "01 Tone", idx: 0 },
                  { label: "02 Rewind", idx: 1 },
                  { label: "03 Translate", idx: 2 },
                  { label: "04 Agent", idx: 3 },
                  { label: "05 Jargon", idx: 4 },
                  { label: "06 Snippet", idx: 5 }
                ].map((pill) => (
                  <button
                    key={pill.idx}
                    onClick={() => {
                      if (!howYouWorkRef.current) return;
                      const sectionTop = howYouWorkRef.current.offsetTop;
                      const sectionHeight = howYouWorkRef.current.offsetHeight - window.innerHeight;
                      const targetScroll = sectionTop + (pill.idx / 5) * sectionHeight;
                      if (lenisRef.current) {
                        lenisRef.current.scrollTo(targetScroll, { duration: 0.9 });
                      } else if (containerRef.current) {
                        containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border-2 border-black/15 text-[11px] font-bold text-neutral-800 cursor-pointer transition shadow-2xs hover:border-black active:scale-95"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>


        {/* ==========================================================================
                8. "GOOD QUESTIONS." INTERACTIVE FAQ ACCORDION (Wispr Flow Parity)
               ========================================================================== */}
        <section id="faqs" className="relative px-6 sm:px-12 py-24 bg-[#faf9f5] border-t border-black/[0.04]">
          <div className="max-w-5xl mx-auto">

            {/* Header */}
            <div className="text-center mb-14">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-black/[0.06] text-[11.5px] font-semibold text-neutral-600 uppercase tracking-wider mb-3 shadow-xs">
                FAQs
              </div>
              <h2 className="text-[38px] sm:text-[54px] font-normal tracking-tight text-neutral-900 leading-tight">
                Good <em className="italic font-serif font-light text-neutral-500">questions.</em>
              </h2>
            </div>

            {/* 2-Column Split: Questions on Left, Sticky Answer on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Questions List */}
              <div className="lg:col-span-6 space-y-2.5">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setOpenFaq(idx)}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${isOpen
                        ? 'bg-white border-neutral-900 shadow-sm'
                        : 'bg-white/70 hover:bg-white border-black/[0.05]'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[14px] sm:text-[14.5px] leading-snug font-medium ${isOpen ? 'text-neutral-950 font-semibold' : 'text-neutral-700'
                          }`}>
                          {faq.q}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-neutral-900 text-white rotate-90' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                          <ChevronRight size={13} />
                        </div>
                      </div>

                      {/* Inline Collapsible Answer for Mobile */}
                      <div className={`lg:hidden pt-3 mt-3 border-t border-neutral-100 text-[13px] text-neutral-600 whitespace-pre-line leading-relaxed ${isOpen ? 'block' : 'hidden'}`}>
                        {faq.a}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Sticky Answer Showcase on Desktop */}
              <div className="hidden lg:block lg:col-span-6 sticky top-28">
                {openFaq !== null && (
                  <motion.div
                    key={openFaq}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-[32px] p-8 sm:p-10 border border-black/[0.06] shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Answer
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-3 rounded-full bg-[#5b8266]" />
                        <span className="w-1 h-5 rounded-full bg-[#f48574]" />
                        <span className="w-1 h-3 rounded-full bg-[#5b8266]" />
                      </div>
                    </div>

                    <h3 className="text-[18px] font-bold tracking-tight text-neutral-900 leading-snug mb-4">
                      {faqs[openFaq].q}
                    </h3>

                    <div className="text-[14.5px] leading-relaxed text-neutral-700 whitespace-pre-line font-normal">
                      {faqs[openFaq].a}
                    </div>

                    <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11.5px] text-neutral-400">
                      <span>Wispr Flow Knowledge Base</span>
                      <span className="text-neutral-900 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/docs')}>
                        Explore documentation →
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

            </div>

          </div>
        </section>

        {/* ==========================================================================
                9. "START FLOWING" PRE-CTA SECTION
               ========================================================================== */}
        <section className="relative px-6 sm:px-12 pt-24 pb-14 bg-white text-center border-t border-black/[0.04] border-b-0">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-[44px] sm:text-[64px] font-normal tracking-tight text-neutral-900 leading-none">
              Start flowing
            </h2>
            <p className="text-[16px] sm:text-[18px] text-neutral-600 font-normal mt-4">
              Effortless voice dictation in Noska all over.
            </p>

            {/* Primary Button Group */}
            <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
              <button
                onClick={() => navigate('/dashboard')}
                className="wispr-btn-windows px-7 py-3.5 rounded-full text-[14px] font-semibold text-neutral-900 flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-sm"
              >
                <span>Download</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => scrollToSection('live-studio')}
                className="wispr-btn-secondary px-6 py-3.5 rounded-full text-[14px] font-medium transition cursor-pointer flex items-center gap-2"
              >
                <Mic size={15} className="text-[#e28a7a]" />
                <span>Try Flow</span>
              </button>
            </div>

            <div className="text-[12.5px] font-medium text-neutral-400 mt-5">
              Available on Mac, Windows, iPhone, and Android.
            </div>
          </div>
        </section>

        {/* ==========================================================================
                10. 3D ANIMATED MEADOW SUNSET FOOTER (Interactive Ecosystem)
               ========================================================================== */}
        <NoskaMeadowFooter />

      </div>
    </div>
  );
}

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
  Terminal
} from 'lucide-react';
import './NoskaWispr.css';

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
  const [pillTimer, setPillTimer] = useState(2);
  const cleanupBadges = ['Removed Umm', 'Fixed Grammar', 'Auto Punctuation', '4x Velocity'];
  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);

  useEffect(() => {
    const badgeTimer = setInterval(() => {
      setActiveBadgeIndex((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(badgeTimer);
  }, []);

  // Authentic Speech-to-Text Personalization States
  const [activeTone, setActiveTone] = useState<'formal' | 'casual' | 'executive' | 'technical'>('formal');
  const [customWords, setCustomWords] = useState<string[]>(['Sarah', 'Aditya', 'Noska', 'Supabase', 'GraphQL', 'PostgreSQL']);
  const [newWordInput, setNewWordInput] = useState('');
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);
  const [isRewindActive, setIsRewindActive] = useState(false);

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

  useEffect(() => {
    const t = setInterval(() => setPillTimer((s) => (s + 1) % 60), 1000);
    return () => clearInterval(t);
  }, []);

  const recognitionRef = useRef<any>(null);

  // 1. Initialize Lenis buttery-smooth inertial momentum scroll on the container
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const lenis = new Lenis({
      wrapper: container,
      content: content,
      duration: 1.4, // Luxurious, silky glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85, // Silky granular response
      touchMultiplier: 1.6,
      infinite: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Scroll state tracking via Lenis + native container scroll backup
    const handleScroll = () => {
      if (container) {
        setIsScrolled(container.scrollTop > 25);
      }
    };
    lenis.on('scroll', (e: any) => {
      setIsScrolled(e.scroll > 25);
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
      lenisRef.current.scrollTo(elem, { offset: -30, duration: 1.35 });
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

  // Spring physics for buttery-smooth momentum without lag or jitter
  const smoothHeroProgress = useSpring(heroScrollProgress, {
    stiffness: 85,
    damping: 26,
    mass: 0.5,
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
      title: "Create Linear Issue",
      voiceInput: "“Create a Linear issue: Fix auth token refresh race condition, high priority, assign to me”",
      intent: "linear.create_issue",
      toolCall: 'linear.create_issue({ title: "Fix auth token refresh race condition", priority: "urgent", assignee: "@me" })',
      result: "✓ Issue LIN-842 created & assigned to you on Linear",
      category: "Issue Tracker"
    },
    {
      title: "Post Slack Announcement",
      voiceInput: "“Draft Slack update in #product: Q3 Whisper engine is live with 0.18s latency!”",
      intent: "slack.post_message",
      toolCall: 'slack.post_message({ channel: "#product", message: "🚀 Q3 Whisper engine is live with 0.18s latency!" })',
      result: "✓ Broadcasted to #product channel (142 members)",
      category: "Team Comms"
    },
    {
      title: "Schedule Google Calendar",
      voiceInput: "“Schedule 30-minute debrief with Marcus on Calendar for tomorrow at 3 PM”",
      intent: "gcal.create_event",
      toolCall: 'gcal.create_event({ title: "Debrief with Marcus", start: "Tomorrow 3:00 PM", duration: "30m" })',
      result: "✓ Calendar invite dispatched to marcus@acme.co",
      category: "Calendar"
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

        {/* Soft Background Sky Ambiance */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-[#dbe8dd]/70 blur-3xl" />
          <div className="absolute top-10 right-0 w-[680px] h-[680px] rounded-full bg-[#fde9e3]/75 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-[720px] h-[720px] rounded-full bg-[#edf6ee]/55 blur-3xl" />
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
              The voice-to-text AI that turns speech into clear, polished writing in every app.
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
                  {cleanupBadges[activeBadgeIndex]}
                </text>
              </g>

            </svg>
          </motion.div>

          {/* BILLOWING CELESTIAL CLOUD HORIZON with Dynamic Scroll Parting */}
          <div className="relative w-full -mt-8 sm:-mt-12 pointer-events-none select-none z-10">

            {/* Master Responsive Cloudscape Vector with Scroll Parallax */}
            <svg
              viewBox="0 0 1440 540"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto min-h-[340px] sm:min-h-[440px] block overflow-visible"
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

                {/* Drop Shadows for Dimensional Cloud Billows */}
                <filter id="wispr-pink-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="-8" stdDeviation="16" floodColor="#f48574" floodOpacity="0.22" />
                </filter>
                <filter id="wispr-sage-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="-8" stdDeviation="16" floodColor="#5b8266" floodOpacity="0.18" />
                </filter>
                <filter id="wispr-cloud-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="-10" stdDeviation="18" floodColor="#1e2029" floodOpacity="0.04" />
                </filter>
                <filter id="wispr-beam-blur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="22" />
                </filter>
              </defs>

              {/* 1. Center Back: Glowing Sunrise Arch & Shimmering Light Plume with Parallax */}
              <motion.g style={{ y: domeY, scale: domeScale, opacity: beamOpacity, transformOrigin: '720px 220px' }}>
                <ellipse cx="720" cy="220" rx="380" ry="220" fill="url(#wispr-sunrise-glow)" />
                {/* Diffused light halo */}
                <motion.polygon
                  style={{ scaleX: beamScaleX, transformOrigin: '720px 220px' }}
                  points="650,280 790,280 830,10 610,10"
                  fill="url(#wispr-light-beam)"
                  opacity="0.55"
                  filter="url(#wispr-beam-blur)"
                />
                {/* Sharp radiant central plume (Wispr enlightenment ray) */}
                <motion.polygon
                  style={{ scaleX: beamScaleX, transformOrigin: '720px 220px' }}
                  points="685,280 755,280 780,20 660,20"
                  fill="url(#wispr-light-beam)"
                  opacity="0.95"
                  className="wispr-cloud-beam-shimmer"
                />
              </motion.g>

              {/* 2. Left Flank: Voluptuous Soft Blush Pink Clouds with Scroll Parting */}
              <motion.g
                style={{
                  x: cloudLeftX,
                  y: cloudLeftY,
                  scale: cloudLeftScale,
                  rotate: cloudLeftRotate,
                  transformOrigin: '240px 240px'
                }}
                filter="url(#wispr-pink-shadow)"
              >
                <g className="wispr-cloud-drift-left">
                  {/* Deep layer */}
                  <circle cx="120" cy="240" r="145" fill="url(#wispr-pink-grad-1)" opacity="0.9" />
                  <circle cx="260" cy="200" r="135" fill="url(#wispr-pink-grad-1)" opacity="0.9" />
                  <circle cx="390" cy="230" r="120" fill="url(#wispr-pink-grad-1)" opacity="0.85" />
                  {/* Fore layer */}
                  <circle cx="50" cy="270" r="130" fill="url(#wispr-pink-grad-2)" />
                  <circle cx="190" cy="230" r="140" fill="url(#wispr-pink-grad-2)" />
                  <circle cx="330" cy="255" r="130" fill="url(#wispr-pink-grad-2)" />
                  <circle cx="460" cy="300" r="105" fill="url(#wispr-pink-grad-2)" opacity="0.9" />
                  {/* Specular curved highlights */}
                  <path d="M 110 125 Q 190 115 250 140" stroke="url(#wispr-pink-highlight)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 250 160 Q 320 150 375 180" stroke="url(#wispr-pink-highlight)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>
              </motion.g>

              {/* 3. Right Flank: Voluptuous Soft Sage Mint Clouds with Scroll Parting */}
              <motion.g
                style={{
                  x: cloudRightX,
                  y: cloudRightY,
                  scale: cloudRightScale,
                  rotate: cloudRightRotate,
                  transformOrigin: '1200px 240px'
                }}
                filter="url(#wispr-sage-shadow)"
              >
                <g className="wispr-cloud-drift-right">
                  {/* Deep layer */}
                  <circle cx="1320" cy="240" r="145" fill="url(#wispr-sage-grad-1)" opacity="0.9" />
                  <circle cx="1180" cy="200" r="135" fill="url(#wispr-sage-grad-1)" opacity="0.9" />
                  <circle cx="1050" cy="230" r="120" fill="url(#wispr-sage-grad-1)" opacity="0.85" />
                  {/* Fore layer */}
                  <circle cx="1390" cy="270" r="130" fill="url(#wispr-sage-grad-2)" />
                  <circle cx="1250" cy="230" r="140" fill="url(#wispr-sage-grad-2)" />
                  <circle cx="1110" cy="255" r="130" fill="url(#wispr-sage-grad-2)" />
                  <circle cx="980" cy="300" r="105" fill="url(#wispr-sage-grad-2)" opacity="0.9" />
                  {/* Specular curved highlights */}
                  <path d="M 1330 125 Q 1250 115 1190 140" stroke="url(#wispr-sage-highlight)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 1190 160 Q 1120 150 1065 180" stroke="url(#wispr-sage-highlight)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>
              </motion.g>

              {/* 4. Mid-Ground: Warm Ivory Pillows for 3D Layered Depth */}
              <motion.g style={{ y: cloudMidY, transformOrigin: '720px 320px' }} filter="url(#wispr-cloud-soft-shadow)">
                {/* Mid-Left Ivory Cluster */}
                <motion.g style={{ x: cloudMidLeftX }}>
                  <circle cx="280" cy="320" r="135" fill="url(#wispr-ivory-grad)" />
                  <circle cx="480" cy="310" r="125" fill="url(#wispr-ivory-grad)" />
                  <circle cx="640" cy="340" r="110" fill="url(#wispr-ivory-grad)" />
                </motion.g>
                {/* Mid-Right Ivory Cluster */}
                <motion.g style={{ x: cloudMidRightX }}>
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
                filter="url(#wispr-cloud-soft-shadow)"
              >
                {/* Left Parting Cumulus Cluster */}
                <motion.g style={{ x: cloudFrontLeftX }}>
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
        <section id="benchmarks" className="relative px-4 sm:px-8 md:px-12 py-16 bg-white">
          <div className="wispr-speed-container bg-[#092b1f] text-[#ffffeb] rounded-[36px] sm:rounded-[48px] p-6 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl">

            {/* Subtle emerald glow inside container */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#1b5e46]/35 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#e28a7a]/15 blur-3xl pointer-events-none" />

            {/* Section Header */}
            <div className="max-w-3xl mx-auto text-center relative z-10 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#134332] border border-white/10 text-[11.5px] font-semibold text-[#8de2be] uppercase tracking-wider mb-4">
                <Zap size={12} />
                <span>Velocity Benchmark</span>
              </div>
              <h2 className="text-[38px] sm:text-[58px] font-normal tracking-tight text-[#ffffeb] leading-[1.08]">
                4x faster <em className="italic font-serif font-light text-[#fdd2c8]">than typing</em>
              </h2>
              <p className="text-[14.5px] sm:text-[16.5px] text-[#ffffeb]/75 max-w-xl mx-auto mt-4 font-normal leading-relaxed">
                Voice that finally works is here. Flow lets you create, code, message, and write at the speed of thought, 4x faster than your keyboard.
              </p>
            </div>

            {/* Dual Velocity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto relative z-10 mb-12">

              {/* Keyboard 45 WPM Card */}
              <div className="rounded-[28px] bg-[#0d3627] border border-white/10 p-6 sm:p-8 flex flex-col justify-between min-h-[190px]">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-[13px] font-semibold uppercase tracking-wider text-[#ffffeb]/60">Keyboard</span>
                  <span className="text-[20px] font-mono font-bold text-[#ffffeb]/80">45 wpm</span>
                </div>

                <div className="my-4 overflow-hidden relative h-10 flex items-center">
                  <svg width="100%" height="32" viewBox="0 0 600 32" className="overflow-visible">
                    <path id="curve-keyboard" d="M0 16 H1200" fill="transparent" />
                    <text className="text-[13.5px] font-medium fill-[#ffffeb]/40">
                      <textPath xlinkHref="#curve-keyboard">
                        I'm getting started with the project. How would you like to set up the file? Typing one sluggish keystroke at a time...
                      </textPath>
                      <animate attributeName="x" dur="28s" values="0; -600" repeatCount="indefinite" />
                    </text>
                  </svg>
                </div>

                <div className="text-[12px] text-[#ffffeb]/50">
                  Standard keyboard typing speed with typing fatigue
                </div>
              </div>

              {/* Wispr Flow 220 WPM Card */}
              <div className="rounded-[28px] bg-gradient-to-br from-[#124835] to-[#0c3929] border border-[#f48574]/40 p-6 sm:p-8 flex flex-col justify-between min-h-[190px] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f48574]/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f48574] animate-pulse" />
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-white">Flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-mono font-bold text-[#fdd2c8]">220 wpm</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f48574]/20 text-[#fdd2c8] border border-[#f48574]/30">4.9x speed</span>
                  </div>
                </div>

                <div className="my-4 overflow-hidden relative h-12 flex items-center">
                  <svg width="100%" height="48" viewBox="0 0 700 48" className="overflow-visible">
                    <path id="curve-flow-fast" d="M 0 32 Q 175 0 350 32 T 700 32 T 1050 32" fill="transparent" stroke="rgba(244, 133, 116, 0.2)" strokeWidth="1.5" />
                    <text className="text-[14px] font-semibold fill-[#ffffeb]">
                      <textPath xlinkHref="#curve-flow-fast">
                        Instant speech dictation at the speed of thought. Zero punctuation delays, automatic cleanup, full velocity!
                      </textPath>
                      <animate attributeName="x" dur="12s" values="0; -700" repeatCount="indefinite" />
                    </text>
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[12px] text-[#ffffeb]/70 relative z-10">
                  <span>Conversational speaking velocity</span>
                  <div className="flex items-center gap-1">
                    <span className="wispr-eq-bar" />
                    <span className="wispr-eq-bar" />
                    <span className="wispr-eq-bar" />
                    <span className="wispr-eq-bar" />
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
                  className={`px-5 py-2.5 rounded-full text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'slack'
                    ? 'bg-[#ffffeb] text-neutral-900 shadow-lg font-semibold scale-105'
                    : 'bg-[#124231] text-[#ffffeb]/75 hover:text-white border border-white/10 hover:bg-[#16503b]'
                    }`}
                >
                  <MessageCircle size={15} className={activeApp === 'slack' ? 'text-[#36C5F0]' : ''} />
                  <span>Slack</span>
                </button>
                <button
                  onClick={() => setActiveApp('claude')}
                  className={`px-5 py-2.5 rounded-full text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'claude'
                    ? 'bg-[#ffffeb] text-neutral-900 shadow-lg font-semibold scale-105'
                    : 'bg-[#124231] text-[#ffffeb]/75 hover:text-white border border-white/10 hover:bg-[#16503b]'
                    }`}
                >
                  <Sparkles size={15} className={activeApp === 'claude' ? 'text-[#D97706]' : ''} />
                  <span>Claude</span>
                </button>
                <button
                  onClick={() => setActiveApp('gmail')}
                  className={`px-5 py-2.5 rounded-full text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer ${activeApp === 'gmail'
                    ? 'bg-[#ffffeb] text-neutral-900 shadow-lg font-semibold scale-105'
                    : 'bg-[#124231] text-[#ffffeb]/75 hover:text-white border border-white/10 hover:bg-[#16503b]'
                    }`}
                >
                  <Monitor size={15} className={activeApp === 'gmail' ? 'text-[#EA4335]' : ''} />
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
                  className="rounded-[24px] bg-[#0c3325] border border-white/12 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#f48574]">
                          What You Said (Raw Audio)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#ffffeb]/70 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                        {appTransformations[activeApp].fillersRemoved} vocal fillers removed
                      </span>
                    </div>
                    <div className="text-[14px] leading-relaxed text-[#ffffeb]/90 font-mono py-1">
                      {appTransformations[activeApp].rawAudio}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#ffffeb]/65">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f48574]" />
                      <span>{appTransformations[activeApp].legend}</span>
                    </div>
                    <span className="font-mono text-[#ffffeb]/40 text-[10px]">
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
                  className="rounded-[24px] bg-white text-neutral-900 p-6 flex flex-col justify-between shadow-2xl border border-black/[0.04]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-neutral-800">
                          {appTransformations[activeApp].target}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200/60">
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
                          <span className="text-[11px] font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-black/5 font-medium">Markdown Mode</span>
                          <span className="text-[11px] font-mono text-neutral-400">42 tokens</span>
                        </>
                      )}
                      {appTransformations[activeApp].toolbarType === 'gmail' && (
                        <>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] font-bold">B</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px] italic font-serif">I</button>
                          <button className="p-1 hover:text-neutral-700 transition cursor-pointer text-[12px]">📎</button>
                          <span className="text-[11px] text-neutral-400 font-medium">To: Marcus Chen</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyText(appTransformations[activeApp].polished)}
                      className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
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
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-black/[0.08] text-[12px] font-semibold text-neutral-800 tracking-wide mb-3 shadow-xs">
              <Sparkles size={13} className="text-emerald-600" />
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
                  className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${activePromptIndex === idx
                    ? 'bg-neutral-900 text-white shadow-md font-semibold scale-105'
                    : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-black/[0.06]'
                    }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex items-center gap-1 bg-white p-1 rounded-full border border-black/[0.07] shadow-xs mt-4">
              <button
                onClick={() => setStudioMode('raw')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition cursor-pointer ${studioMode === 'raw' ? 'bg-neutral-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
              >
                Raw Spoken Audio
              </button>
              <button
                onClick={() => setStudioMode('polished')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition cursor-pointer flex items-center gap-1.5 ${studioMode === 'polished' ? 'bg-gradient-to-r from-[#0e3827] to-[#1a5b40] text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
              >
                <Sparkles size={11} className="text-emerald-300" />
                <span>Noska Voice Polished</span>
              </button>
              <button
                onClick={() => setStudioMode('code')}
                className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition cursor-pointer ${studioMode === 'code' ? 'bg-neutral-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
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
              className="max-w-3xl mx-auto bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[12.5px] font-bold uppercase tracking-wider text-red-400">
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
                        className="w-[3px] bg-emerald-400 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {liveWpm} WPM
                  </span>
                </div>
              </div>

              {/* Live Streaming Speech Transcript */}
              <div className="min-h-[110px] p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-[14px] leading-relaxed text-[#ffffeb]">
                {transcriptionText || (
                  <span className="text-neutral-500 italic">
                    Listening to your microphone... speak naturally now (e.g. "so um basically we need to ship the update by Friday")
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10 flex-wrap gap-3">
                <span className="text-[11.5px] text-neutral-400">
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
                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    <span>Polish with AI</span>
                  </button>
                  <button
                    onClick={() => setIsRecording(false)}
                    className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition cursor-pointer"
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
                  <span className={`w-2.5 h-2.5 rounded-full ${studioMode === 'polished' ? 'bg-emerald-500' : studioMode === 'code' ? 'bg-blue-500' : 'bg-amber-500'
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
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200/60">
                    ⚡ 0.18s • On-Device Whisper
                  </span>
                  <button
                    onClick={() => handleCopyText(studioPresets[activePromptIndex][studioMode])}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition cursor-pointer flex items-center gap-1.5 text-[12px] font-medium"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="font-mono text-[13.5px] sm:text-[14px] leading-relaxed text-neutral-800 whitespace-pre-line bg-[#faf9f5] p-5 rounded-2xl border border-black/[0.04] shadow-inner">
                {studioPresets[activePromptIndex][studioMode]}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 text-[12px] text-neutral-500 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  {studioMode === 'polished'
                    ? 'Punctuation, bullet points & grammar formatted automatically'
                    : studioMode === 'code'
                      ? 'Synthesizes code blocks directly from voice commands'
                      : 'Contains vocal fillers and repeated syllables'}
                </span>
                <button
                  onClick={() => setIsRecording(true)}
                  className="text-neutral-900 font-semibold hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer transition-colors"
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
                6. "WHY US?" BENTO GRID SHOWCASE
               ========================================================================== */}
        <section id="why-us" className="relative px-6 sm:px-12 py-20 bg-gradient-to-b from-white via-[#fafbfa] to-white border-t border-black/[0.03]">

          <div className="absolute top-1/3 right-4 w-72 h-44 opacity-45 pointer-events-none wispr-ambient-cloud-3">
            <svg className="w-full h-full text-[#eef5ef]" viewBox="0 0 300 180" fill="currentColor">
              <path d="M 30 160 Q 10 110 50 80 Q 90 40 150 50 Q 210 20 260 70 Q 300 100 280 150 Z" />
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">

            {/* Left 8 Columns: Multi-card Bento cluster */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-5">

              {/* Card 1: Concentric Radar with Avatars & Language Models */}
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="sm:col-span-6 bg-white rounded-[28px] p-6 border border-black/[0.06] shadow-sm relative overflow-hidden h-[250px] flex flex-col justify-between"
              >
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-[120px] h-[120px] rounded-full border border-black/[0.08]" />
                  <div className="absolute w-[200px] h-[200px] rounded-full border border-black/[0.06]" />
                  <div className="absolute w-[280px] h-[280px] rounded-full border border-black/[0.04]" />
                  <div className="wispr-radar-sweep-line" />
                </div>

                <div className="relative z-10">
                  <div className="text-[32px] font-semibold tracking-tight text-neutral-900 leading-none">100+</div>
                  <div className="text-[12px] text-neutral-500 font-medium mt-1">Language Models & Accents</div>
                </div>

                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-6 right-12 w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-md">
                    <img src="/images/wispr/avatar1.jpg" alt="Voice Node" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute top-20 right-28 w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
                    <img src="/images/wispr/avatar2.jpg" alt="Voice Node" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-16 right-10 w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
                    <img src="/images/wispr/avatar3.jpg" alt="Voice Node" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-8 left-20 w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-md">
                    <img src="/images/wispr/user.jpg" alt="Voice Node" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition cursor-pointer">
                    <Plus size={14} />
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Creative User & Invisible Layer */}
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="sm:col-span-6 bg-[#ebf2ec] rounded-[28px] overflow-hidden border border-black/[0.04] shadow-sm relative h-[250px] group"
              >
                <img
                  src="/images/wispr/user.jpg"
                  alt="Creative User"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-4 left-4 right-4 py-2 px-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-between text-white text-[12px] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Invisible Global Layer</span>
                  </div>
                  <kbd className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono text-white/90">Ctrl+Shift+Space</kbd>
                </div>
              </motion.div>

              {/* Card 3: Sage Green Accuracy Metric */}
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="sm:col-span-4 bg-gradient-to-br from-[#dce9de] to-[#c7dccb] rounded-[28px] p-5 border border-black/[0.04] shadow-sm flex flex-col justify-between h-[210px] relative overflow-hidden"
              >
                <svg className="absolute -bottom-4 -right-4 w-40 h-40 text-[#b9d2be] opacity-50 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M 0 50 Q 25 10 50 50 T 100 50 L 100 100 L 0 100 Z" />
                </svg>
                <div>
                  <div className="text-[34px] font-semibold text-neutral-900 tracking-tight leading-none">99.8%</div>
                  <div className="text-[12px] text-neutral-700 font-medium mt-1 leading-snug">
                    Filler Words<br />Auto-Purged
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center text-neutral-800">
                  <TrendingUp size={13} />
                </div>
              </motion.div>

              {/* Card 4: Peach 3D Wave Glass Card */}
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="sm:col-span-8 rounded-[28px] p-5 border border-black/[0.05] shadow-sm relative overflow-hidden h-[210px] flex flex-col justify-between text-white group"
                style={{
                  backgroundImage: `url(/images/wispr/peach-mesh.jpg)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                    {advantages[advantageIndex].tag}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAdvantageIndex(0)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${advantageIndex === 0 ? 'bg-white text-neutral-900' : 'bg-white/30 text-white hover:bg-white/50'}`}
                    >
                      <Volume2 size={12} />
                    </button>
                    <button
                      onClick={() => setAdvantageIndex(1)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${advantageIndex === 1 ? 'bg-white text-neutral-900' : 'bg-white/30 text-white hover:bg-white/50'}`}
                    >
                      <Scan size={12} />
                    </button>
                    <button
                      onClick={() => setAdvantageIndex(2)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${advantageIndex === 2 ? 'bg-white text-neutral-900' : 'bg-white/30 text-white hover:bg-white/50'}`}
                    >
                      <Lightbulb size={12} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-[17px] font-semibold text-white tracking-tight leading-snug">
                    {advantages[advantageIndex].title}
                  </h3>
                  <p className="text-[12px] text-white/85 font-normal mt-0.5 line-clamp-2">
                    {advantages[advantageIndex].subtitle}
                  </p>

                  <div className="flex items-center gap-1 mt-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        onClick={() => setAdvantageIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${advantageIndex === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Card 5: Platform Features & iPhone Mockup */}
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="sm:col-span-12 bg-[#eaf1ec] rounded-[28px] p-6 border border-black/[0.04] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-neutral-700 shadow-sm">
                      <Settings size={12} />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-neutral-700 shadow-sm">
                      <TrendingUp size={12} />
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    Universal App Compatibility
                  </div>
                  <h3 className="text-[22px] font-semibold text-neutral-900 tracking-tight leading-snug">
                    Types In Every<br />Native Desktop App
                  </h3>
                  <p className="text-[13px] text-neutral-600 font-normal mt-2 max-w-sm">
                    Types directly wherever your cursor blinks: Slack, Claude, Cursor, VS Code, Notion, Gmail, and terminal.
                  </p>
                </div>

                {/* Realistic iPhone Mockup Frame */}
                <div className="w-[200px] h-[210px] bg-neutral-950 rounded-t-[32px] p-2 pt-3 shadow-2xl border-4 border-neutral-900 overflow-hidden relative select-none">
                  <div className="mx-auto w-16 h-3 bg-black rounded-full mb-3 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                  </div>

                  <div className="bg-white rounded-2xl p-3 h-full shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-neutral-900">Hi, Mike</span>
                      <Mic size={10} className="text-[#e28a7a]" />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#fde9e3] border border-[#f9c7bc]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[#c75e4c]">01:24 Voice Memo</span>
                        <button
                          onClick={() => setIsPlayingAudio(prev => !prev)}
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-neutral-800 shadow-xs cursor-pointer"
                        >
                          {isPlayingAudio ? <Pause size={9} /> : <Play size={9} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5 h-4">
                        {[40, 75, 50, 90, 60, 30, 85, 45, 95, 70, 40].map((val, idx) => (
                          <div
                            key={idx}
                            style={{ height: isPlayingAudio ? `${val}%` : '20%' }}
                            className="w-1 bg-[#e28a7a] rounded-full transition-all duration-200"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Right 4 Columns: Grand Headline, 220 WPM Pill & Rotating Stamp */}
            <div className="lg:col-span-4 flex flex-col justify-between h-full gap-8 pl-0 lg:pl-4">

              <div>
                <h2 className="text-[48px] sm:text-[60px] font-normal tracking-tight text-neutral-900 leading-[1.02]">
                  Why Flow?
                </h2>
                <p className="text-[14px] text-neutral-600 leading-relaxed mt-4">
                  Flow combines state-of-the-art speech intelligence with zero-latency desktop integration to help modern builders, writers, and teams execute 4x faster.
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 min-w-[170px] rounded-full p-4 px-6 bg-gradient-to-r from-[#f79d8e] to-[#f48574] text-white shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="text-[26px] font-semibold leading-none">220 WPM</div>
                    <div className="text-[11.5px] font-medium text-white/90 mt-0.5">4x Faster Than Typing</div>
                  </div>
                  <ArrowRight size={16} className="text-white/80" />
                </motion.div>

                <div
                  onClick={() => scrollToSection('live-studio')}
                  className="relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer select-none group"
                >
                  <svg className="absolute inset-0 w-full h-full wispr-rotating-stamp" viewBox="0 0 100 100">
                    <path
                      id="circlePath"
                      d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                      fill="transparent"
                    />
                    <text className="text-[9.5px] font-bold uppercase tracking-[0.22em] fill-neutral-600">
                      <textPath xlinkHref="#circlePath">
                        • Try Voice Studio •
                      </textPath>
                    </text>
                  </svg>
                  <div className="w-9 h-9 rounded-full bg-[#f4f5f2] group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center shadow-xs transition duration-200">
                    <Mic size={12} className="text-[#e28a7a]" />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ==========================================================================
                7. "BUILT AROUND HOW YOU WORK" (Tone, Vocabulary, Snippets & Rewind)
               ========================================================================== */}
        <section id="how-you-work" className="relative px-6 sm:px-12 py-24 bg-white border-t border-black/[0.04]">

          {/* Section Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#edf5ef] border border-[#5b8266]/20 text-[12px] font-semibold text-[#3d6148] uppercase tracking-wider mb-4 shadow-xs">
              <Sparkles size={13} className="text-[#3d6148]" />
              <span>Proprietary Noska Voice Suite</span>
            </div>
            <h2 className="text-[38px] sm:text-[56px] font-extrabold tracking-tight text-neutral-900 leading-[1.05]">
              Built around <em>how you speak,</em><br />
              <span className="text-neutral-500 font-light italic">not how keyboards think.</span>
            </h2>
            <p className="text-[15px] sm:text-[17px] text-neutral-600 max-w-2xl mx-auto mt-4 leading-relaxed font-normal">
              From real-time translation and autonomous voice agent actions to adaptive tone matching and hands-free Voice Rewind — Noska puts the entire frontier of voice computing at your command.
            </p>
          </div>

          {/* 6 Interactive Real-Feature Showcase Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">

            {/* CARD 1: Interactive Tone Adaptation */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#5b8266]/10 text-[#5b8266] flex items-center justify-center">
                      <SlidersHorizontal size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Adaptive Tone Matching</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700">
                    App-Specific
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Speak the same raw thought once. Noska formats it with the exact right tone whether you're writing a client proposal, replying to an executive, or messaging a teammate.
                </p>

                {/* Tone Selector Buttons */}
                <div className="flex items-center gap-1.5 mb-4 bg-white p-1 rounded-2xl border border-black/[0.06] shadow-xs">
                  {(['formal', 'casual', 'executive', 'technical'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTone(t)}
                      className={`flex-1 py-1.5 sm:py-2 rounded-xl text-[11.5px] sm:text-[12px] font-medium transition cursor-pointer capitalize ${activeTone === t
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Dynamic Transformed Message Box */}
                <motion.div
                  key={activeTone}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-black/[0.05] shadow-xs min-h-[95px] flex items-center"
                >
                  <p className="text-[13.5px] leading-relaxed text-neutral-800 font-sans font-normal">
                    {tonePresets[activeTone]}
                  </p>
                </motion.div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>Matches Slack, Gmail & Notion standards</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Auto-cased & calibrated
                </span>
              </div>
            </div>

            {/* CARD 2: Voice Rewind (Hands-Free Self-Correction) */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <RotateCcw size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Voice Rewind</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono">
                    "Scratch That"
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Change your mind mid-sentence? Say <em>"scratch that"</em> or <em>"wait, I meant..."</em> and Noska automatically deletes and rewrites the prior phrase in-place.
                </p>

                {/* Interactive Rewind Simulation Box */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-black/[0.05] shadow-xs min-h-[110px] flex flex-col justify-between">
                  <div className="text-[13.5px] leading-relaxed text-neutral-800">
                    {isRewindActive ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <span className="text-neutral-400 line-through decoration-red-400 decoration-2">Let's schedule the release for Friday afternoon</span>{' '}
                        <span className="text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">actually, make it Tuesday morning at 10 AM.</span>
                      </motion.div>
                    ) : (
                      <div>
                        Let's schedule the release for Friday afternoon...
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => setIsRewindActive(prev => !prev)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${isRewindActive
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                        }`}
                    >
                      <RotateCcw size={12} className={isRewindActive ? 'animate-spin' : ''} />
                      <span>{isRewindActive ? "Reset Simulation" : "Simulate 'Scratch That'"}</span>
                    </button>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {isRewindActive ? "✓ Phrase deleted & replaced" : "Waiting for correction trigger"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>Powered by Noska `rewind-engine.ts`</span>
                <span className="text-neutral-900 font-semibold">Zero mouse/backspace touches</span>
              </div>
            </div>

            {/* CARD 3: Real-Time Multi-Language Voice Translate (NEW) */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                      <Globe size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Real-Time Voice Translate</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
                    100+ Languages
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Speak in your native language or conversational Hinglish. Noska auto-detects dialect nuances and translates speech into polished English in real time.
                </p>

                {/* Language Switcher Pills */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  {(['hinglish', 'spanish', 'japanese', 'german'] as const).map((langKey) => (
                    <button
                      key={langKey}
                      onClick={() => setActiveTranslateLang(langKey)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition cursor-pointer flex items-center gap-1.5 ${activeTranslateLang === langKey
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-black/[0.06]'
                        }`}
                    >
                      <span>{translatePresets[langKey].flag}</span>
                      <span>{translatePresets[langKey].lang}</span>
                    </button>
                  ))}
                </div>

                {/* Real-Time Translation Stream Box */}
                <motion.div
                  key={activeTranslateLang}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-black/[0.05] shadow-xs space-y-3"
                >
                  <div className="border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-neutral-400">
                        Input: {translatePresets[activeTranslateLang].detected}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Listening
                      </span>
                    </div>
                    <p className="text-[13px] text-neutral-600 font-mono italic">
                      {translatePresets[activeTranslateLang].spoken}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                        Output: {translatePresets[activeTranslateLang].targetLang}
                      </span>
                      <span className="text-[10.5px] font-mono text-neutral-400">
                        {translatePresets[activeTranslateLang].latency}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-neutral-900 font-sans font-medium leading-relaxed">
                      {translatePresets[activeTranslateLang].translated}
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>100% On-Device Whisper v3</span>
                <span className="text-emerald-700 font-semibold">Zero cloud audio transmission</span>
              </div>
            </div>

            {/* CARD 4: Autonomous Voice Agent Mode (NEW) */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Autonomous Voice Agent Mode</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                    Voice-to-Action
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Speak real-world workflows into existence. Noska Agent parses intents, binds desktop tools, creates issues, drafts communications, and triggers actions.
                </p>

                {/* Agent Command Selector */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  {agentCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunAgentCommand(idx)}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium transition cursor-pointer flex items-center gap-1.5 ${activeAgentCommand === idx
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-black/[0.06]'
                        }`}
                    >
                      <Terminal size={11} className={activeAgentCommand === idx ? 'text-emerald-400' : 'text-neutral-400'} />
                      <span>{cmd.title}</span>
                    </button>
                  ))}
                </div>

                {/* Agent Execution Console Terminal */}
                <div className="bg-[#15171e] text-white rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-lg space-y-3 font-mono text-[12.5px]">
                  <div>
                    <div className="flex items-center justify-between text-[10.5px] text-neutral-400 mb-1">
                      <span>VOICE INTENT</span>
                      <span className="text-emerald-400 font-semibold">{agentCommands[activeAgentCommand].category}</span>
                    </div>
                    <p className="text-neutral-200 text-[12px] leading-relaxed">
                      {agentCommands[activeAgentCommand].voiceInput}
                    </p>
                  </div>

                  <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 text-[11.5px] text-emerald-300 overflow-x-auto">
                    <code>&gt; {agentCommands[activeAgentCommand].toolCall}</code>
                  </div>

                  {/* Multi-Step Execution State */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${agentRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                      <span className="text-[11.5px] text-neutral-300 font-medium">
                        {agentRunning
                          ? agentStep === 0
                            ? "Parsing intent..."
                            : "Calling MCP tool..."
                          : agentCommands[activeAgentCommand].result}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRunAgentCommand(activeAgentCommand)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer"
                    >
                      {agentRunning ? "Running..." : "Re-run"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>Integrated with MCP, Linear, Slack & GitHub</span>
                <span className="text-neutral-900 font-semibold">1-Click Voice Execution</span>
              </div>
            </div>

            {/* CARD 5: Custom Dictionary & Unique Jargon */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Personal Vocabulary</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono">
                    100% Accuracy
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Add teammates' names, client brands, internal codenames, and complex technical terms. Noska prioritizes your custom dictionary so uncommon words are never misspelled.
                </p>

                {/* Interactive Word Chips */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {customWords.map((word) => (
                    <div
                      key={word}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-[12.5px] font-medium text-neutral-800 shadow-xs"
                    >
                      <span>{word}</span>
                      <button
                        onClick={() => setCustomWords(words => words.filter(w => w !== word))}
                        className="text-neutral-400 hover:text-neutral-700 cursor-pointer ml-0.5 font-bold"
                        title="Remove word"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Word Input Field */}
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
                    placeholder="Type a name or jargon (e.g. AcmeCorp)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-black/[0.08] text-[12.5px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    onClick={() => {
                      if (newWordInput.trim() && !customWords.includes(newWordInput.trim())) {
                        setCustomWords(words => [...words, newWordInput.trim()]);
                        setNewWordInput('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] font-semibold transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>Synchronized locally in `dictionary.ts`</span>
                <span className="text-emerald-700 font-semibold">Zero phonetic errors</span>
              </div>
            </div>

            {/* CARD 6: Smart Voice Snippets & Semantic Triggers */}
            <div className="bg-[#faf9f6] rounded-[32px] p-7 sm:p-9 border border-black/[0.06] shadow-sm flex flex-col justify-between hover:border-black/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e28a7a]/15 text-[#c75e4c] flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <span className="text-[15px] font-bold text-neutral-900">Smart Voice Snippets</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#fde9e3] text-[#c75e4c]">
                    Semantic Triggers
                  </span>
                </div>

                <p className="text-[13px] text-neutral-600 mb-5 leading-relaxed">
                  Never dictate long links, bios, or repetitive signatures. Speak a short voice trigger and Noska expands it into complete formatted text instantly.
                </p>

                {/* Snippet Triggers Selection */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {[
                    { trigger: "“my calendar link”", title: "Calendar Booking" },
                    { trigger: "“standard sign off”", title: "Email Signature" },
                    { trigger: "“github repo”", title: "Noska Repo" },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSnippetIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition cursor-pointer ${activeSnippetIndex === idx
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-black/[0.06]'
                        }`}
                    >
                      {item.trigger}
                    </button>
                  ))}
                </div>

                {/* Expanded Preview Box */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-black/[0.05] shadow-xs min-h-[95px] flex flex-col justify-center">
                  <span className="text-[10.5px] font-mono text-neutral-400 uppercase tracking-wider mb-1">Expanded Result</span>
                  <div className="text-[13px] leading-relaxed text-neutral-800 font-mono">
                    {activeSnippetIndex === 0 && "Feel free to book time on my calendar here: https://cal.com/noska/30min"}
                    {activeSnippetIndex === 1 && "Best regards,\nNoska Engineering Team"}
                    {activeSnippetIndex === 2 && "https://github.com/shrikrishna-lab/noska"}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[11.5px] text-neutral-500">
                <span>Supports dynamic variables (`time`, `clipboard`)</span>
                <span className="text-neutral-900 font-semibold">Instant expansion</span>
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
        <section className="relative px-6 sm:px-12 py-24 bg-white text-center border-t border-black/[0.04]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-[44px] sm:text-[64px] font-normal tracking-tight text-neutral-900 leading-none">
              Start flowing
            </h2>
            <p className="text-[16px] sm:text-[18px] text-neutral-600 font-normal mt-4">
              Effortless voice dictation in every application.
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
                10. COMPREHENSIVE WISPR FLOW FOOTER
               ========================================================================== */}
        <footer className="px-6 sm:px-12 pt-16 pb-12 bg-[#fafaf8] border-t border-black/[0.05]">
          <div className="max-w-6xl mx-auto">

            {/* Product Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

              {/* Card 1: Dictation */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15px] font-bold text-neutral-900">Wispr Flow Dictation</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">Core</span>
                  </div>
                  <p className="text-[13px] text-neutral-600 leading-relaxed mb-4">
                    The voice-to-text AI that turns speech into clear, polished writing in every app on your computer.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-[13px] font-semibold text-neutral-900 hover:text-neutral-600 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Download free</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Card 2: Desktop Integration */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/[0.06] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15px] font-bold text-neutral-900">Universal App Integration</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Native</span>
                  </div>
                  <p className="text-[13px] text-neutral-600 leading-relaxed mb-4">
                    Types directly wherever your cursor blinks: Slack, Claude, Cursor, Notion, Gmail, and terminal with zero setup.
                  </p>
                </div>
                <button
                  onClick={() => scrollToSection('live-studio')}
                  className="text-[13px] font-semibold text-neutral-900 hover:text-neutral-600 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Test live microphone</span>
                  <ArrowRight size={13} />
                </button>
              </div>

            </div>

            {/* Footer Navigation Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-12 border-b border-black/[0.06] text-[13px]">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">Get started</h4>
                <ul className="space-y-2 text-neutral-600">
                  <li><button onClick={() => navigate('/')} className="hover:text-neutral-900 transition cursor-pointer">Home</button></li>
                  <li><button onClick={() => navigate('/privacy')} className="hover:text-neutral-900 transition cursor-pointer">Privacy & Security</button></li>
                  <li><button onClick={() => scrollToSection('live-studio')} className="hover:text-neutral-900 transition cursor-pointer">Web demo</button></li>
                  <li><button onClick={() => scrollToSection('benchmarks')} className="hover:text-neutral-900 transition cursor-pointer">Why Flow vs Built-in</button></li>
                  <li><button onClick={() => navigate('/docs')} className="hover:text-neutral-900 transition cursor-pointer">Microphone guide</button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">Professionals</h4>
                <ul className="space-y-2 text-neutral-600">
                  <li><span className="cursor-default">Leaders</span></li>
                  <li><span className="cursor-default">Developers</span></li>
                  <li><span className="cursor-default">Creators</span></li>
                  <li><span className="cursor-default">Customer Support</span></li>
                  <li><span className="cursor-default">Lawyers</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">Company</h4>
                <ul className="space-y-2 text-neutral-600">
                  <li><button onClick={() => navigate('/about')} className="hover:text-neutral-900 transition cursor-pointer">About Noska</button></li>
                  <li><button onClick={() => navigate('/careers')} className="hover:text-neutral-900 transition cursor-pointer">Careers</button></li>
                  <li><button onClick={() => navigate('/about')} className="hover:text-neutral-900 transition cursor-pointer">Contact</button></li>
                  <li><button onClick={() => navigate('/privacy')} className="hover:text-neutral-900 transition cursor-pointer">Security</button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-neutral-900 mb-3 uppercase tracking-wider text-[11px]">Download</h4>
                <ul className="space-y-2 text-neutral-600">
                  <li><button onClick={() => navigate('/dashboard')} className="hover:text-neutral-900 transition cursor-pointer font-medium text-neutral-900">Download for Windows</button></li>
                  <li><span className="text-neutral-400">macOS (Apple Silicon & Intel)</span></li>
                  <li><span className="text-neutral-400">iOS App Store</span></li>
                  <li><span className="text-neutral-400">Android Google Play</span></li>
                </ul>
              </div>
            </div>

            {/* Bottom Legal Copyright Bar */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-700">Noska Wispr Dictation</span>
                <span>© 2026 Noska Inc. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/privacy')} className="hover:text-neutral-700 transition cursor-pointer">Privacy Policy</button>
                <span>•</span>
                <button onClick={() => navigate('/terms')} className="hover:text-neutral-700 transition cursor-pointer">Terms of Service</button>
                <span>•</span>
                <button onClick={() => navigate('/dashboard')} className="font-semibold text-neutral-800 hover:underline flex items-center gap-0.5 cursor-pointer">
                  <span>Open Workspace</span>
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>

          </div>
        </footer>

      </div>
    </div>
  );
}

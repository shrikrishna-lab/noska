import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Gift, Users, Trophy, Star, Zap, Copy, Share2, QrCode, Check, ArrowRight,
  Lock, Sparkles, Award, Brain, Palette, Infinity, Paintbrush, X, ChevronDown,
  ExternalLink, Globe, MessageSquare,
  Medal, Target, Crown
} from "lucide-react";
import { Link } from "react-router-dom";
import "./Referrals.css";

const NOSKA_BLUE = "#7CC8FF";
const NOSKA_BEIGE = "#E6D5B8";

const rewardPasses = [
  { name: "Explorer Pass", days: 7, desc: "7 Days Pro", color: "#7CC8FF", delay: 0 },
  { name: "Creator Pass", days: 15, desc: "15 Days Pro", color: "#8B5CF6", delay: 0.3 },
  { name: "Team Pass", days: 30, desc: "30 Days Pro", color: "#10B981", delay: 0.6 },
  { name: "Founder Pass", days: 90, desc: "90 Days Pro", color: "#F59E0B", delay: 0.9 },
  { name: "Legend Pass", days: 365, desc: "365 Days Pro", color: "#6366F1", delay: 1.2 },
];

const milestones = [
  { friends: 1, reward: "7 Days Pro", icon: Zap, color: "#7CC8FF" },
  { friends: 3, reward: "500 AI Credits", icon: Brain, color: "#8B5CF6" },
  { friends: 5, reward: "30 Days Pro", icon: Zap, color: "#10B981" },
  { friends: 10, reward: "Founder Badge", icon: Award, color: "#F59E0B" },
  { friends: 25, reward: "Lifetime Beta Access", icon: Infinity, color: "#6366F1" },
];

const tasks = [
  { title: "Invite a Friend", desc: "Both receive 7 Days Pro", icon: Gift, action: "Invite", color: "#7CC8FF" },
  { title: "Publish a Template", desc: "250 AI Credits", icon: Palette, action: "Publish", color: "#8B5CF6" },
  { title: "Share Workspace", desc: "Exclusive Theme", icon: Share2, action: "Share", color: "#10B981" },
  { title: "Post about Noska", desc: "Founder XP", icon: MessageSquare, action: "Share", color: "#F59E0B" },
];

const secretRewards = [
  { invites: 10, label: "10 Invites" },
  { invites: 25, label: "25 Invites" },
  { invites: 50, label: "50 Invites" },
  { invites: 100, label: "100 Invites" },
];

const leaderboardData = [
  { name: "Alex Chen", xp: 12500, referrals: 47, rewards: 12, avatar: "AC", color: "#FFD700" },
  { name: "Mira Sato", xp: 9800, referrals: 38, rewards: 9, avatar: "MS", color: "#C0C0C0" },
  { name: "James Wilson", xp: 7200, referrals: 29, rewards: 7, avatar: "JW", color: "#CD7F32" },
];

const levelThresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 50000, 100000];
const levelNames = ["Newcomer", "Contributor", "Builder", "Creator", "Architect", "Innovator", "Pioneer", "Legend", "Visionary", "Mythic"];

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useMousePosition();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.vx -= dx * 0.00005;
          p.vy -= dy * 0.00005;
        }
        p.vx += (Math.random() - 0.5) * 0.01;
        p.vy += (Math.random() - 0.5) * 0.01;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 200, 255, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="referral-particles" />;
}

function BackgroundEffects() {
  return (
    <div className="referral-bg">
      <div className="referral-bg-spotlight" />
      <div className="referral-bg-blob referral-bg-blob-1" />
      <div className="referral-bg-blob referral-bg-blob-2" />
      <div className="referral-bg-blob referral-bg-blob-3" />
      <div className="referral-bg-grain" />
      <ParticleLayer />
    </div>
  );
}

function RewardPassCard({ pass, index }: { pass: typeof rewardPasses[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateZ: index % 2 === 0 ? -8 : 8 }}
      animate={{ opacity: 1, y: 0, rotateZ: index % 2 === 0 ? -4 : 4 }}
      transition={{ delay: 0.2 + index * 0.15, type: "spring", stiffness: 80, damping: 15 }}
      whileHover={{ scale: 1.08, rotateZ: 0, y: -8 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="reward-pass-card"
      style={{ borderColor: `${pass.color}40` }}
    >
      <div className="reward-pass-shine" />
      <div className="reward-pass-content">
        <div className="reward-pass-logo">N</div>
        <p className="reward-pass-name">{pass.name}</p>
        <p className="reward-pass-desc">{pass.desc}</p>
      </div>
      <motion.div
        className="reward-pass-glow"
        animate={{ opacity: hovered ? 1 : 0 }}
        style={{ background: `radial-gradient(circle at center, ${pass.color}40, transparent)` }}
      />
    </motion.div>
  );
}

function FloatingPasses() {
  return (
    <div className="floating-passes">
      {rewardPasses.map((pass, i) => (
        <div key={pass.name} className="floating-pass-wrapper" style={{ animationDelay: `${i * 0.4}s` }}>
          <RewardPassCard pass={pass} index={i} />
        </div>
      ))}
    </div>
  );
}

function HeroCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 15, y: x * 15 });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className="hero-card"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="hero-card-shine"
        animate={{ opacity: hovered ? 1 : 0 }}
        style={{ transform: "translateZ(30px)" }}
      />
      <div className="hero-card-inner" style={{ transform: "translateZ(20px)" }}>
        <div className="hero-card-icon"><Gift /></div>
        <h3 className="hero-card-title">Your Reward Pass</h3>
        <p className="hero-card-subtitle">Start inviting friends to unlock</p>
        <div className="hero-card-pass" style={{ transform: "translateZ(40px)" }}>
          <span className="hero-card-pass-tier">Explorer</span>
          <span className="hero-card-pass-value">7 Days Pro</span>
        </div>
        <div className="hero-card-code">
          <span>noska.app/invite/</span>
          <span className="hero-card-code-value">yourname</span>
        </div>
      </div>
    </motion.div>
  );
}

function ReferralHero() {
  return (
    <section className="referral-hero">
      <div className="referral-hero-badge">
        <Sparkles className="referral-hero-badge-icon" />
        <span>Exclusive Rewards</span>
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="referral-hero-title"
      >
        Build <span className="referral-hero-title-accent">Together.</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="referral-hero-subtitle"
      >
        Invite friends to Noska and unlock exclusive rewards for both of you.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <HeroCard />
      </motion.div>
    </section>
  );
}

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!ref.current || counted.current) return;
    counted.current = true;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

function ProgressCard() {
  const total = 5;
  const current = 2;
  const pct = (current / total) * 100;

  return (
    <ScrollReveal>
      <div className="progress-card">
        <div className="progress-card-header">
          <div>
            <p className="progress-card-label">Friends Joined</p>
            <h3 className="progress-card-value">{current} <span className="progress-card-total">/ {total}</span></h3>
          </div>
          <div className="progress-card-next">
            <span className="progress-card-next-label">Next Reward</span>
            <span className="progress-card-next-value">Creator Pass</span>
          </div>
        </div>
        <div className="progress-bar-track">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
          <motion.div
            className="progress-bar-dot"
            initial={{ left: 0 }}
            whileInView={{ left: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </div>
        <p className="progress-card-pct">{pct}% complete</p>
      </div>
    </ScrollReveal>
  );
}

function MilestoneTimeline() {
  return (
    <ScrollReveal>
      <div className="milestone-section">
        <h2 className="section-title">Milestones</h2>
        <p className="section-subtitle">Unlock greater rewards as you grow</p>
        <div className="milestone-timeline">
          {milestones.map((m, i) => (
            <motion.div
              key={m.friends}
              className="milestone-item"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div className="milestone-connector">
                <motion.div
                  className="milestone-dot"
                  style={{ borderColor: m.color }}
                  whileInView={{ scale: [1, 1.3, 1] }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
                />
                {i < milestones.length - 1 && <div className="milestone-line" />}
              </div>
              <div className="milestone-content">
                <div className="milestone-icon" style={{ background: `${m.color}20`, color: m.color }}>
                  <m.icon />
                </div>
                <div>
                  <p className="milestone-friends">Friend #{m.friends}</p>
                  <p className="milestone-reward">{m.reward}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

function TaskCard({ task, index }: { task: typeof tasks[0]; index: number }) {
  const Icon = task.icon;
  return (
    <motion.div
      className="task-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
    >
      <div className="task-card-icon" style={{ background: `${task.color}15`, color: task.color }}>
        <Icon />
      </div>
      <div className="task-card-body">
        <h3 className="task-card-title">{task.title}</h3>
        <p className="task-card-desc">{task.desc}</p>
      </div>
      <button className="task-card-btn" style={{ background: task.color }}>
        {task.action} <ArrowRight />
      </button>
    </motion.div>
  );
}

function TaskSection() {
  return (
    <ScrollReveal>
      <div className="task-section">
        <h2 className="section-title">Complete Tasks</h2>
        <p className="section-subtitle">Earn rewards by contributing to the community</p>
        <div className="task-grid">
          {tasks.map((task, i) => <TaskCard key={task.title} task={task} index={i} />)}
        </div>
      </div>
    </ScrollReveal>
  );
}

function InviteLink() {
  const [copied, setCopied] = useState(false);
  const code = "yourname";

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://noska.app/invite/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollReveal>
      <div className="invite-section">
        <h2 className="section-title">Your Invite Link</h2>
        <p className="section-subtitle">Share with friends to start earning</p>
        <div className="invite-link-card">
          <div className="invite-link-input">
            <Globe className="invite-link-icon" />
            <span className="invite-link-text">noska.app/invite/</span>
            <span className="invite-link-code">{code}</span>
          </div>
          <div className="invite-link-actions">
            <button className="invite-link-btn" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button className="invite-link-btn invite-link-btn-primary">
              <Share2 /> <span>Share</span>
            </button>
            <button className="invite-link-btn">
              <QrCode /> <span>QR</span>
            </button>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function ReferralStats() {
  const stats = [
    { icon: Users, label: "Friends Joined", value: 12, color: "#7CC8FF" },
    { icon: Target, label: "Active Referrals", value: 8, color: "#8B5CF6" },
    { icon: Gift, label: "Rewards Earned", value: 5, color: "#F59E0B" },
    { icon: Brain, label: "AI Credits", value: 1250, color: "#10B981" },
    { icon: Share2, label: "Workspace Shares", value: 7, color: "#6366F1" },
    { icon: Palette, label: "Templates Published", value: 3, color: "#E6D5B8" },
  ];

  return (
    <ScrollReveal>
      <div className="stats-section">
        <h2 className="section-title">Your Dashboard</h2>
        <p className="section-subtitle">Track your referral impact</p>
        <div className="stats-grid">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-card">
                <div className="stat-card-icon" style={{ background: `${s.color}15` }}>
                  <Icon style={{ color: s.color }} />
                </div>
                <div className="stat-card-body">
                  <p className="stat-card-label">{s.label}</p>
                  <p className="stat-card-value"><CountUp end={s.value} /></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

function Leaderboard() {
  const medals = [Crown, Medal, Medal];

  return (
    <ScrollReveal>
      <div className="leaderboard-section">
        <h2 className="section-title">Top Builders</h2>
        <p className="section-subtitle">This month's top contributors</p>
        <div className="leaderboard-list">
          {leaderboardData.map((user, i) => {
            const MedalIcon = medals[i];
            return (
              <motion.div
                key={user.name}
                className="leaderboard-item"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <div className="leaderboard-rank" style={{ color: user.color }}>
                  <MedalIcon />
                </div>
                <div className="leaderboard-avatar" style={{ background: `${user.color}20`, color: user.color }}>
                  {user.avatar}
                </div>
                <div className="leaderboard-info">
                  <p className="leaderboard-name">{user.name}</p>
                  <div className="leaderboard-stats">
                    <span>{user.xp.toLocaleString()} XP</span>
                    <span>{user.referrals} referrals</span>
                    <span>{user.rewards} rewards</span>
                  </div>
                </div>
                <div className="leaderboard-monthly">Monthly</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

function XPProgress() {
  const level = 3;
  const xp = 720;
  const nextThreshold = levelThresholds[level];
  const prevThreshold = levelThresholds[level - 1];
  const progress = ((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

  return (
    <ScrollReveal>
      <div className="xp-section">
        <h2 className="section-title">Builder Level</h2>
        <p className="section-subtitle">Level up by earning XP</p>
        <div className="xp-card">
          <div className="xp-header">
            <div className="xp-level-info">
              <span className="xp-level-badge">Level {level}</span>
              <span className="xp-level-name">{levelNames[level - 1]}</span>
            </div>
            <div className="xp-points">
              <Star className="xp-star" />
              <span>{xp.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="progress-bar-track xp-bar">
            <motion.div
              className="progress-bar-fill xp-bar-fill"
              initial={{ width: 0 }}
              whileInView={{ width: `${progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="xp-next">{xp.toLocaleString()} / {nextThreshold.toLocaleString()} XP to next level</p>
          <div className="xp-unlocks">
            {["Themes", "Icons", "AI Credits", "Skins", "Badges", "Early Features"].map((u) => (
              <div key={u} className="xp-unlock-item">
                <div className="xp-unlock-check"><Sparkles /></div>
                <span>{u}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function SecretRewards() {
  return (
    <ScrollReveal>
      <div className="secret-section">
        <h2 className="section-title">Secret Rewards</h2>
        <p className="section-subtitle">Hidden treasures for top builders</p>
        <div className="secret-grid">
          {secretRewards.map((s) => (
            <motion.div
              key={s.invites}
              className="secret-card"
              whileHover={{ scale: 1.05, y: -4 }}
            >
              <div className="secret-card-lock">
                <Lock />
              </div>
              <div className="secret-card-glow" />
              <p className="secret-card-label">{s.label}</p>
              <div className="secret-card-shimmer" />
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

function RewardModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="reward-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="reward-modal-card"
        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reward-modal-confetti">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="reward-modal-confetti-piece"
              initial={{ opacity: 1, y: 0, rotate: 0, x: 0 }}
              animate={{ opacity: 0, y: -200 - Math.random() * 300, rotate: Math.random() * 720, x: (Math.random() - 0.5) * 200 }}
              transition={{ duration: 2, delay: Math.random() * 0.5, ease: "easeOut" }}
              style={{ background: [NOSKA_BLUE, NOSKA_BEIGE, "#8B5CF6", "#10B981", "#F59E0B"][i % 5] }}
            />
          ))}
        </div>
        <div className="reward-modal-icon"><Gift /></div>
        <h2 className="reward-modal-title">Reward Unlocked!</h2>
        <div className="reward-modal-card-visual">
          <span className="reward-modal-pass">7 Days Pro</span>
        </div>
        <p className="reward-modal-desc">You've unlocked 7 days of Noska Pro. Welcome to the builder community!</p>
        <button className="reward-modal-btn" onClick={onClose}>
          Continue Building <ArrowRight />
        </button>
      </motion.div>
    </motion.div>
  );
}

function StickyMobileBar() {
  return (
    <div className="sticky-mobile-bar">
      <button className="sticky-mobile-btn">
        <Gift /> Invite Friends
      </button>
    </div>
  );
}

export default function Referrals() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowModal(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="referral-page">
      <BackgroundEffects />
      <div className="referral-content">
        <ReferralHero />
        <FloatingPasses />
        <ProgressCard />
        <MilestoneTimeline />
        <TaskSection />
        <InviteLink />
        <ReferralStats />
        <Leaderboard />
        <XPProgress />
        <SecretRewards />
      </div>
      <AnimatePresence>
        {showModal && <RewardModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
      <StickyMobileBar />
    </div>
  );
}

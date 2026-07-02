import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, LayoutGrid, Users } from "lucide-react";

/**
 * Public marketing page at "/". Deliberately does not import App.jsx or touch
 * Supabase/auth/session bootstrap — it's a static entry point that routes
 * users into /login. The real app (auth -> onboarding -> workspace) only
 * mounts once the user navigates past this page.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1.5">
            <img src="/logo.png" alt="Noska" className="h-full w-full object-contain" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">Noska</span>
        </div>
        <Link
          to="/login"
          className="rounded-lg bg-[var(--noska-blue)] px-4 py-2 text-[13.5px] font-medium text-white transition hover:opacity-90"
        >
          Log in
        </Link>
      </header>

      <main className="flex flex-col items-center px-6 pt-20 pb-24 text-center md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="mx-auto max-w-[18ch] text-[40px] font-bold leading-[1.1] tracking-tight md:text-[56px]">
            Your second brain, built for how you actually think
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-[var(--text-secondary)] md:text-[18px]">
            Notes, docs, databases, and AI — all in one workspace. Noska gets out of your
            way so you can focus on the work.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-xl bg-[var(--noska-blue)] px-6 py-3 text-[14.5px] font-medium text-white shadow-[0_8px_24px_var(--noska-blue-glow)] transition hover:opacity-90"
            >
              Get started free
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 grid w-full max-w-4xl gap-4 md:grid-cols-3"
        >
          <FeatureCard
            icon={Sparkles}
            title="AI built in"
            description="Ask questions, draft pages, and organize ideas with AI woven into every part of the workspace."
          />
          <FeatureCard
            icon={LayoutGrid}
            title="Docs, databases, canvas"
            description="Write freely or structure it your way — switch between document, canvas, and graph views."
          />
          <FeatureCard
            icon={Users}
            title="Built for teams"
            description="Share pages, collaborate in real time, and keep everyone's work in one shared workspace."
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-left">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-[var(--accent-deep)]">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

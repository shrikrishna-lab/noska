import { motion } from 'framer-motion';
import {
  User, Rocket, Globe2, GraduationCap, Code2, Palette, ClipboardList,
  BrainCircuit, BookOpen, FolderKanban, FileSignature, Sparkles,
} from 'lucide-react';

const USE_CASES = [
  { icon: User, label: 'Personal Notes' },
  { icon: Rocket, label: 'Startups' },
  { icon: Globe2, label: 'Remote Teams' },
  { icon: GraduationCap, label: 'Students' },
  { icon: Code2, label: 'Developers' },
  { icon: Palette, label: 'Design Teams' },
  { icon: ClipboardList, label: 'Product Managers' },
  { icon: BrainCircuit, label: 'Knowledge Management' },
  { icon: BookOpen, label: 'Company Wiki' },
  { icon: FolderKanban, label: 'Project Planning' },
  { icon: FileSignature, label: 'Documentation' },
  { icon: Sparkles, label: 'AI Workspace' },
];

export function UseCases() {
  return (
    <section id="projects" className="nl-usecases">
      <div className="nl-container">
        <div className="nl-section-header">
          <span className="nl-eyebrow">Use cases</span>
          <h2>Built for how you actually work.</h2>
          <p>Whatever you call your workflow, Noska bends to fit it.</p>
        </div>

        <div className="nl-usecases-grid">
          {USE_CASES.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              className="nl-usecase-pill"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

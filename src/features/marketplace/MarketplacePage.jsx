import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Star, Download, ChevronLeft, X, Plus, ExternalLink, Clock, BadgeCheck, Tag, DollarSign } from "lucide-react";
import { CATEGORIES, SAMPLE_TEMPLATES } from "./Constants";
import { uid } from "../../utils/helpers";

export default function MarketplacePage({ pages, onDuplicate, onToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState(() => new Set());
  const [myAdditions, setMyAdditions] = useState([]);

  const filtered = useMemo(() => {
    let items = SAMPLE_TEMPLATES;
    if (activeCategory !== "all") items = items.filter(t => t.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, searchQuery]);

  const handleAdd = (template) => {
    const page = {
      id: uid(),
      title: template.title,
      icon: '📄',
      blocks: [
        { id: uid(), type: 'h1', text: template.title },
        { id: uid(), type: 'text', text: template.description },
        { id: uid(), type: 'divider', text: '' },
        { id: uid(), type: 'callout', text: `Added from Marketplace — by ${template.creatorName}` },
        { id: uid(), type: 'text', text: 'Start customizing your template...' }
      ],
      tags: [template.category]
    };
    onDuplicate(page);
    setPurchasedIds(prev => new Set([...prev, template.id]));
    setMyAdditions(prev => [{ id: template.id, title: template.title, pricePaid: template.price, addedAt: new Date().toISOString(), status: 'active' }, ...prev]);
    setSelectedTemplate(null);
    onToast?.(`${template.title} added to workspace`);
  };

  const handleBuy = (template) => {
    setCartOpen(true);
    handleAdd(template);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <ShoppingBag size={20} className="text-[var(--accent)]" />
          <h1 className="text-lg font-semibold text-[var(--text)]">Marketplace</h1>
          {selectedTemplate && (
            <button onClick={() => setSelectedTemplate(null)} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] ml-2">
              <ChevronLeft size={14} /> Back
            </button>
          )}
        </div>
        <div className="relative mt-3 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] pl-9 pr-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedTemplate ? (
          <TemplateDetail template={selectedTemplate} onAdd={handleAdd} onBuy={handleBuy} onBack={() => setSelectedTemplate(null)} purchased={purchasedIds.has(selectedTemplate.id)} onToast={onToast} />
        ) : cartOpen ? (
          <MyAdditionsView additions={myAdditions} pages={pages} onToast={onToast} onClose={() => setCartOpen(false)} />
        ) : (
          <BrowseView
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            templates={filtered}
            onSelect={setSelectedTemplate}
            purchasedIds={purchasedIds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BrowseView({ categories, activeCategory, onCategoryChange, templates, onSelect, purchasedIds }) {
  const rails = useMemo(() => {
    const popular = [...templates].sort((a, b) => b.addCount - a.addCount).slice(0, 6);
    const newItems = [...templates].slice(0, 6);
    const free = templates.filter(t => t.price === 0).slice(0, 6);
    return { recommended: templates.slice(0, 6), popular, newItems, free };
  }, [templates]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      {/* Categories */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => onCategoryChange("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeCategory === "all" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => onCategoryChange(c.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeCategory === c.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"}`}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Rails */}
      {Object.entries(rails).map(([key, items]) => (
        <div key={key} className="mb-8">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3 capitalize">{key}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {items.map(t => (
              <TemplateCard key={t.id} template={t} onClick={() => onSelect(t)} purchased={purchasedIds.has(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template: t, onClick, purchased }) {
  const handleClick = (e) => { e.stopPropagation(); onClick(); };
  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ y: -2 }}
      className="group text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)]/30 hover:shadow-md transition-all"
    >
      <div className="h-24 bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 flex items-center justify-center">
        <div className="text-3xl opacity-30 group-hover:opacity-50 transition">{CATEGORIES.find(c => c.id === t.category)?.icon || '📄'}</div>
      </div>
      <div className="p-3">
        <h4 className="text-xs font-semibold text-[var(--text)] truncate">{t.title}</h4>
        <p className="text-[10px] text-[var(--muted)] mt-0.5 truncate">{t.creatorName}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <Download size={10} /> {t.addCount >= 1000 ? `${(t.addCount / 1000).toFixed(1)}k` : t.addCount}
          </div>
          <div className="flex items-center gap-1">
            {t.price === 0 ? (
              <span className="text-[10px] font-semibold text-[var(--success)]">Free</span>
            ) : (
              <span className="text-[10px] font-semibold text-[var(--accent)]">${t.price.toFixed(2)}</span>
            )}
            {purchased && <BadgeCheck size={10} className="text-[var(--success)]" />}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function TemplateDetail({ template: t, onAdd, onBuy, onBack, purchased, onToast }) {
  const [activeTab, setActiveTab] = useState("overview");
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-48 h-36 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center shrink-0">
            <span className="text-5xl opacity-40">{CATEGORIES.find(c => c.id === t.category)?.icon || '📄'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text)]">{t.title}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
              <span>by {t.creatorName}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5"><Star size={10} className="text-[var(--warning)]" /> {t.rating}</span>
              <span>·</span>
              <Download size={10} /> {t.addCount} adds
            </div>
            <p className="text-sm text-[var(--secondary)] mt-3 leading-5">{t.description}</p>
            <div className="flex items-center gap-3 mt-4">
              {purchased ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-[var(--success)]/10 px-4 py-2 text-sm font-semibold text-[var(--success)]"><BadgeCheck size={14} /> Added to workspace</span>
              ) : t.price === 0 ? (
                <button onClick={() => onAdd(t)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Plus size={14} /> Add Free</button>
              ) : (
                <button onClick={() => onBuy(t)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition"><DollarSign size={14} /> Buy for ${t.price.toFixed(2)}</button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--border)] mb-4">
          {["overview", "reviews", "versions"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 text-xs font-medium capitalize border-b-2 transition ${activeTab === tab ? "text-[var(--accent)] border-[var(--accent)]" : "text-[var(--muted)] border-transparent hover:text-[var(--text)]"}`}>{tab}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h4 className="text-sm font-semibold text-[var(--text)] mb-2">What's included</h4>
              <ul className="space-y-1.5">
                {['Pre-built page structure with sample content', 'Organized by sections with clear headings', 'Ready-to-use templates', 'Customizable to your workflow'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--secondary)]"><BadgeCheck size={12} className="mt-0.5 text-[var(--success)] shrink-0" /> {f}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-[var(--muted)]">14-day refund policy. Contact the creator for support.</p>
          </div>
        )}
        {activeTab === "reviews" && (
          <p className="text-xs text-[var(--muted)] py-4">No reviews yet. Be the first!</p>
        )}
        {activeTab === "versions" && (
          <p className="text-xs text-[var(--muted)] py-4">v1.0 — Initial release</p>
        )}
      </div>
    </div>
  );
}

function MyAdditionsView({ additions, onToast }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">My Added Templates</h3>
      {additions.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">You haven't added any templates yet. Browse the marketplace to get started!</p>
      ) : (
        <div className="space-y-2">
          {additions.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="text-lg">{CATEGORIES.find(c => c.id === a.category)?.icon || '📄'}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[var(--text)]">{a.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mt-0.5">
                  <span>{a.pricePaid === 0 ? 'Free' : `$${a.pricePaid.toFixed(2)}`}</span>
                  <span>·</span>
                  <Clock size={9} /> {new Date(a.addedAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.status === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

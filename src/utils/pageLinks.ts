export function extractMentions(text) {
  if (!text) return [];
  const regex = /\[\[([^\]]+)\]\]/g;
  const mentions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push({ raw: match[0], title: match[1].trim(), index: match.index });
  }
  return mentions;
}

export function resolveMentions(mentions, pages) {
  return mentions.map(m => {
    const page = pages.find(p => p.title.toLowerCase() === m.title.toLowerCase());
    return { ...m, pageId: page?.id || null, resolved: !!page };
  });
}

export function getBacklinks(pageId, allPages) {
  const target = allPages.find(p => p.id === pageId);
  if (!target) return [];
  return allPages.filter(p => {
    if (p.id === pageId) return false;
    const text = extractPageText(p);
    return text.includes(`[[${target.title}]]`);
  });
}

export function getOutgoingLinks(pageId, allPages) {
  const page = allPages.find(p => p.id === pageId);
  if (!page) return [];
  const mentions = extractMentions(extractPageText(page));
  const resolved = resolveMentions(mentions, allPages);
  return resolved.filter(m => m.resolved).map(m => ({
    pageId: m.pageId,
    title: m.title,
  }));
}

export function getAllRelations(pageId, allPages) {
  const backlinks = getBacklinks(pageId, allPages).map(p => ({
    pageId: p.id,
    title: p.title,
    icon: p.icon,
    type: 'backlink',
  }));
  const outgoing = getOutgoingLinks(pageId, allPages).map(l => {
    const p = allPages.find(x => x.id === l.pageId);
    return { ...l, icon: p?.icon || '🔗', type: 'outgoing' };
  });
  return { backlinks, outgoing };
}

function extractPageText(page) {
  if (!page?.blocks) return page?.title || '';
  return page.blocks
    .filter(b => b.text)
    .map(b => b.text)
    .join('\n');
}

export function renderMention(text) {
  return text.replace(/\[\[([^\]]+)\]\]/g, '<span class="page-mention" data-mention="$1">$1</span>');
}

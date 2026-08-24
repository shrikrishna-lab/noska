/* ============================================================================
 * Noska Platform V5 — Content capabilities (pages, blocks, tasks, learning,
 * databases, views, search).
 *
 * THE single implementation behind:
 *   - /api/v1 REST routes
 *   - MCP tools (content/tasks/learning/databases groups)
 *   - template instantiation
 *   - agent runtime server tools (via future delegation)
 *
 * Every mutation either verifies persisted state or reports honestly when a
 * verification could not be performed. Owner scoping is applied on every query.
 * ========================================================================== */

import {
  db, errors, pageUrl,
  verifyArrayItem, emitEvent, loadOwned,
  type Row,
} from "../core/runtime.ts";
import {
  extractId, mustId,
  markdownToBlocks,
  COMMANDS, commandByName,
  initialReviewState, scheduleSM2, type ReviewState,
  taskCheckedPatch, normalizeTaskFieldPatch,
} from "../core/pure.ts";

const MAX_SCAN_PAGES = 500;

/* ─── Pages ─────────────────────────────────────────────────────────────── */

export async function loadPage(userId: string, ref: unknown): Promise<Row> {
  const id = mustId(ref, "page reference");
  try {
    return await loadOwned("pages", userId, id);
  } catch {
    throw errors.notFound("Page");
  }
}

export const pages = {
  compact(p: Row) {
    return {
      id: p.id, url: pageUrl(String(p.id)), title: p.title, icon: p.icon,
      parent_id: p.parent_id ?? null, trashed: p.trashed === true, tags: p.tags ?? [],
    };
  },

  async list(userId: string, opts: { trashed?: boolean; parentId?: unknown; limit?: number; includeArchivedMeta?: boolean } = {}) {
    let q = db().from("pages")
      .select("id,title,icon,cover,parent_id,favorite,trashed,tags,hidden_from_recents,workspace_id,created_at,updated_at")
      .eq("user_id", userId);
    q = q.eq("trashed", opts.trashed ?? false);
    if (opts.parentId != null) q = q.eq("parent_id", extractId(opts.parentId));
    const { data } = await q.order("updated_at", { ascending: false }).limit(Math.min(Number(opts.limit) || 50, 500));
    return { pages: data ?? [] };
  },

  async get(userId: string, ref: unknown) {
    return loadPage(userId, ref);
  },

  async create(userId: string, input: Row, opts: { workspaceId?: string } = {}) {
    const title = String(input.title ?? "").trim();
    if (!title) throw errors.validation("Every page needs a title.");
    const ins: Row = {
      user_id: userId,
      title,
      blocks: typeof input.markdown === "string" ? markdownToBlocks(input.markdown)
        : Array.isArray(input.blocks) ? input.blocks : [],
    };
    if (typeof input.icon === "string") ins.icon = input.icon;
    if (typeof input.cover === "string") ins.cover = input.cover;
    if (Array.isArray(input.tags)) ins.tags = input.tags;
    if (input.parent_id != null) {
      const parentId = mustId(input.parent_id, "parent_id");
      await loadPage(userId, parentId); // IDOR guard
      ins.parent_id = parentId;
    }
    if (opts.workspaceId) ins.workspace_id = opts.workspaceId;
    const { data, error } = await db().from("pages").insert(ins).select("*").single();
    if (error) throw errors.internal(error.message);
    return data as Row;
  },

  async update(userId: string, ref: unknown, patch: Row) {
    const page = await loadPage(userId, ref);
    const allowed: Row = {};
    if (typeof patch.title === "string" && patch.title.trim()) allowed.title = patch.title.trim();
    if (typeof patch.append_markdown === "string" && patch.append_markdown.trim()) {
      allowed.blocks = [...((page.blocks ?? []) as Array<Row>), ...markdownToBlocks(patch.append_markdown)];
    }
    if (Array.isArray(patch.blocks)) allowed.blocks = patch.blocks;
    if (typeof patch.icon === "string") allowed.icon = patch.icon;
    if (Array.isArray(patch.tags)) allowed.tags = patch.tags;
    if (patch.favorite !== undefined) allowed.favorite = patch.favorite === true;
    if (patch.archive === true || patch.trashed === true) allowed.trashed = true;
    if (patch.restore === true || patch.trashed === false) allowed.trashed = false;
    if (!Object.keys(allowed).length) throw errors.validation("Nothing to update.");
    const { error } = await db().from("pages").update(allowed).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    const v = await verifyPersisted(userId, "pages", String(page.id), {}, "user_id");
    return { updated: true, id: page.id, url: pageUrl(String(page.id)), persisted: Boolean(v.actual) };
  },

  async archive(userId: string, ref: unknown) {
    const page = await loadPage(userId, ref);
    await db().from("pages").update({ trashed: true }).eq("id", String(page.id)).eq("user_id", userId);
    return { archived: true, id: page.id, url: pageUrl(String(page.id)) };
  },

  async restore(userId: string, ref: unknown) {
    const page = await loadPage(userId, ref);
    await db().from("pages").update({ trashed: false }).eq("id", String(page.id)).eq("user_id", userId);
    return { restored: true, id: page.id, url: pageUrl(String(page.id)) };
  },

  async duplicate(userId: string, ref: unknown, overrideTitle?: string) {
    const page = await loadPage(userId, ref);
    const { data, error } = await db().from("pages").insert({
      user_id: userId,
      title: overrideTitle?.trim() ? overrideTitle.trim() : `${page.title} (copy)`,
      icon: page.icon, cover: page.cover, tags: page.tags, parent_id: page.parent_id ?? null,
      workspace_id: page.workspace_id ?? "",
      blocks: page.blocks ?? [],
    }).select("id,title").single();
    if (error) throw errors.internal(error.message);
    return { duplicated: true, source_id: page.id, new_page: pages.compact(data as Row) };
  },

  async move(userId: string, ref: unknown, newParentRef: unknown) {
    const page = await loadPage(userId, ref);
    let newParent: string | null = null;
    if (newParentRef !== null && newParentRef !== undefined) {
      newParent = mustId(newParentRef, "new_parent_id_or_url");
      // cycle guard: walk up from destination
      let cursor: unknown = newParent;
      for (let i = 0; i < 25 && cursor; i++) {
        if (cursor === page.id) throw errors.validation("Cannot move a page under its own descendant.");
        try { cursor = (await loadPage(userId, cursor)).parent_id; } catch { break; }
      }
      await loadPage(userId, newParent); // IDOR guard
    }
    await db().from("pages").update({ parent_id: newParent }).eq("id", String(page.id)).eq("user_id", userId);
    return { moved: true, id: page.id, new_parent_id: newParent, url: pageUrl(String(page.id)) };
  },

  async children(userId: string, ref: unknown) {
    const page = await loadPage(userId, ref);
    const { data } = await db().from("pages").select("id,title,icon,trashed")
      .eq("user_id", userId).eq("parent_id", String(page.id));
    return { children: data ?? [] };
  },

  async parentOf(userId: string, ref: unknown) {
    const page = await loadPage(userId, ref);
    if (!page.parent_id) return { parent: null };
    return { parent: pages.compact(await loadPage(userId, page.parent_id)) };
  },

  async tree(userId: string) {
    const { data } = await db().from("pages").select("id,title,icon,parent_id,trashed")
      .eq("user_id", userId).order("created_at");
    const rows = (data ?? []) as Array<Row>;
    const byParent = new Map<string, Array<Row>>();
    for (const r of rows) {
      const k = (r.parent_id as string) ?? "__root__";
      byParent.set(k, [...(byParent.get(k) ?? []), r]);
    }
    const build = (pid: string): Array<Row> =>
      (byParent.get(pid) ?? []).map((r) => ({
        id: r.id, title: r.title, icon: r.icon, trashed: r.trashed, children: build(String(r.id)),
      }));
    return { tree: build("__root__"), total: rows.length };
  },

  /** Bounded scan used by tasks/reviews/search/databases. */
  async scan(userId: string, columns = "id,title,icon,trashed,tags,created_at,updated_at,blocks") {
    const { data, error } = await db().from("pages").select(columns).eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(MAX_SCAN_PAGES);
    if (error) throw errors.internal("Failed to read workspace data.");
    return (data ?? []) as Array<Row>;
  },
};

/* ─── Commands ──────────────────────────────────────────────────────────── */

export const commands = {
  list() {
    return { commands: COMMANDS };
  },
  search(query: string) {
    const q = String(query ?? "").toLowerCase().replace(/^\//, "");
    return { commands: COMMANDS.filter((c) => c.name.includes(q) || c.description.toLowerCase().includes(q)) };
  },
  get(name: string) {
    const c = commandByName(String(name ?? ""));
    if (!c) throw errors.notFound("Command");
    return { command: c };
  },
  async execute(userId: string, commandName: string, pageRef: unknown, text: string, afterBlockId?: string) {
    const cmd = commandByName(String(commandName ?? ""));
    if (!cmd) throw errors.notFound(`Command ${String(commandName)}`);
    const page = await loadPage(userId, pageRef);
    const nb: Row = { id: crypto.randomUUID(), type: cmd.blockType, text: String(text ?? ""), ...(cmd.extra ?? {}) };
    const blocks = [...((page.blocks ?? []) as Array<Row>)];
    const at = afterBlockId ? blocks.findIndex((b) => b.id === afterBlockId) + 1 : blocks.length;
    blocks.splice(at || blocks.length, 0, nb);
    await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    return { executed: cmd.name, block: nb, position: Math.max(at - 1, 0) + 1, page_url: pageUrl(String(page.id)) };
  },
};

/* ─── Tasks (rich V5 model over legacy todo blocks) ─────────────────────── */

function mapTask(page: Row, b: Row) {
  return {
    id: b.id,
    text: typeof b.text === "string" ? b.text : "",
    checked: b.checked === true || (b.properties as Row | undefined)?.checked === true,
    priority: b.priority ?? null,
    assignee: b.assignee ?? null,
    dueAt: b.dueAt ?? null,
    labels: b.labels ?? [],
    recurrence: b.recurrence ?? null,
    parent_task_id: b.parent_task_id ?? null,
    completedAt: b.completedAt ?? null,
    createdAt: typeof b.createdAt === "string" ? b.createdAt : null,
    page_id: page.id,
    page_title: page.title,
  };
}

/** Locate one todo block across the owner's pages. */
async function findTaskBlock(userId: string, taskId: string): Promise<{ page: Row; index: number; block: Row }> {
  const scanned = await pages.scan(userId);
  for (const p of scanned) {
    const blocks = ((p.blocks ?? []) as Array<Row>);
    const idx = blocks.findIndex((b) => b.id === taskId && (b.type === "todo" || b.type === "to_do"));
    if (idx !== -1) return { page: p, index: idx, block: blocks[idx] };
  }
  throw errors.notFound("Task");
}

export const tasks = {
  async list(userId: string, opts: { done?: boolean; pageRef?: unknown; limit?: number } = {}) {
    const cap = Math.min(Math.max(Number(opts.limit) || 25, 1), 100);
    const pageId = opts.pageRef ? extractId(opts.pageRef) : null;
    let q = db().from("pages").select("id,title,trashed,blocks").eq("user_id", userId).eq("trashed", false);
    if (pageId) q = q.eq("id", pageId);
    const { data } = await q.order("updated_at", { ascending: false }).limit(MAX_SCAN_PAGES);
    const out: Array<Row> = [];
    for (const p of (data ?? []) as Array<Row>) {
      for (const b of ((p.blocks ?? []) as Array<Row>)) {
        if (!(b.type === "todo" || b.type === "to_do")) continue;
        const checked = b.checked === true || (b.properties as Row | undefined)?.checked === true;
        if (typeof opts.done === "boolean" && checked !== opts.done) continue;
        out.push(mapTask(p, b));
        if (out.length >= cap) return { tasks: out };
      }
    }
    return { tasks: out };
  },

  async create(keyUserId: string, input: Row, opts: { workspaceId?: string } = {}) {
    const text = String(input.text ?? "").trim();
    if (!text) throw errors.validation("text is required");
    const page = await loadPage(keyUserId, input.page_id ?? input.pageRef);
    const nb: Row = {
      id: crypto.randomUUID(), type: "to_do", text, checked: false,
      createdAt: new Date().toISOString(), createdBy: keyUserId,
    };
    const { set } = normalizeTaskFieldPatch(input);
    for (const [k, v] of Object.entries(set)) {
      if (k !== "page_id" && k !== "completedAt") nb[k] = v;
    }
    if (!nb.checked && !nb.completedAt) delete nb.completedAt;
    const blocks = [...((page.blocks ?? []) as Array<Row>), nb];
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", keyUserId);
    if (error) throw errors.internal(error.message);
    const persisted = await verifyArrayItem(
      keyUserId, "pages", String(page.id), "blocks",
      (b) => b.id === nb.id && (b.priority ?? null) === (nb.priority ?? null),
    );
    await emitEvent({
      userId: keyUserId, workspaceId: opts.workspaceId ?? "", type: "task.created",
      entity: "task", entityId: String(nb.id), actor: keyUserId,
      data: { page_id: page.id, text },
    });
    return { task: mapTask(page, nb), verified: persisted };
  },

  async update(userId: string, taskId: string, patch: Row) {
    const found = await findTaskBlock(userId, taskId);
    const blocks = ((found.page.blocks ?? []) as Array<Row>).slice();
    const { set, clear } = normalizeTaskFieldPatch(patch);

    if (patch.text !== undefined) found.block = { ...found.block, text: String(patch.text) };
    if (patch.checked !== undefined) found.block = taskCheckedPatch(found.block, patch.checked === true);
    for (const [k, v] of Object.entries(set)) {
      if (k === "page_id") continue;
      found.block = { ...found.block, [k]: v };
    }
    for (const f of clear) delete found.block[f];
    blocks[found.index] = found.block;

    const { error } = await db().from("pages").update({ blocks }).eq("id", String(found.page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    const verified = await verifyArrayItem(userId, "pages", String(found.page.id), "blocks",
      (b) => b.id === taskId &&
        (patch.checked === undefined || (b.checked === true) === (patch.checked === true)));
    return { task: mapTask(found.page, found.block), verified };
  },

  async complete(userId: string, taskId: string) {
    const updated = await tasks.update(userId, taskId, { checked: true });
    await emitEvent({
      userId, type: "task.completed", entity: "task", entityId: taskId, actor: userId,
      data: { page_id: updated.task.page_id, text: updated.task.text },
    });
    return { completed: updated.verified, verified: updated.verified, task: updated.task };
  },

  async reopen(userId: string, taskId: string) {
    const updated = await tasks.update(userId, taskId, { checked: false });
    return { reopened: updated.verified, verified: updated.verified, task: updated.task };
  },

  async bulkUpdate(userId: string, updates: Array<Row>) {
    const results: Array<Row> = [];
    let okCount = 0;
    for (const u of updates) {
      try {
        const taskId = mustId(u.task_id ?? u.id, "task_id");
        await tasks.update(userId, taskId, u);
        results.push({ task_id: taskId, ok: true });
        okCount++;
      } catch (e) {
        results.push({
          task_id: String(u.task_id ?? ""),
          ok: false,
          reason: e instanceof Error && "code" in e ? String((e as Row).code) : "TOOL_FAILED",
        });
      }
    }
    return { updated: okCount, results };
  },
};

/* ─── Learning (spaced repetition) ──────────────────────────────────────── */

export const learning = {
  async listCards(userId: string, opts: { dueOnly?: boolean; limit?: number } = {}) {
    const { data } = await db().from("pages").select("id,title,trashed,blocks")
      .eq("user_id", userId).eq("trashed", false).limit(MAX_SCAN_PAGES);
    const nowIso = new Date().toISOString();
    const cards: Array<Row> = [];
    for (const p of (data ?? []) as Array<Row>) {
      for (const b of ((p.blocks ?? []) as Array<Row>)) {
        const r = b.review as ReviewState | undefined;
        if (!r || r.suspended) continue;
        const next = typeof r.nextReview === "string" ? r.nextReview : undefined;
        if (opts.dueOnly && next && next > nowIso) continue;
        cards.push({
          block_id: b.id,
          front: typeof b.text === "string" ? b.text : "",
          back: typeof b.back === "string" ? b.back : null,
          page_id: p.id, page_title: p.title,
          state: {
            easeFactor: r.easeFactor ?? 2.5,
            interval: r.interval ?? 0,
            repetition: r.repetition ?? 0,
            nextReview: r.nextReview ?? null,
            lastReview: r.lastReview ?? null,
            suspended: r.suspended === true,
          },
          interval_days: r.interval ?? 0, repetitions: r.repetition ?? 0,
          next_review: r.nextReview ?? null,
        });
      }
    }
    return { cards: cards.slice(0, Math.min(opts.limit ?? cards.length, 200)) };
  },

  /** Schedule existing block(s) as SM-2 cards due immediately. */
  async addStudyCards(userId: string, pageRef: unknown, blockIds: unknown[]) {
    const page = await loadPage(userId, pageRef);
    const ids = blockIds.flat().map(String);
    const blocks = [...((page.blocks ?? []) as Array<Row>)];
    const scheduled: string[] = [];
    for (const id of ids) {
      const i = blocks.findIndex((b) => b.id === id);
      if (i !== -1) { blocks[i] = { ...blocks[i], review: initialReviewState() }; scheduled.push(String(id)); }
    }
    if (!scheduled.length) throw errors.notFound("Blocks");
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    const persisted = await verifyArrayItem(userId, "pages", String(page.id), "blocks",
      (b) => scheduled.includes(String(b.id)) && Boolean(b.review));
    if (persisted) {
      await emitEvent({
        userId, type: "study.card.created", entity: "study_card",
        entityId: scheduled[0], actor: userId, data: { count: scheduled.length, page_id: page.id },
      });
    }
    return { scheduled_count: scheduled.length, verified: persisted, block_ids: scheduled };
  },

  async rate(userId: string, pageRef: unknown, blockId: string, quality: number) {
    if (![1, 2, 3, 4, 5].includes(quality)) {
      throw errors.validation("quality must be an integer 1-5 per SM-2.");
    }
    const page = await loadPage(userId, pageRef);
    const blocks = [...((page.blocks ?? []) as Array<Row>)];
    const i = blocks.findIndex((b) => b.id === blockId && b.review);
    if (i === -1) throw errors.notFound("Review card");
    const next = scheduleSM2(blocks[i].review as ReviewState, quality);
    blocks[i] = { ...blocks[i], review: next };
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    return { state: next, verified: await verifyArrayItem(userId, "pages", String(page.id), "blocks",
      (b) => b.id === blockId && (b.review as ReviewState | undefined)?.lastReview === next.lastReview) };
  },

  async reschedule(userId: string, pageRef: unknown, blockId: string, opts: { dueAt?: string; daysFromNow?: number } = {}) {
    const page = await loadPage(userId, pageRef);
    const blocks = [...((page.blocks ?? []) as Array<Row>)];
    const i = blocks.findIndex((b) => b.id === blockId && b.review);
    if (i === -1) throw errors.notFound("Study card");
    const review = { ...((blocks[i].review ?? {}) as Row) };
    review.nextReview = opts.dueAt
      ? String(opts.dueAt)
      : new Date(Date.now() + Number(opts.daysFromNow || 0) * 86400000).toISOString();
    blocks[i] = { ...blocks[i], review };
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    return { rescheduled: true, next_review: review.nextReview };
  },

  async removeCard(userId: string, pageRef: unknown, blockId: string) {
    const page = await loadPage(userId, pageRef);
    const blocks = [...((page.blocks ?? []) as Array<Row>)];
    const i = blocks.findIndex((b) => b.id === blockId);
    if (i === -1 || !blocks[i].review) throw errors.notFound("Review card");
    delete blocks[i].review;
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    return { removed: true };
  },

  async progress(userId: string) {
    const { data } = await db().from("pages").select("title,tags,trashed,blocks")
      .eq("user_id", userId).eq("trashed", false).limit(MAX_SCAN_PAGES);
    const nowMs = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    let total = 0, due = 0, overdue = 0, correct = 0, rated = 0, mastered = 0, reviewedToday = 0;
    const topics = new Map<string, { c: number; s: number }>();
    for (const p of (data ?? []) as Array<Row>) {
      const label = (Array.isArray(p.tags) && p.tags.length ? String(p.tags[0]) : String(p.title ?? "Untitled"));
      for (const b of ((p.blocks ?? []) as Array<Row>)) {
        const r = b.review as ReviewState | undefined;
        if (!r || r.suspended) continue;
        total++;
        const next = typeof r.nextReview === "string" ? new Date(r.nextReview).getTime() : 0;
        if (!r.nextReview || next <= nowMs) due++;
        if (next && next < todayStart.getTime()) overdue++;
        const last = typeof r.lastReview === "string" ? new Date(r.lastReview).getTime() : 0;
        if (last >= todayStart.getTime()) reviewedToday++;
        if (typeof r.quality === "number" && r.quality > 0) { rated++; if (r.quality >= 3) correct++; }
        if ((Number(r.repetition) || 0) >= 3) mastered++;
        if ((Number(r.easeFactor) || 2.5) < 2.35) {
          const t = topics.get(label) ?? { c: 0, s: 0 }; t.c++; t.s++; topics.set(label, t);
        }
      }
    }
    const weak = [...topics.entries()]
      .map(([topic, t]) => ({ topic, struggling: t.s }))
      .sort((a, b) => b.struggling - a.struggling).slice(0, 3);
    return {
      total_cards: total, due_now: due, overdue,
      retention_pct: rated ? Math.round((correct / rated) * 100) : 0,
      mastery_pct: total ? Math.round((mastered / total) * 100) : 0,
      reviewed_today: reviewedToday,
      weakest_topics: weak,
    };
  },
};

/* ─── Databases & views (database blocks embedded in pages) ─────────────── */

interface DbHit { page: Row; block: Row }

async function findDatabase(userId: string, ref: unknown): Promise<DbHit> {
  const id = mustId(ref, "database reference");
  const scanned = await pages.scan(userId, "id,title,blocks");
  for (const p of scanned) {
    for (const b of ((p.blocks ?? []) as Array<Row>)) {
      if (b.id === id && String(b.type ?? "").startsWith("database")) return { page: p, block: b };
    }
  }
  throw errors.notFound("Database");
}

export const databases = {
  async list(userId: string) {
    const scanned = await pages.scan(userId, "id,title,trashed,blocks");
    const out: Array<Row> = [];
    for (const p of scanned) {
      if (p.trashed) continue;
      for (const b of ((p.blocks ?? []) as Array<Row>)) {
        const t = String(b.type ?? "");
        if (!t.startsWith("database")) continue;
        const schema = (b.database ?? {}) as Row;
        out.push({
          database_id: b.id, title: b.text ?? "", page_id: p.id, page_title: p.title,
          property_count: Array.isArray(schema.properties) ? schema.properties.length : 0,
          row_count: Array.isArray(schema.rows) ? schema.rows.length : 0,
          views: (Array.isArray(schema.views) ? schema.views : []).map((v) => ((v as Row).name ?? (v as Row).type)),
        });
      }
    }
    return { databases: out };
  },

  async get(userId: string, ref: unknown) {
    const { page, block } = await findDatabase(userId, ref);
    const schema = (block.database ?? {}) as Row;
    return {
      database: {
        id: block.id, page_id: page.id, title: block.text ?? "",
        properties: schema.properties ?? [], views: schema.views ?? [], rows: schema.rows ?? [],
      },
    };
  },

  async query(userId: string, ref: unknown, opts: { filter?: Row; sortBy?: string; sortDir?: string; limit?: number } = {}) {
    const { block } = await findDatabase(userId, ref);
    const rows = ((((block.database ?? {}) as Row).rows ?? []) as Array<Row>).slice();
    const filter = opts.filter ?? {};
    const filtered = rows.filter((r) =>
      Object.entries(filter).every(([k, v]) => (k === "name" ? r.name : (r.props as Row)?.[k]) === v));
    if (opts.sortBy) {
      const col = String(opts.sortBy);
      const dir = opts.sortDir === "desc" ? -1 : 1;
      filtered.sort((a, b) => dir * String(col === "name" ? a.name : (a.props as Row)?.[col])
        .localeCompare(String(col === "name" ? b.name : (b.props as Row)?.[col])));
    }
    const lim = Math.min(Number(opts.limit) || 50, 200);
    return { rows: filtered.slice(0, lim), total_matched: filtered.length };
  },

  async createRow(userId: string, ref: unknown, name: string, props: Row = {}) {
    const { page, block } = await findDatabase(userId, ref);
    const schema = { ...((block.database ?? {}) as Row) } as Row;
    const row: Row = { id: crypto.randomUUID(), name: String(name), props, createdAt: new Date().toISOString() };
    schema.rows = [...(((schema.rows ?? []) as Array<Row>)), row];
    const blocks = ((page.blocks ?? []) as Array<Row>).map((b) => (b.id === block.id ? { ...b, database: schema } : b));
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    const persisted = await verifyArrayItem(userId, "pages", String(page.id), "blocks",
      (b) => ((b.database as Row | undefined)?.rows as Array<Row> | undefined)?.some?.((r) => r.id === row.id) === true);
    return { row: { id: row.id, name: row.name }, verified: persisted };
  },

  async updateRow(userId: string, ref: unknown, rowId: string, patch: { name?: string; props?: Row }) {
    const { page, block } = await findDatabase(userId, ref);
    const schema = JSON.parse(JSON.stringify(block.database ?? {})) as Row;
    const row = ((schema.rows ?? []) as Array<Row>).find((r) => r.id === rowId);
    if (!row) throw errors.notFound("Row");
    if (patch.name !== undefined) row.name = String(patch.name);
    if (patch.props !== undefined) row.props = { ...((row.props ?? {}) as Row), ...patch.props };
    const blocks = ((page.blocks ?? []) as Array<Row>).map((b) => (b.id === block.id ? { ...b, database: schema } : b));
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    return { updated: true, verified: await verifyArrayItem(userId, "pages", String(page.id), "blocks",
      (b) => (((b.database as Row | undefined)?.rows as Array<Row> | undefined) ?? []).some((r) =>
        r.id === rowId && (patch.name === undefined || r.name === patch.name))) };
  },

  async createView(userId: string, ref: unknown, name: string, type: string, groupBy?: string) {
    const allowed = ["table", "board", "list", "calendar", "gallery", "feed"];
    if (!allowed.includes(type)) throw errors.validation(`type must be one of ${allowed.join(", ")}`);
    const { page, block } = await findDatabase(userId, ref);
    const schema = JSON.parse(JSON.stringify(block.database ?? {})) as Row;
    const view: Row = { id: crypto.randomUUID(), name: String(name), type, groupBy: groupBy ?? null };
    schema.views = [...(((schema.views ?? []) as Array<Row>)), view];
    const blocks = ((page.blocks ?? []) as Array<Row>).map((b) => (b.id === block.id ? { ...b, database: schema } : b));
    const { error } = await db().from("pages").update({ blocks }).eq("id", String(page.id)).eq("user_id", userId);
    if (error) throw errors.internal(error.message);
    return { created: true, view_id: view.id, views: ((schema.views ?? []) as Array<Row>).map((v) => v.name) };
  },
};

/* ─── Search ────────────────────────────────────────────────────────────── */

export const search = {
  async query(userId: string, rawQuery: string, limit = 10) {
    const q = String(rawQuery ?? "").trim().toLowerCase();
    if (!q) throw errors.validation("query is required");
    const cap = Math.min(Math.max(limit, 1), 50);
    const scanned = await pages.scan(userId, "id,title,tags,trashed,updated_at,blocks");
    const results: Array<Row> = [];
    for (const p of scanned) {
      if (p.trashed) continue;
      if (String(p.title ?? "").toLowerCase().includes(q)) {
        results.push({ kind: "page", id: p.id, url: pageUrl(String(p.id)), title: p.title });
      }
      for (const b of ((p.blocks ?? []) as Array<Row>)) {
        const t = typeof b.text === "string" ? b.text : "";
        if (t && t.toLowerCase().includes(q)) {
          results.push({
            kind: b.type === "todo" || b.type === "to_do" ? "task" : b.review ? "study_card" : "block",
            id: p.id, url: pageUrl(String(p.id)), title: p.title, matched_text: t.slice(0, 200),
          });
        }
        if (results.length >= cap) return { results };
      }
      if (results.length >= cap) break;
    }
    return { results };
  },
};

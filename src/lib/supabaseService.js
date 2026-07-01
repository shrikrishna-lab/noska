import { supabase } from "./supabase";

// ============ PAGES ============

export async function fetchPages(userId) {
  let query = supabase.from("pages").select("*");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(mapPageFromDb);
}

export async function savePage(page, userId) {
  const dbPage = mapPageToDb(page);
  if (userId) dbPage.user_id = userId;
  const { data, error } = await supabase
    .from("pages")
    .upsert(dbPage, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return mapPageFromDb(data);
}

export async function savePages(pages, userId) {
  if (!pages.length) return [];
  const dbPages = pages
    .map((p) => {
      const db = mapPageToDb(p);
      if (userId) db.user_id = userId;
      return db;
    })
    .sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
  const { data, error } = await supabase
    .from("pages")
    .upsert(dbPages, { onConflict: "id" })
    .select();
  if (error) throw error;
  return (data || []).map(mapPageFromDb);
}

export async function deletePage(id) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

// ============ WORKSPACE SETTINGS ============

export async function fetchSettings() {
  const { data, error } = await supabase.from("workspace_settings").select("*");
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveSetting(key, value) {
  const { error } = await supabase
    .from("workspace_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

// ============ AI CHATS ============

export async function fetchAIChats(userId) {
  let query = supabase.from("ai_chats").select("*");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    name: c.name || "New chat",
    messages: c.messages || [],
    pinned: c.pinned || false,
    archived: c.archived || false,
    chatType: c.chat_type || "private",
    pageId: c.page_id || null,
    pageTitle: c.page_title || null,
    collaborators: c.collaborators || [],
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

export async function saveAIChat(chat, userId) {
  const { data, error } = await supabase
    .from("ai_chats")
    .upsert({
      id: chat.id,
      name: chat.name || chat.title || "New chat",
      messages: chat.messages || [],
      pinned: chat.pinned || false,
      archived: chat.archived || false,
      chat_type: chat.chatType || "private",
      page_id: chat.pageId || null,
      page_title: chat.pageTitle || null,
      collaborators: chat.collaborators || [],
      ...(userId ? { user_id: userId } : {})
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    messages: data.messages,
    pinned: data.pinned || false,
    archived: data.archived || false,
    chatType: data.chat_type || "private",
    pageId: data.page_id || null,
    pageTitle: data.page_title || null,
    collaborators: data.collaborators || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function saveAIChats(chats, userId) {
  if (!chats.length) return;
  const dbChats = chats.map((c) => ({
    id: c.id,
    name: c.name || c.title || "New chat",
    messages: c.messages || [],
    pinned: c.pinned || false,
    archived: c.archived || false,
    chat_type: c.chatType || "private",
    page_id: c.pageId || null,
    page_title: c.pageTitle || null,
    collaborators: c.collaborators || [],
    ...(userId ? { user_id: userId } : {})
  }));
  const { error } = await supabase
    .from("ai_chats")
    .upsert(dbChats, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAIChat(id) {
  const { error } = await supabase.from("ai_chats").delete().eq("id", id);
  if (error) throw error;
}

// ============ AI MEMORY ============

export async function fetchAIMemory() {
  const { data, error } = await supabase
    .from("ai_memory")
    .select("*")
    .order("importance", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  const map = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveAIMemoryEntry(key, value, category = "general", importance = 0.5, ttlHours = null) {
  const entry = {
    key,
    value: typeof value === "object" ? value : { text: value },
    category,
    importance,
    expires_at: ttlHours ? new Date(Date.now() + ttlHours * 3600000).toISOString() : null
  };
  const { error } = await supabase
    .from("ai_memory")
    .upsert(entry, { onConflict: "key" });
  if (error && error.code !== "42P01") throw error;
}

export async function saveAIMemory(entries) {
  if (!entries.length) return;
  const dbRows = entries.map(e => ({
    key: e.key,
    value: typeof e.value === "object" ? e.value : { text: e.value },
    category: e.category || "general",
    importance: e.importance ?? 0.5,
    expires_at: e.ttlHours ? new Date(Date.now() + e.ttlHours * 3600000).toISOString() : null
  }));
  const { error } = await supabase.from("ai_memory").upsert(dbRows, { onConflict: "key" });
  if (error && error.code !== "42P01") throw error;
}

export async function deleteAIMemory(key) {
  const { error } = await supabase.from("ai_memory").delete().eq("key", key);
  if (error && error.code !== "42P01") throw error;
}

export async function clearExpiredMemory() {
  const { error } = await supabase
    .from("ai_memory")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
  if (error && error.code !== "42P01") throw error;
}

// ============ USER PROFILES ============

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

export async function upsertUserProfile(profile) {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: profile.userId,
      user_name: profile.userName || 'Workspace User',
      email: profile.email || null,
      avatar_url: profile.avatarUrl || null,
      onboarding_complete: profile.onboardingComplete ?? false,
      use_case: profile.useCase || null,
      workspace_name: profile.workspaceName || 'My Workspace',
      preferences: profile.preferences || {}
    }, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOnboardingComplete(userId, useCase, workspaceName) {
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      onboarding_complete: true,
      use_case: useCase || null,
      workspace_name: workspaceName || 'My Workspace',
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  if (error) throw error;
}

// ============ CREATOR PROFILES ============

export async function fetchCreatorProfile(userId) {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

export async function fetchCreatorProfileById(id) {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

export async function upsertCreatorProfile(profile) {
  const { data, error } = await supabase
    .from("creator_profiles")
    .upsert({
      user_id: profile.userId,
      display_name: profile.displayName || 'Creator',
      photo_url: profile.photoUrl || '',
      cover_url: profile.coverUrl || '',
      bio: profile.bio || '',
      links: profile.links || [],
      payout_account_id: profile.payoutAccountId || '',
      payout_status: profile.payoutStatus || 'not_setup'
    }, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============ MARKETPLACE TEMPLATES ============

export async function fetchMarketplaceTemplates(filters = {}) {
  let query = supabase.from("marketplace_templates").select("*");
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "published");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.type) query = query.eq("template_type", filters.type);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  const orderCol = filters.orderBy || "add_count";
  const orderDir = filters.orderDir || "desc";
  query = query.order(orderCol, { ascending: orderDir === "asc" });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchTemplateById(id) {
  const { data, error } = await supabase
    .from("marketplace_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMarketplaceTemplate(template) {
  const { data, error } = await supabase
    .from("marketplace_templates")
    .upsert({
      id: template.id,
      owner_id: template.ownerId,
      title: template.title,
      description: template.description || '',
      category: template.category || 'uncategorized',
      language: template.language || 'en',
      price: template.price ?? 0,
      status: template.status || 'draft',
      screenshots: template.screenshots || [],
      video_url: template.videoUrl || '',
      source_page_id: template.sourcePageId,
      template_type: template.templateType || 'page_template',
      access_locked: template.accessLocked || false,
      add_count: template.addCount || 0,
      rating: template.rating || 0,
      rating_count: template.ratingCount || 0
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMarketplaceTemplate(id) {
  const { error } = await supabase.from("marketplace_templates").delete().eq("id", id);
  if (error) throw error;
}

// ============ TEMPLATE ADDITIONS ============

export async function fetchTemplateAdditions(userId) {
  const { data, error } = await supabase
    .from("template_additions")
    .select("*")
    .eq("added_by_user_id", userId)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveTemplateAddition(addition) {
  const { data, error } = await supabase
    .from("template_additions")
    .upsert({
      id: addition.id,
      template_id: addition.templateId,
      workspace_id: addition.workspaceId || '',
      added_by_user_id: addition.addedByUserId,
      price_paid: addition.pricePaid ?? 0,
      status: addition.status || 'active',
      refund_eligible_until: addition.refundEligibleUntil || new Date(Date.now() + 14 * 86400000).toISOString()
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function requestRefund(additionId, reason) {
  const addition = await supabase.from("template_additions").select("*").eq("id", additionId).single();
  if (addition.error) throw addition.error;
  const { data, error } = await supabase
    .from("template_refunds")
    .insert({
      addition_id: additionId,
      template_id: addition.data.template_id,
      requester_user_id: addition.data.added_by_user_id,
      reason: reason || ''
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("template_additions").update({ status: "refunded" }).eq("id", additionId);
  return data;
}

// ============ AGENTS ============

export async function fetchAgents(filters = {}) {
  let query = supabase.from("agents").select("*");
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.workspaceId) query = query.eq("workspace_id", filters.workspaceId);
  if (filters.type) query = query.eq("type", filters.type);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAgentById(id) {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAgent(agent) {
  const { data, error } = await supabase
    .from("agents")
    .upsert({
      id: agent.id,
      type: agent.type || 'custom',
      owner_id: agent.ownerId,
      workspace_id: agent.workspaceId || '',
      name: agent.name,
      description: agent.description || '',
      icon: agent.icon || '🤖',
      instructions: agent.instructions || '',
      model: agent.model || 'default',
      status: agent.status || 'active',
      credit_cap_per_run: agent.creditCapPerRun ?? 100,
      credit_cap_per_month: agent.creditCapPerMonth ?? 10000
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgent(id) {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT TRIGGERS ============

export async function fetchAgentTriggers(agentId) {
  const { data, error } = await supabase
    .from("agent_triggers")
    .select("*")
    .eq("agent_id", agentId);
  if (error) throw error;
  return data || [];
}

export async function saveAgentTrigger(trigger) {
  const { data, error } = await supabase
    .from("agent_triggers")
    .upsert({
      id: trigger.id,
      agent_id: trigger.agentId,
      type: trigger.type,
      config: trigger.config || {}
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgentTrigger(id) {
  const { error } = await supabase.from("agent_triggers").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT ACCESS GRANTS ============

export async function fetchAgentAccessGrants(agentId) {
  const { data, error } = await supabase
    .from("agent_access_grants")
    .select("*")
    .eq("agent_id", agentId);
  if (error) throw error;
  return data || [];
}

export async function saveAgentAccessGrant(grant) {
  const { data, error } = await supabase
    .from("agent_access_grants")
    .upsert({
      id: grant.id,
      agent_id: grant.agentId,
      resource_type: grant.resourceType,
      resource_id: grant.resourceId,
      level: grant.level
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgentAccessGrant(id) {
  const { error } = await supabase.from("agent_access_grants").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT RUN LOGS ============

export async function fetchAgentRunLogs(agentId) {
  const { data, error } = await supabase
    .from("agent_run_logs")
    .select("*")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveAgentRunLog(log) {
  const { data, error } = await supabase
    .from("agent_run_logs")
    .upsert({
      id: log.id,
      agent_id: log.agentId,
      triggered_by: log.triggeredBy || '',
      started_at: log.startedAt || new Date().toISOString(),
      finished_at: log.finishedAt || null,
      steps_taken: log.stepsTaken || 0,
      credits_used: log.creditsUsed || 0,
      resources_read: log.resourcesRead || [],
      resources_written: log.resourcesWritten || [],
      status: log.status || 'running'
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ MAPPERS ============

function mapPageFromDb(db) {
  return {
    id: db.id,
    title: db.title || "Untitled",
    icon: db.icon || "📝",
    cover: db.cover !== undefined ? db.cover : "linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)",
    parentId: db.parent_id,
    favorite: db.favorite || false,
    trashed: db.trashed || false,
    tags: db.tags || [],
    hiddenFromRecents: db.hidden_from_recents || false,
    offline: db.offline || false,
    isEncrypted: db.is_encrypted || false,
    encryptedBlocks: db.encrypted_blocks,
    iv: db.iv,
    salt: db.salt,
    isLocked: db.is_locked || false,
    blocks: db.blocks || [],
    lineage: db.lineage || [],
    updatedAt: db.updated_at,
    createdAt: db.created_at
  };
}

function mapPageToDb(page) {
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    cover: page.cover,
    parent_id: page.parentId || null,
    favorite: page.favorite || false,
    trashed: page.trashed || false,
    tags: page.tags || [],
    hidden_from_recents: page.hiddenFromRecents || false,
    offline: page.offline || false,
    is_encrypted: page.isEncrypted || false,
    encrypted_blocks: page.encryptedBlocks || null,
    iv: page.iv || null,
    salt: page.salt || null,
    is_locked: page.isLocked || false,
    blocks: page.blocks || [],
    lineage: page.lineage || []
  };
}

// ============ STORAGE (images, files) ============

const IMAGES_BUCKET = "images";

export async function ensureImagesBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === IMAGES_BUCKET)) {
    await supabase.storage.createBucket(IMAGES_BUCKET, { public: true });
  }
}

export async function uploadImage(file, userId) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId || "anonymous"}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(data.path);
  return publicUrl;
}

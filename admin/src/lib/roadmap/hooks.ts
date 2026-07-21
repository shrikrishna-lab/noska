import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";
import type {
  RoadmapFeature, RoadmapSprint, RoadmapRelease,
  RoadmapComment, RoadmapChecklistItem, RoadmapActivity,
  RoadmapDependency, RoadmapStats, RoadmapSelectResult,
} from "./types";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session");
  return t;
}

const KEYS = {
  features: (filters?: Record<string, unknown>) => ["roadmap", "features", filters],
  stats: ["roadmap", "stats"] as const,
  sprints: ["roadmap", "sprints"] as const,
  releases: ["roadmap", "releases"] as const,
  labels: ["roadmap", "labels"] as const,
  comments: (id: string) => ["roadmap", "comments", id] as const,
  checklists: (id: string) => ["roadmap", "checklists", id] as const,
  activity: (id: string) => ["roadmap", "activity", id] as const,
  dependencies: (id: string) => ["roadmap", "deps", id] as const,
  detail: (id: string) => ["roadmap", "detail", id] as const,
};

// ── Features ──

export function useRoadmapFeatures(filters?: Record<string, unknown>, search?: string, sortBy = "created_at", sortDir = "desc") {
  return useQuery({
    queryKey: KEYS.features({ ...filters, search, sortBy, sortDir }),
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return { data: [], total: 0, page: 1, page_size: 100 } as RoadmapSelectResult;
      const { data, error } = await supabase.rpc("roadmap_select", {
        p_session_token: token(),
        p_filters: filters ?? {},
        p_search: search ?? null,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
        p_page: 1,
        p_page_size: 500,
      });
      if (error) throw error;
      return data as unknown as RoadmapSelectResult;
    },
  });
}

export function useRoadmapFeature(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return null;
      const { data, error } = await supabase.rpc("roadmap_select", {
        p_session_token: token(),
        p_filters: { status: "all" },
        p_search: null,
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_page: 1,
        p_page_size: 500,
      });
      if (error) throw error;
      const result = data as unknown as RoadmapSelectResult;
      return result.data.find((f: RoadmapFeature) => f.id === id) ?? null;
    },
  });
}

export function useCreateRoadmapFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_insert", {
        p_session_token: token(), p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });
}

export function useUpdateRoadmapFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_update", {
        p_session_token: token(), p_id: id, p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });
}

export function useDeleteRoadmapFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_delete", {
        p_session_token: token(), p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });
}

export function useUpdateRoadmapStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, sort_order }: { id: string; status: string; sort_order?: number }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_update_status", {
        p_session_token: token(), p_id: id, p_status: status,
        p_sort_order: sort_order ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });
}

// ── Stats ──

export function useRoadmapStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return null;
      const { data, error } = await supabase.rpc("roadmap_get_stats", { p_session_token: token() });
      if (error) throw error;
      return data as RoadmapStats;
    },
    refetchInterval: 30000,
  });
}

// ── Sprints ──

export function useRoadmapSprints() {
  return useQuery({
    queryKey: KEYS.sprints,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_get_sprints", { p_session_token: token() });
      if (error) throw error;
      return (data ?? []) as RoadmapSprint[];
    },
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, start_date, end_date }: { name: string; start_date?: string; end_date?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_sprint_create", {
        p_session_token: token(), p_name: name,
        p_start_date: start_date ?? null, p_end_date: end_date ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap", "sprints"] }),
  });
}

export function useCloseSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_sprint_close", {
        p_session_token: token(), p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap", "sprints"] });
      qc.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });
}

// ── Releases ──

export function useRoadmapReleases() {
  return useQuery({
    queryKey: KEYS.releases,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_get_releases", { p_session_token: token() });
      if (error) throw error;
      return (data ?? []) as RoadmapRelease[];
    },
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, version, description }: { name: string; version: string; description?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_release_create", {
        p_session_token: token(), p_name: name, p_version: version,
        p_description: description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap", "releases"] }),
  });
}

export function usePublishRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, release_notes }: { id: string; release_notes?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_release_publish", {
        p_session_token: token(), p_id: id, p_release_notes: release_notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
      qc.invalidateQueries({ queryKey: ["roadmap", "releases"] });
      qc.invalidateQueries({ queryKey: ["roadmap", "stats"] });
    },
  });
}

// ── Labels ──

export function useRoadmapLabels() {
  return useQuery({
    queryKey: KEYS.labels,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_get_labels", { p_session_token: token() });
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });
}

// ── Comments ──

export function useRoadmapComments(featureId: string | null) {
  return useQuery({
    queryKey: KEYS.comments(featureId ?? ""),
    enabled: !!featureId,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_comments_get", {
        p_session_token: token(), p_feature_id: featureId,
      });
      if (error) throw error;
      return (data ?? []) as RoadmapComment[];
    },
  });
}

export function useAddRoadmapComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feature_id, content, parent_id }: { feature_id: string; content: string; parent_id?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_comment_add", {
        p_session_token: token(), p_feature_id: feature_id,
        p_content: content, p_parent_id: parent_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["roadmap", "comments", variables.feature_id] });
      qc.invalidateQueries({ queryKey: ["roadmap", "activity", variables.feature_id] });
    },
  });
}

// ── Checklists ──

export function useRoadmapChecklists(featureId: string | null) {
  return useQuery({
    queryKey: KEYS.checklists(featureId ?? ""),
    enabled: !!featureId,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_checklists_get", {
        p_session_token: token(), p_feature_id: featureId,
      });
      if (error) throw error;
      return (data ?? []) as RoadmapChecklistItem[];
    },
  });
}

export function useToggleChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_checklist_toggle", {
        p_session_token: token(), p_id: id, p_completed: completed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap", "checklists"] });
    },
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feature_id, title, section }: { feature_id: string; title: string; section?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_checklist_add", {
        p_session_token: token(), p_feature_id: feature_id,
        p_title: title, p_section: section ?? "General",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["roadmap", "checklists", variables.feature_id] });
    },
  });
}

// ── Activity ──

export function useRoadmapActivity(featureId: string | null) {
  return useQuery({
    queryKey: KEYS.activity(featureId ?? ""),
    enabled: !!featureId,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_get_activity", {
        p_session_token: token(), p_feature_id: featureId,
      });
      if (error) throw error;
      return (data ?? []) as RoadmapActivity[];
    },
  });
}

// ── Dependencies ──

export function useRoadmapDependencies(featureId: string | null) {
  return useQuery({
    queryKey: KEYS.dependencies(featureId ?? ""),
    enabled: !!featureId,
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("roadmap_get_dependencies", {
        p_session_token: token(), p_feature_id: featureId,
      });
      if (error) throw error;
      return (data ?? []) as RoadmapDependency[];
    },
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feature_id, depends_on_id, type }: { feature_id: string; depends_on_id: string; type?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("roadmap_add_dependency", {
        p_session_token: token(), p_feature_id: feature_id,
        p_depends_on_id: depends_on_id, p_type: type ?? "blocks",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap", "deps"] });
    },
  });
}

// ── Filters hook ──

export function useFeatureFilters(features: RoadmapFeature[]) {
  return useMemo(() => {
    const owners = new Set<string>();
    const categories = new Set<string>();
    const allLabels = new Set<string>();
    for (const f of features) {
      if (f.owner) owners.add(f.owner);
      if (f.category) categories.add(f.category);
      if (f.labels) for (const l of f.labels) allLabels.add(l);
    }
    return {
      owners: Array.from(owners).sort(),
      categories: Array.from(categories).sort(),
      labels: Array.from(allLabels).sort(),
    };
  }, [features]);
}

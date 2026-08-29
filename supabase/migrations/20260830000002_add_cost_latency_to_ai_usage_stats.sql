-- Migration: 20260830000002_add_cost_latency_to_ai_usage_stats.sql
-- Description: Add cost and latency tracking columns to user_ai_usage_stats

alter table public.user_ai_usage_stats
  add column if not exists total_cost numeric default 0,
  add column if not exists avg_latency_ms integer default 0;

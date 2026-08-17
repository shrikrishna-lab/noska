export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_access_grants: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          level: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          level: string
          resource_id: string
          resource_type: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          level?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_access_grants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_run_logs: {
        Row: {
          agent_id: string
          credits_used: number | null
          finished_at: string | null
          id: string
          resources_read: Json | null
          resources_written: Json | null
          started_at: string | null
          status: string | null
          steps_taken: number | null
          triggered_by: string | null
        }
        Insert: {
          agent_id: string
          credits_used?: number | null
          finished_at?: string | null
          id?: string
          resources_read?: Json | null
          resources_written?: Json | null
          started_at?: string | null
          status?: string | null
          steps_taken?: number | null
          triggered_by?: string | null
        }
        Update: {
          agent_id?: string
          credits_used?: number | null
          finished_at?: string | null
          id?: string
          resources_read?: Json | null
          resources_written?: Json | null
          started_at?: string | null
          status?: string | null
          steps_taken?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_triggers: {
        Row: {
          agent_id: string
          config: Json | null
          created_at: string | null
          id: string
          type: string
        }
        Insert: {
          agent_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          type: string
        }
        Update: {
          agent_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_triggers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string | null
          credit_cap_per_month: number | null
          credit_cap_per_run: number | null
          description: string | null
          icon: string | null
          id: string
          instructions: string | null
          model: string | null
          name: string
          owner_id: string
          status: string | null
          type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          credit_cap_per_month?: number | null
          credit_cap_per_run?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          name: string
          owner_id: string
          status?: string | null
          type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          credit_cap_per_month?: number | null
          credit_cap_per_run?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          name?: string
          owner_id?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_chats: {
        Row: {
          archived: boolean | null
          chat_type: string | null
          collaborators: Json | null
          created_at: string | null
          id: string
          messages: Json | null
          name: string | null
          page_id: string | null
          page_title: string | null
          pinned: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived?: boolean | null
          chat_type?: string | null
          collaborators?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          name?: string | null
          page_id?: string | null
          page_title?: string | null
          pinned?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived?: boolean | null
          chat_type?: string | null
          collaborators?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          name?: string | null
          page_id?: string | null
          page_title?: string | null
          pinned?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          category: string
          created_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          ai_completion_tokens: number | null
          ai_cost: number | null
          ai_latency_ms: number | null
          ai_model: string | null
          ai_prompt_tokens: number | null
          ai_provider: string | null
          ai_tool_calls: Json | null
          ai_undo_ref: string | null
          block_id: string | null
          block_type: string | null
          content_after: Json | null
          content_before: Json | null
          created_at: string | null
          detail: string | null
          id: string
          page_id: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          ai_completion_tokens?: number | null
          ai_cost?: number | null
          ai_latency_ms?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          ai_provider?: string | null
          ai_tool_calls?: Json | null
          ai_undo_ref?: string | null
          block_id?: string | null
          block_type?: string | null
          content_after?: Json | null
          content_before?: Json | null
          created_at?: string | null
          detail?: string | null
          id?: string
          page_id?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          ai_completion_tokens?: number | null
          ai_cost?: number | null
          ai_latency_ms?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          ai_provider?: string | null
          ai_tool_calls?: Json | null
          ai_undo_ref?: string | null
          block_id?: string | null
          block_type?: string | null
          content_after?: Json | null
          content_before?: Json | null
          created_at?: string | null
          detail?: string | null
          id?: string
          page_id?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      block_locks: {
        Row: {
          acquired_at: string | null
          block_id: string
          expires_at: string | null
          id: string
          page_id: string | null
          user_color: string
          user_id: string
          user_name: string
        }
        Insert: {
          acquired_at?: string | null
          block_id: string
          expires_at?: string | null
          id?: string
          page_id?: string | null
          user_color?: string
          user_id: string
          user_name: string
        }
        Update: {
          acquired_at?: string | null
          block_id?: string
          expires_at?: string | null
          id?: string
          page_id?: string | null
          user_color?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_locks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_sessions: {
        Row: {
          current_block_id: string | null
          id: string
          last_activity: string | null
          page_id: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_avatar: string | null
          user_color: string
          user_id: string
          user_name: string
        }
        Insert: {
          current_block_id?: string | null
          id?: string
          last_activity?: string | null
          page_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_avatar?: string | null
          user_color?: string
          user_id: string
          user_name: string
        }
        Update: {
          current_block_id?: string | null
          id?: string
          last_activity?: string | null
          page_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_avatar?: string | null
          user_color?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string
          id: string
          links: Json | null
          payout_account_id: string | null
          payout_status: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          links?: Json | null
          payout_account_id?: string | null
          payout_status?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          links?: Json | null
          payout_account_id?: string | null
          payout_status?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_templates: {
        Row: {
          access_locked: boolean | null
          add_count: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          language: string | null
          owner_id: string
          price: number | null
          rating: number | null
          rating_count: number | null
          screenshots: Json | null
          source_page_id: string | null
          status: string | null
          template_type: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          access_locked?: boolean | null
          add_count?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string | null
          owner_id: string
          price?: number | null
          rating?: number | null
          rating_count?: number | null
          screenshots?: Json | null
          source_page_id?: string | null
          status?: string | null
          template_type?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          access_locked?: boolean | null
          add_count?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string | null
          owner_id?: string
          price?: number | null
          rating?: number | null
          rating_count?: number | null
          screenshots?: Json | null
          source_page_id?: string | null
          status?: string | null
          template_type?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_invites: {
        Row: {
          created_at: string
          id: string
          invitee_user_id: string
          invitee_username: string
          inviter_user_id: string
          inviter_username: string | null
          page_id: string
          page_title: string
          responded_at: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_user_id: string
          invitee_username: string
          inviter_user_id: string
          inviter_username?: string | null
          page_id: string
          page_title?: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_user_id?: string
          invitee_username?: string
          inviter_user_id?: string
          inviter_username?: string | null
          page_id?: string
          page_title?: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_invites_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_permissions: {
        Row: {
          can_audit: boolean | null
          can_comment: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_manage_collaborators: boolean | null
          can_share: boolean | null
          can_use_ai: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          page_id: string | null
          role: string
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          can_audit?: boolean | null
          can_comment?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_manage_collaborators?: boolean | null
          can_share?: boolean | null
          can_use_ai?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          can_audit?: boolean | null
          can_comment?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_manage_collaborators?: boolean | null
          can_share?: boolean | null
          can_use_ai?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_permissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          blocks: Json | null
          created_at: string | null
          description: string | null
          id: string
          page_id: string | null
          page_snapshot: Json | null
          title: string | null
          user_id: string
          user_name: string
          version_number: number
        }
        Insert: {
          blocks?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          page_id?: string | null
          page_snapshot?: Json | null
          title?: string | null
          user_id: string
          user_name: string
          version_number: number
        }
        Update: {
          blocks?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          page_id?: string | null
          page_snapshot?: Json | null
          title?: string | null
          user_id?: string
          user_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          blocks: Json | null
          cover: string | null
          created_at: string | null
          encrypted_blocks: string | null
          favorite: boolean | null
          hidden_from_recents: boolean | null
          icon: string | null
          id: string
          is_encrypted: boolean | null
          is_locked: boolean | null
          iv: string | null
          lineage: Json | null
          offline: boolean | null
          parent_id: string | null
          salt: string | null
          tags: Json | null
          title: string
          trashed: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          blocks?: Json | null
          cover?: string | null
          created_at?: string | null
          encrypted_blocks?: string | null
          favorite?: boolean | null
          hidden_from_recents?: boolean | null
          icon?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_locked?: boolean | null
          iv?: string | null
          lineage?: Json | null
          offline?: boolean | null
          parent_id?: string | null
          salt?: string | null
          tags?: Json | null
          title?: string
          trashed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          blocks?: Json | null
          cover?: string | null
          created_at?: string | null
          encrypted_blocks?: string | null
          favorite?: boolean | null
          hidden_from_recents?: boolean | null
          icon?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_locked?: boolean | null
          iv?: string | null
          lineage?: Json | null
          offline?: boolean | null
          parent_id?: string | null
          salt?: string | null
          tags?: Json | null
          title?: string
          trashed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      template_additions: {
        Row: {
          added_at: string | null
          added_by_user_id: string
          id: string
          price_paid: number | null
          refund_eligible_until: string | null
          status: string | null
          template_id: string
          workspace_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by_user_id: string
          id?: string
          price_paid?: number | null
          refund_eligible_until?: string | null
          status?: string | null
          template_id: string
          workspace_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by_user_id?: string
          id?: string
          price_paid?: number | null
          refund_eligible_until?: string | null
          status?: string | null
          template_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_additions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_refunds: {
        Row: {
          addition_id: string
          created_at: string | null
          id: string
          reason: string | null
          requester_user_id: string
          resolved_at: string | null
          status: string | null
          template_id: string
        }
        Insert: {
          addition_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          requester_user_id: string
          resolved_at?: string | null
          status?: string | null
          template_id: string
        }
        Update: {
          addition_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          requester_user_id?: string
          resolved_at?: string | null
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_refunds_addition_id_fkey"
            columns: ["addition_id"]
            isOneToOne: false
            referencedRelation: "template_additions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_refunds_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          last_active_at: string | null
          latitude: number | null
          longitude: number | null
          onboarding_complete: boolean | null
          postal_code: string | null
          preferences: Json | null
          role: string | null
          state: string | null
          updated_at: string | null
          use_case: string | null
          user_id: string
          user_name: string
          username: string | null
          workspace_name: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_complete?: boolean | null
          postal_code?: string | null
          preferences?: Json | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          use_case?: string | null
          user_id: string
          user_name?: string
          username?: string | null
          workspace_name?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_complete?: boolean | null
          postal_code?: string | null
          preferences?: Json | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          use_case?: string | null
          user_id?: string
          user_name?: string
          username?: string | null
          workspace_name?: string | null
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      launch_settings: {
        Row: {
          id: string; launch_mode: string; login_mode: string; custom_login_url: string | null
          launch_date: string | null; countdown_enabled: boolean; auto_switch_mode: string | null
          auto_switch_at: string | null; maintenance_title: string; maintenance_message: string
          registration_enabled: boolean; show_pricing: boolean; show_blog: boolean; show_docs: boolean
          show_changelog: boolean; show_login: boolean; show_signup: boolean; show_waitlist: boolean
          show_discord: boolean; show_community: boolean; page_visibility: Json; route_protection: Json
          updated_at: string | null; updated_by: string | null; published: boolean
        }
        Insert: {
          id?: string; launch_mode?: string; login_mode?: string; custom_login_url?: string | null
          launch_date?: string | null; countdown_enabled?: boolean; auto_switch_mode?: string | null
          auto_switch_at?: string | null; maintenance_title?: string; maintenance_message?: string
          registration_enabled?: boolean; show_pricing?: boolean; show_blog?: boolean; show_docs?: boolean
          show_changelog?: boolean; show_login?: boolean; show_signup?: boolean; show_waitlist?: boolean
          show_discord?: boolean; show_community?: boolean; page_visibility?: Json; route_protection?: Json
          updated_at?: string | null; updated_by?: string | null; published?: boolean
        }
        Update: {
          id?: string; launch_mode?: string; login_mode?: string; custom_login_url?: string | null
          launch_date?: string | null; countdown_enabled?: boolean; auto_switch_mode?: string | null
          auto_switch_at?: string | null; maintenance_title?: string; maintenance_message?: string
          registration_enabled?: boolean; show_pricing?: boolean; show_blog?: boolean; show_docs?: boolean
          show_changelog?: boolean; show_login?: boolean; show_signup?: boolean; show_waitlist?: boolean
          show_discord?: boolean; show_community?: boolean; page_visibility?: Json; route_protection?: Json
          updated_at?: string | null; updated_by?: string | null; published?: boolean
        }
        Relationships: [{ foreignKeyName: "launch_settings_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      landing_content: {
        Row: {
          id: string; section: string; title: string | null; subtitle: string | null; body: string | null
          cta_text: string | null; cta_link: string | null; secondary_cta_text: string | null; secondary_cta_link: string | null
          image_url: string | null; icon: string | null; badge: string | null; sort_order: number
          content: Json; active: boolean; updated_at: string | null; updated_by: string | null
        }
        Insert: {
          id?: string; section: string; title?: string | null; subtitle?: string | null; body?: string | null
          cta_text?: string | null; cta_link?: string | null; secondary_cta_text?: string | null; secondary_cta_link?: string | null
          image_url?: string | null; icon?: string | null; badge?: string | null; sort_order?: number
          content?: Json; active?: boolean; updated_at?: string | null; updated_by?: string | null
        }
        Update: {
          id?: string; section?: string; title?: string | null; subtitle?: string | null; body?: string | null
          cta_text?: string | null; cta_link?: string | null; secondary_cta_text?: string | null; secondary_cta_link?: string | null
          image_url?: string | null; icon?: string | null; badge?: string | null; sort_order?: number
          content?: Json; active?: boolean; updated_at?: string | null; updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: "landing_content_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      cta_buttons: {
        Row: {
          id: string; button_id: string; button_text: string; destination: string; variant: string
          color: string; icon: string | null; open_in_new_tab: boolean; visible: boolean; enabled: boolean
          animation: string; priority: number; confirmation_text: string | null; requires_auth: boolean
          launch_mode_override: Json; ab_variants: Json; ab_enabled: boolean
          created_at: string; updated_at: string; updated_by: string | null
        }
        Insert: {
          id?: string; button_id: string; button_text?: string; destination?: string; variant?: string
          color?: string; icon?: string | null; open_in_new_tab?: boolean; visible?: boolean; enabled?: boolean
          animation?: string; priority?: number; confirmation_text?: string | null; requires_auth?: boolean
          launch_mode_override?: Json; ab_variants?: Json; ab_enabled?: boolean
          created_at?: string; updated_at?: string; updated_by?: string | null
        }
        Update: {
          id?: string; button_id?: string; button_text?: string; destination?: string; variant?: string
          color?: string; icon?: string | null; open_in_new_tab?: boolean; visible?: boolean; enabled?: boolean
          animation?: string; priority?: number; confirmation_text?: string | null; requires_auth?: boolean
          launch_mode_override?: Json; ab_variants?: Json; ab_enabled?: boolean
          created_at?: string; updated_at?: string; updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: "cta_buttons_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      announcement_bar: {
        Row: {
          id: string; enabled: boolean; text: string; link_url: string | null; link_text: string | null
          background_color: string; text_color: string; emoji: string; countdown_enabled: boolean
          countdown_target: string | null; dismissible: boolean; sticky: boolean; animation: string
          updated_at: string | null; updated_by: string | null
        }
        Insert: {
          id?: string; enabled?: boolean; text?: string; link_url?: string | null; link_text?: string | null
          background_color?: string; text_color?: string; emoji?: string; countdown_enabled?: boolean
          countdown_target?: string | null; dismissible?: boolean; sticky?: boolean; animation?: string
          updated_at?: string | null; updated_by?: string | null
        }
        Update: {
          id?: string; enabled?: boolean; text?: string; link_url?: string | null; link_text?: string | null
          background_color?: string; text_color?: string; emoji?: string; countdown_enabled?: boolean
          countdown_target?: string | null; dismissible?: boolean; sticky?: boolean; animation?: string
          updated_at?: string | null; updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: "announcement_bar_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      approved_emails: {
        Row: { id: string; email: string; waitlist_entry_id: string | null; approved_at: string; approved_by: string | null; invite_sent: boolean; created_at: string }
        Insert: { id?: string; email: string; waitlist_entry_id?: string | null; approved_at?: string; approved_by?: string | null; invite_sent?: boolean; created_at?: string }
        Update: { id?: string; email?: string; waitlist_entry_id?: string | null; approved_at?: string; approved_by?: string | null; invite_sent?: boolean; created_at?: string }
        Relationships: [{ foreignKeyName: "approved_emails_waitlist_entry_id_fkey", columns: ["waitlist_entry_id"], isOneToOne: false, referencedRelation: "waitlist_entries", referencedColumns: ["id"] }]
      }
      waitlist_settings: {
        Row: {
          id: string; enabled: boolean; collect_name: boolean; collect_company: boolean; collect_role: boolean
          collect_country: boolean; collect_referral_code: boolean; collect_phone: boolean
          email_verification: boolean; double_opt_in: boolean; auto_approve: boolean; max_waitlist: number
          confirmation_title: string; confirmation_message: string; updated_at: string | null; updated_by: string | null
        }
        Insert: {
          id?: string; enabled?: boolean; collect_name?: boolean; collect_company?: boolean; collect_role?: boolean
          collect_country?: boolean; collect_referral_code?: boolean; collect_phone?: boolean
          email_verification?: boolean; double_opt_in?: boolean; auto_approve?: boolean; max_waitlist?: number
          confirmation_title?: string; confirmation_message?: string; updated_at?: string | null; updated_by?: string | null
        }
        Update: {
          id?: string; enabled?: boolean; collect_name?: boolean; collect_company?: boolean; collect_role?: boolean
          collect_country?: boolean; collect_referral_code?: boolean; collect_phone?: boolean
          email_verification?: boolean; double_opt_in?: boolean; auto_approve?: boolean; max_waitlist?: number
          confirmation_title?: string; confirmation_message?: string; updated_at?: string | null; updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: "waitlist_settings_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      social_links: {
        Row: {
          id: string; platform: string; url: string; label: string | null; icon: string | null
          sort_order: number; active: boolean
        }
        Insert: {
          id?: string; platform: string; url?: string; label?: string | null; icon?: string | null
          sort_order?: number; active?: boolean
        }
        Update: {
          id?: string; platform?: string; url?: string; label?: string | null; icon?: string | null
          sort_order?: number; active?: boolean
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          id: string; page_path: string; title: string | null; description: string | null
          og_image: string | null; og_title: string | null; og_description: string | null
          twitter_card: string; twitter_site: string | null; keywords: string; robots: string
          canonical_url: string | null; schema_markup: Json | null; updated_at: string | null; updated_by: string | null
        }
        Insert: {
          id?: string; page_path?: string; title?: string | null; description?: string | null
          og_image?: string | null; og_title?: string | null; og_description?: string | null
          twitter_card?: string; twitter_site?: string | null; keywords?: string; robots?: string
          canonical_url?: string | null; schema_markup?: Json | null; updated_at?: string | null; updated_by?: string | null
        }
        Update: {
          id?: string; page_path?: string; title?: string | null; description?: string | null
          og_image?: string | null; og_title?: string | null; og_description?: string | null
          twitter_card?: string; twitter_site?: string | null; keywords?: string; robots?: string
          canonical_url?: string | null; schema_markup?: Json | null; updated_at?: string | null; updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: "seo_settings_updated_by_fkey", columns: ["updated_by"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
      launch_audit_log: {
        Row: {
          id: string; admin_id: string | null; admin_name: string | null; action: string
          entity_type: string; entity_id: string | null; field: string | null
          old_value: Json | null; new_value: Json | null; details: string | null; created_at: string | null
        }
        Insert: {
          id?: string; admin_id?: string | null; admin_name?: string | null; action: string
          entity_type: string; entity_id?: string | null; field?: string | null
          old_value?: Json | null; new_value?: Json | null; details?: string | null; created_at?: string | null
        }
        Update: {
          id?: string; admin_id?: string | null; admin_name?: string | null; action?: string
          entity_type?: string; entity_id?: string | null; field?: string | null
          old_value?: Json | null; new_value?: Json | null; details?: string | null; created_at?: string | null
        }
        Relationships: [{ foreignKeyName: "launch_audit_log_admin_id_fkey", columns: ["admin_id"], isOneToOne: false, referencedRelation: "admin_users", referencedColumns: ["id"] }]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_stale_sessions: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      batch_insert_audit_events: { Args: { p_events: Json }; Returns: number }
      get_page_audit_events: { Args: { p_page_id: string; p_block_id?: string; p_action?: string; p_user_id?: string; p_since?: string; p_search?: string; p_limit?: number; p_offset?: number }; Returns: Json }
      get_ai_audit_events: { Args: { p_page_id: string; p_limit?: number }; Returns: Json }
      get_audit_summary: { Args: { p_page_id: string }; Returns: Json }
      get_audit_event: { Args: { p_event_id: string }; Returns: Json }
      log_launch_audit: { Args: { p_admin_id?: string; p_admin_name?: string; p_action?: string; p_entity_type?: string; p_entity_id?: string; p_field?: string; p_old_value?: Json; p_new_value?: Json; p_details?: string }; Returns: undefined }
      get_waitlist_stats: { Args: Record<string, never>; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

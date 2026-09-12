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
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          prefix: string
          key_hash: string
          scopes: Json
          created_at: string
          expires_at: string | null
          last_used_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          prefix: string
          key_hash: string
          scopes?: Json
          created_at?: string
          expires_at?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          prefix?: string
          key_hash?: string
          scopes?: Json
          created_at?: string
          expires_at?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          created_at: string
          detail: Json | null
          id: string
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_name?: string
          created_at?: string
          detail?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          detail?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          random_delay_minutes: boolean | null
          schedule_end: string | null
          schedule_start: string | null
          scheduled_at: string | null
          send_immediately: boolean | null
          sent_count: number | null
          status: string
          target_count: number | null
          target_type: string
          target_users: string[] | null
          title: string
          total_count: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          random_delay_minutes?: boolean | null
          schedule_end?: string | null
          schedule_start?: string | null
          scheduled_at?: string | null
          send_immediately?: boolean | null
          sent_count?: number | null
          status?: string
          target_count?: number | null
          target_type?: string
          target_users?: string[] | null
          title: string
          total_count?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          random_delay_minutes?: boolean | null
          schedule_end?: string | null
          schedule_start?: string | null
          scheduled_at?: string | null
          send_immediately?: boolean | null
          sent_count?: number | null
          status?: string
          target_count?: number | null
          target_type?: string
          target_users?: string[] | null
          title?: string
          total_count?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          last_active_at: string | null
          lifted_at: string | null
          token: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_active_at?: string | null
          lifted_at?: string | null
          token: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_active_at?: string | null
          lifted_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          password_hash: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          name: string
          password_hash?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          password_hash?: string | null
          role?: string
        }
        Relationships: []
      }
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
          config: Json | null
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
          config?: Json | null
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
          config?: Json | null
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
      automations: {
        Row: {
          conditions: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          last_run_at: string | null
          name: string
          owner_id: string
          permissions: Json | null
          run_count: number
          status: string
          steps: Json | null
          trigger_config: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          owner_id: string
          permissions?: Json | null
          run_count?: number
          status?: string
          steps?: Json | null
          trigger_config: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          owner_id?: string
          permissions?: Json | null
          run_count?: number
          status?: string
          steps?: Json | null
          trigger_config?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          detail: Json | null
          error: string | null
          finished_at: string | null
          id: string
          owner_id: string
          started_at: string
          status: string
          steps_taken: number | null
          summary: string | null
          trigger_type: string | null
        }
        Insert: {
          automation_id: string
          detail?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id: string
          started_at?: string
          status?: string
          steps_taken?: number | null
          summary?: string | null
          trigger_type?: string | null
        }
        Update: {
          automation_id?: string
          detail?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id?: string
          started_at?: string
          status?: string
          steps_taken?: number | null
          summary?: string | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
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
      announcement_bar: {
        Row: {
          animation: string | null
          background_color: string | null
          countdown_enabled: boolean | null
          countdown_target: string | null
          dismissible: boolean | null
          emoji: string | null
          enabled: boolean | null
          id: string
          link_text: string | null
          link_url: string | null
          sticky: boolean | null
          text: string | null
          text_color: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          animation?: string | null
          background_color?: string | null
          countdown_enabled?: boolean | null
          countdown_target?: string | null
          dismissible?: boolean | null
          emoji?: string | null
          enabled?: boolean | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          sticky?: boolean | null
          text?: string | null
          text_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          animation?: string | null
          background_color?: string | null
          countdown_enabled?: boolean | null
          countdown_target?: string | null
          dismissible?: boolean | null
          emoji?: string | null
          enabled?: boolean | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          sticky?: boolean | null
          text?: string | null
          text_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_bar_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          scopes: string[] | null
          usage_this_month: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          scopes?: string[] | null
          usage_this_month?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          scopes?: string[] | null
          usage_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_emails: {
        Row: {
          approved_at: string
          approved_by: string | null
          created_at: string
          email: string
          email_clicked_at: string | null
          email_delivered_at: string | null
          email_opened_at: string | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          invite_expires_at: string | null
          invite_sent: boolean
          status: string | null
          waitlist_entry_id: string | null
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          email: string
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent?: boolean
          status?: string | null
          waitlist_entry_id?: string | null
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          email?: string
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent?: boolean
          status?: string | null
          waitlist_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_emails_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_emails_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
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
      banned_users: {
        Row: {
          ban_type: string
          banned_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          lifted_at: string | null
          reason: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          ban_type?: string
          banned_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          reason?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          ban_type?: string
          banned_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          reason?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
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
      blog_posts: {
        Row: {
          author: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          published: boolean | null
          published_at: string | null
          tag: string | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          tag?: string | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          tag?: string | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
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
      cta_buttons: {
        Row: {
          ab_enabled: boolean | null
          ab_variants: Json | null
          animation: string | null
          button_id: string
          button_text: string
          color: string | null
          confirmation_text: string | null
          created_at: string | null
          destination: string
          enabled: boolean | null
          icon: string | null
          id: string
          launch_mode_override: Json | null
          open_in_new_tab: boolean | null
          priority: number | null
          requires_auth: boolean | null
          updated_at: string | null
          updated_by: string | null
          variant: string | null
          visible: boolean | null
        }
        Insert: {
          ab_enabled?: boolean | null
          ab_variants?: Json | null
          animation?: string | null
          button_id: string
          button_text: string
          color?: string | null
          confirmation_text?: string | null
          created_at?: string | null
          destination: string
          enabled?: boolean | null
          icon?: string | null
          id?: string
          launch_mode_override?: Json | null
          open_in_new_tab?: boolean | null
          priority?: number | null
          requires_auth?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          variant?: string | null
          visible?: boolean | null
        }
        Update: {
          ab_enabled?: boolean | null
          ab_variants?: Json | null
          animation?: string | null
          button_id?: string
          button_text?: string
          color?: string | null
          confirmation_text?: string | null
          created_at?: string | null
          destination?: string
          enabled?: boolean | null
          icon?: string | null
          id?: string
          launch_mode_override?: Json | null
          open_in_new_tab?: boolean | null
          priority?: number | null
          requires_auth?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          variant?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cta_buttons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_accounts: {
        Row: {
          account_type: string
          deleted_at: string
          deleted_by_admin_id: string | null
          deleted_by_name: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string | null
          original_id: string
          restored_at: string | null
          restored_by_admin_id: string | null
          role: string | null
        }
        Insert: {
          account_type: string
          deleted_at?: string
          deleted_by_admin_id?: string | null
          deleted_by_name?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          original_id: string
          restored_at?: string | null
          restored_by_admin_id?: string | null
          role?: string | null
        }
        Update: {
          account_type?: string
          deleted_at?: string
          deleted_by_admin_id?: string | null
          deleted_by_name?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          original_id?: string
          restored_at?: string | null
          restored_by_admin_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_accounts_deleted_by_admin_id_fkey"
            columns: ["deleted_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_accounts_restored_by_admin_id_fkey"
            columns: ["restored_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          assigned_to: string | null
          company: string
          created_at: string | null
          email: string
          employees: string
          id: string
          message: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company: string
          created_at?: string | null
          email: string
          employees?: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string
          created_at?: string | null
          email?: string
          employees?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_branding: {
        Row: {
          accent_color: string
          company_name: string
          created_at: string | null
          discord_url: string | null
          favicon_url: string | null
          footer_text: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          support_email: string
          twitter_url: string | null
          updated_at: string | null
          website_url: string
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string
          company_name?: string
          created_at?: string | null
          discord_url?: string | null
          favicon_url?: string | null
          footer_text?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          support_email?: string
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string
          company_name?: string
          created_at?: string | null
          discord_url?: string | null
          favicon_url?: string | null
          footer_text?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          support_email?: string
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          bounce_rate: number | null
          click_rate: number | null
          created_at: string | null
          created_by: string | null
          html_content: string | null
          id: string
          name: string
          open_rate: number | null
          recipients: number | null
          scheduled_for: string | null
          sent: number | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          bounce_rate?: number | null
          click_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          name: string
          open_rate?: number | null
          recipients?: number | null
          scheduled_for?: string | null
          sent?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          bounce_rate?: number | null
          click_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          name?: string
          open_rate?: number | null
          recipients?: number | null
          scheduled_for?: string | null
          sent?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event: string
          html_content: string | null
          id: string
          message_id: string | null
          raw_payload: Json | null
          recipient: string | null
          retried: boolean | null
          subject: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event: string
          html_content?: string | null
          id?: string
          message_id?: string | null
          raw_payload?: Json | null
          recipient?: string | null
          retried?: boolean | null
          subject?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event?: string
          html_content?: string | null
          id?: string
          message_id?: string | null
          raw_payload?: Json | null
          recipient?: string | null
          retried?: boolean | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string | null
          delivery_logs: Json | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          delivery_logs?: Json | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          delivery_logs?: Json | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          html_content: string
          id: string
          max_retries: number | null
          recipient: string
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          html_content: string
          id?: string
          max_retries?: number | null
          recipient: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          html_content?: string
          id?: string
          max_retries?: number | null
          recipient?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          id: string
          name: string
          subscriber_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name: string
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name?: string
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks: Json | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          html_content: string | null
          id: string
          locale: string
          name: string
          plain_text: string | null
          status: string
          subject: string
          thumbnail: string | null
          translations: Json | null
          updated_at: string | null
          variables: string[] | null
          version: number
        }
        Insert: {
          blocks?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          locale?: string
          name: string
          plain_text?: string | null
          status?: string
          subject?: string
          thumbnail?: string | null
          translations?: Json | null
          updated_at?: string | null
          variables?: string[] | null
          version?: number
        }
        Update: {
          blocks?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          locale?: string
          name?: string
          plain_text?: string | null
          status?: string
          subject?: string
          thumbnail?: string | null
          translations?: Json | null
          updated_at?: string | null
          variables?: string[] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_versions: {
        Row: {
          blocks: Json | null
          changes_description: string | null
          created_at: string | null
          created_by: string | null
          html_content: string | null
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          blocks?: Json | null
          changes_description?: string | null
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          template_id: string
          version_number: number
        }
        Update: {
          blocks?: Json | null
          changes_description?: string | null
          created_at?: string | null
          created_by?: string | null
          html_content?: string | null
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          name: string
          rollout_percent: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          name: string
          rollout_percent?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          name?: string
          rollout_percent?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          rating: number | null
          screenshot_url: string | null
          status: string | null
          user_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          screenshot_url?: string | null
          status?: string | null
          user_name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          screenshot_url?: string | null
          status?: string | null
          user_name?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          last_sync_at: string | null
          name: string
          status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      landing_content: {
        Row: {
          active: boolean | null
          badge: string | null
          body: string | null
          content: Json | null
          cta_link: string | null
          cta_text: string | null
          icon: string | null
          id: string
          image_url: string | null
          secondary_cta_link: string | null
          secondary_cta_text: string | null
          section: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          body?: string | null
          content?: Json | null
          cta_link?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          secondary_cta_link?: string | null
          secondary_cta_text?: string | null
          section: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          body?: string | null
          content?: Json | null
          cta_link?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          secondary_cta_link?: string | null
          secondary_cta_text?: string | null
          section?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          admin_name: string | null
          created_at: string | null
          details: string | null
          entity_id: string | null
          entity_type: string
          field: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_type: string
          field?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_type?: string
          field?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_settings: {
        Row: {
          auto_switch_at: string | null
          auto_switch_mode: string | null
          countdown_enabled: boolean | null
          custom_login_url: string | null
          id: string
          launch_date: string | null
          launch_mode: string
          login_mode: string
          maintenance_message: string | null
          maintenance_title: string | null
          page_visibility: Json | null
          published: boolean | null
          registration_enabled: boolean | null
          route_protection: Json | null
          show_blog: boolean | null
          show_changelog: boolean | null
          show_community: boolean | null
          show_discord: boolean | null
          show_docs: boolean | null
          show_login: boolean | null
          show_pricing: boolean | null
          show_signup: boolean | null
          show_waitlist: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_switch_at?: string | null
          auto_switch_mode?: string | null
          countdown_enabled?: boolean | null
          custom_login_url?: string | null
          id?: string
          launch_date?: string | null
          launch_mode?: string
          login_mode?: string
          maintenance_message?: string | null
          maintenance_title?: string | null
          page_visibility?: Json | null
          published?: boolean | null
          registration_enabled?: boolean | null
          route_protection?: Json | null
          show_blog?: boolean | null
          show_changelog?: boolean | null
          show_community?: boolean | null
          show_discord?: boolean | null
          show_docs?: boolean | null
          show_login?: boolean | null
          show_pricing?: boolean | null
          show_signup?: boolean | null
          show_waitlist?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_switch_at?: string | null
          auto_switch_mode?: string | null
          countdown_enabled?: boolean | null
          custom_login_url?: string | null
          id?: string
          launch_date?: string | null
          launch_mode?: string
          login_mode?: string
          maintenance_message?: string | null
          maintenance_title?: string | null
          page_visibility?: Json | null
          published?: boolean | null
          registration_enabled?: boolean | null
          route_protection?: Json | null
          show_blog?: boolean | null
          show_changelog?: boolean | null
          show_community?: boolean | null
          show_discord?: boolean | null
          show_docs?: boolean | null
          show_login?: boolean | null
          show_pricing?: boolean | null
          show_signup?: boolean | null
          show_waitlist?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string | null
          id: string
          published: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
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
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          source: string | null
          status: string
          subscribed_at: string | null
          tags: string[] | null
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          is_test: boolean
          page_id: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          is_test?: boolean
          page_id?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          is_test?: boolean
          page_id?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          archived_at: string | null
          category: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          metadata: Json | null
          read_at: string | null
          severity: string | null
          source: string | null
          status: string
          title: string
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string | null
          source?: string | null
          status?: string
          title: string
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string | null
          source?: string | null
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      payments: {
        Row: {
          amount: number
          currency: string | null
          customer_name: string
          id: string
          method: string | null
          paid_at: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          currency?: string | null
          customer_name: string
          id?: string
          method?: string | null
          paid_at?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          currency?: string | null
          customer_name?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          active_referrals: number
          ai_credits: number
          code: string
          created_at: string
          id: string
          level: number
          rewards_earned: number
          total_referrals: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          active_referrals?: number
          ai_credits?: number
          code: string
          created_at?: string
          id?: string
          level?: number
          rewards_earned?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          active_referrals?: number
          ai_credits?: number
          code?: string
          created_at?: string
          id?: string
          level?: number
          rewards_earned?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          min_referrals: number
          name: string
          type: string
          value: number
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_referrals?: number
          name: string
          type: string
          value?: number
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_referrals?: number
          name?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      roadmap_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          feature_id: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          feature_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          feature_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_activity_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_attachments: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          name: string
          type: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          name: string
          type?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          name?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_attachments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_checklists: {
        Row: {
          completed: boolean | null
          created_at: string | null
          feature_id: string
          id: string
          section: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          feature_id: string
          id?: string
          section?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          feature_id?: string
          id?: string
          section?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_checklists_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_comments: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string | null
          feature_id: string
          id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          content: string
          created_at?: string | null
          feature_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          feature_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_comments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "roadmap_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          depends_on_id: string
          feature_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_id: string
          feature_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_id?: string
          feature_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_dependencies_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          acceptance_criteria: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          dependencies: number | null
          description: string | null
          epic: string | null
          estimated_time: string | null
          eta: string | null
          id: string
          labels: string | null
          owner: string | null
          priority: string | null
          progress: number | null
          release_id: string | null
          sort_order: number | null
          sprint_id: string | null
          start_date: string | null
          status: string | null
          target_date: string | null
          target_version: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: number | null
          description?: string | null
          epic?: string | null
          estimated_time?: string | null
          eta?: string | null
          id?: string
          labels?: string | null
          owner?: string | null
          priority?: string | null
          progress?: number | null
          release_id?: string | null
          sort_order?: number | null
          sprint_id?: string | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          target_version?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: number | null
          description?: string | null
          epic?: string | null
          estimated_time?: string | null
          eta?: string | null
          id?: string
          labels?: string | null
          owner?: string | null
          priority?: string | null
          progress?: number | null
          release_id?: string | null
          sort_order?: number | null
          sprint_id?: string | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          target_version?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roadmap_releases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          release_notes: string | null
          released_at: string | null
          status: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          release_notes?: string | null
          released_at?: string | null
          status?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          release_notes?: string | null
          released_at?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      roadmap_sprints: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roadmap_votes: {
        Row: {
          created_at: string | null
          email: string
          id: string
          roadmap_item_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          roadmap_item_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          roadmap_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_votes_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          description: string | null
          id: string
          keywords: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_path: string
          robots: string | null
          schema_markup: Json | null
          title: string | null
          twitter_card: string | null
          twitter_site: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          description?: string | null
          id?: string
          keywords?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_path?: string
          robots?: string | null
          schema_markup?: Json | null
          title?: string | null
          twitter_card?: string | null
          twitter_site?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          description?: string | null
          id?: string
          keywords?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_path?: string
          robots?: string | null
          schema_markup?: Json | null
          title?: string | null
          twitter_card?: string | null
          twitter_site?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          active: boolean | null
          icon: string | null
          id: string
          label: string | null
          platform: string
          sort_order: number | null
          url: string
        }
        Insert: {
          active?: boolean | null
          icon?: string | null
          id?: string
          label?: string | null
          platform: string
          sort_order?: number | null
          url: string
        }
        Update: {
          active?: boolean | null
          icon?: string | null
          id?: string
          label?: string | null
          platform?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          customer_name: string
          email: string | null
          id: string
          mrr: number | null
          payment_method: string | null
          plan: string | null
          renews_at: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          customer_name: string
          email?: string | null
          id?: string
          mrr?: number | null
          payment_method?: string | null
          plan?: string | null
          renews_at?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          customer_name?: string
          email?: string | null
          id?: string
          mrr?: number | null
          payment_method?: string | null
          plan?: string | null
          renews_at?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          sender_id: string | null
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          last_update: string | null
          priority: string | null
          replies: number | null
          status: string | null
          subject: string
          user_name: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_update?: string | null
          priority?: string | null
          replies?: number | null
          status?: string | null
          subject: string
          user_name: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_update?: string | null
          priority?: string | null
          replies?: number | null
          status?: string | null
          subject?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_user_id: string
          responded_at: string | null
          role: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_user_id: string
          responded_at?: string | null
          role?: string
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_user_id?: string
          responded_at?: string | null
          role?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string
          team_id: string
          user_avatar: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          joined_at?: string | null
          role?: string
          team_id: string
          user_avatar?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          joined_at?: string | null
          role?: string
          team_id?: string
          user_avatar?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          lead_name: string | null
          member_count: number | null
          name: string
          slug: string | null
          updated_at: string | null
          workspace_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          lead_name?: string | null
          member_count?: number | null
          name: string
          slug?: string | null
          updated_at?: string | null
          workspace_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          lead_name?: string | null
          member_count?: number | null
          name?: string
          slug?: string | null
          updated_at?: string | null
          workspace_count?: number | null
        }
        Relationships: []
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
      user_invite_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
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
      user_referrals: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          referral_code_id: string | null
          referred_id: string
          referrer_id: string
          reward_claimed: boolean
          reward_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          referral_code_id?: string | null
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean
          reward_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          referral_code_id?: string | null
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean
          reward_id?: string | null
          status?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          accepted: boolean | null
          approved_at: string | null
          approved_by: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          clerk_entry_id: string | null
          country: string | null
          email: string
          email_clicked_at: string | null
          email_delivered_at: string | null
          email_opened_at: string | null
          email_queued_at: string | null
          email_sent_at: string | null
          email_status: string | null
          first_login_at: string | null
          github_id: string | null
          google_id: string | null
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          invite_sent: boolean | null
          joined_at: string | null
          last_reminder_sent_at: string | null
          microsoft_id: string | null
          name: string
          notes: string | null
          position: number | null
          provider: string | null
          referral_count: number | null
          referrer_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          reviewed_by: string | null
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          workspace_created_at: string | null
        }
        Insert: {
          accepted?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          clerk_entry_id?: string | null
          country?: string | null
          email: string
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_queued_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          first_login_at?: string | null
          github_id?: string | null
          google_id?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          invite_sent?: boolean | null
          joined_at?: string | null
          last_reminder_sent_at?: string | null
          microsoft_id?: string | null
          name: string
          notes?: string | null
          position?: number | null
          provider?: string | null
          referral_count?: number | null
          referrer_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          reviewed_by?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          workspace_created_at?: string | null
        }
        Update: {
          accepted?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          clerk_entry_id?: string | null
          country?: string | null
          email?: string
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_queued_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          first_login_at?: string | null
          github_id?: string | null
          google_id?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          invite_sent?: boolean | null
          joined_at?: string | null
          last_reminder_sent_at?: string | null
          microsoft_id?: string | null
          name?: string
          notes?: string | null
          position?: number | null
          provider?: string | null
          referral_count?: number | null
          referrer_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          reviewed_by?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          workspace_created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_settings: {
        Row: {
          auto_approve: boolean | null
          collect_company: boolean | null
          collect_country: boolean | null
          collect_name: boolean | null
          collect_phone: boolean | null
          collect_referral_code: boolean | null
          collect_role: boolean | null
          confirmation_message: string | null
          confirmation_title: string | null
          double_opt_in: boolean | null
          email_verification: boolean | null
          enabled: boolean | null
          id: string
          max_waitlist: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_approve?: boolean | null
          collect_company?: boolean | null
          collect_country?: boolean | null
          collect_name?: boolean | null
          collect_phone?: boolean | null
          collect_referral_code?: boolean | null
          collect_role?: boolean | null
          confirmation_message?: string | null
          confirmation_title?: string | null
          double_opt_in?: boolean | null
          email_verification?: boolean | null
          enabled?: boolean | null
          id?: string
          max_waitlist?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_approve?: boolean | null
          collect_company?: boolean | null
          collect_country?: boolean | null
          collect_name?: boolean | null
          collect_phone?: boolean | null
          collect_referral_code?: boolean | null
          collect_role?: boolean | null
          confirmation_message?: string | null
          confirmation_title?: string | null
          double_opt_in?: boolean | null
          email_verification?: boolean | null
          enabled?: boolean | null
          id?: string
          max_waitlist?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          endpoint_id: string
          error_message: string | null
          event: string
          id: string
          payload: Json | null
          request_body: string | null
          request_headers: Json | null
          response_body: string | null
          response_status: number | null
          retry_count: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint_id: string
          error_message?: string | null
          event: string
          id?: string
          payload?: Json | null
          request_body?: string | null
          request_headers?: Json | null
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          endpoint_id?: string
          error_message?: string | null
          event?: string
          id?: string
          payload?: Json | null
          request_body?: string | null
          request_headers?: Json | null
          response_body?: string | null
          response_status?: number | null
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          events: string[]
          failure_count: number | null
          id: string
          last_triggered_at: string | null
          name: string
          secret: string | null
          status: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          status?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          status?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
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
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      waitlist_daily_stats: {
        Row: {
          accepted: number | null
          approvals: number | null
          day: string | null
          email_clicked: number | null
          email_opened: number | null
          rejected: number | null
          signups: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_count: {
        Args: { p_session_token: string; p_table: string }
        Returns: number
      }
      get_widget_catalog: {
        Args: Record<string, never>
        Returns: Json
      }
      get_widget_layout: {
        Args: { p_workspace_id?: string }
        Returns: Json
      }
      save_widget_layout: {
        Args: { p_layout: Json; p_workspace_id: string }
        Returns: boolean
      }
      record_widget_events: {
        Args: { p_events: Json }
        Returns: number
      }
      admin_user_notification_send: {
        Args: {
          p_body?: string
          p_broadcast?: boolean
          p_category?: string
          p_is_test?: boolean
          p_min_role?: string
          p_page_id?: string
          p_severity?: string
          p_session_token: string
          p_title: string
          p_user_ids?: Json
        }
        Returns: Json
      }
      admin_user_notification_overview: {
        Args: { p_session_token: string }
        Returns: Json
      }
      admin_user_notification_delete: {
        Args: { p_min_role?: string; p_notification_id: string; p_session_token: string }
        Returns: boolean
      }
      admin_delete: {
        Args: {
          p_id: string
          p_min_role?: string
          p_session_token: string
          p_table: string
        }
        Returns: boolean
      }
      admin_insert: {
        Args: {
          p_data: Json
          p_min_role?: string
          p_session_token: string
          p_table: string
        }
        Returns: string
      }
      admin_login: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      admin_logout: { Args: { p_token: string }; Returns: boolean }
      admin_select: {
        Args: {
          p_eq_col?: string
          p_eq_val?: string
          p_limit?: number
          p_order_col?: string
          p_order_dir?: string
          p_select?: string
          p_session_token: string
          p_table: string
        }
        Returns: Json
      }
      admin_update: {
        Args: {
          p_data: Json
          p_id: string
          p_min_role?: string
          p_session_token: string
          p_table: string
        }
        Returns: Json
      }
      ban_user: {
        Args: {
          p_ban_type: string
          p_expires_at?: string
          p_reason: string
          p_session_token?: string
          p_user_id: string
        }
        Returns: boolean
      }
      batch_insert_audit_events: { Args: { p_events: Json }; Returns: number }
      bulk_approve_waitlist: { Args: { ids: string[] }; Returns: undefined }
      bulk_update_notifications: {
        Args: {
          p_data: Json
          p_session_token: string
          p_severity_filter?: string
          p_source_filter?: string
          p_status_filter?: string
        }
        Returns: number
      }
      check_admin_exists: { Args: never; Returns: boolean }
      clean_stale_sessions: { Args: never; Returns: undefined }
      cleanup_admin_audit_log: {
        Args: { p_retention_days?: number; p_session_token?: string }
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: { p_session_token?: string }
        Returns: number
      }
      create_user_invite_code: { Args: { p_code: string }; Returns: Json }
      delete_user_data: {
        Args: { p_session_token: string; p_user_id: string }
        Returns: boolean
      }
      expire_waitlist_invites: { Args: never; Returns: undefined }
      get_admin_id_from_session: { Args: { p_token: string }; Returns: string }
      get_admin_referral_codes: {
        Args: { p_session_token?: string }
        Returns: Json
      }
      get_admin_user_referrals: {
        Args: { p_session_token?: string }
        Returns: Json
      }
      get_ai_audit_events:
        | { Args: { p_limit?: number; p_page_id: string }; Returns: Json }
        | { Args: { p_limit?: number; p_page_id: string }; Returns: Json }
      get_ai_events_today_count: {
        Args: { p_session_token: string }
        Returns: number
      }
      get_audit_event: { Args: { p_event_id: string }; Returns: Json }
      get_audit_summary:
        | {
            Args: { p_page_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_audit_summary(p_page_id => text), public.get_audit_summary(p_page_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_page_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_audit_summary(p_page_id => text), public.get_audit_summary(p_page_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_invite_by_code: { Args: { p_code: string }; Returns: Json }
      get_page_audit_events:
        | {
            Args: {
              p_action?: string
              p_block_id?: string
              p_limit?: number
              p_offset?: number
              p_page_id?: string
              p_search?: string
              p_since?: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action?: string
              p_block_id?: string
              p_limit?: number
              p_offset?: number
              p_page_id: string
              p_search?: string
              p_since?: string
              p_user_id?: string
            }
            Returns: Json
          }
      get_total_users_count: { Args: never; Returns: number }
      get_unread_notification_count: {
        Args: { p_session_token: string }
        Returns: number
      }
      get_waitlist_conversion_rate: {
        Args: never
        Returns: {
          accepted: number
          approved: number
          conversion_rate: number
          total: number
        }[]
      }
      get_waitlist_position: {
        Args: { p_email: string }
        Returns: {
          ahead: number
          pos: number
          total_pending: number
        }[]
      }
      get_waitlist_stats: { Args: { p_session_token?: string }; Returns: Json }
      hard_ban_user: {
        Args: { p_reason: string; p_session_token?: string; p_user_id: string }
        Returns: boolean
      }
      insert_audit_event: {
        Args: {
          p_action?: string
          p_ai_completion_tokens?: number
          p_ai_cost?: number
          p_ai_latency_ms?: number
          p_ai_model?: string
          p_ai_prompt_tokens?: number
          p_ai_provider?: string
          p_ai_tool_calls?: Json
          p_ai_undo_ref?: string
          p_block_id?: string
          p_block_type?: string
          p_content_after?: Json
          p_content_before?: Json
          p_detail?: string
          p_page_id?: string
          p_user_id?: string
          p_user_name?: string
        }
        Returns: string
      }
      is_page_owner: {
        Args: { check_page_id: string; check_user_id: string }
        Returns: boolean
      }
      is_user_banned: { Args: { p_user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_detail?: Json
          p_target_id?: string
          p_target_name?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_launch_audit: {
        Args: {
          p_action: string
          p_admin_id: string
          p_admin_name: string
          p_details?: string
          p_entity_id?: string
          p_entity_type: string
          p_field?: string
          p_new_value?: Json
          p_old_value?: Json
        }
        Returns: undefined
      }
      permanently_delete_account: {
        Args: { p_account_id: string; p_session_token: string }
        Returns: boolean
      }
      read_admin_audit_log: {
        Args: { p_limit?: number; p_offset?: number; p_session_token: string }
        Returns: Json
      }
      recalculate_waitlist_positions: { Args: never; Returns: undefined }
      require_admin_role: {
        Args: { p_min_role?: string; p_token: string }
        Returns: string
      }
      restore_account: {
        Args: { p_account_id: string; p_session_token: string }
        Returns: boolean
      }
      roadmap_add_dependency: {
        Args: {
          p_depends_on_id: string
          p_feature_id: string
          p_session_token: string
          p_type?: string
        }
        Returns: boolean
      }
      roadmap_checklist_add: {
        Args: {
          p_feature_id: string
          p_section?: string
          p_session_token: string
          p_title: string
        }
        Returns: string
      }
      roadmap_checklist_toggle: {
        Args: { p_completed: boolean; p_id: string; p_session_token: string }
        Returns: boolean
      }
      roadmap_checklists_get: {
        Args: { p_feature_id: string; p_session_token: string }
        Returns: Json
      }
      roadmap_comment_add: {
        Args: {
          p_content: string
          p_feature_id: string
          p_parent_id?: string
          p_session_token: string
        }
        Returns: string
      }
      roadmap_comments_get: {
        Args: { p_feature_id: string; p_session_token: string }
        Returns: Json
      }
      roadmap_delete: {
        Args: { p_id: string; p_session_token: string }
        Returns: boolean
      }
      roadmap_get_activity: {
        Args: { p_feature_id: string; p_session_token: string }
        Returns: Json
      }
      roadmap_get_dependencies: {
        Args: { p_feature_id: string; p_session_token: string }
        Returns: Json
      }
      roadmap_get_labels: {
        Args: { p_session_token: string }
        Returns: string[]
      }
      roadmap_get_releases: { Args: { p_session_token: string }; Returns: Json }
      roadmap_get_sprints: { Args: { p_session_token: string }; Returns: Json }
      roadmap_get_stats: { Args: { p_session_token: string }; Returns: Json }
      roadmap_insert: {
        Args: { p_data: Json; p_session_token: string }
        Returns: string
      }
      roadmap_release_create: {
        Args: {
          p_description?: string
          p_name: string
          p_session_token: string
          p_version: string
        }
        Returns: string
      }
      roadmap_release_publish: {
        Args: {
          p_id: string
          p_release_notes?: string
          p_session_token: string
        }
        Returns: boolean
      }
      roadmap_select: {
        Args: {
          p_filters?: Json
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_session_token: string
          p_sort_by?: string
          p_sort_dir?: string
        }
        Returns: Json
      }
      roadmap_sprint_close: {
        Args: { p_id: string; p_session_token: string }
        Returns: boolean
      }
      roadmap_sprint_create: {
        Args: {
          p_end_date?: string
          p_name: string
          p_session_token: string
          p_start_date?: string
        }
        Returns: string
      }
      roadmap_update: {
        Args: { p_data: Json; p_id: string; p_session_token: string }
        Returns: Json
      }
      roadmap_update_status: {
        Args: {
          p_id: string
          p_session_token: string
          p_sort_order?: number
          p_status: string
        }
        Returns: boolean
      }
      search_notifications: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_session_token: string
          p_severity?: string
          p_sort_by?: string
          p_sort_dir?: string
          p_source?: string
          p_status?: string
          p_type?: string
        }
        Returns: Json
      }
      set_admin_password: {
        Args: { p_email: string; p_password: string; p_session_token?: string }
        Returns: boolean
      }
      setup_first_admin: {
        Args: { p_email: string; p_name: string; p_password: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_delete_return: { Args: never; Returns: Json }
      test_platform_crud: { Args: never; Returns: Json }
      unban_user: {
        Args: { p_session_token?: string; p_user_id: string }
        Returns: boolean
      }
      validate_admin_session: { Args: { p_token: string }; Returns: Json }
      validate_select_columns: {
        Args: { p_select: string }
        Returns: undefined
      }
      verify_admin_password: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
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

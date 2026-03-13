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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      agent_execution_queue: {
        Row: {
          command: string
          completed_at: string | null
          created_at: string
          id: string
          keyword: string | null
          kill_switch: boolean
          result: Json | null
          started_at: string | null
          status: string
          user_id: string
          vision_data: Json | null
        }
        Insert: {
          command: string
          completed_at?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          kill_switch?: boolean
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
          vision_data?: Json | null
        }
        Update: {
          command?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          kill_switch?: boolean
          result?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
          vision_data?: Json | null
        }
        Relationships: []
      }
      agent_status: {
        Row: {
          agent_version: string | null
          id: string
          is_online: boolean
          last_heartbeat: string | null
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_version?: string | null
          id?: string
          is_online?: boolean
          last_heartbeat?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_version?: string | null
          id?: string
          is_online?: boolean
          last_heartbeat?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_swarm_sessions: {
        Row: {
          active_agents: number
          completed_agents: number
          created_at: string
          id: string
          max_agents: number
          name: string
          objective: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_agents?: number
          completed_agents?: number
          created_at?: string
          id?: string
          max_agents?: number
          name?: string
          objective?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_agents?: number
          completed_agents?: number
          created_at?: string
          id?: string
          max_agents?: number
          name?: string
          objective?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_swarm_tasks: {
        Row: {
          agent_index: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          model: string | null
          prompt: string
          result: string | null
          role: string
          role_label: string
          session_id: string
          started_at: string | null
          status: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_index: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model?: string | null
          prompt: string
          result?: string | null
          role?: string
          role_label?: string
          session_id: string
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_index?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model?: string | null
          prompt?: string
          result?: string | null
          role?: string
          role_label?: string
          session_id?: string
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_swarm_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_swarm_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          created_at: string | null
          flagged: boolean | null
          id: string
          input_text: string
          output_text: string
          score: number | null
          self_notes: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          input_text: string
          output_text: string
          score?: number | null
          self_notes?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          flagged?: boolean | null
          id?: string
          input_text?: string
          output_text?: string
          score?: number | null
          self_notes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_interactions: {
        Row: {
          ai_response: string
          auto_category: string | null
          category: string | null
          context_tags: string[] | null
          created_at: string
          id: string
          persona: string | null
          speaker: string | null
          topic: string | null
          updated_at: string
          user_id: string | null
          user_input: string
        }
        Insert: {
          ai_response: string
          auto_category?: string | null
          category?: string | null
          context_tags?: string[] | null
          created_at?: string
          id?: string
          persona?: string | null
          speaker?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
          user_input: string
        }
        Update: {
          ai_response?: string
          auto_category?: string | null
          category?: string | null
          context_tags?: string[] | null
          created_at?: string
          id?: string
          persona?: string | null
          speaker?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
          user_input?: string
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          category: string
          created_at: string | null
          details: string
          id: string
          metadata: Json | null
          source: string
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          details: string
          id?: string
          metadata?: Json | null
          source?: string
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          details?: string
          id?: string
          metadata?: Json | null
          source?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          last_reset: string | null
          metadata: Json | null
          model: string | null
          status: string | null
          tokens_used: number
          tts_requests: number | null
          updated_at: string | null
          user_id: string | null
          user_plan: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_reset?: string | null
          metadata?: Json | null
          model?: string | null
          status?: string | null
          tokens_used?: number
          tts_requests?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_reset?: string | null
          metadata?: Json | null
          model?: string | null
          status?: string | null
          tokens_used?: number
          tts_requests?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: number
          key: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: never
          key: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: never
          key?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      api_keywords: {
        Row: {
          action: string
          active: boolean | null
          description: string | null
          id: string
          keyword: string
          updated_at: string | null
        }
        Insert: {
          action: string
          active?: boolean | null
          description?: string | null
          id?: string
          keyword: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          active?: boolean | null
          description?: string | null
          id?: string
          keyword?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_milestones: {
        Row: {
          created_at: string | null
          date: string | null
          description: string | null
          id: number
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: never
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: never
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broadcast_history: {
        Row: {
          body: string
          created_at: string | null
          id: string
          recipients_count: number
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
          target_audience: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          recipients_count?: number
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
          target_audience: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          recipients_count?: number
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
          target_audience?: string
        }
        Relationships: []
      }
      build_logs: {
        Row: {
          build_type: string
          completed_at: string | null
          created_at: string
          id: string
          log_output: string | null
          status: string
          triggered_by: string | null
          version_code: number | null
          version_name: string | null
        }
        Insert: {
          build_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          log_output?: string | null
          status?: string
          triggered_by?: string | null
          version_code?: number | null
          version_name?: string | null
        }
        Update: {
          build_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          log_output?: string | null
          status?: string
          triggered_by?: string | null
          version_code?: number | null
          version_name?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_purchase_date: string | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          total_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_purchase_date?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_purchase_date?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          end_time: string | null
          id: string
          mute_count: number | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          mute_count?: number | null
          start_time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          mute_count?: number | null
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_awards: {
        Row: {
          award_date: string | null
          award_type: string | null
          chapter_id: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          award_date?: string | null
          award_type?: string | null
          chapter_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          award_date?: string | null
          award_type?: string | null
          chapter_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_awards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_requests: {
        Row: {
          admin_notes: string | null
          chapter_name: string
          city: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_name: string | null
          state: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          chapter_name: string
          city?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name?: string | null
          state: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          chapter_name?: string
          city?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name?: string | null
          state?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          name: string
          state: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          state: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      character_references: {
        Row: {
          context: string | null
          created_at: string | null
          description: string | null
          era: string | null
          generation_count: number | null
          id: string
          is_primary: boolean | null
          is_system: boolean | null
          metadata: Json | null
          name: string
          pronouns: string | null
          reference_photo_path: string | null
          reference_photo_url: string
          slug: string
          traits: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          description?: string | null
          era?: string | null
          generation_count?: number | null
          id?: string
          is_primary?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          pronouns?: string | null
          reference_photo_path?: string | null
          reference_photo_url: string
          slug: string
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          description?: string | null
          era?: string | null
          generation_count?: number | null
          id?: string
          is_primary?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          pronouns?: string | null
          reference_photo_path?: string | null
          reference_photo_url?: string
          slug?: string
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          role: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_imports: {
        Row: {
          created_at: string | null
          filename: string | null
          id: string
          imported_at: string | null
          message_count: number | null
          raw_json: Json | null
          source: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          message_count?: number | null
          raw_json?: Json | null
          source?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filename?: string | null
          id?: string
          imported_at?: string | null
          message_count?: number | null
          raw_json?: Json | null
          source?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cridergpt_api_keys: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string
          id: string
          key_hash: string
          label: string | null
          permissions: Json | null
          rate_limit_per_minute: number | null
          revoked_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          key_hash: string
          label?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          key_hash?: string
          label?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      cridergpt_api_logs: {
        Row: {
          command: string | null
          created_at: string | null
          endpoint: string | null
          flags: Json | null
          id: string
          status: string | null
          user_email: string | null
        }
        Insert: {
          command?: string | null
          created_at?: string | null
          endpoint?: string | null
          flags?: Json | null
          id?: string
          status?: string | null
          user_email?: string | null
        }
        Update: {
          command?: string | null
          created_at?: string | null
          endpoint?: string | null
          flags?: Json | null
          id?: string
          status?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      cridergpt_api_settings: {
        Row: {
          endpoint_overrides: Json | null
          id: string
          kill_switch: boolean | null
          updated_at: string | null
        }
        Insert: {
          endpoint_overrides?: Json | null
          id?: string
          kill_switch?: boolean | null
          updated_at?: string | null
        }
        Update: {
          endpoint_overrides?: Json | null
          id?: string
          kill_switch?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cridergpt_training_corpus: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          source_table: string
          topic: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table: string
          topic?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string
          topic?: string | null
        }
        Relationships: []
      }
      cridergpt_training_data: {
        Row: {
          category: string
          content: string
          created_at: string
          data_type: string
          dataset_name: string
          description: string | null
          id: string
          metadata: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          data_type?: string
          dataset_name: string
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          data_type?: string
          dataset_name?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          name: string | null
          stripe_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string | null
          stripe_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string | null
          stripe_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demo_usage: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          last_used_at: string | null
          max_messages: number | null
          messages_sent: number | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          max_messages?: number | null
          messages_sent?: number | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          max_messages?: number | null
          messages_sent?: number | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          chapter_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          id: string
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          notification_type: string
          read: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          notification_type: string
          read?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          notification_type?: string
          read?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      feature_settings: {
        Row: {
          created_at: string | null
          harvest_helper_enabled: boolean | null
          id: string
          innovator_enabled: boolean | null
          savannah_tone_enabled: boolean | null
          tech_tillage_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          harvest_helper_enabled?: boolean | null
          id?: string
          innovator_enabled?: boolean | null
          savannah_tone_enabled?: boolean | null
          tech_tillage_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          harvest_helper_enabled?: boolean | null
          id?: string
          innovator_enabled?: boolean | null
          savannah_tone_enabled?: boolean | null
          tech_tillage_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founders: {
        Row: {
          added_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_verified_at: string | null
        }
        Insert: {
          added_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
        }
        Update: {
          added_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
        }
        Relationships: []
      }
      guardian_alerts: {
        Row: {
          acknowledged: boolean | null
          activity_log_id: string | null
          alert_type: string
          child_id: string
          created_at: string | null
          description: string | null
          guardian_id: string
          id: string
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          activity_log_id?: string | null
          alert_type: string
          child_id: string
          created_at?: string | null
          description?: string | null
          guardian_id: string
          id?: string
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          activity_log_id?: string | null
          alert_type?: string
          child_id?: string
          created_at?: string | null
          description?: string | null
          guardian_id?: string
          id?: string
          severity?: string
          title?: string
        }
        Relationships: []
      }
      guardian_relationships: {
        Row: {
          child_email: string | null
          child_id: string | null
          child_phone: string | null
          created_at: string | null
          guardian_id: string
          id: string
          invite_code: string | null
          monitoring_enabled: boolean | null
          relationship_label: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          child_email?: string | null
          child_id?: string | null
          child_phone?: string | null
          created_at?: string | null
          guardian_id: string
          id?: string
          invite_code?: string | null
          monitoring_enabled?: boolean | null
          relationship_label?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          child_email?: string | null
          child_id?: string | null
          child_phone?: string | null
          created_at?: string | null
          guardian_id?: string
          id?: string
          invite_code?: string | null
          monitoring_enabled?: boolean | null
          relationship_label?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guardian_settings: {
        Row: {
          created_at: string | null
          email_daily_summary: boolean | null
          id: string
          monitor_chat_content: boolean | null
          monitor_file_uploads: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          receive_real_time_notifications: boolean | null
          relationship_id: string
          updated_at: string | null
          usage_time_alerts: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_daily_summary?: boolean | null
          id?: string
          monitor_chat_content?: boolean | null
          monitor_file_uploads?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          receive_real_time_notifications?: boolean | null
          relationship_id: string
          updated_at?: string | null
          usage_time_alerts?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_daily_summary?: boolean | null
          id?: string
          monitor_chat_content?: boolean | null
          monitor_file_uploads?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          receive_real_time_notifications?: boolean | null
          relationship_id?: string
          updated_at?: string | null
          usage_time_alerts?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_settings_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "guardian_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          import_id: string
          message_timestamp: string | null
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          import_id: string
          message_timestamp?: string | null
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          import_id?: string
          message_timestamp?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_messages_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "conversation_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_queue: {
        Row: {
          created_at: string | null
          detected_from: string | null
          gap_description: string | null
          id: string
          learned_data: string | null
          priority: number | null
          resolved_at: string | null
          source: string | null
          status: string | null
          topic: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          detected_from?: string | null
          gap_description?: string | null
          id?: string
          learned_data?: string | null
          priority?: number | null
          resolved_at?: string | null
          source?: string | null
          status?: string | null
          topic: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          detected_from?: string | null
          gap_description?: string | null
          id?: string
          learned_data?: string | null
          priority?: number | null
          resolved_at?: string | null
          source?: string | null
          status?: string | null
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lifetime_plan_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lifetime_plan_count: number | null
          max_lifetime_buyers: number | null
          promotion_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lifetime_plan_count?: number | null
          max_lifetime_buyers?: number | null
          promotion_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lifetime_plan_count?: number | null
          max_lifetime_buyers?: number | null
          promotion_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      livestock_access: {
        Row: {
          animal_ids: string[] | null
          expires_at: string | null
          granted_at: string
          granted_to: string
          id: string
          owner_id: string
          permissions: Json
          revoked_at: string | null
          role: string
        }
        Insert: {
          animal_ids?: string[] | null
          expires_at?: string | null
          granted_at?: string
          granted_to: string
          id?: string
          owner_id: string
          permissions?: Json
          revoked_at?: string | null
          role?: string
        }
        Update: {
          animal_ids?: string[] | null
          expires_at?: string | null
          granted_at?: string
          granted_to?: string
          id?: string
          owner_id?: string
          permissions?: Json
          revoked_at?: string | null
          role?: string
        }
        Relationships: []
      }
      livestock_animals: {
        Row: {
          acquisition_date: string | null
          acquisition_method: string | null
          animal_id: string
          birth_date: string | null
          breed: string | null
          color_markings: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string | null
          notes: string | null
          owner_id: string
          photo_url: string | null
          sex: string | null
          species: string
          status: string
          tag_id: string | null
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_method?: string | null
          animal_id: string
          birth_date?: string | null
          breed?: string | null
          color_markings?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          sex?: string | null
          species: string
          status?: string
          tag_id?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          acquisition_method?: string | null
          animal_id?: string
          birth_date?: string | null
          breed?: string | null
          color_markings?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          sex?: string | null
          species?: string
          status?: string
          tag_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      livestock_health_records: {
        Row: {
          administered_by: string | null
          animal_id: string
          cost: number | null
          created_at: string
          description: string | null
          dosage: string | null
          follow_up_date: string | null
          id: string
          medication: string | null
          record_type: string
          recorded_at: string
          title: string
          vet_name: string | null
        }
        Insert: {
          administered_by?: string | null
          animal_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          dosage?: string | null
          follow_up_date?: string | null
          id?: string
          medication?: string | null
          record_type: string
          recorded_at?: string
          title: string
          vet_name?: string | null
        }
        Update: {
          administered_by?: string | null
          animal_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          dosage?: string | null
          follow_up_date?: string | null
          id?: string
          medication?: string | null
          record_type?: string
          recorded_at?: string
          title?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestock_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_notes: {
        Row: {
          animal_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          note_type: string | null
        }
        Insert: {
          animal_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: string | null
        }
        Update: {
          animal_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestock_notes_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_production: {
        Row: {
          animal_id: string
          id: string
          notes: string | null
          production_type: string
          quality_grade: string | null
          quantity: number
          recorded_at: string
          recorded_by: string
          unit: string
        }
        Insert: {
          animal_id: string
          id?: string
          notes?: string | null
          production_type: string
          quality_grade?: string | null
          quantity: number
          recorded_at?: string
          recorded_by: string
          unit?: string
        }
        Update: {
          animal_id?: string
          id?: string
          notes?: string | null
          production_type?: string
          quality_grade?: string | null
          quantity?: number
          recorded_at?: string
          recorded_by?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_production_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_scan_logs: {
        Row: {
          animal_id: string | null
          card_id: string
          id: string
          ip_address: string | null
          result: string
          scanned_at: string
          scanned_by: string
        }
        Insert: {
          animal_id?: string | null
          card_id: string
          id?: string
          ip_address?: string | null
          result: string
          scanned_at?: string
          scanned_by: string
        }
        Update: {
          animal_id?: string | null
          card_id?: string
          id?: string
          ip_address?: string | null
          result?: string
          scanned_at?: string
          scanned_by?: string
        }
        Relationships: []
      }
      livestock_tag_pool: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_animal: string | null
          created_at: string
          id: string
          status: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_animal?: string | null
          created_at?: string
          id?: string
          status?: string
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_animal?: string | null
          created_at?: string
          id?: string
          status?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_tag_pool_assigned_to_animal_fkey"
            columns: ["assigned_to_animal"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_tags: {
        Row: {
          activated_at: string | null
          animal_id: string
          created_at: string
          deactivated_at: string | null
          id: string
          is_primary: boolean | null
          tag_location: string | null
          tag_number: string
          tag_type: string
        }
        Insert: {
          activated_at?: string | null
          animal_id: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_primary?: boolean | null
          tag_location?: string | null
          tag_number: string
          tag_type?: string
        }
        Update: {
          activated_at?: string | null
          animal_id?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_primary?: boolean | null
          tag_location?: string | null
          tag_number?: string
          tag_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_tags_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_transfers: {
        Row: {
          animal_id: string
          created_at: string
          from_owner: string
          id: string
          notes: string | null
          price: number | null
          status: string
          to_owner: string
          transfer_date: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          from_owner: string
          id?: string
          notes?: string | null
          price?: number | null
          status?: string
          to_owner: string
          transfer_date?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          from_owner?: string
          id?: string
          notes?: string | null
          price?: number | null
          status?: string
          to_owner?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_transfers_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_weights: {
        Row: {
          animal_id: string
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string
          weight_lbs: number
        }
        Insert: {
          animal_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by: string
          weight_lbs: number
        }
        Update: {
          animal_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string
          weight_lbs?: number
        }
        Relationships: [
          {
            foreignKeyName: "livestock_weights_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "livestock_animals"
            referencedColumns: ["id"]
          },
        ]
      }
      media_generations: {
        Row: {
          character_ids: string[] | null
          created_at: string | null
          id: string
          output_path: string | null
          output_type: string
          output_url: string | null
          prompt: string
          status: string | null
          style: string | null
          unified_prompt: string | null
          user_id: string
          visual_settings: Json | null
        }
        Insert: {
          character_ids?: string[] | null
          created_at?: string | null
          id?: string
          output_path?: string | null
          output_type?: string
          output_url?: string | null
          prompt: string
          status?: string | null
          style?: string | null
          unified_prompt?: string | null
          user_id: string
          visual_settings?: Json | null
        }
        Update: {
          character_ids?: string[] | null
          created_at?: string | null
          id?: string
          output_path?: string | null
          output_type?: string
          output_url?: string | null
          prompt?: string
          status?: string | null
          style?: string | null
          unified_prompt?: string | null
          user_id?: string
          visual_settings?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          room_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          audio_url: string | null
          bpm: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          genre: string | null
          id: string
          metadata: Json | null
          mood: string | null
          prompt: string | null
          source_audio_url: string | null
          status: string
          title: string
          track_type: string
          updated_at: string
          user_id: string
          voice_profile_id: string | null
        }
        Insert: {
          audio_url?: string | null
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          id?: string
          metadata?: Json | null
          mood?: string | null
          prompt?: string | null
          source_audio_url?: string | null
          status?: string
          title?: string
          track_type?: string
          updated_at?: string
          user_id: string
          voice_profile_id?: string | null
        }
        Update: {
          audio_url?: string | null
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          id?: string
          metadata?: Json | null
          mood?: string | null
          prompt?: string | null
          source_audio_url?: string | null
          status?: string
          title?: string
          track_type?: string
          updated_at?: string
          user_id?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          product_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_tasks: {
        Row: {
          created_at: string | null
          detected_from: string | null
          id: string
          remind_after: string | null
          status: string | null
          task_description: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detected_from?: string | null
          id?: string
          remind_after?: string | null
          status?: string | null
          task_description: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          detected_from?: string | null
          id?: string
          remind_after?: string | null
          status?: string | null
          task_description?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_configurations: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          lifetime_access: boolean | null
          limits: Json
          plan_display_name: string
          plan_name: string
          price_monthly: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          lifetime_access?: boolean | null
          limits?: Json
          plan_display_name: string
          plan_name: string
          price_monthly?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          lifetime_access?: boolean | null
          limits?: Json
          plan_display_name?: string
          plan_name?: string
          price_monthly?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_subscriptions: {
        Row: {
          created_at: string
          email: string
          external_platform_user_id: string | null
          features_unlocked: Json | null
          id: string
          last_sync_at: string | null
          plan_name: string
          platform_name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          sync_error: string | null
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          external_platform_user_id?: string | null
          features_unlocked?: Json | null
          id?: string
          last_sync_at?: string | null
          plan_name: string
          platform_name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          external_platform_user_id?: string | null
          features_unlocked?: Json | null
          id?: string
          last_sync_at?: string | null
          plan_name?: string
          platform_name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean
          created_at: string | null
          currency: string
          description: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json | null
          product_id: string
          trial_period_days: number | null
          type: string
          unit_amount: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          currency: string
          description?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id: string
          trial_period_days?: number | null
          type: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string
          trial_period_days?: number | null
          type?: string
          unit_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          chat_tokens_limit: number | null
          created_at: string | null
          current_plan: string | null
          file_upload_mb_limit: number | null
          id: string
          max_api_keys: number | null
          max_projects: number | null
          memory_enabled: boolean | null
          plus_access: boolean | null
          plus_features: Json | null
          plus_subscription_start_date: string | null
          plus_subscription_status: string | null
          plus_tier: string | null
          pro_access: boolean | null
          role: string | null
          special_date: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_plus_customer_id: string | null
          stripe_plus_subscription_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_tier: string | null
          tier: string | null
          tier_features: string[] | null
          tts_limit: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          chat_tokens_limit?: number | null
          created_at?: string | null
          current_plan?: string | null
          file_upload_mb_limit?: number | null
          id?: string
          max_api_keys?: number | null
          max_projects?: number | null
          memory_enabled?: boolean | null
          plus_access?: boolean | null
          plus_features?: Json | null
          plus_subscription_start_date?: string | null
          plus_subscription_status?: string | null
          plus_tier?: string | null
          pro_access?: boolean | null
          role?: string | null
          special_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_plus_customer_id?: string | null
          stripe_plus_subscription_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          tier?: string | null
          tier_features?: string[] | null
          tts_limit?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          chat_tokens_limit?: number | null
          created_at?: string | null
          current_plan?: string | null
          file_upload_mb_limit?: number | null
          id?: string
          max_api_keys?: number | null
          max_projects?: number | null
          memory_enabled?: boolean | null
          plus_access?: boolean | null
          plus_features?: Json | null
          plus_subscription_start_date?: string | null
          plus_subscription_status?: string | null
          plus_tier?: string | null
          pro_access?: boolean | null
          role?: string | null
          special_date?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_plus_customer_id?: string | null
          stripe_plus_subscription_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          tier?: string | null
          tier_features?: string[] | null
          tts_limit?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          notes: string | null
          receipt_date: string
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          notes?: string | null
          receipt_date?: string
          store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          notes?: string | null
          receipt_date?: string
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relationship_milestones: {
        Row: {
          id: string
          initiator: string | null
          milestone_date: string
          milestone_type: string
          note: string | null
          response: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          initiator?: string | null
          milestone_date: string
          milestone_type: string
          note?: string | null
          response?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          initiator?: string | null
          milestone_date?: string
          milestone_type?: string
          note?: string | null
          response?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      room_members: {
        Row: {
          room_id: string
          user_id: string
        }
        Insert: {
          room_id: string
          user_id: string
        }
        Update: {
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      savanaa_chats: {
        Row: {
          created_at: string | null
          id: string
          message: string
          speaker: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          speaker: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          speaker?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string
          quantity: number
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id: string
          quantity: number
          status: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string
          quantity?: number
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          starts_at: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_audit: {
        Row: {
          created_at: string | null
          event_description: string
          event_type: string
          id: string
          metadata: Json | null
          risk_level: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_description: string
          event_type: string
          id?: string
          metadata?: Json | null
          risk_level?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          risk_level?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_info: {
        Row: {
          created_at: string | null
          id: number
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: never
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: never
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      system_owners: {
        Row: {
          added_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          permissions: Json | null
          role: string | null
        }
        Insert: {
          added_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          role?: string | null
        }
        Update: {
          added_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          role?: string | null
        }
        Relationships: []
      }
      system_status: {
        Row: {
          estimated_duration: string | null
          id: string
          maintenance_mode: boolean | null
          message: string | null
          scheduled_end: string | null
          updated_at: string | null
          updated_by: string | null
          whitelist_ips: string[] | null
        }
        Insert: {
          estimated_duration?: string | null
          id?: string
          maintenance_mode?: boolean | null
          message?: string | null
          scheduled_end?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whitelist_ips?: string[] | null
        }
        Update: {
          estimated_duration?: string | null
          id?: string
          maintenance_mode?: boolean | null
          message?: string | null
          scheduled_end?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whitelist_ips?: string[] | null
        }
        Relationships: []
      }
      tier_upgrade_logs: {
        Row: {
          created_at: string | null
          id: number
          new_tier: string
          old_tier: string
          stripe_event_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          new_tier: string
          old_tier?: string
          stripe_event_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          new_tier?: string
          old_tier?: string
          stripe_event_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tiktok_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          tiktok_user_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          tiktok_user_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          tiktok_user_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_inputs: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          input_type: string
          is_active: boolean | null
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          input_type?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          input_type?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_controls: {
        Row: {
          created_at: string | null
          current_minute_requests: number | null
          daily_calculator_limit: number | null
          daily_calculator_used: number | null
          daily_doc_analysis_limit: number | null
          daily_docs_used: number | null
          daily_document_limit: number | null
          daily_document_used: number | null
          daily_image_gen_limit: number | null
          daily_images_used: number | null
          daily_tokens_limit: number | null
          daily_tokens_used: number | null
          daily_tts_limit: number | null
          daily_tts_used: number | null
          id: string
          is_suspended: boolean | null
          last_minute_reset: string | null
          last_monthly_reset: string | null
          last_reset_date: string | null
          monthly_ai_assistant_limit: number | null
          monthly_ai_assistant_used: number | null
          plan_name: string
          requests_per_minute_limit: number | null
          suspension_reason: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_minute_requests?: number | null
          daily_calculator_limit?: number | null
          daily_calculator_used?: number | null
          daily_doc_analysis_limit?: number | null
          daily_docs_used?: number | null
          daily_document_limit?: number | null
          daily_document_used?: number | null
          daily_image_gen_limit?: number | null
          daily_images_used?: number | null
          daily_tokens_limit?: number | null
          daily_tokens_used?: number | null
          daily_tts_limit?: number | null
          daily_tts_used?: number | null
          id?: string
          is_suspended?: boolean | null
          last_minute_reset?: string | null
          last_monthly_reset?: string | null
          last_reset_date?: string | null
          monthly_ai_assistant_limit?: number | null
          monthly_ai_assistant_used?: number | null
          plan_name?: string
          requests_per_minute_limit?: number | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_minute_requests?: number | null
          daily_calculator_limit?: number | null
          daily_calculator_used?: number | null
          daily_doc_analysis_limit?: number | null
          daily_docs_used?: number | null
          daily_document_limit?: number | null
          daily_document_used?: number | null
          daily_image_gen_limit?: number | null
          daily_images_used?: number | null
          daily_tokens_limit?: number | null
          daily_tokens_used?: number | null
          daily_tts_limit?: number | null
          daily_tts_used?: number | null
          id?: string
          is_suspended?: boolean | null
          last_minute_reset?: string | null
          last_monthly_reset?: string | null
          last_reset_date?: string | null
          monthly_ai_assistant_limit?: number | null
          monthly_ai_assistant_used?: number | null
          plan_name?: string
          requests_per_minute_limit?: number | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          ip_address: string | null
          last_name: string | null
          location: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          last_name?: string | null
          location?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          last_name?: string | null
          location?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_ffa_profiles: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          graduation_year: number | null
          id: string
          is_advisor: boolean | null
          officer_role: string | null
          setup_completed: boolean | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          graduation_year?: number | null
          id?: string
          is_advisor?: boolean | null
          officer_role?: string | null
          setup_completed?: boolean | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          graduation_year?: number | null
          id?: string
          is_advisor?: boolean | null
          officer_role?: string | null
          setup_completed?: boolean | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ffa_profiles_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          first_seen: string | null
          frequency: number | null
          id: string
          last_seen: string | null
          metadata: Json | null
          pattern_key: string
          pattern_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          first_seen?: string | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          pattern_key: string
          pattern_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          first_seen?: string | null
          frequency?: number | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          pattern_key?: string
          pattern_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          preference_type: string
          preference_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          preference_type: string
          preference_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          preference_type?: string
          preference_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auto_save: boolean | null
          avatar_url: string | null
          created_at: string | null
          fs_version: string | null
          full_name: string | null
          id: string
          show_advanced_options: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_save?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          fs_version?: string | null
          full_name?: string | null
          id?: string
          show_advanced_options?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_save?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          fs_version?: string | null
          full_name?: string | null
          id?: string
          show_advanced_options?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          report_type: string
          reported_user_id: string | null
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          report_type: string
          reported_user_id?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          report_type?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          email: string
          id: string
          metadata: Json | null
          plan_name: string
          plan_status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          plan_name?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          plan_name?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_violations: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          user_id: string | null
          violation_type: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          user_id?: string | null
          violation_type: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          username: string
        }
        Insert: {
          id?: string
          username: string
        }
        Update: {
          id?: string
          username?: string
        }
        Relationships: []
      }
      vision_memory: {
        Row: {
          ai_response: string
          category: string
          created_at: string
          id: string
          image_url: string
          metadata: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_response: string
          category?: string
          created_at?: string
          id?: string
          image_url: string
          metadata?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_response?: string
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          metadata?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          metadata: Json | null
          name: string
          sample_duration_seconds: number | null
          sample_path: string | null
          sample_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          sample_duration_seconds?: number | null
          sample_path?: string | null
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          sample_duration_seconds?: number | null
          sample_path?: string | null
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_samples: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      category_summary: {
        Row: {
          auto_category: string | null
          first_interaction: string | null
          last_interaction: string | null
          sample_questions: string | null
          sample_responses: string | null
          total_interactions: number | null
        }
        Relationships: []
      }
      category_training_data: {
        Row: {
          auto_category: string | null
          interactions: Json | null
        }
        Relationships: []
      }
      feedback_audit: {
        Row: {
          unmatched_feedback: number | null
        }
        Relationships: []
      }
      feedback_unmatched_details: {
        Row: {
          created_at: string | null
          id: string | null
          input_text: string | null
          output_text: string | null
          user_id: string | null
        }
        Relationships: []
      }
      sellable_ai_categories: {
        Row: {
          ai_response: string | null
          category: string | null
          created_at: string | null
          id: string | null
          user_input: string | null
        }
        Insert: {
          ai_response?: string | null
          category?: never
          created_at?: string | null
          id?: string | null
          user_input?: string | null
        }
        Update: {
          ai_response?: string | null
          category?: never
          created_at?: string | null
          id?: string | null
          user_input?: string | null
        }
        Relationships: []
      }
      sellable_ai_dataset: {
        Row: {
          ai_response: string | null
          category: string | null
          created_at: string | null
          id: string | null
          user_input: string | null
        }
        Relationships: []
      }
      sellable_ai_interactions: {
        Row: {
          ai_response: string | null
          category: string | null
          id: string | null
          user_input: string | null
        }
        Insert: {
          ai_response?: string | null
          category?: never
          id?: string | null
          user_input?: string | null
        }
        Update: {
          ai_response?: string | null
          category?: never
          id?: string | null
          user_input?: string | null
        }
        Relationships: []
      }
      sellable_dataset: {
        Row: {
          ai_response: string | null
          category: string | null
          id: string | null
          user_input: string | null
        }
        Insert: {
          ai_response?: string | null
          category?: never
          id?: string | null
          user_input?: string | null
        }
        Update: {
          ai_response?: string | null
          category?: never
          id?: string | null
          user_input?: string | null
        }
        Relationships: []
      }
      unmatched_feedback: {
        Row: {
          created_at: string | null
          flagged: boolean | null
          id: string | null
          input_text: string | null
          output_text: string | null
          score: number | null
          self_notes: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_interaction_feedback_audit: {
        Row: {
          ai_response: string | null
          feedback_time: string | null
          flagged: boolean | null
          input_text: string | null
          interaction_time: string | null
          output_text: string | null
          score: number | null
          self_notes: string | null
          user_input: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit_user_platform_sync: {
        Args: never
        Returns: {
          cridergpt_features: string[]
          cridergpt_tier: string
          email: string
          fsmb_tier: string
          full_name: string
          google_account_id: string
          last_audit_date: string
          payment_status: string
          revenue_total: number
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_end_date: string
          subscription_start_date: string
          sync_issues: string[]
          total_tokens_used: number
          total_tts_requests: number
          unlock_status: string
          user_id: string
        }[]
      }
      batch_sync_user_tiers: {
        Args: never
        Returns: {
          new_tier: string
          old_tier: string
          sync_result: Json
          user_id: string
        }[]
      }
      can_use_calculator: { Args: { user_uuid: string }; Returns: Json }
      can_user_make_request: {
        Args: {
          request_type?: string
          requested_amount?: number
          user_uuid: string
        }
        Returns: Json
      }
      can_user_request_tts:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      check_plus_access:
        | { Args: never; Returns: boolean }
        | { Args: { feature?: string }; Returns: boolean }
      check_tier_limit:
        | { Args: never; Returns: boolean }
        | { Args: { limit_type: string }; Returns: number }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      compute_user_revenue_mapping: {
        Args: never
        Returns: {
          active_subscriptions: number
          email: string
          features_purchased: string[]
          last_payment_date: string
          payment_method_status: string
          stripe_customer_id: string
          total_payments_amount: number
          user_id: string
        }[]
      }
      create_plus_only_rls: {
        Args: { feature?: string; target_table_name: string }
        Returns: undefined
      }
      create_tier_limit_policy: {
        Args: {
          limit_column: string
          limit_type: string
          target_table_name: string
        }
        Returns: undefined
      }
      example_function: { Args: { input_value: number }; Returns: number }
      generate_complete_platform_audit: {
        Args: never
        Returns: {
          audit_id: string
          audit_timestamp: string
          email: string
          feature_id_cridergpt: string
          feature_id_fsmb: string
          feature_name_cridergpt: string
          feature_name_fsmb: string
          features_unlocked_vs_paid: string
          full_name: string
          google_account_id: string
          missing_unlocks: string[]
          notes: string
          payment_id: string
          price: number
          revenue_total: number
          status: string
          stripe_customer_id: string
          user_id: string
          user_unlocked: boolean
        }[]
      }
      generate_reply: {
        Args: { persona: string; user_message: string }
        Returns: string
      }
      get_all_active_plans: {
        Args: never
        Returns: {
          features: Json
          limits: Json
          plan_display_name: string
          plan_name: string
          price_monthly: number
          sort_order: number
        }[]
      }
      get_crideros_milestone:
        | { Args: never; Returns: Record<string, unknown>[] }
        | { Args: { milestone_name: string }; Returns: string }
      get_crideros_start_date: { Args: never; Returns: string }
      get_crideros_timeline: {
        Args: never
        Returns: {
          milestone_date: string
          milestone_description: string
          milestone_name: string
          milestone_status: string
        }[]
      }
      get_owner_details:
        | {
            Args: never
            Returns: {
              contact_email: string
              owner_name: string
            }[]
          }
        | {
            Args: { check_email: string }
            Returns: {
              is_owner: boolean
              permissions: Json
              role: string
            }[]
          }
      get_plan_features: {
        Args: { plan_name_input: string }
        Returns: {
          features: Json
          limits: Json
          plan_display_name: string
          plan_name: string
          price_monthly: number
        }[]
      }
      get_stripe_customer_id: { Args: never; Returns: string }
      get_subscription_status:
        | {
            Args: never
            Returns: {
              amount: number
              cancel_at_period_end: boolean
              currency: string
              current_period_end: string
              interval_count: number
              interval_value: string
              price_id: string
              product_name: string
              status: string
              subscription_id: string
            }[]
          }
        | {
            Args: { user_id: string }
            Returns: {
              current_period_end: string
              is_subscribed: boolean
              price_id: string
              subscription_status: string
            }[]
          }
      get_training_inputs: {
        Args: {
          input_category?: string
          limit_count?: number
          user_uuid: string
        }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          metadata: Json
        }[]
      }
      get_usage_summary: { Args: { user_uuid: string }; Returns: Json }
      get_user_current_plan: {
        Args: { user_uuid?: string }
        Returns: {
          current_plan: string
          email: string
          is_active: boolean
          plan_display_name: string
          plan_limits: Json
          platform_features: Json
          plus_access: boolean
          pro_access: boolean
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_end_date: string
          subscription_status: string
          tier: string
          user_id: string
        }[]
      }
      get_user_sync_data: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          tier: string
          tier_created_at: string
          tokens_used: number
          tts_requests: number
          user_plan: string
          username: string
        }[]
      }
      has_active_subscription: { Args: never; Returns: boolean }
      has_livestock_access: {
        Args: { check_animal_id: string; check_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tier_feature: { Args: { feature: string }; Returns: boolean }
      is_founder:
        | { Args: never; Returns: boolean }
        | { Args: { check_email: string }; Returns: boolean }
      is_guardian_of: {
        Args: { child_uuid: string; guardian_uuid: string }
        Returns: boolean
      }
      log_tier_upgrade:
        | {
            Args: {
              p_new_tier: string
              p_old_tier: string
              p_stripe_event_id: string
              p_user_id: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_new_tier?: string
              p_old_tier?: string
              p_stripe_event_id?: string
              p_user_id: string
            }
            Returns: undefined
          }
      record_calculator_usage: {
        Args: {
          calc_type: string
          input_data: Json
          project_id?: string
          result_data: Json
          user_uuid: string
        }
        Returns: string
      }
      record_usage: {
        Args: { amount_used?: number; request_type: string; user_uuid: string }
        Returns: boolean
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
      reset_query_statistics: { Args: never; Returns: undefined }
      safe_batch_sync_user_tiers: {
        Args: never
        Returns: {
          message: string
          new_tier: string
          previous_tier: string
          status: string
          sync_timestamp: string
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_pro_access: {
        Args: { new_pro_status: boolean; user_id: string }
        Returns: undefined
      }
      user_has_feature_access: {
        Args: { feature_name: string }
        Returns: boolean
      }
      validate_cross_platform_unlocks: {
        Args: never
        Returns: {
          cridergpt_feature_id: string
          cridergpt_feature_name: string
          cridergpt_unlocked: boolean
          email: string
          fsmb_feature_id: string
          fsmb_feature_name: string
          fsmb_unlocked: boolean
          price_paid: number
          unlock_consistent: boolean
          user_id: string
          validation_notes: string
        }[]
      }
      verify_developer: { Args: { check_user_id?: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

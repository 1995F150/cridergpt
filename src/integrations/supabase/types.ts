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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
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
      ai_requests: {
        Row: {
          created_at: string
          id: number
          prompt: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          prompt: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          prompt?: string
          response?: string
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
          tokens_used?: number
          tts_requests?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Relationships: []
      }
      analysis_logs: {
        Row: {
          analysis_summary: Json
          created_at: string
          file_name: string
          file_type: string
          id: string
          user_id: string
        }
        Insert: {
          analysis_summary: Json
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          user_id: string
        }
        Update: {
          analysis_summary?: Json
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          user_id?: string
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
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      autonomous_fixes: {
        Row: {
          fix_applied: string
          fix_result: Json | null
          id: string
          issue_description: string
          issue_type: string
          timestamp: string | null
        }
        Insert: {
          fix_applied: string
          fix_result?: Json | null
          id?: string
          issue_description: string
          issue_type: string
          timestamp?: string | null
        }
        Update: {
          fix_applied?: string
          fix_result?: Json | null
          id?: string
          issue_description?: string
          issue_type?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      autonomous_tasks: {
        Row: {
          action: string
          description: string
          id: string
          priority: string
          result: Json | null
          status: string
          timestamp: string | null
          type: string
        }
        Insert: {
          action: string
          description: string
          id: string
          priority: string
          result?: Json | null
          status?: string
          timestamp?: string | null
          type: string
        }
        Update: {
          action?: string
          description?: string
          id?: string
          priority?: string
          result?: Json | null
          status?: string
          timestamp?: string | null
          type?: string
        }
        Relationships: []
      }
      autonomous_updates: {
        Row: {
          description: string
          id: string
          result: Json | null
          timestamp: string | null
          update_type: string
        }
        Insert: {
          description: string
          id?: string
          result?: Json | null
          timestamp?: string | null
          update_type: string
        }
        Update: {
          description?: string
          id?: string
          result?: Json | null
          timestamp?: string | null
          update_type?: string
        }
        Relationships: []
      }
      background_datasets: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          reference_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          reference_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          reference_url?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
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
      calculator_records: {
        Row: {
          calculator_type: string
          created_at: string
          ffa_project_id: string | null
          id: string
          input_data: Json
          result_data: Json
          timestamp: string
          user_id: string
        }
        Insert: {
          calculator_type: string
          created_at?: string
          ffa_project_id?: string | null
          id?: string
          input_data: Json
          result_data: Json
          timestamp?: string
          user_id: string
        }
        Update: {
          calculator_type?: string
          created_at?: string
          ffa_project_id?: string | null
          id?: string
          input_data?: Json
          result_data?: Json
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_calculator_ffa_project"
            columns: ["ffa_project_id"]
            isOneToOne: false
            referencedRelation: "ffa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
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
      categorized_interactions: {
        Row: {
          ai_response: string
          categorized_at: string | null
          category: string
          created_at: string | null
          id: string
          interaction_id: string
          user_input: string
        }
        Insert: {
          ai_response: string
          categorized_at?: string | null
          category: string
          created_at?: string | null
          id?: string
          interaction_id: string
          user_input: string
        }
        Update: {
          ai_response?: string
          categorized_at?: string | null
          category?: string
          created_at?: string | null
          id?: string
          interaction_id?: string
          user_input?: string
        }
        Relationships: []
      }
      category_definitions: {
        Row: {
          category_name: string | null
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
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
      chapter_documents: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          document_type: string
          file_url: string | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_documents_chapter_id_fkey"
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
          created_at: string | null
          id: string
          is_archived: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          created_at: string
          id: number
          price_id: string
          status: string
          stripe_checkout_id: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          price_id: string
          status?: string
          stripe_checkout_id: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          price_id?: string
          status?: string
          stripe_checkout_id?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_interactions: {
        Row: {
          answer: string
          created_at: string | null
          id: number
          ip_address: string | null
          question: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: never
          ip_address?: string | null
          question: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: never
          ip_address?: string | null
          question?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crider_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_ephemeral: boolean | null
          message_type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_ephemeral?: boolean | null
          message_type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_ephemeral?: boolean | null
          message_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crider_chat_users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          is_synced: boolean | null
          location: Json | null
          status: string | null
          sync_note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          is_synced?: boolean | null
          location?: Json | null
          status?: string | null
          sync_note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          is_synced?: boolean | null
          location?: Json | null
          status?: string | null
          sync_note?: string | null
          updated_at?: string | null
          user_id?: string
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
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant1_id: string
          participant2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant1_id: string
          participant2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant1_id?: string
          participant2_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          related_calculator_id: string | null
          related_project_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          related_calculator_id?: string | null
          related_project_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          related_calculator_id?: string | null
          related_project_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_calculator"
            columns: ["related_calculator_id"]
            isOneToOne: false
            referencedRelation: "calculator_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_project"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "ffa_projects"
            referencedColumns: ["id"]
          },
        ]
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
      feature_usage: {
        Row: {
          created_at: string | null
          feature_name: string
          id: string
          status: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_name: string
          id?: string
          status: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_name?: string
          id?: string
          status?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          calculator_record_id: string | null
          corrected_data: Json | null
          created_at: string
          feedback_type: string
          id: string
          notes: string | null
          original_data: Json | null
          user_id: string
        }
        Insert: {
          calculator_record_id?: string | null
          corrected_data?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          original_data?: Json | null
          user_id: string
        }
        Update: {
          calculator_record_id?: string | null
          corrected_data?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          original_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_calculator"
            columns: ["calculator_record_id"]
            isOneToOne: false
            referencedRelation: "calculator_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ffa_projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          expenses: number | null
          hours_logged: number | null
          id: string
          income: number | null
          project_name: string
          project_type: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          expenses?: number | null
          hours_logged?: number | null
          id?: string
          income?: number | null
          project_name: string
          project_type?: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          expenses?: number | null
          hours_logged?: number | null
          id?: string
          income?: number | null
          project_name?: string
          project_type?: string
          start_date?: string | null
          updated_at?: string
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
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      function_error_analysis: {
        Row: {
          analysis_timestamp: string | null
          auto_fix_attempted: boolean | null
          error_count: number
          error_details: Json | null
          id: string
        }
        Insert: {
          analysis_timestamp?: string | null
          auto_fix_attempted?: boolean | null
          error_count: number
          error_details?: Json | null
          id?: string
        }
        Update: {
          analysis_timestamp?: string | null
          auto_fix_attempted?: boolean | null
          error_count?: number
          error_details?: Json | null
          id?: string
        }
        Relationships: []
      }
      google_integration_activity: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          service_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          service_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          service_name?: string
          user_id?: string
        }
        Relationships: []
      }
      google_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_synced: string | null
          refresh_token: string | null
          scopes: string[]
          service_name: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_synced?: string | null
          refresh_token?: string | null
          scopes?: string[]
          service_name: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_synced?: string | null
          refresh_token?: string | null
          scopes?: string[]
          service_name?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_name: string | null
          due_date: string | null
          ffa_project_id: string | null
          id: string
          invoice_number: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          ffa_project_id?: string | null
          id?: string
          invoice_number: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          ffa_project_id?: string | null
          id?: string
          invoice_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_project"
            columns: ["ffa_project_id"]
            isOneToOne: false
            referencedRelation: "ffa_projects"
            referencedColumns: ["id"]
          },
        ]
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
      memories: {
        Row: {
          created_at: string
          id: number
          image_url: string
          label: string
          user_email: string
        }
        Insert: {
          created_at: string
          id?: number
          image_url: string
          label: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: number
          image_url?: string
          label?: string
          user_email?: string
        }
        Relationships: []
      }
      monitoring_logs: {
        Row: {
          errors_count: number | null
          health_status: boolean | null
          id: string
          issues_count: number | null
          performance_metrics: Json | null
          timestamp: string | null
        }
        Insert: {
          errors_count?: number | null
          health_status?: boolean | null
          id?: string
          issues_count?: number | null
          performance_metrics?: Json | null
          timestamp?: string | null
        }
        Update: {
          errors_count?: number | null
          health_status?: boolean | null
          id?: string
          issues_count?: number | null
          performance_metrics?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      openai_requests: {
        Row: {
          created_at: string
          free_tier_tokens: number
          id: number
          model: string
          plus_tier_tokens: number
          query: string
          response: string | null
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          free_tier_tokens?: number
          id?: never
          model: string
          plus_tier_tokens?: number
          query: string
          response?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          free_tier_tokens?: number
          id?: never
          model?: string
          plus_tier_tokens?: number
          query?: string
          response?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      profiles_old: {
        Row: {
          chat_tokens_limit: number | null
          current_plan: string | null
          file_upload_mb_limit: number | null
          id: string
          max_api_keys: number | null
          max_projects: number | null
          old_id: number
          plus_access: boolean | null
          plus_features: Json | null
          plus_subscription_start_date: string | null
          plus_subscription_status: string | null
          plus_tier: string | null
          pro_access: boolean | null
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
          current_plan?: string | null
          file_upload_mb_limit?: number | null
          id?: string
          max_api_keys?: number | null
          max_projects?: number | null
          old_id?: number
          plus_access?: boolean | null
          plus_features?: Json | null
          plus_subscription_start_date?: string | null
          plus_subscription_status?: string | null
          plus_tier?: string | null
          pro_access?: boolean | null
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
          current_plan?: string | null
          file_upload_mb_limit?: number | null
          id?: string
          max_api_keys?: number | null
          max_projects?: number | null
          old_id?: number
          plus_access?: boolean | null
          plus_features?: Json | null
          plus_subscription_start_date?: string | null
          plus_subscription_status?: string | null
          plus_tier?: string | null
          pro_access?: boolean | null
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
      relationships: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string | null
          relationship_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id?: string | null
          relationship_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string | null
          relationship_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
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
      stories: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount_paid: number
          created_at: string
          customer_id: string
          id: number
          invoice_id: string
          payment_date: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          customer_id: string
          id?: never
          invoice_id: string
          payment_date: string
          status: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_id?: string
          id?: never
          invoice_id?: string
          payment_date?: string
          status?: string
          user_id?: string | null
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
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: number
          response_history: string[] | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: never
          response_history?: string[] | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: never
          response_history?: string[] | null
          status?: string
          subject?: string
          updated_at?: string
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
      system_updates: {
        Row: {
          created_at: string | null
          date: string
          id: string
          message: string
          priority: string
          title: string
          type: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          message: string
          priority?: string
          title: string
          type?: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          message?: string
          priority?: string
          title?: string
          type?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      text_to_speech_requests: {
        Row: {
          audio_file_path: string
          created_at: string
          id: number
          text: string
          user_id: string
        }
        Insert: {
          audio_file_path: string
          created_at?: string
          id?: never
          text: string
          user_id: string
        }
        Update: {
          audio_file_path?: string
          created_at?: string
          id?: never
          text?: string
          user_id?: string
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
      tts_requests: {
        Row: {
          count: number | null
          month: string
          user_id: string
        }
        Insert: {
          count?: number | null
          month: string
          user_id: string
        }
        Update: {
          count?: number | null
          month?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: number
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: never
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: never
          uploaded_at?: string
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
      usage_log: {
        Row: {
          id: string
          tokens_used: number
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          tokens_used: number
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          tokens_used?: number
          used_at?: string | null
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
      user_agreements: {
        Row: {
          accepted_at: string | null
          agreement_version: string
          id: number
          user_email: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          agreement_version: string
          id?: never
          user_email: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          agreement_version?: string
          id?: never
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_chats: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          role?: string | null
          user_id?: string | null
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
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
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
      user_subscriptions_backup: {
        Row: {
          created_at: string | null
          id: string
          tier: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tier: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_tiers: {
        Row: {
          created_at: string | null
          id: number
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_updates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          title: string
          update_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          update_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          update_type?: string
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
      vehicle_designs: {
        Row: {
          brand: string
          category: string
          config: Json
          created_at: string
          id: string
          model_data: Json | null
          name: string
          updated_at: string
          user_id: string
          xml_content: string | null
        }
        Insert: {
          brand: string
          category?: string
          config?: Json
          created_at?: string
          id?: string
          model_data?: Json | null
          name: string
          updated_at?: string
          user_id: string
          xml_content?: string | null
        }
        Update: {
          brand?: string
          category?: string
          config?: Json
          created_at?: string
          id?: string
          model_data?: Json | null
          name?: string
          updated_at?: string
          user_id?: string
          xml_content?: string | null
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

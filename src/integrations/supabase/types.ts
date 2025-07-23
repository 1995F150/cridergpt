export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
          current_plan: string | null
          file_upload_mb_limit: number | null
          id: string
          max_api_keys: number | null
          max_projects: number | null
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
          price_id: string
          quantity: number
          status: string
          trial_end: string | null
          trial_start: string | null
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
          price_id: string
          quantity: number
          status: string
          trial_end?: string | null
          trial_start?: string | null
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
          price_id?: string
          quantity?: number
          status?: string
          trial_end?: string | null
          trial_start?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_request_tts: {
        Args: Record<PropertyKey, never> | { uid: string }
        Returns: boolean
      }
      check_plus_access: {
        Args: Record<PropertyKey, never> | { feature?: string }
        Returns: boolean
      }
      check_tier_limit: {
        Args: Record<PropertyKey, never> | { limit_type: string }
        Returns: number
      }
      create_plus_only_rls: {
        Args: { target_table_name: string; feature?: string }
        Returns: undefined
      }
      create_tier_limit_policy: {
        Args: {
          target_table_name: string
          limit_column: string
          limit_type: string
        }
        Returns: undefined
      }
      example_function: {
        Args: { input_value: number }
        Returns: number
      }
      get_crideros_milestone: {
        Args: Record<PropertyKey, never> | { milestone_name: string }
        Returns: string
      }
      get_crideros_start_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_crideros_timeline: {
        Args: Record<PropertyKey, never>
        Returns: {
          milestone_name: string
          milestone_date: string
          milestone_description: string
          milestone_status: string
        }[]
      }
      get_owner_details: {
        Args: Record<PropertyKey, never> | { check_email: string }
        Returns: {
          owner_name: string
          contact_email: string
        }[]
      }
      get_stripe_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_subscription_status: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: {
          subscription_id: string
          product_name: string
          price_id: string
          status: string
          current_period_end: string
          cancel_at_period_end: boolean
          amount: number
          currency: string
          interval_value: string
          interval_count: number
        }[]
      }
      has_active_subscription: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_tier_feature: {
        Args: { feature: string }
        Returns: boolean
      }
      is_founder: {
        Args: Record<PropertyKey, never> | { check_email: string }
        Returns: boolean
      }
      log_tier_upgrade: {
        Args:
          | {
              p_user_id: number
              p_old_tier: string
              p_new_tier: string
              p_stripe_event_id: string
            }
          | {
              p_user_id: string
              p_old_tier?: string
              p_new_tier?: string
              p_stripe_event_id?: string
            }
        Returns: undefined
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_query_statistics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_pro_access: {
        Args: { user_id: string; new_pro_status: boolean }
        Returns: undefined
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

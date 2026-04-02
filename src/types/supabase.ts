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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_chat_logs: {
        Row: {
          created_at: string
          id: number
          intent: string | null
          sender: string
          session_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: number
          intent?: string | null
          sender: string
          session_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: number
          intent?: string | null
          sender?: string
          session_id?: string
          text?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          impact_score: number | null
          status: string | null
          type: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          impact_score?: number | null
          status?: string | null
          type: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          impact_score?: number | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          advance_notice_days: number | null
          buffer_nights_after: number | null
          buffer_nights_before: number | null
          created_at: string | null
          end_date: string
          id: string
          is_blocked: boolean | null
          last_synced_at: string | null
          min_nights: number | null
          origin_type: string | null
          price_override: number | null
          property_id: string | null
          reason: string | null
          requires_manual_approval: boolean | null
          restricted_checkin_days: Json | null
          restricted_checkout_days: Json | null
          start_date: string
          sync_last_hash: string | null
          updated_at: string | null
        }
        Insert: {
          advance_notice_days?: number | null
          buffer_nights_after?: number | null
          buffer_nights_before?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          is_blocked?: boolean | null
          last_synced_at?: string | null
          min_nights?: number | null
          origin_type?: string | null
          price_override?: number | null
          property_id?: string | null
          reason?: string | null
          requires_manual_approval?: boolean | null
          restricted_checkin_days?: Json | null
          restricted_checkout_days?: Json | null
          start_date: string
          sync_last_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          advance_notice_days?: number | null
          buffer_nights_after?: number | null
          buffer_nights_before?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_blocked?: boolean | null
          last_synced_at?: string | null
          min_nights?: number | null
          origin_type?: string | null
          price_override?: number | null
          property_id?: string | null
          reason?: string | null
          requires_manual_approval?: boolean | null
          restricted_checkin_days?: Json | null
          restricted_checkout_days?: Json | null
          start_date?: string
          sync_last_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons_breakdown: Json | null
          applied_policy: Json | null
          auto_cancel_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in: string
          check_out: string
          cleaning_fee_at_booking: number | null
          contract_signed: boolean | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          email_sent: boolean | null
          email_sent_feedback: boolean | null
          email_sent_thanks: boolean | null
          guests_count: number | null
          hold_expires_at: string | null
          id: string
          instructions_sent_at: string | null
          is_manual_block: boolean | null
          last_notification_sent: string | null
          notified_external_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          policy_snapshot: Json | null
          property_id: string | null
          service_fee_at_booking: number | null
          source: string | null
          status: string | null
          stripe_client_secret: string | null
          stripe_payment_intent_id: string | null
          sync_last_hash: string | null
          total_paid_at_booking: number | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          addons_breakdown?: Json | null
          applied_policy?: Json | null
          auto_cancel_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in: string
          check_out: string
          cleaning_fee_at_booking?: number | null
          contract_signed?: boolean | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          email_sent?: boolean | null
          email_sent_feedback?: boolean | null
          email_sent_thanks?: boolean | null
          guests_count?: number | null
          hold_expires_at?: string | null
          id?: string
          instructions_sent_at?: string | null
          is_manual_block?: boolean | null
          last_notification_sent?: string | null
          notified_external_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          policy_snapshot?: Json | null
          property_id?: string | null
          service_fee_at_booking?: number | null
          source?: string | null
          status?: string | null
          stripe_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          sync_last_hash?: string | null
          total_paid_at_booking?: number | null
          total_price: number
          user_id?: string | null
        }
        Update: {
          addons_breakdown?: Json | null
          applied_policy?: Json | null
          auto_cancel_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          cleaning_fee_at_booking?: number | null
          contract_signed?: boolean | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          email_sent?: boolean | null
          email_sent_feedback?: boolean | null
          email_sent_thanks?: boolean | null
          guests_count?: number | null
          hold_expires_at?: string | null
          id?: string
          instructions_sent_at?: string | null
          is_manual_block?: boolean | null
          last_notification_sent?: string | null
          notified_external_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          policy_snapshot?: Json | null
          property_id?: string | null
          service_fee_at_booking?: number | null
          source?: string | null
          status?: string | null
          stripe_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          sync_last_hash?: string | null
          total_paid_at_booking?: number | null
          total_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "fk_bookings_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_activity_logs: {
        Row: {
          created_at: string | null
          date: string | null
          emergencies_coordinated: number | null
          id: string
          inquiries_resolved: number | null
          maintenance_tasks: number | null
          revenue_generated: number | null
          salty_efficiency_score: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          emergencies_coordinated?: number | null
          id?: string
          inquiries_resolved?: number | null
          maintenance_tasks?: number | null
          revenue_generated?: number | null
          salty_efficiency_score?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          emergencies_coordinated?: number | null
          id?: string
          inquiries_resolved?: number | null
          maintenance_tasks?: number | null
          revenue_generated?: number | null
          salty_efficiency_score?: number | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          booking_history_ref: Json | null
          current_property: string | null
          current_url: string | null
          human_takeover_until: string | null
          id: string
          is_host_typing: boolean | null
          last_interaction: string | null
          last_sentiment: string | null
          message_count: number | null
          session_id: string | null
          takeover_notified: boolean | null
          user_id: string | null
        }
        Insert: {
          booking_history_ref?: Json | null
          current_property?: string | null
          current_url?: string | null
          human_takeover_until?: string | null
          id?: string
          is_host_typing?: boolean | null
          last_interaction?: string | null
          last_sentiment?: string | null
          message_count?: number | null
          session_id?: string | null
          takeover_notified?: boolean | null
          user_id?: string | null
        }
        Update: {
          booking_history_ref?: Json | null
          current_property?: string | null
          current_url?: string | null
          human_takeover_until?: string | null
          id?: string
          is_host_typing?: boolean | null
          last_interaction?: string | null
          last_sentiment?: string | null
          message_count?: number | null
          session_id?: string | null
          takeover_notified?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_leads: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cron_heartbeats: {
        Row: {
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: number
          status: string | null
          task_name: string | null
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          status?: string | null
          task_name?: string | null
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: number
          status?: string | null
          task_name?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      destination_guides: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          distance: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          map_url: string | null
          salty_tip: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          map_url?: string | null
          salty_tip?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          map_url?: string | null
          salty_tip?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      earnings: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: number
          property_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          id?: number
          property_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: number
          property_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          opened_at: string | null
          resend_id: string
          status: string | null
          subject: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          opened_at?: string | null
          resend_id: string
          status?: string | null
          subject?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_tickets: {
        Row: {
          booking_id: string | null
          created_at: string | null
          description: string | null
          id: string
          issue_type: string
          property_id: string | null
          provider_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type: string
          property_id?: string | null
          provider_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          property_id?: string | null
          provider_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "emergency_tickets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          date_of_interest: string | null
          email: string
          full_name: string
          id: string
          interest: string | null
          message: string
          phone: string | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          date_of_interest?: string | null
          email: string
          full_name: string
          id?: string
          interest?: string | null
          message: string
          phone?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          date_of_interest?: string | null
          email?: string
          full_name?: string
          id?: string
          interest?: string | null
          message?: string
          phone?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: number
          sender: string
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          sender: string
          text: string
        }
        Update: {
          created_at?: string | null
          id?: number
          sender?: string
          text?: string
        }
        Relationships: []
      }
      pending_bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          expires_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          property_id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          expires_at: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          property_id: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          expires_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          property_id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          given_concessions: Json | null
          id: string
          interest_tags: string[] | null
          phone: string | null
          role: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          given_concessions?: Json | null
          id: string
          interest_tags?: string[] | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          given_concessions?: Json | null
          id?: string
          interest_tags?: string[] | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean | null
          allow_on_seasonal_prices: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_percent: number
          id: string
          max_uses: number | null
          min_stay_nights: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean | null
          allow_on_seasonal_prices?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent: number
          id?: string
          max_uses?: number | null
          min_stay_nights?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean | null
          allow_on_seasonal_prices?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number
          id?: string
          max_uses?: number | null
          min_stay_nights?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_code: string | null
          address: string | null
          airbnb_id: string | null
          airbnb_url: string | null
          amenities: string[] | null
          availability_urgency_msg: string | null
          baths: number | null
          bedrooms: number | null
          beds: number | null
          blockeddates: Json | null
          calendarSync: Json | null
          cancellation_policy_type: string | null
          category: string | null
          cleaning_fee: number | null
          created_at: string | null
          description: string | null
          email: string | null
          exact_lat_long: string | null
          featuredamenity: string | null
          fees: Json | null
          general_area_map_url: string | null
          google_maps_url: string | null
          guests: number | null
          guidebook_url: string | null
          host: Json | null
          host_id: string | null
          house_rules: string[] | null
          id: string
          images: string[] | null
          images_backup: string[] | null
          images_meta: Json | null
          is_offline: boolean | null
          location: string | null
          location_coords: string | null
          lockbox_image_url: string | null
          max_discount_allowed: number | null
          min_price_floor: number | null
          offers: Json | null
          original_price: number | null
          policies: Json | null
          price: number
          property_features: Json | null
          rating: number | null
          review_url: string | null
          reviews: number | null
          reviews_count: number | null
          reviews_list: Json | null
          seasonal_prices: Json | null
          security_deposit: number | null
          service_fee: number | null
          subtitle: string | null
          sync_last_hash: string | null
          sync_settings: Json | null
          tax_rate: number | null
          title: string
          type: string | null
          updated_at: string | null
          waze_url: string | null
          wifi_name: string | null
          wifi_pass: string | null
        }
        Insert: {
          access_code?: string | null
          address?: string | null
          airbnb_id?: string | null
          airbnb_url?: string | null
          amenities?: string[] | null
          availability_urgency_msg?: string | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          blockeddates?: Json | null
          calendarSync?: Json | null
          cancellation_policy_type?: string | null
          category?: string | null
          cleaning_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          exact_lat_long?: string | null
          featuredamenity?: string | null
          fees?: Json | null
          general_area_map_url?: string | null
          google_maps_url?: string | null
          guests?: number | null
          guidebook_url?: string | null
          host?: Json | null
          host_id?: string | null
          house_rules?: string[] | null
          id?: string
          images?: string[] | null
          images_backup?: string[] | null
          images_meta?: Json | null
          is_offline?: boolean | null
          location?: string | null
          location_coords?: string | null
          lockbox_image_url?: string | null
          max_discount_allowed?: number | null
          min_price_floor?: number | null
          offers?: Json | null
          original_price?: number | null
          policies?: Json | null
          price: number
          property_features?: Json | null
          rating?: number | null
          review_url?: string | null
          reviews?: number | null
          reviews_count?: number | null
          reviews_list?: Json | null
          seasonal_prices?: Json | null
          security_deposit?: number | null
          service_fee?: number | null
          subtitle?: string | null
          sync_last_hash?: string | null
          sync_settings?: Json | null
          tax_rate?: number | null
          title: string
          type?: string | null
          updated_at?: string | null
          waze_url?: string | null
          wifi_name?: string | null
          wifi_pass?: string | null
        }
        Update: {
          access_code?: string | null
          address?: string | null
          airbnb_id?: string | null
          airbnb_url?: string | null
          amenities?: string[] | null
          availability_urgency_msg?: string | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          blockeddates?: Json | null
          calendarSync?: Json | null
          cancellation_policy_type?: string | null
          category?: string | null
          cleaning_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          exact_lat_long?: string | null
          featuredamenity?: string | null
          fees?: Json | null
          general_area_map_url?: string | null
          google_maps_url?: string | null
          guests?: number | null
          guidebook_url?: string | null
          host?: Json | null
          host_id?: string | null
          house_rules?: string[] | null
          id?: string
          images?: string[] | null
          images_backup?: string[] | null
          images_meta?: Json | null
          is_offline?: boolean | null
          location?: string | null
          location_coords?: string | null
          lockbox_image_url?: string | null
          max_discount_allowed?: number | null
          min_price_floor?: number | null
          offers?: Json | null
          original_price?: number | null
          policies?: Json | null
          price?: number
          property_features?: Json | null
          rating?: number | null
          review_url?: string | null
          reviews?: number | null
          reviews_count?: number | null
          reviews_list?: Json | null
          seasonal_prices?: Json | null
          security_deposit?: number | null
          service_fee?: number | null
          subtitle?: string | null
          sync_last_hash?: string | null
          sync_settings?: Json | null
          tax_rate?: number | null
          title?: string
          type?: string | null
          updated_at?: string | null
          waze_url?: string | null
          wifi_name?: string | null
          wifi_pass?: string | null
        }
        Relationships: []
      }
      property_cohosts: {
        Row: {
          created_at: string
          email: string
          id: string
          invitation_token: string | null
          property_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invitation_token?: string | null
          property_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invitation_token?: string | null
          property_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      property_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          property_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          property_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
        ]
      }
      reviews: {
        Row: {
          author: string
          avatar_url: string | null
          booking_id: string | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          property_id: string
          rating: number | null
          source: string | null
          text: string
          user_id: string | null
        }
        Insert: {
          author: string
          avatar_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          property_id: string
          rating?: number | null
          source?: string | null
          text: string
          user_id?: string | null
        }
        Update: {
          author?: string
          avatar_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          property_id?: string
          rating?: number | null
          source?: string | null
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      salty_family_knowledge: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      salty_memories: {
        Row: {
          created_at: string
          id: string
          learned_text: string
          property_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          learned_text: string
          property_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          learned_text?: string
          property_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_salty_memories_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_salty_memories_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_salty_memories_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          base_fee: number | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          priority: number | null
          specialty: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          base_fee?: number | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          priority?: number | null
          specialty: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          base_fee?: number | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          priority?: number | null
          specialty?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string | null
          id: string
          phone: string
          property_id: string | null
          resend_id: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          phone: string
          property_id?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          phone?: string
          property_id?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      synced_blocks: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          id: string
          property_id: string
          source: string
          sync_hash: string | null
          sync_session_id: string | null
          updated_at: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          id?: string
          property_id: string
          source: string
          sync_hash?: string | null
          sync_session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          id?: string
          property_id?: string
          source?: string
          sync_hash?: string | null
          sync_session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          consecutive_failures: number | null
          error_details: string | null
          id: string
          last_check: string | null
          latency_ms: number | null
          metadata: Json | null
          property_id: string | null
          service_name: string
          status: string
        }
        Insert: {
          consecutive_failures?: number | null
          error_details?: string | null
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          property_id?: string | null
          service_name: string
          status: string
        }
        Update: {
          consecutive_failures?: number | null
          error_details?: string | null
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          property_id?: string | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          meta: Json | null
          service: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          meta?: Json | null
          service: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          service?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          done: boolean | null
          id: number
          priority: string | null
          property: string
          property_id: string | null
          status: string | null
          text: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          done?: boolean | null
          id?: number
          priority?: string | null
          property: string
          property_id?: string | null
          status?: string | null
          text: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          done?: boolean | null
          id?: number
          priority?: string | null
          property?: string
          property_id?: string | null
          status?: string | null
          text?: string
        }
        Relationships: []
      }
      urgent_alerts: {
        Row: {
          contact: string
          created_at: string | null
          full_name: string
          id: string
          message: string
          property_id: string | null
          sentiment_score: number | null
          severity: number | null
          status: string | null
        }
        Insert: {
          contact: string
          created_at?: string | null
          full_name: string
          id?: string
          message: string
          property_id?: string | null
          sentiment_score?: number | null
          severity?: number | null
          status?: string | null
        }
        Update: {
          contact?: string
          created_at?: string | null
          full_name?: string
          id?: string
          message?: string
          property_id?: string | null
          sentiment_score?: number | null
          severity?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urgent_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_active_threads"
            referencedColumns: ["property_id"]
          },
        ]
      }
      vapi_calls: {
        Row: {
          call_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          recording_url: string | null
          started_at: string | null
          success_evaluation: string | null
          summary: string | null
          transcript: string | null
        }
        Insert: {
          call_id: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          success_evaluation?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          started_at?: string | null
          success_evaluation?: string | null
          summary?: string | null
          transcript?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      property_listings: {
        Row: {
          address: string | null
          amenities: string[] | null
          baths: number | null
          bedrooms: number | null
          beds: number | null
          category: string | null
          cleaning_fee: number | null
          description: string | null
          guests: number | null
          id: string | null
          images: string[] | null
          location: string | null
          original_price: number | null
          price: number | null
          rating: number | null
          reviews_count: number | null
          service_fee: number | null
          subtitle: string | null
          tax_rate: number | null
          title: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          category?: string | null
          cleaning_fee?: number | null
          description?: string | null
          guests?: number | null
          id?: string | null
          images?: string[] | null
          location?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          service_fee?: number | null
          subtitle?: string | null
          tax_rate?: number | null
          title?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          category?: string | null
          cleaning_fee?: number | null
          description?: string | null
          guests?: number | null
          id?: string | null
          images?: string[] | null
          location?: string | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          service_fee?: number | null
          subtitle?: string | null
          tax_rate?: number | null
          title?: string | null
        }
        Relationships: []
      }
      vw_active_threads: {
        Row: {
          booking_status: string | null
          check_in: string | null
          check_out: string | null
          guest_avatar: string | null
          guest_name: string | null
          human_takeover_until: string | null
          is_host_typing: boolean | null
          last_interaction: string | null
          last_sentiment: string | null
          message_count: number | null
          property_id: string | null
          property_image: string | null
          property_title: string | null
          session_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_holds: { Args: never; Returns: undefined }
      get_booking_access_level: {
        Args: { p_booking_id: string }
        Returns: number
      }
      get_host_dashboard_bundle: {
        Args: { target_email: string }
        Returns: Json
      }
      get_property_availability_bundle: {
        Args: { target_property_id: string }
        Returns: Json
      }
      get_secure_property_details: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      increment_promo_usage: { Args: { promo_id: string }; Returns: undefined }
    }
    Enums: {
      cancellation_policy_enum:
        | "flexible"
        | "moderate"
        | "firm"
        | "strict"
        | "non-refundable"
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
      cancellation_policy_enum: [
        "flexible",
        "moderate",
        "firm",
        "strict",
        "non-refundable",
      ],
    },
  },
} as const

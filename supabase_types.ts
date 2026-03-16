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
          sender: string
          session_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: number
          sender: string
          session_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: number
          sender?: string
          session_id?: string
          text?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          customer_name: string | null
          email_sent: boolean | null
          email_sent_feedback: boolean | null
          email_sent_thanks: boolean | null
          guests_count: number | null
          hold_expires_at: string | null
          id: string
          instructions_sent_at: string | null
          last_notification_sent: string | null
          payment_method: string | null
          payment_proof_url: string | null
          property_id: string | null
          source: string | null
          status: string | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          customer_name?: string | null
          email_sent?: boolean | null
          email_sent_feedback?: boolean | null
          email_sent_thanks?: boolean | null
          guests_count?: number | null
          hold_expires_at?: string | null
          id?: string
          instructions_sent_at?: string | null
          last_notification_sent?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          property_id?: string | null
          source?: string | null
          status?: string | null
          total_price: number
          user_id?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          customer_name?: string | null
          email_sent?: boolean | null
          email_sent_feedback?: boolean | null
          email_sent_thanks?: boolean | null
          guests_count?: number | null
          hold_expires_at?: string | null
          id?: string
          instructions_sent_at?: string | null
          last_notification_sent?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          property_id?: string | null
          source?: string | null
          status?: string | null
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
            foreignKeyName: "fk_bookings_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
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
      leads: {
        Row: {
          created_at: string | null
          date_of_interest: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          date_of_interest?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          date_of_interest?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
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
      operation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string
          id: string
          is_completed: boolean | null
          property_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_completed?: boolean | null
          property_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_completed?: boolean | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          address: string | null
          airbnb_id: string | null
          airbnb_url: string | null
          amenities: string[] | null
          baths: number | null
          bedrooms: number | null
          beds: number | null
          blockeddates: Json | null
          blockedDates: string[] | null
          calendarsync: Json | null
          calendarSync: Json | null
          category: string | null
          cleaning_fee: number | null
          created_at: string | null
          description: string | null
          email: string | null
          featuredamenity: string | null
          featuredAmenity: string | null
          fees: Json | null
          guests: number | null
          host: Json | null
          host_id: string | null
          house_rules: string[] | null
          id: string
          images: string[] | null
          is_offline: boolean | null
          isoffline: boolean | null
          isOffline: boolean | null
          location: string | null
          policies: Json | null
          price: number
          original_price: number | null
          property_features: Json | null
          rating: number | null
          reviews: number | null
          seasonal_prices: Json | null
          security_deposit: number | null
          service_fee: number | null
          subtitle: string | null
          sync_settings: Json | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          airbnb_id?: string | null
          airbnb_url?: string | null
          amenities?: string[] | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          blockeddates?: Json | null
          blockedDates?: string[] | null
          calendarsync?: Json | null
          calendarSync?: Json | null
          category?: string | null
          cleaning_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          featuredamenity?: string | null
          featuredAmenity?: string | null
          fees?: Json | null
          guests?: number | null
          host?: Json | null
          host_id?: string | null
          house_rules?: string[] | null
          id?: string
          images?: string[] | null
          is_offline?: boolean | null
          isoffline?: boolean | null
          isOffline?: boolean | null
          location?: string | null
          policies?: Json | null
          price: number
          original_price?: number | null
          property_features?: Json | null
          rating?: number | null
          reviews?: number | null
          seasonal_prices?: Json | null
          security_deposit?: number | null
          service_fee?: number | null
          subtitle?: string | null
          sync_settings?: Json | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          airbnb_id?: string | null
          airbnb_url?: string | null
          amenities?: string[] | null
          baths?: number | null
          bedrooms?: number | null
          beds?: number | null
          blockeddates?: Json | null
          blockedDates?: string[] | null
          calendarsync?: Json | null
          calendarSync?: Json | null
          category?: string | null
          cleaning_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          featuredamenity?: string | null
          featuredAmenity?: string | null
          fees?: Json | null
          guests?: number | null
          host?: Json | null
          host_id?: string | null
          house_rules?: string[] | null
          id?: string
          images?: string[] | null
          is_offline?: boolean | null
          isoffline?: boolean | null
          isOffline?: boolean | null
          location?: string | null
          policies?: Json | null
          price?: number
          original_price?: number | null
          property_features?: Json | null
          rating?: number | null
          reviews?: number | null
          seasonal_prices?: Json | null
          security_deposit?: number | null
          service_fee?: number | null
          subtitle?: string | null
          sync_settings?: Json | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          booking_id: string | null
          property_id: string
          user_id: string | null
          author: string
          text: string
          rating: number
          source: string
          avatar_url: string | null
          is_visible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          property_id: string
          user_id?: string | null
          author: string
          text: string
          rating: number
          source?: string
          avatar_url?: string | null
          is_visible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          property_id?: string
          user_id?: string | null
          author?: string
          text?: string
          rating?: number
          source?: string
          avatar_url?: string | null
          is_visible?: boolean
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "reviews_booking_id_fkey"; columns: ["booking_id"]; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "reviews_property_id_fkey"; columns: ["property_id"]; referencedRelation: "properties"; referencedColumns: ["id"] }
        ]
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
        ]
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
        ]
      }
      system_health: {
        Row: {
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
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          done: boolean | null
          id: number
          property: string
          status: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          id?: number
          property: string
          status?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          id?: number
          property?: string
          status?: string | null
          text?: string
        }
        Relationships: []
      }
      urgent_alerts: {
        Row: {
          contact: string
          created_at: string | null
          id: string
          message: string
          name: string
          sentiment_score: number | null
          severity: number | null
          status: string | null
        }
        Insert: {
          contact: string
          created_at?: string | null
          id?: string
          message: string
          name: string
          sentiment_score?: number | null
          severity?: number | null
          status?: string | null
        }
        Update: {
          contact?: string
          created_at?: string | null
          id?: string
          message?: string
          name?: string
          sentiment_score?: number | null
          severity?: number | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_holds: { Args: never; Returns: undefined }
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

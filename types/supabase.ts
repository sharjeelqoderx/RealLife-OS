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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      device_app_preferences: {
        Row: {
          lock_filter_switch: boolean
          prevent_logout: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          lock_filter_switch?: boolean
          prevent_logout?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          lock_filter_switch?: boolean
          prevent_logout?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_enrollments: {
        Row: {
          cloudflare_device_id: string | null
          cloudflare_registration_id: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          requested_device_name: string
          status: string
          user_id: string
        }
        Insert: {
          cloudflare_device_id?: string | null
          cloudflare_registration_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          requested_device_name: string
          status?: string
          user_id: string
        }
        Update: {
          cloudflare_device_id?: string | null
          cloudflare_registration_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          requested_device_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      device_setup_sessions: {
        Row: {
          answers: Json
          cloudflare_wizard_step: number
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          cloudflare_wizard_step?: number
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          cloudflare_wizard_step?: number
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gateway_activity_logs: {
        Row: {
          action: string | null
          application_name: string | null
          cloudflare_device_id: string
          created_at: string
          dataset: string
          device_id: string | null
          device_name: string | null
          event_fingerprint: string
          hostname: string | null
          id: string
          occurred_at: string
          policy_id: string | null
          policy_name: string | null
          raw: Json
          url: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          application_name?: string | null
          cloudflare_device_id: string
          created_at?: string
          dataset: string
          device_id?: string | null
          device_name?: string | null
          event_fingerprint: string
          hostname?: string | null
          id?: string
          occurred_at: string
          policy_id?: string | null
          policy_name?: string | null
          raw?: Json
          url?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          application_name?: string | null
          cloudflare_device_id?: string
          created_at?: string
          dataset?: string
          device_id?: string | null
          device_name?: string | null
          event_fingerprint?: string
          hostname?: string | null
          id?: string
          occurred_at?: string
          policy_id?: string | null
          policy_name?: string | null
          raw?: Json
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_activity_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tenant_device_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          version: string
        }
        Insert: {
          applied_at?: string
          version: string
        }
        Update: {
          applied_at?: string
          version?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      tenant_device_metadata: {
        Row: {
          cloudflare_account_id: string | null
          cloudflare_device_id: string
          cloudflare_location_id: string | null
          cloudflare_registration_id: string | null
          created_at: string
          display_name: string | null
          doh_subdomain: string | null
          enrollment_status: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cloudflare_account_id?: string | null
          cloudflare_device_id: string
          cloudflare_location_id?: string | null
          cloudflare_registration_id?: string | null
          created_at?: string
          display_name?: string | null
          doh_subdomain?: string | null
          enrollment_status?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cloudflare_account_id?: string | null
          cloudflare_device_id?: string
          cloudflare_location_id?: string | null
          cloudflare_registration_id?: string | null
          created_at?: string
          display_name?: string | null
          doh_subdomain?: string | null
          enrollment_status?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_device_profile_members: {
        Row: {
          created_at: string
          device_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_device_profile_members_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "tenant_device_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_device_profile_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "tenant_device_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_device_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_gateway_policies: {
        Row: {
          action: string
          cloudflare_rule_id: string | null
          configuration_json: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          precedence: number
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          cloudflare_rule_id?: string | null
          configuration_json?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          precedence?: number
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          cloudflare_rule_id?: string | null
          configuration_json?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          precedence?: number
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_policy_assignments: {
        Row: {
          cloudflare_rule_id: string | null
          created_at: string
          id: string
          policy_id: string
          precedence: number
          sync_error: string | null
          sync_status: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cloudflare_rule_id?: string | null
          created_at?: string
          id?: string
          policy_id: string
          precedence?: number
          sync_error?: string | null
          sync_status?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cloudflare_rule_id?: string | null
          created_at?: string
          id?: string
          policy_id?: string
          precedence?: number
          sync_error?: string | null
          sync_status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "tenant_gateway_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_policy_gateway_rules: {
        Row: {
          cloudflare_rule_id: string
          created_at: string
          id: string
          policy_id: string
          rule_role: string
          sync_status: string
          target_id: string | null
          target_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cloudflare_rule_id: string
          created_at?: string
          id?: string
          policy_id: string
          rule_role?: string
          sync_status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cloudflare_rule_id?: string
          created_at?: string
          id?: string
          policy_id?: string
          rule_role?: string
          sync_status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_gateway_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "tenant_gateway_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          device_limit: number
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          device_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          device_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

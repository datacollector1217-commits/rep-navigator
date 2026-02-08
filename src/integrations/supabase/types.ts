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
      daily_logs: {
        Row: {
          created_at: string
          end_meter: number | null
          id: string
          log_date: string
          official_km: number | null
          personal_km: number | null
          start_meter: number | null
          status: Database["public"]["Enums"]["daily_log_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_meter?: number | null
          id?: string
          log_date?: string
          official_km?: number | null
          personal_km?: number | null
          start_meter?: number | null
          status?: Database["public"]["Enums"]["daily_log_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_meter?: number | null
          id?: string
          log_date?: string
          official_km?: number | null
          personal_km?: number | null
          start_meter?: number | null
          status?: Database["public"]["Enums"]["daily_log_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_logs: {
        Row: {
          created_at: string
          fill_date: string
          id: string
          liters: number
          meter_reading: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fill_date?: string
          id?: string
          liters: number
          meter_reading: number
          user_id: string
        }
        Update: {
          created_at?: string
          fill_date?: string
          id?: string
          liters?: number
          meter_reading?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      shops: {
        Row: {
          address: string | null
          assigned_rep_id: string | null
          bp_code: string | null
          contact_person: string | null
          created_at: string
          district: string | null
          dsl_code: string | null
          id: string
          is_suspended: boolean
          name: string
          phone: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_rep_id?: string | null
          bp_code?: string | null
          contact_person?: string | null
          created_at?: string
          district?: string | null
          dsl_code?: string | null
          id?: string
          is_suspended?: boolean
          name: string
          phone?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_rep_id?: string | null
          bp_code?: string | null
          contact_person?: string | null
          created_at?: string
          district?: string | null
          dsl_code?: string | null
          id?: string
          is_suspended?: boolean
          name?: string
          phone?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          daily_log_id: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          note: string | null
          outcome: Database["public"]["Enums"]["visit_outcome"]
          shop_id: string
          user_id: string
          visit_time: string
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["visit_outcome"]
          shop_id: string
          user_id: string
          visit_time?: string
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["visit_outcome"]
          shop_id?: string
          user_id?: string
          visit_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rep" | "manager"
      daily_log_status: "started" | "completed"
      visit_outcome: "order_taken" | "collection" | "just_visit" | "shop_closed"
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
      app_role: ["admin", "rep", "manager"],
      daily_log_status: ["started", "completed"],
      visit_outcome: ["order_taken", "collection", "just_visit", "shop_closed"],
    },
  },
} as const

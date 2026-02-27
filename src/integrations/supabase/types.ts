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
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          page: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          page?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          page?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_value: number
          name: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_value?: number
          name: string
          state?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_value?: number
          name?: string
          state?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          license_plate: string | null
          name: string
          phone: string | null
          user_id: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name: string
          phone?: string | null
          user_id?: string | null
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name?: string
          phone?: string | null
          user_id?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      dynamic_rules: {
        Row: {
          condition_type: string
          created_at: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
        }
        Insert: {
          condition_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
        }
        Relationships: []
      }
      freight_settings: {
        Row: {
          comissao_carro: number
          comissao_moto: number
          fixed_fee: number
          id: string
          margem_minima_carro: number
          margem_minima_moto: number
          multiplicador_carro: number
          multiplicador_moto: number
          national_min_value: number
          national_price_per_km: number
          pedagios_padrao: number
          price_per_km_car: number
          price_per_km_moto: number
          taxa_retorno_carro: number
          updated_at: string
          valor_base_nacional: number
        }
        Insert: {
          comissao_carro?: number
          comissao_moto?: number
          fixed_fee?: number
          id?: string
          margem_minima_carro?: number
          margem_minima_moto?: number
          multiplicador_carro?: number
          multiplicador_moto?: number
          national_min_value?: number
          national_price_per_km?: number
          pedagios_padrao?: number
          price_per_km_car?: number
          price_per_km_moto?: number
          taxa_retorno_carro?: number
          updated_at?: string
          valor_base_nacional?: number
        }
        Update: {
          comissao_carro?: number
          comissao_moto?: number
          fixed_fee?: number
          id?: string
          margem_minima_carro?: number
          margem_minima_moto?: number
          multiplicador_carro?: number
          multiplicador_moto?: number
          national_min_value?: number
          national_price_per_km?: number
          pedagios_padrao?: number
          price_per_km_car?: number
          price_per_km_moto?: number
          taxa_retorno_carro?: number
          updated_at?: string
          valor_base_nacional?: number
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          additional_fee: number
          city_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          additional_fee?: number
          city_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          additional_fee?: number
          city_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_name: string | null
          client_phone: string | null
          confirmed_at: string | null
          created_at: string
          destination_city: string | null
          distance_km: number | null
          driver_id: string | null
          final_value: number | null
          id: string
          origin_city: string | null
          simulation_id: string | null
          status: string
          vehicle_type: string | null
        }
        Insert: {
          client_name?: string | null
          client_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          destination_city?: string | null
          distance_km?: number | null
          driver_id?: string | null
          final_value?: number | null
          id?: string
          origin_city?: string | null
          simulation_id?: string | null
          status?: string
          vehicle_type?: string | null
        }
        Update: {
          client_name?: string | null
          client_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          destination_city?: string | null
          distance_km?: number | null
          driver_id?: string | null
          final_value?: number | null
          id?: string
          origin_city?: string | null
          simulation_id?: string | null
          status?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations_log"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_change_log: {
        Row: {
          changed_by: string | null
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          table_name: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          table_name?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      simulations_log: {
        Row: {
          created_at: string
          destination_city: string | null
          destination_neighborhood: string | null
          distance_km: number | null
          final_value: number | null
          id: string
          mode: string
          origin_city: string | null
          origin_neighborhood: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          destination_city?: string | null
          destination_neighborhood?: string | null
          distance_km?: number | null
          final_value?: number | null
          id?: string
          mode?: string
          origin_city?: string | null
          origin_neighborhood?: string | null
          vehicle_type: string
        }
        Update: {
          created_at?: string
          destination_city?: string | null
          destination_neighborhood?: string | null
          distance_km?: number | null
          final_value?: number | null
          id?: string
          mode?: string
          origin_city?: string | null
          origin_neighborhood?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          custom_tracking_code: string | null
          facebook_pixel_id: string | null
          ga4_id: string | null
          google_verification: string | null
          gtm_id: string | null
          id: string
          show_whatsapp_button: boolean
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          custom_tracking_code?: string | null
          facebook_pixel_id?: string | null
          ga4_id?: string | null
          google_verification?: string | null
          gtm_id?: string | null
          id?: string
          show_whatsapp_button?: boolean
          updated_at?: string | null
          whatsapp_number?: string
        }
        Update: {
          custom_tracking_code?: string | null
          facebook_pixel_id?: string | null
          ga4_id?: string | null
          google_verification?: string | null
          gtm_id?: string | null
          id?: string
          show_whatsapp_button?: boolean
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "user" | "driver" | "client"
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
      app_role: ["admin", "user", "driver", "client"],
    },
  },
} as const

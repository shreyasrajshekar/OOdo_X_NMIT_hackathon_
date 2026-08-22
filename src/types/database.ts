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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          hours_worked: number | null
          id: number
          note: string | null
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          hours_worked?: number | null
          id?: number
          note?: string | null
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          hours_worked?: number | null
          id?: number
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action_taken: string
          cascade_id: string | null
          created_at: string | null
          entity_id: number | null
          entity_type: string | null
          error_message: string | null
          execution_ms: number | null
          id: number
          status: string | null
          trigger_name: string
          trigger_type: string
          undo_sql: string | null
          undone: boolean | null
        }
        Insert: {
          action_taken: string
          cascade_id?: string | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          error_message?: string | null
          execution_ms?: number | null
          id?: number
          status?: string | null
          trigger_name: string
          trigger_type: string
          undo_sql?: string | null
          undone?: boolean | null
        }
        Update: {
          action_taken?: string
          cascade_id?: string | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          error_message?: string | null
          execution_ms?: number | null
          id?: number
          status?: string | null
          trigger_name?: string
          trigger_type?: string
          undo_sql?: string | null
          undone?: boolean | null
        }
        Relationships: []
      }
      leave_balance: {
        Row: {
          casual_leave: number | null
          created_at: string | null
          employee_id: string
          id: number
          paid_leave: number | null
          sick_leave: number | null
          unpaid_leave: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          casual_leave?: number | null
          created_at?: string | null
          employee_id: string
          id?: number
          paid_leave?: number | null
          sick_leave?: number | null
          unpaid_leave?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          casual_leave?: number | null
          created_at?: string | null
          employee_id?: string
          id?: number
          paid_leave?: number | null
          sick_leave?: number | null
          unpaid_leave?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          admin_comment: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          from_date: string
          id: number
          leave_type: string
          reason: string
          status: string
          to_date: string
          total_days: number
          updated_at: string | null
        }
        Insert: {
          admin_comment?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          from_date: string
          id?: number
          leave_type: string
          reason: string
          status?: string
          to_date: string
          total_days: number
          updated_at?: string | null
        }
        Update: {
          admin_comment?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          from_date?: string
          id?: number
          leave_type?: string
          reason?: string
          status?: string
          to_date?: string
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_caps: {
        Row: {
          cooldown_hours: number
          description: string | null
          type: string
        }
        Insert: {
          cooldown_hours: number
          description?: string | null
          type: string
        }
        Update: {
          cooldown_hours?: number
          description?: string | null
          type?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          sent_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          cascade_id: string | null
          created_at: string | null
          id: number
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          cascade_id?: string | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          cascade_id?: string | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          first_name: string
          id: string
          is_active: boolean | null
          join_date: string | null
          last_name: string
          login_id: string | null
          phone: string | null
          position: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          first_name: string
          id: string
          is_active?: boolean | null
          join_date?: string | null
          last_name: string
          login_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          join_date?: string | null
          last_name?: string
          login_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          allowance: number
          basic: number
          created_at: string | null
          da: number
          employee_id: string
          hra: number
          id: number
          month: number
          net_pay: number
          other_deduction: number | null
          paid_on: string | null
          pf_deduction: number | null
          status: string | null
          tax_deduction: number | null
          year: number
        }
        Insert: {
          allowance: number
          basic: number
          created_at?: string | null
          da: number
          employee_id: string
          hra: number
          id?: number
          month: number
          net_pay: number
          other_deduction?: number | null
          paid_on?: string | null
          pf_deduction?: number | null
          status?: string | null
          tax_deduction?: number | null
          year: number
        }
        Update: {
          allowance?: number
          basic?: number
          created_at?: string | null
          da?: number
          employee_id?: string
          hra?: number
          id?: number
          month?: number
          net_pay?: number
          other_deduction?: number | null
          paid_on?: string | null
          pf_deduction?: number | null
          status?: string | null
          tax_deduction?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structure: {
        Row: {
          allowance: number
          basic: number
          da: number
          employee_id: string
          hra: number
          id: number
          pf_rate: number | null
          tax_rate: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowance: number
          basic: number
          da: number
          employee_id: string
          hra: number
          id?: number
          pf_rate?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowance?: number
          basic?: number
          da?: number
          employee_id?: string
          hra?: number
          id?: number
          pf_rate?: number | null
          tax_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_structure_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structure_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      should_notify: {
        Args: { p_type: string; p_user_id: string }
        Returns: boolean
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

// Handwritten mirror of supabase/migrations/*.sql.
// Regenerate against a live project when convenient:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// Shape follows supabase-js v2 generated conventions.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          code: string;
          logo_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          logo_url?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          login_id: string;
          first_name: string;
          last_name: string;
          work_email: string;
          personal_email: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          manager_id: string | null;
          department: string | null;
          job_title: string | null;
          joining_date: string;
          dob: string | null;
          gender: string | null;
          marital_status: string | null;
          nationality: string | null;
          address: string | null;
          avatar_url: string | null;
          bank_account_no: string | null;
          bank_name: string | null;
          ifsc_code: string | null;
          pan_no: string | null;
          uan_no: string | null;
          esic_code: string | null;
          must_change_password: boolean;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          login_id: string;
          first_name: string;
          last_name: string;
          work_email: string;
          personal_email?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          manager_id?: string | null;
          department?: string | null;
          job_title?: string | null;
          joining_date: string;
          dob?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          nationality?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          bank_account_no?: string | null;
          bank_name?: string | null;
          ifsc_code?: string | null;
          pan_no?: string | null;
          uan_no?: string | null;
          esic_code?: string | null;
          must_change_password?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
        Relationships: [];
      };
      employee_resume: {
        Row: {
          employee_id: string;
          about: string | null;
          love_about_job: string | null;
          interests: string | null;
          skills: Json | null;
          certifications: Json | null;
        };
        Insert: {
          employee_id: string;
          about?: string | null;
          love_about_job?: string | null;
          interests?: string | null;
          skills?: Json | null;
          certifications?: Json | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["employee_resume"]["Insert"]
        >;
          Relationships: [],
      };
      payroll_config: {
        Row: {
          company_id: string;
          pf_employee_rate: number;
          pf_employer_rate: number;
          professional_tax: number;
          pf_wage_ceiling: number | null;
          sandwich_unpaid_leaves: boolean;
        };
        Insert: {
          company_id: string;
          pf_employee_rate?: number;
          pf_employer_rate?: number;
          professional_tax?: number;
          pf_wage_ceiling?: number | null;
          sandwich_unpaid_leaves?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["payroll_config"]["Insert"]
        >;
          Relationships: [],
      };
      salary_structures: {
        Row: {
          id: string;
          employee_id: string;
          wage_type: string;
          monthly_wage: number;
          yearly_wage: number;
          working_days_month: number;
          break_hours: number | null;
          effective_from: string;
          is_current: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          wage_type?: string;
          monthly_wage: number;
          working_days_month?: number;
          break_hours?: number | null;
          effective_from?: string;
          is_current?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["salary_structures"]["Insert"]
        >;
          Relationships: [],
      };
      salary_components: {
        Row: {
          id: string;
          structure_id: string;
          code: string;
          name: string;
          computation: Database["public"]["Enums"]["computation_type"];
          percent_value: number | null;
          base_component_code: string | null;
          fixed_amount: number | null;
          sequence: number;
        };
        Insert: {
          id?: string;
          structure_id: string;
          code: string;
          name: string;
          computation: Database["public"]["Enums"]["computation_type"];
          percent_value?: number | null;
          base_component_code?: string | null;
          fixed_amount?: number | null;
          sequence: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["salary_components"]["Insert"]
        >;
          Relationships: [],
      };
      holidays: {
        Row: {
          id: string;
          company_id: string;
          holiday_date: string;
          name: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          holiday_date: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["holidays"]["Insert"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          check_in: string | null;
          check_out: string | null;
          work_hours: number | null;
          extra_hours: number | null;
          status: Database["public"]["Enums"]["attendance_status"];
          is_anomaly: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          work_date: string;
          check_in?: string | null;
          check_out?: string | null;
          work_hours?: number | null;
          extra_hours?: number | null;
          status?: Database["public"]["Enums"]["attendance_status"];
          is_anomaly?: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
      regularization_requests: {
        Row: {
          id: string;
          attendance_id: string;
          employee_id: string;
          proposed_check_in: string | null;
          proposed_check_out: string | null;
          reason: string;
          status: Database["public"]["Enums"]["request_status"];
          reviewed_by: string | null;
          review_comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          attendance_id: string;
          employee_id: string;
          proposed_check_in?: string | null;
          proposed_check_out?: string | null;
          reason: string;
          status?: Database["public"]["Enums"]["request_status"];
          reviewed_by?: string | null;
          review_comment?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["regularization_requests"]["Insert"]
        >;
          Relationships: [],
      };
      leave_types: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          is_paid: boolean;
          requires_attachment: boolean;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          name: string;
          is_paid?: boolean;
          requires_attachment?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["leave_types"]["Insert"]>;
        Relationships: [];
      };
      leave_allocations: {
        Row: {
          id: string;
          employee_id: string;
          leave_type_id: string;
          days: number;
          valid_from: string;
          valid_to: string;
          note: string | null;
          allocated_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          leave_type_id: string;
          days: number;
          valid_from: string;
          valid_to: string;
          note?: string | null;
          allocated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["leave_allocations"]["Insert"]
        >;
          Relationships: [],
      };
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          day_count: number;
          remarks: string | null;
          attachment_url: string | null;
          status: Database["public"]["Enums"]["request_status"];
          reviewed_by: string | null;
          review_comment: string | null;
          reviewed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          day_count: number;
          remarks?: string | null;
          attachment_url?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          reviewed_by?: string | null;
          review_comment?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["leave_requests"]["Insert"]
        >;
          Relationships: [],
      };
      payslips: {
        Row: {
          id: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          working_days: number;
          payable_days: number;
          lop_days: number;
          earnings: Json;
          deductions: Json;
          gross: number;
          total_deduct: number;
          net_pay: number;
          pdf_url: string | null;
          generated_at: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          working_days: number;
          payable_days: number;
          lop_days?: number;
          earnings: Json;
          deductions: Json;
          gross: number;
          total_deduct: number;
          net_pay: number;
          pdf_url?: string | null;
          generated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payslips"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          company_id: string;
          actor_id: string | null;
          entity: string;
          entity_id: string;
          field: string;
          old_value: string | null;
          new_value: string | null;
          changed_at: string | null;
        };
        Insert: {
          id?: number;
          company_id: string;
          actor_id?: string | null;
          entity: string;
          entity_id: string;
          field: string;
          old_value?: string | null;
          new_value?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      leave_balances: {
        Row: {
          employee_id: string;
          leave_type_id: string;
          allocated: number | null;
          taken: number | null;
          available: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: Database["public"]["Enums"]["app_role"] };
      auth_company: { Args: Record<string, never>; Returns: string };
      generate_login_id: {
        Args: {
          p_company_id: string;
          p_first_name: string;
          p_last_name: string;
          p_joining_date: string;
        };
        Returns: string;
      };
      lookup_email_for_identifier: {
        Args: { p_identifier: string };
        Returns: string;
      };
      complete_password_change: { Args: Record<string, never>; Returns: undefined };
      do_check_in: { Args: Record<string, never>; Returns: undefined };
      do_check_out: { Args: Record<string, never>; Returns: undefined };
      replace_salary_components: {
        Args: { p_structure_id: string; p_components: Json };
        Returns: undefined;
      };
      audit_history_for_employee: {
        Args: { p_employee_id: string };
        Returns: {
          field: string;
          old_value: string | null;
          new_value: string | null;
          changed_at: string | null;
          actor: string | null;
          entity: string;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "employee";
      attendance_status:
        | "present"
        | "absent"
        | "half_day"
        | "leave"
        | "holiday"
        | "weekend";
      request_status: "pending" | "approved" | "rejected";
      computation_type:
        | "fixed"
        | "percent_of_wage"
        | "percent_of_component"
        | "balance";
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

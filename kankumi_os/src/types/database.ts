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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          organization_id: string
          published_at: string | null
          title: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          title: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          title?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_checklists: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          fiscal_year_id: string
          id: string
          notes: string | null
          organization_id: string
          scheduled_date: string | null
          status: string
          template_id: string | null
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          fiscal_year_id: string
          id?: string
          notes?: string | null
          organization_id: string
          scheduled_date?: string | null
          status?: string
          template_id?: string | null
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          fiscal_year_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          scheduled_date?: string | null
          status?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_checklists_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          content_type: string
          created_at: string
          created_by: string
          expense_id: string | null
          file_name: string
          file_size: number
          id: string
          organization_id: string
          storage_path: string
          topic_id: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by: string
          expense_id?: string | null
          file_name: string
          file_size: number
          id?: string
          organization_id: string
          storage_path: string
          topic_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string
          expense_id?: string | null
          file_name?: string
          file_size?: number
          id?: string
          organization_id?: string
          storage_path?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_csv_mappers: {
        Row: {
          amount_column: number
          bank_name: string
          created_at: string
          date_column: number
          date_format: string
          description_column: number
          encoding: string
          id: string
          organization_id: string
          preset_key: string | null
          skip_rows: number
        }
        Insert: {
          amount_column: number
          bank_name: string
          created_at?: string
          date_column: number
          date_format?: string
          description_column: number
          encoding?: string
          id?: string
          organization_id: string
          preset_key?: string | null
          skip_rows?: number
        }
        Update: {
          amount_column?: number
          bank_name?: string
          created_at?: string
          date_column?: number
          date_format?: string
          description_column?: number
          encoding?: string
          id?: string
          organization_id?: string
          preset_key?: string | null
          skip_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_csv_mappers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_imports: {
        Row: {
          created_at: string
          filename: string
          id: string
          import_date: string
          imported_by: string | null
          mapper_id: string | null
          matched_count: number
          organization_id: string
          record_count: number
          unmatched_count: number
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          import_date: string
          imported_by?: string | null
          mapper_id?: string | null
          matched_count?: number
          organization_id: string
          record_count?: number
          unmatched_count?: number
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          import_date?: string
          imported_by?: string | null
          mapper_id?: string | null
          matched_count?: number
          organization_id?: string
          record_count?: number
          unmatched_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_imports_mapper_id_fkey"
            columns: ["mapper_id"]
            isOneToOne: false
            referencedRelation: "bank_csv_mappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance: number | null
          bank_import_id: string
          created_at: string
          description: string
          id: string
          matched_payment_id: string | null
          organization_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
        }
        Insert: {
          amount: number
          balance?: number | null
          bank_import_id: string
          created_at?: string
          description: string
          id?: string
          matched_payment_id?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
        }
        Update: {
          amount?: number
          balance?: number | null
          bank_import_id?: string
          created_at?: string
          description?: string
          id?: string
          matched_payment_id?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_import_id_fkey"
            columns: ["bank_import_id"]
            isOneToOne: false
            referencedRelation: "bank_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budgeted_amount: number
          category_id: string
          created_at: string
          fiscal_year_id: string
          id: string
          organization_id: string
        }
        Insert: {
          budgeted_amount?: number
          category_id: string
          created_at?: string
          fiscal_year_id: string
          id?: string
          organization_id: string
        }
        Update: {
          budgeted_amount?: number
          category_id?: string
          created_at?: string
          fiscal_year_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_types: {
        Row: {
          alias_name: string | null
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          type: Database["public"]["Enums"]["charge_type_enum"]
        }
        Insert: {
          alias_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          type: Database["public"]["Enums"]["charge_type_enum"]
        }
        Update: {
          alias_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          type?: Database["public"]["Enums"]["charge_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "charge_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          default_frequency: string
          id: string
          key: string
          label: string
          legal_basis: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          default_frequency: string
          id?: string
          key: string
          label: string
          legal_basis?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          default_frequency?: string
          id?: string
          key?: string
          label?: string
          legal_basis?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          organization_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_profile_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          label: string
          options: Json | null
          organization_id: string
          purpose: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_type: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          organization_id: string
          purpose: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          organization_id?: string
          purpose?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_profile_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          id: string
          is_active: boolean
          is_template: boolean
          name: string
          organization_id: string
          parent_id: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          fiscal_year_id: string
          id: string
          organization_id: string
          receipt_url: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          fiscal_year_id: string
          id?: string
          organization_id: string
          receipt_url?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          fiscal_year_id?: string
          id?: string
          organization_id?: string
          receipt_url?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          organization_id: string
          start_date: string
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          organization_id: string
          start_date: string
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          organization_id?: string
          start_date?: string
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      household_profiles: {
        Row: {
          contact: string
          custom_fields: Json | null
          emergency_info: Json | null
          facility_usage: Json | null
          id: string
          organization_id: string
          representative_name: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          contact: string
          custom_fields?: Json | null
          emergency_info?: Json | null
          facility_usage?: Json | null
          id?: string
          organization_id: string
          representative_name: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          contact?: string
          custom_fields?: Json | null
          emergency_info?: Json | null
          facility_usage?: Json | null
          id?: string
          organization_id?: string
          representative_name?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_calendar_events: {
        Row: {
          checklist_id: string | null
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          is_recurring: boolean
          organization_id: string
          recurrence_rule: string | null
          start_date: string
          title: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          organization_id: string
          recurrence_rule?: string | null
          start_date: string
          title: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          organization_id?: string
          recurrence_rule?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_calendar_events_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "annual_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          fiscal_year_start: number
          id: string
          name: string
          unit_count: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          fiscal_year_start?: number
          id?: string
          name: string
          unit_count?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          fiscal_year_start?: number
          id?: string
          name?: string
          unit_count?: number
        }
        Relationships: []
      }
      payment_profiles: {
        Row: {
          account_last4: string
          bank_name: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          organization_id: string
          source: Database["public"]["Enums"]["profile_source"]
          transfer_name: string
          unit_id: string
        }
        Insert: {
          account_last4: string
          bank_name: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          organization_id: string
          source?: Database["public"]["Enums"]["profile_source"]
          transfer_name: string
          unit_id: string
        }
        Update: {
          account_last4?: string
          bank_name?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          organization_id?: string
          source?: Database["public"]["Enums"]["profile_source"]
          transfer_name?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          bank_transaction_id: string | null
          created_at: string
          has_irregularity_flag: boolean
          id: string
          notes: string | null
          organization_id: string
          paid_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          year_month: string
        }
        Insert: {
          bank_transaction_id?: string | null
          created_at?: string
          has_irregularity_flag?: boolean
          id?: string
          notes?: string | null
          organization_id: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id: string
          year_month: string
        }
        Update: {
          bank_transaction_id?: string | null
          created_at?: string
          has_irregularity_flag?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          organization_id: string
          status: string
          title: string
          topic_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
          topic_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          body: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          organization_id: string
          pinned_at: string | null
          priority: Database["public"]["Enums"]["priority"]
          status: Database["public"]["Enums"]["topic_status"]
          title: string
          type: Database["public"]["Enums"]["topic_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          organization_id: string
          pinned_at?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          status?: Database["public"]["Enums"]["topic_status"]
          title: string
          type?: Database["public"]["Enums"]["topic_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          pinned_at?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          status?: Database["public"]["Enums"]["topic_status"]
          title?: string
          type?: Database["public"]["Enums"]["topic_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "topics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_charges: {
        Row: {
          amount: number
          charge_type_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          organization_id: string
          unit_id: string
        }
        Insert: {
          amount?: number
          charge_type_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          organization_id: string
          unit_id: string
        }
        Update: {
          amount?: number
          charge_type_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          organization_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_charges_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_owners: {
        Row: {
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          owner_type: Database["public"]["Enums"]["owner_type"]
          phone: string | null
          start_date: string
          unit_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          owner_type?: Database["public"]["Enums"]["owner_type"]
          phone?: string | null
          start_date?: string
          unit_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          owner_type?: Database["public"]["Enums"]["owner_type"]
          phone?: string | null
          start_date?: string
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_owners_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area_sqm: number | null
          created_at: string
          floor: number | null
          id: string
          occupancy_status: Database["public"]["Enums"]["occupancy_status"]
          organization_id: string
          unit_number: string
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          occupancy_status?: Database["public"]["Enums"]["occupancy_status"]
          organization_id: string
          unit_number: string
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          occupancy_status?: Database["public"]["Enums"]["occupancy_status"]
          organization_id?: string
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_board_or_above: { Args: { org_id: string }; Returns: boolean }
      my_organization_ids: { Args: never; Returns: string[] }
      my_role: {
        Args: { org_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      account_type: "management" | "reserve_fund"
      charge_type_enum:
        | "management_fee"
        | "reserve_fund"
        | "common_fee"
        | "parking"
        | "bike_parking"
        | "other"
      member_role:
        | "admin"
        | "vice_president"
        | "treasurer"
        | "board_member"
        | "auditor"
        | "resident"
      occupancy_status: "occupied" | "vacant" | "excluded"
      owner_type: "owner" | "resident" | "both"
      payment_status: "confirmed" | "missing" | "irregular" | "excluded"
      priority: "low" | "normal" | "high" | "urgent"
      profile_source: "user" | "admin"
      topic_status: "open" | "in_progress" | "resolved" | "closed"
      topic_type: "board_meeting" | "general" | "issue" | "notice" | "task"
      transaction_status: "unmatched" | "matched" | "ignored"
      visibility: "board_only" | "all_members"
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
      account_type: ["management", "reserve_fund"],
      charge_type_enum: [
        "management_fee",
        "reserve_fund",
        "common_fee",
        "parking",
        "bike_parking",
        "other",
      ],
      member_role: [
        "admin",
        "vice_president",
        "treasurer",
        "board_member",
        "auditor",
        "resident",
      ],
      occupancy_status: ["occupied", "vacant", "excluded"],
      owner_type: ["owner", "resident", "both"],
      payment_status: ["confirmed", "missing", "irregular", "excluded"],
      priority: ["low", "normal", "high", "urgent"],
      profile_source: ["user", "admin"],
      topic_status: ["open", "in_progress", "resolved", "closed"],
      topic_type: ["board_meeting", "general", "issue", "notice", "task"],
      transaction_status: ["unmatched", "matched", "ignored"],
      visibility: ["board_only", "all_members"],
    },
  },
} as const

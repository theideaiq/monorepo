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
      affiliate_attributions: {
        Row: {
          affiliate_id: string;
          member_id: string;
          touched_at: string;
          via: string;
        };
        Insert: {
          affiliate_id: string;
          member_id: string;
          touched_at?: string;
          via: string;
        };
        Update: {
          affiliate_id?: string;
          member_id?: string;
          touched_at?: string;
          via?: string;
        };
        Relationships: [
          {
            foreignKeyName: "affiliate_attributions_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["user_id"];
          },
        ];
      };
      affiliate_commissions: {
        Row: {
          affiliate_id: string;
          amount: number;
          available_at: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["affiliate_commission_kind"];
          order_id: string | null;
          payment_id: string | null;
          payout_id: string | null;
          status: Database["public"]["Enums"]["affiliate_commission_status"];
        };
        Insert: {
          affiliate_id: string;
          amount: number;
          available_at?: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["affiliate_commission_kind"];
          order_id?: string | null;
          payment_id?: string | null;
          payout_id?: string | null;
          status?: Database["public"]["Enums"]["affiliate_commission_status"];
        };
        Update: {
          affiliate_id?: string;
          amount?: number;
          available_at?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["affiliate_commission_kind"];
          order_id?: string | null;
          payment_id?: string | null;
          payout_id?: string | null;
          status?: Database["public"]["Enums"]["affiliate_commission_status"];
        };
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "affiliate_commissions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "affiliate_commissions_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_payouts";
            referencedColumns: ["id"];
          },
        ];
      };
      affiliate_payouts: {
        Row: {
          account: string | null;
          affiliate_id: string;
          amount: number;
          bulbs: number | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["affiliate_payout_method"];
          paid_by: string | null;
          reference: string | null;
        };
        Insert: {
          account?: string | null;
          affiliate_id: string;
          amount: number;
          bulbs?: number | null;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["affiliate_payout_method"];
          paid_by?: string | null;
          reference?: string | null;
        };
        Update: {
          account?: string | null;
          affiliate_id?: string;
          amount?: number;
          bulbs?: number | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["affiliate_payout_method"];
          paid_by?: string | null;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["user_id"];
          },
        ];
      };
      affiliates: {
        Row: {
          channel: string | null;
          code: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          payout_account: string | null;
          payout_method: Database["public"]["Enums"]["affiliate_payout_method"];
          pitch: string;
          staff_note: string | null;
          status: Database["public"]["Enums"]["affiliate_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          channel?: string | null;
          code?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          payout_account?: string | null;
          payout_method?: Database["public"]["Enums"]["affiliate_payout_method"];
          pitch: string;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["affiliate_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          channel?: string | null;
          code?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          payout_account?: string | null;
          payout_method?: Database["public"]["Enums"]["affiliate_payout_method"];
          pitch?: string;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["affiliate_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: NonNullable<Json>;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: NonNullable<Json>;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: NonNullable<Json>;
        };
        Relationships: [];
      };
      box_parts: {
        Row: {
          box_id: string;
          category_id: string | null;
          created_at: string;
          format: string | null;
          id: string;
          position: number;
          product_id: string | null;
          quantity: number;
          variant_id: string | null;
        };
        Insert: {
          box_id: string;
          category_id?: string | null;
          created_at?: string;
          format?: string | null;
          id?: string;
          position?: number;
          product_id?: string | null;
          quantity?: number;
          variant_id?: string | null;
        };
        Update: {
          box_id?: string;
          category_id?: string | null;
          created_at?: string;
          format?: string | null;
          id?: string;
          position?: number;
          product_id?: string | null;
          quantity?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "box_parts_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "box_parts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "box_parts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "box_parts_product_id_variant_id_fkey";
            columns: ["product_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id", "id"];
          },
        ];
      };
      box_themes: {
        Row: {
          active: boolean;
          box_id: string;
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          position: number;
        };
        Insert: {
          active?: boolean;
          box_id: string;
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en: string;
          position?: number;
        };
        Update: {
          active?: boolean;
          box_id?: string;
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "box_themes_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["product_id"];
          },
        ];
      };
      boxes: {
        Row: {
          min_value: number;
          product_id: string;
          season: string | null;
          updated_at: string;
        };
        Insert: {
          min_value?: number;
          product_id: string;
          season?: string | null;
          updated_at?: string;
        };
        Update: {
          min_value?: number;
          product_id?: string;
          season?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boxes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      bulb_entries: {
        Row: {
          amount: number;
          available_at: string;
          created_at: string;
          created_by: string | null;
          event_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["bulb_kind"];
          order_id: string | null;
          payment_id: string | null;
          product_id: string | null;
          reason: string | null;
          review_id: string | null;
          status: Database["public"]["Enums"]["bulb_status"];
          trade_in_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          available_at?: string;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["bulb_kind"];
          order_id?: string | null;
          payment_id?: string | null;
          product_id?: string | null;
          reason?: string | null;
          review_id?: string | null;
          status?: Database["public"]["Enums"]["bulb_status"];
          trade_in_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          available_at?: string;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["bulb_kind"];
          order_id?: string | null;
          payment_id?: string | null;
          product_id?: string | null;
          reason?: string | null;
          review_id?: string | null;
          status?: Database["public"]["Enums"]["bulb_status"];
          trade_in_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulb_entries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulb_entries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulb_entries_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulb_entries_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulb_entries_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "product_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulb_entries_trade_in_id_fkey";
            columns: ["trade_in_id"];
            isOneToOne: false;
            referencedRelation: "trade_ins";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          company_note: string | null;
          created_at: string;
          cv_path: string | null;
          decided_at: string | null;
          decided_by: string | null;
          full_name: string;
          headline: string | null;
          id: string;
          job_request_id: string;
          proposed_by: string | null;
          status: Database["public"]["Enums"]["candidate_status"];
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          company_note?: string | null;
          created_at?: string;
          cv_path?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          full_name: string;
          headline?: string | null;
          id?: string;
          job_request_id: string;
          proposed_by?: string | null;
          status?: Database["public"]["Enums"]["candidate_status"];
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          company_note?: string | null;
          created_at?: string;
          cv_path?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          full_name?: string;
          headline?: string | null;
          id?: string;
          job_request_id?: string;
          proposed_by?: string | null;
          status?: Database["public"]["Enums"]["candidate_status"];
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_request_id_fkey";
            columns: ["job_request_id"];
            isOneToOne: false;
            referencedRelation: "job_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          box_theme_id: string | null;
          condition: Database["public"]["Enums"]["product_condition"] | null;
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
          user_id: string;
          variant_id: string;
        };
        Insert: {
          box_theme_id?: string | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
          variant_id: string;
        };
        Update: {
          box_theme_id?: string | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_box_theme_id_fkey";
            columns: ["box_theme_id"];
            isOneToOne: false;
            referencedRelation: "box_themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_variant_fkey";
            columns: ["product_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id", "id"];
          },
        ];
      };
      chart_of_accounts: {
        Row: {
          active: boolean;
          category: string | null;
          code: string;
          created_at: string;
          id: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
        };
        Insert: {
          active?: boolean;
          category?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
        };
        Update: {
          active?: boolean;
          category?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["account_type"];
        };
        Relationships: [];
      };
      crm_contacts: {
        Row: {
          last_contacted_at: string | null;
          notes: string | null;
          status: Database["public"]["Enums"]["crm_status"];
          tags: string[];
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          last_contacted_at?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["crm_status"];
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          last_contacted_at?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["crm_status"];
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      delivery_areas: {
        Row: {
          active: boolean;
          code: string | null;
          id: string;
          name: string;
          province: string;
          remote: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code?: string | null;
          id: string;
          name: string;
          province: string;
          remote?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string | null;
          id?: string;
          name?: string;
          province?: string;
          remote?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          active: boolean;
          carrier_province: string | null;
          created_at: string;
          fee: number;
          free_from: number | null;
          governorate: string | null;
          id: string;
          max_days: number;
          min_days: number;
          name_ar: string;
          name_en: string;
          plus_free_delivery: boolean;
          position: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          carrier_province?: string | null;
          created_at?: string;
          fee: number;
          free_from?: number | null;
          governorate?: string | null;
          id?: string;
          max_days?: number;
          min_days?: number;
          name_ar: string;
          name_en: string;
          plus_free_delivery?: boolean;
          position?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          carrier_province?: string | null;
          created_at?: string;
          fee?: number;
          free_from?: number | null;
          governorate?: string | null;
          id?: string;
          max_days?: number;
          min_days?: number;
          name_ar?: string;
          name_en?: string;
          plus_free_delivery?: boolean;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          event_id: string;
          user_id?: string;
        };
        Update: {
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          cover_image: string | null;
          created_at: string;
          created_by: string | null;
          description_ar: string | null;
          description_en: string | null;
          ends_at: string | null;
          id: string;
          location: string;
          published: boolean;
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          cover_image?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string | null;
          id?: string;
          location: string;
          published?: boolean;
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          cover_image?: string | null;
          created_at?: string;
          created_by?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string;
          published?: boolean;
          slug?: string;
          starts_at?: string;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_settings: {
        Row: {
          base_currency: string;
          corporate_tax_rate: number;
          fiscal_year_start_month: number;
          id: boolean;
          updated_at: string;
          vat_rate: number;
        };
        Insert: {
          base_currency?: string;
          corporate_tax_rate?: number;
          fiscal_year_start_month?: number;
          id?: boolean;
          updated_at?: string;
          vat_rate?: number;
        };
        Update: {
          base_currency?: string;
          corporate_tax_rate?: number;
          fiscal_year_start_month?: number;
          id?: boolean;
          updated_at?: string;
          vat_rate?: number;
        };
        Relationships: [];
      };
      guardian_links: {
        Row: {
          accepted_at: string | null;
          allows_plus: boolean;
          code: string;
          created_at: string;
          guardian_id: string | null;
          id: string;
          status: string;
          teen_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          allows_plus?: boolean;
          code?: string;
          created_at?: string;
          guardian_id?: string | null;
          id?: string;
          status?: string;
          teen_id: string;
        };
        Update: {
          accepted_at?: string | null;
          allows_plus?: boolean;
          code?: string;
          created_at?: string;
          guardian_id?: string | null;
          id?: string;
          status?: string;
          teen_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_links_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_links_teen_id_fkey";
            columns: ["teen_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          invitee: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          invitee: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          invitee?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount: number;
          created_by: string | null;
          description: string | null;
          due_on: string;
          id: string;
          issued_at: string;
          number: number;
          organization_id: string;
          paid_at: string | null;
          purchase_order_id: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_by?: string | null;
          description?: string | null;
          due_on: string;
          id?: string;
          issued_at?: string;
          number?: never;
          organization_id: string;
          paid_at?: string | null;
          purchase_order_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_by?: string | null;
          description?: string | null;
          due_on?: string;
          id?: string;
          issued_at?: string;
          number?: never;
          organization_id?: string;
          paid_at?: string | null;
          purchase_order_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: true;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      job_requests: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          employment_type: Database["public"]["Enums"]["employment_type"];
          id: string;
          location: string | null;
          number: number;
          openings: number;
          organization_id: string;
          salary_max: number | null;
          salary_min: number | null;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          id?: string;
          location?: string | null;
          number?: never;
          openings?: number;
          organization_id: string;
          salary_max?: number | null;
          salary_min?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          employment_type?: Database["public"]["Enums"]["employment_type"];
          id?: string;
          location?: string | null;
          number?: never;
          openings?: number;
          organization_id?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      kit_booking_games: {
        Row: {
          booking_id: string;
          product_id: string;
          rental_id: string | null;
        };
        Insert: {
          booking_id: string;
          product_id: string;
          rental_id?: string | null;
        };
        Update: {
          booking_id?: string;
          product_id?: string;
          rental_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kit_booking_games_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "kit_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kit_booking_games_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kit_booking_games_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rentals";
            referencedColumns: ["id"];
          },
        ];
      };
      kit_bookings: {
        Row: {
          amount_due: number | null;
          created_at: string;
          damage_charge: number | null;
          deposit: number;
          deposit_waived: boolean;
          ends_on: string;
          extra_days: number;
          id: string;
          kit_type: string;
          order_id: string | null;
          refund_due: number | null;
          starts_on: string;
          status: string;
          unit_id: string;
          user_id: string | null;
        };
        Insert: {
          amount_due?: number | null;
          created_at?: string;
          damage_charge?: number | null;
          deposit?: number;
          deposit_waived?: boolean;
          ends_on: string;
          extra_days?: number;
          id?: string;
          kit_type: string;
          order_id?: string | null;
          refund_due?: number | null;
          starts_on: string;
          status?: string;
          unit_id: string;
          user_id?: string | null;
        };
        Update: {
          amount_due?: number | null;
          created_at?: string;
          damage_charge?: number | null;
          deposit?: number;
          deposit_waived?: boolean;
          ends_on?: string;
          extra_days?: number;
          id?: string;
          kit_type?: string;
          order_id?: string | null;
          refund_due?: number | null;
          starts_on?: string;
          status?: string;
          unit_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kit_bookings_kit_type_fkey";
            columns: ["kit_type"];
            isOneToOne: false;
            referencedRelation: "kit_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kit_bookings_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kit_bookings_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "kit_units";
            referencedColumns: ["id"];
          },
        ];
      };
      kit_types: {
        Row: {
          active: boolean;
          deposit: number;
          description_ar: string;
          description_en: string;
          extra_day_price: number;
          games: number;
          games_category_id: string | null;
          id: string;
          image: string | null;
          name_ar: string;
          name_en: string;
          position: number;
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          deposit?: number;
          description_ar?: string;
          description_en?: string;
          extra_day_price: number;
          games?: number;
          games_category_id?: string | null;
          id: string;
          image?: string | null;
          name_ar: string;
          name_en: string;
          position?: number;
          price: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          deposit?: number;
          description_ar?: string;
          description_en?: string;
          extra_day_price?: number;
          games?: number;
          games_category_id?: string | null;
          id?: string;
          image?: string | null;
          name_ar?: string;
          name_en?: string;
          position?: number;
          price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kit_types_games_category_id_fkey";
            columns: ["games_category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      kit_units: {
        Row: {
          created_at: string;
          id: string;
          kit_type: string;
          label: string;
          note: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kit_type: string;
          label: string;
          note?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kit_type?: string;
          label?: string;
          note?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kit_units_kit_type_fkey";
            columns: ["kit_type"];
            isOneToOne: false;
            referencedRelation: "kit_types";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string;
          entry_date: string;
          exchange_rate: number;
          id: string;
          reference: string | null;
          scenario: Database["public"]["Enums"]["ledger_scenario"];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description: string;
          entry_date: string;
          exchange_rate?: number;
          id?: string;
          reference?: string | null;
          scenario?: Database["public"]["Enums"]["ledger_scenario"];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string;
          entry_date?: string;
          exchange_rate?: number;
          id?: string;
          reference?: string | null;
          scenario?: Database["public"]["Enums"]["ledger_scenario"];
        };
        Relationships: [];
      };
      ledger_lines: {
        Row: {
          account_id: string;
          credit: number;
          debit: number;
          dimensions: NonNullable<Json>;
          entry_id: string;
          id: string;
          memo: string | null;
        };
        Insert: {
          account_id: string;
          credit?: number;
          debit?: number;
          dimensions?: NonNullable<Json>;
          entry_id: string;
          id?: string;
          memo?: string | null;
        };
        Update: {
          account_id?: string;
          credit?: number;
          debit?: number;
          dimensions?: NonNullable<Json>;
          entry_id?: string;
          id?: string;
          memo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_lines_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "chart_of_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_lines_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "ledger_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: NonNullable<Json>;
          event: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link: string | null;
          pushed_at: string | null;
          read_at: string | null;
          telegram_sent_at: string | null;
          user_id: string;
          whatsapp_sent_at: string | null;
        };
        Insert: {
          created_at?: string;
          data?: NonNullable<Json>;
          event: string;
          id?: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link?: string | null;
          pushed_at?: string | null;
          read_at?: string | null;
          telegram_sent_at?: string | null;
          user_id: string;
          whatsapp_sent_at?: string | null;
        };
        Update: {
          created_at?: string;
          data?: NonNullable<Json>;
          event?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["notification_kind"];
          link?: string | null;
          pushed_at?: string | null;
          read_at?: string | null;
          telegram_sent_at?: string | null;
          user_id?: string;
          whatsapp_sent_at?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          attributes: NonNullable<Json>;
          box_theme_id: string | null;
          condition: Database["public"]["Enums"]["product_condition"] | null;
          id: string;
          kind: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          packed_at: string | null;
          packed_by: string | null;
          product_id: string | null;
          quantity: number;
          rental_id: string | null;
          unit_price: number;
          variant_id: string | null;
        };
        Insert: {
          attributes?: NonNullable<Json>;
          box_theme_id?: string | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          id?: string;
          kind?: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          packed_at?: string | null;
          packed_by?: string | null;
          product_id?: string | null;
          quantity: number;
          rental_id?: string | null;
          unit_price: number;
          variant_id?: string | null;
        };
        Update: {
          attributes?: NonNullable<Json>;
          box_theme_id?: string | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          id?: string;
          kind?: string;
          name_ar?: string;
          name_en?: string;
          order_id?: string;
          packed_at?: string | null;
          packed_by?: string | null;
          product_id?: string | null;
          quantity?: number;
          rental_id?: string | null;
          unit_price?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_box_theme_id_fkey";
            columns: ["box_theme_id"];
            isOneToOne: false;
            referencedRelation: "box_themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rentals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          affiliate_id?: string | null;
          bulbs_discount?: number;
          bulbs_used?: number;
          cash_collected_by?: string | null;
          confirmation_emailed_at?: string | null;
          created_at?: string;
          currency?: string;
          delivery_zone_id?: string | null;
          discount?: number;
          discount_source?: string | null;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status?: string | null;
          id?: string;
          max_bulbs?: number | null;
          number?: never;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee?: number;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          affiliate_id?: string | null;
          bulbs_discount?: number;
          bulbs_used?: number;
          cash_collected_by?: string | null;
          confirmation_emailed_at?: string | null;
          created_at?: string;
          currency?: string;
          delivery_zone_id?: string | null;
          discount?: number;
          discount_source?: string | null;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status?: string | null;
          id?: string;
          max_bulbs?: number | null;
          number?: never;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          shipping_address?: NonNullable<Json>;
          shipping_fee?: number;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey";
            columns: ["delivery_zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pass_access_tokens: {
        Row: {
          client_id: string;
          created_at: string;
          expires_at: string;
          scopes: string[];
          token_hash: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          expires_at: string;
          scopes: string[];
          token_hash: string;
          user_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          expires_at?: string;
          scopes?: string[];
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_access_tokens_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
      };
      pass_card_checks: {
        Row: {
          checked_at: string;
          client_id: string;
          id: number;
          user_id: string | null;
          valid: boolean;
        };
        Insert: {
          checked_at?: string;
          client_id: string;
          id?: never;
          user_id?: string | null;
          valid: boolean;
        };
        Update: {
          checked_at?: string;
          client_id?: string;
          id?: never;
          user_id?: string | null;
          valid?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "pass_card_checks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
      };
      pass_connections: {
        Row: {
          client_id: string;
          granted_at: string;
          last_used_at: string | null;
          scopes: string[];
          subject: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          granted_at?: string;
          last_used_at?: string | null;
          scopes?: string[];
          subject?: string;
          user_id: string;
        };
        Update: {
          client_id?: string;
          granted_at?: string;
          last_used_at?: string | null;
          scopes?: string[];
          subject?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_connections_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
      };
      pass_partners: {
        Row: {
          active: boolean;
          answers: string[];
          client_id: string;
          created_at: string;
          name: string;
          organization_id: string | null;
          redirect_uris: string[];
          secret_hash: string;
          updated_at: string;
          website: string;
        };
        Insert: {
          active?: boolean;
          answers?: string[];
          client_id: string;
          created_at?: string;
          name: string;
          organization_id?: string | null;
          redirect_uris: string[];
          secret_hash: string;
          updated_at?: string;
          website: string;
        };
        Update: {
          active?: boolean;
          answers?: string[];
          client_id?: string;
          created_at?: string;
          name?: string;
          organization_id?: string | null;
          redirect_uris?: string[];
          secret_hash?: string;
          updated_at?: string;
          website?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_partners_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pass_sign_in_codes: {
        Row: {
          client_id: string;
          code_challenge: string;
          code_hash: string;
          created_at: string;
          expires_at: string;
          nonce: string | null;
          redirect_uri: string;
          scopes: string[];
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          client_id: string;
          code_challenge: string;
          code_hash: string;
          created_at?: string;
          expires_at?: string;
          nonce?: string | null;
          redirect_uri: string;
          scopes: string[];
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          client_id?: string;
          code_challenge?: string;
          code_hash?: string;
          created_at?: string;
          expires_at?: string;
          nonce?: string | null;
          redirect_uri?: string;
          scopes?: string[];
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_sign_in_codes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          checkout_url: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          metadata: NonNullable<Json>;
          order_id: string | null;
          organization_id: string | null;
          paid_at: string | null;
          payment_method: string | null;
          provider: string;
          provider_payment_id: string | null;
          reference_id: string;
          refunded_amount: number;
          status: Database["public"]["Enums"]["payment_status"];
          subscription_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          checkout_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          metadata?: NonNullable<Json>;
          order_id?: string | null;
          organization_id?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          provider: string;
          provider_payment_id?: string | null;
          reference_id: string;
          refunded_amount?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          checkout_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          metadata?: NonNullable<Json>;
          order_id?: string | null;
          organization_id?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          reference_id?: string;
          refunded_amount?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      perk_redemptions: {
        Row: {
          created_at: string;
          id: string;
          perk_id: string;
          redeemed_by: string | null;
          redeemed_on: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          perk_id: string;
          redeemed_by?: string | null;
          redeemed_on?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          perk_id?: string;
          redeemed_by?: string | null;
          redeemed_on?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "perk_redemptions_perk_id_fkey";
            columns: ["perk_id"];
            isOneToOne: false;
            referencedRelation: "perks";
            referencedColumns: ["id"];
          },
        ];
      };
      perks: {
        Row: {
          active: boolean;
          area_ar: string;
          area_en: string;
          audience: string;
          created_at: string;
          details_ar: string;
          details_en: string;
          id: string;
          kind: string;
          organization_id: string;
          partner_name: string;
          position: number;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          area_ar?: string;
          area_en?: string;
          audience?: string;
          created_at?: string;
          details_ar?: string;
          details_en?: string;
          id?: string;
          kind?: string;
          organization_id: string;
          partner_name: string;
          position?: number;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          area_ar?: string;
          area_en?: string;
          audience?: string;
          created_at?: string;
          details_ar?: string;
          details_en?: string;
          id?: string;
          kind?: string;
          organization_id?: string;
          partner_name?: string;
          position?: number;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "perks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          active: boolean;
          amount: number;
          audience: string;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          bulb_rate: number | null;
          created_at: string;
          currency: string;
          description: string | null;
          features_ar: string[];
          features_en: string[];
          free_delivery: boolean;
          home_swaps: number | null;
          id: string;
          name: string;
          name_ar: string | null;
          position: number;
          rental_slots: number | null;
          student_of: string | null;
          tier: number | null;
        };
        Insert: {
          active?: boolean;
          amount: number;
          audience?: string;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          bulb_rate?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features_ar?: string[];
          features_en?: string[];
          free_delivery?: boolean;
          home_swaps?: number | null;
          id: string;
          name: string;
          name_ar?: string | null;
          position?: number;
          rental_slots?: number | null;
          student_of?: string | null;
          tier?: number | null;
        };
        Update: {
          active?: boolean;
          amount?: number;
          audience?: string;
          billing_interval?: Database["public"]["Enums"]["billing_interval"];
          bulb_rate?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features_ar?: string[];
          features_en?: string[];
          free_delivery?: boolean;
          home_swaps?: number | null;
          id?: string;
          name?: string;
          name_ar?: string | null;
          position?: number;
          rental_slots?: number | null;
          student_of?: string | null;
          tier?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "plans_student_of_fkey";
            columns: ["student_of"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plus_areas: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          position: number;
          weekday: number | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en: string;
          position?: number;
          weekday?: number | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          position?: number;
          weekday?: number | null;
        };
        Relationships: [];
      };
      plus_homes: {
        Row: {
          address: string;
          area_id: string;
          phone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address: string;
          area_id: string;
          phone: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          area_id?: string;
          phone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plus_homes_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "plus_areas";
            referencedColumns: ["id"];
          },
        ];
      };
      plus_pauses: {
        Row: {
          ends_at: string;
          id: string;
          starts_at: string;
          subscription_id: string;
          user_id: string;
        };
        Insert: {
          ends_at: string;
          id?: string;
          starts_at?: string;
          subscription_id: string;
          user_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          starts_at?: string;
          subscription_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plus_pauses_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      plus_seats: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          organization_id: string;
          plan_id: string;
          requested_by: string | null;
          status: Database["public"]["Enums"]["plus_seat_status"];
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          organization_id: string;
          plan_id: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["plus_seat_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          organization_id?: string;
          plan_id?: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["plus_seat_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plus_seats_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_seats_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_seats_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: true;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      plus_swaps: {
        Row: {
          area_id: string | null;
          counted: boolean;
          created_at: string;
          done_at: string | null;
          fee: number;
          id: string;
          method: string;
          order_id: string | null;
          scheduled_for: string | null;
          status: string;
          user_id: string | null;
        };
        Insert: {
          area_id?: string | null;
          counted?: boolean;
          created_at?: string;
          done_at?: string | null;
          fee?: number;
          id?: string;
          method: string;
          order_id?: string | null;
          scheduled_for?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          area_id?: string | null;
          counted?: boolean;
          created_at?: string;
          done_at?: string | null;
          fee?: number;
          id?: string;
          method?: string;
          order_id?: string | null;
          scheduled_for?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plus_swaps_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "plus_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_swaps_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      plus_waitlist: {
        Row: {
          area_id: string | null;
          created_at: string;
          governorate: string;
          invite_expires_at: string | null;
          invited_at: string | null;
          plan_id: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          area_id?: string | null;
          created_at?: string;
          governorate: string;
          invite_expires_at?: string | null;
          invited_at?: string | null;
          plan_id?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          area_id?: string | null;
          created_at?: string;
          governorate?: string;
          invite_expires_at?: string | null;
          invited_at?: string | null;
          plan_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plus_waitlist_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "plus_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_waitlist_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string | null;
          body_ar: string;
          body_en: string;
          byline: string | null;
          cover_image: string | null;
          created_at: string;
          excerpt_ar: string | null;
          excerpt_en: string | null;
          id: string;
          published_at: string | null;
          section: Database["public"]["Enums"]["post_section"];
          slug: string;
          submission_id: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body_ar?: string;
          body_en?: string;
          byline?: string | null;
          cover_image?: string | null;
          created_at?: string;
          excerpt_ar?: string | null;
          excerpt_en?: string | null;
          id?: string;
          published_at?: string | null;
          section?: Database["public"]["Enums"]["post_section"];
          slug: string;
          submission_id?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body_ar?: string;
          body_en?: string;
          byline?: string | null;
          cover_image?: string | null;
          created_at?: string;
          excerpt_ar?: string | null;
          excerpt_en?: string | null;
          id?: string;
          published_at?: string | null;
          section?: Database["public"]["Enums"]["post_section"];
          slug?: string;
          submission_id?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      procurement_requests: {
        Row: {
          assigned_to: string | null;
          budget: number | null;
          created_at: string;
          created_by: string | null;
          details: string | null;
          id: string;
          needed_by: string | null;
          number: number;
          organization_id: string;
          status: Database["public"]["Enums"]["procurement_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          details?: string | null;
          id?: string;
          needed_by?: string | null;
          number?: never;
          organization_id: string;
          status?: Database["public"]["Enums"]["procurement_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          details?: string | null;
          id?: string;
          needed_by?: string | null;
          number?: never;
          organization_id?: string;
          status?: Database["public"]["Enums"]["procurement_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "procurement_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          affiliate_rate: number;
          bulb_multiplier: number;
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          position: number;
          slug: string;
        };
        Insert: {
          affiliate_rate?: number;
          bulb_multiplier?: number;
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en: string;
          position?: number;
          slug: string;
        };
        Update: {
          affiliate_rate?: number;
          bulb_multiplier?: number;
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      product_reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          photos: string[];
          product_id: string;
          rating: number;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          user_id: string;
          verified_purchase: boolean;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          photos?: string[];
          product_id: string;
          rating: number;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
          verified_purchase?: boolean;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          photos?: string[];
          product_id?: string;
          rating?: number;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
          verified_purchase?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          active: boolean;
          attributes: NonNullable<Json>;
          barcode: string | null;
          compare_at_price: number | null;
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          images: string[];
          label_ar: string | null;
          label_en: string | null;
          position: number;
          price: number;
          product_id: string;
          rental_stock: number;
          sku: string | null;
          stock_count: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          attributes?: NonNullable<Json>;
          barcode?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          images?: string[];
          label_ar?: string | null;
          label_en?: string | null;
          position?: number;
          price: number;
          product_id: string;
          rental_stock?: number;
          sku?: string | null;
          stock_count?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          attributes?: NonNullable<Json>;
          barcode?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          images?: string[];
          label_ar?: string | null;
          label_en?: string | null;
          position?: number;
          price?: number;
          product_id?: string;
          rental_stock?: number;
          sku?: string | null;
          stock_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          age_rating: number | null;
          bulb_multiplier: number | null;
          category_id: string | null;
          compare_at_price: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          currency: string;
          description_ar: string | null;
          description_en: string | null;
          details: NonNullable<Json>;
          featured: boolean;
          id: string;
          images: string[];
          kind: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          price: number;
          rentable: boolean;
          rental_stock: number;
          rental_tier: number | null;
          seller: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_count: number;
          updated_at: string;
          variant_text: string;
          verified: boolean;
        };
        Insert: {
          age_rating?: number | null;
          bulb_multiplier?: number | null;
          category_id?: string | null;
          compare_at_price?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          currency?: string;
          description_ar?: string | null;
          description_en?: string | null;
          details?: NonNullable<Json>;
          featured?: boolean;
          id?: string;
          images?: string[];
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          price: number;
          rentable?: boolean;
          rental_stock?: number;
          rental_tier?: number | null;
          seller?: string;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_count?: number;
          updated_at?: string;
          variant_text?: string;
          verified?: boolean;
        };
        Update: {
          age_rating?: number | null;
          bulb_multiplier?: number | null;
          category_id?: string | null;
          compare_at_price?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          currency?: string;
          description_ar?: string | null;
          description_en?: string | null;
          details?: NonNullable<Json>;
          featured?: boolean;
          id?: string;
          images?: string[];
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar?: string;
          name_en?: string;
          price?: number;
          rentable?: boolean;
          rental_stock?: number;
          rental_tier?: number | null;
          seller?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_count?: number;
          updated_at?: string;
          variant_text?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          banned_at: string | null;
          birthday: string | null;
          calendar_token: string;
          created_at: string;
          full_name: string | null;
          id: string;
          invite_code: string;
          locale: string;
          marketing_opt_in: boolean;
          member_number: number;
          updated_at: string;
          whatsapp_opt_in: boolean;
          whatsapp_phone: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          banned_at?: string | null;
          birthday?: string | null;
          calendar_token?: string;
          created_at?: string;
          full_name?: string | null;
          id: string;
          invite_code?: string;
          locale?: string;
          marketing_opt_in?: boolean;
          member_number?: never;
          updated_at?: string;
          whatsapp_opt_in?: boolean;
          whatsapp_phone?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          banned_at?: string | null;
          birthday?: string | null;
          calendar_token?: string;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          invite_code?: string;
          locale?: string;
          marketing_opt_in?: boolean;
          member_number?: never;
          updated_at?: string;
          whatsapp_opt_in?: boolean;
          whatsapp_phone?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          created_at: string;
          customer_reference: string | null;
          delivered_at: string | null;
          id: string;
          number: number;
          organization_id: string;
          quote_id: string;
          status: Database["public"]["Enums"]["purchase_order_status"];
          total: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_reference?: string | null;
          delivered_at?: string | null;
          id?: string;
          number?: never;
          organization_id: string;
          quote_id: string;
          status?: Database["public"]["Enums"]["purchase_order_status"];
          total: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_reference?: string | null;
          delivered_at?: string | null;
          id?: string;
          number?: never;
          organization_id?: string;
          quote_id?: string;
          status?: Database["public"]["Enums"]["purchase_order_status"];
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: true;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      push_devices: {
        Row: {
          created_at: string;
          id: string;
          last_seen: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_seen?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      quote_lines: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          position: number;
          product_id: string | null;
          quantity: number;
          quote_id: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          position?: number;
          product_id?: string | null;
          quantity: number;
          quote_id: string;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          position?: number;
          product_id?: string | null;
          quantity?: number;
          quote_id?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          notes: string | null;
          number: number;
          request_id: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          notes?: string | null;
          number?: never;
          request_id: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          notes?: string | null;
          number?: never;
          request_id?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          created_at: string;
          invitee_id: string;
          inviter_id: string;
          order_id: string | null;
          rewarded_at: string | null;
          status: Database["public"]["Enums"]["referral_status"];
        };
        Insert: {
          created_at?: string;
          invitee_id: string;
          inviter_id: string;
          order_id?: string | null;
          rewarded_at?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
        };
        Update: {
          created_at?: string;
          invitee_id?: string;
          inviter_id?: string;
          order_id?: string | null;
          rewarded_at?: string | null;
          status?: Database["public"]["Enums"]["referral_status"];
        };
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      rental_rates: {
        Row: {
          category_id: string;
          days: number;
          late_fee: number;
          price: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          days: number;
          late_fee: number;
          price: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          days?: number;
          late_fee?: number;
          price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rental_rates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: true;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      rentals: {
        Row: {
          amount_due: number | null;
          damage_charge: number | null;
          days: number | null;
          deposit: number;
          due_at: string | null;
          due_reminder_at: string | null;
          id: string;
          kind: string;
          late_charge: number | null;
          late_fee: number;
          name_ar: string;
          name_en: string;
          order_id: string | null;
          product_id: string | null;
          refund_due: number | null;
          requested_at: string;
          return_swap_id: string | null;
          returned_at: string | null;
          settled_at: string | null;
          staff_note: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["rental_status"];
          swap_id: string | null;
          updated_at: string;
          user_id: string | null;
          variant_id: string | null;
        };
        Insert: {
          amount_due?: number | null;
          damage_charge?: number | null;
          days?: number | null;
          deposit?: number;
          due_at?: string | null;
          due_reminder_at?: string | null;
          id?: string;
          kind?: string;
          late_charge?: number | null;
          late_fee?: number;
          name_ar: string;
          name_en: string;
          order_id?: string | null;
          product_id?: string | null;
          refund_due?: number | null;
          requested_at?: string;
          return_swap_id?: string | null;
          returned_at?: string | null;
          settled_at?: string | null;
          staff_note?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["rental_status"];
          swap_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          variant_id?: string | null;
        };
        Update: {
          amount_due?: number | null;
          damage_charge?: number | null;
          days?: number | null;
          deposit?: number;
          due_at?: string | null;
          due_reminder_at?: string | null;
          id?: string;
          kind?: string;
          late_charge?: number | null;
          late_fee?: number;
          name_ar?: string;
          name_en?: string;
          order_id?: string | null;
          product_id?: string | null;
          refund_due?: number | null;
          requested_at?: string;
          return_swap_id?: string | null;
          returned_at?: string | null;
          settled_at?: string | null;
          staff_note?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["rental_status"];
          swap_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rentals_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rentals_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rentals_return_swap_fk";
            columns: ["return_swap_id"];
            isOneToOne: false;
            referencedRelation: "plus_swaps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rentals_swap_fk";
            columns: ["swap_id"];
            isOneToOne: false;
            referencedRelation: "plus_swaps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rentals_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          action_required: string | null;
          active: boolean;
          cancelled_at: string | null;
          carrier: string;
          carrier_id: string;
          cash_amount: number;
          created_at: string;
          created_by: string | null;
          delivered_at: string | null;
          fee: number | null;
          fragile: boolean;
          history: NonNullable<Json>;
          id: string;
          order_id: string;
          pickup_id: string | null;
          returned_at: string | null;
          size: string;
          status: string;
          status_title: string | null;
          synced_at: string | null;
          tracking_code: string | null;
          tracking_url: string | null;
          updated_at: string;
        };
        Insert: {
          action_required?: string | null;
          active?: boolean;
          cancelled_at?: string | null;
          carrier?: string;
          carrier_id: string;
          cash_amount?: number;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          fee?: number | null;
          fragile?: boolean;
          history?: NonNullable<Json>;
          id?: string;
          order_id: string;
          pickup_id?: string | null;
          returned_at?: string | null;
          size: string;
          status?: string;
          status_title?: string | null;
          synced_at?: string | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Update: {
          action_required?: string | null;
          active?: boolean;
          cancelled_at?: string | null;
          carrier?: string;
          carrier_id?: string;
          cash_amount?: number;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          fee?: number | null;
          fragile?: boolean;
          history?: NonNullable<Json>;
          id?: string;
          order_id?: string;
          pickup_id?: string | null;
          returned_at?: string | null;
          size?: string;
          status?: string;
          status_title?: string | null;
          synced_at?: string | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          created_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      stock_items: {
        Row: {
          acquired_at: string;
          condition: Database["public"]["Enums"]["product_condition"];
          cost: number | null;
          created_at: string;
          id: string;
          location: string;
          note: string | null;
          order_item_id: string | null;
          price: number | null;
          product_id: string;
          purpose: Database["public"]["Enums"]["stock_purpose"];
          rental_id: string | null;
          serial: string | null;
          status: Database["public"]["Enums"]["stock_status"];
          trade_in_id: string | null;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          acquired_at?: string;
          condition?: Database["public"]["Enums"]["product_condition"];
          cost?: number | null;
          created_at?: string;
          id?: string;
          location?: string;
          note?: string | null;
          order_item_id?: string | null;
          price?: number | null;
          product_id: string;
          purpose?: Database["public"]["Enums"]["stock_purpose"];
          rental_id?: string | null;
          serial?: string | null;
          status?: Database["public"]["Enums"]["stock_status"];
          trade_in_id?: string | null;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          acquired_at?: string;
          condition?: Database["public"]["Enums"]["product_condition"];
          cost?: number | null;
          created_at?: string;
          id?: string;
          location?: string;
          note?: string | null;
          order_item_id?: string | null;
          price?: number | null;
          product_id?: string;
          purpose?: Database["public"]["Enums"]["stock_purpose"];
          rental_id?: string | null;
          serial?: string | null;
          status?: Database["public"]["Enums"]["stock_status"];
          trade_in_id?: string | null;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_items_product_variant_fkey";
            columns: ["product_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id", "id"];
          },
          {
            foreignKeyName: "stock_items_rental_id_fkey";
            columns: ["rental_id"];
            isOneToOne: false;
            referencedRelation: "rentals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_items_trade_in_id_fkey";
            columns: ["trade_in_id"];
            isOneToOne: false;
            referencedRelation: "trade_ins";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          bulb_half_from: number;
          bulb_rate: number;
          cash_limit: number | null;
          cash_on_delivery_enabled: boolean;
          delivery_cost: number;
          extra_swap_fee: number;
          id: boolean;
          max_giveaway_rate: number;
          min_margin_rate: number;
          payment_fee_rate: number;
          pickup_address_ar: string | null;
          pickup_address_en: string | null;
          pickup_enabled: boolean;
          pickup_hours_ar: string | null;
          pickup_hours_en: string | null;
          plus_capacity: number;
          plus_invite_hours: number;
          rental_deposit_rate: number;
          return_days: number;
          shipping_fee: number;
          survey_fee_rate: number;
          survey_welcome_credits: number;
          updated_at: string;
        };
        Insert: {
          bulb_half_from?: number;
          bulb_rate?: number;
          cash_limit?: number | null;
          cash_on_delivery_enabled?: boolean;
          delivery_cost?: number;
          extra_swap_fee?: number;
          id?: boolean;
          max_giveaway_rate?: number;
          min_margin_rate?: number;
          payment_fee_rate?: number;
          pickup_address_ar?: string | null;
          pickup_address_en?: string | null;
          pickup_enabled?: boolean;
          pickup_hours_ar?: string | null;
          pickup_hours_en?: string | null;
          plus_capacity?: number;
          plus_invite_hours?: number;
          rental_deposit_rate?: number;
          return_days?: number;
          shipping_fee?: number;
          survey_fee_rate?: number;
          survey_welcome_credits?: number;
          updated_at?: string;
        };
        Update: {
          bulb_half_from?: number;
          bulb_rate?: number;
          cash_limit?: number | null;
          cash_on_delivery_enabled?: boolean;
          delivery_cost?: number;
          extra_swap_fee?: number;
          id?: boolean;
          max_giveaway_rate?: number;
          min_margin_rate?: number;
          payment_fee_rate?: number;
          pickup_address_ar?: string | null;
          pickup_address_en?: string | null;
          pickup_enabled?: boolean;
          pickup_hours_ar?: string | null;
          pickup_hours_en?: string | null;
          plus_capacity?: number;
          plus_invite_hours?: number;
          rental_deposit_rate?: number;
          return_days?: number;
          shipping_fee?: number;
          survey_fee_rate?: number;
          survey_welcome_credits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_badges: {
        Row: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_id: string;
          user_id: string;
          valid_until: string;
          verified_at: string;
        };
        Insert: {
          email_hash?: string | null;
          governorate?: string | null;
          major?: string | null;
          method: string;
          study_year?: number | null;
          university_id: string;
          user_id: string;
          valid_until: string;
          verified_at?: string;
        };
        Update: {
          email_hash?: string | null;
          governorate?: string | null;
          major?: string | null;
          method?: string;
          study_year?: number | null;
          university_id?: string;
          user_id?: string;
          valid_until?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_badges_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      student_requests: {
        Row: {
          attempts: number;
          card_path: string | null;
          code_expires_at: string | null;
          code_hash: string | null;
          created_at: string;
          email: string | null;
          id: string;
          method: string;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          university_id: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          card_path?: string | null;
          code_expires_at?: string | null;
          code_hash?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          method: string;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          university_id: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          card_path?: string | null;
          code_expires_at?: string | null;
          code_hash?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          method?: string;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_requests_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_reviews: {
        Row: {
          archive_worthy: boolean | null;
          formatting: string | null;
          notes: string | null;
          originality: number | null;
          reviewed_by: string | null;
          submission_id: string;
          technical: number | null;
          thematic: number | null;
          updated_at: string;
        };
        Insert: {
          archive_worthy?: boolean | null;
          formatting?: string | null;
          notes?: string | null;
          originality?: number | null;
          reviewed_by?: string | null;
          submission_id: string;
          technical?: number | null;
          thematic?: number | null;
          updated_at?: string;
        };
        Update: {
          archive_worthy?: boolean | null;
          formatting?: string | null;
          notes?: string | null;
          originality?: number | null;
          reviewed_by?: string | null;
          submission_id?: string;
          technical?: number | null;
          thematic?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_reviews_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          assigned_to: string | null;
          author_id: string | null;
          body: string | null;
          decided_at: string | null;
          decision_note: string | null;
          file_path: string | null;
          id: string;
          status: Database["public"]["Enums"]["submission_status"];
          submitted_at: string;
          title: string;
          type: Database["public"]["Enums"]["submission_type"];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          author_id?: string | null;
          body?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          file_path?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string;
          title: string;
          type: Database["public"]["Enums"]["submission_type"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          author_id?: string | null;
          body?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          file_path?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string;
          title?: string;
          type?: Database["public"]["Enums"]["submission_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          affiliate_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          next_plan_id: string | null;
          organization_id: string | null;
          paused_until: string | null;
          plan_id: string;
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          affiliate_id?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          next_plan_id?: string | null;
          organization_id?: string | null;
          paused_until?: string | null;
          plan_id: string;
          provider: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          affiliate_id?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          next_plan_id?: string | null;
          organization_id?: string | null;
          paused_until?: string | null;
          plan_id?: string;
          provider?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "subscriptions_next_plan_id_fkey";
            columns: ["next_plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          internal: boolean;
          ticket_id: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          internal?: boolean;
          ticket_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          internal?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          number: number;
          order_id: string | null;
          priority: Database["public"]["Enums"]["ticket_priority"];
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          topic: Database["public"]["Enums"]["ticket_topic"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          number?: never;
          order_id?: string | null;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          topic?: Database["public"]["Enums"]["ticket_topic"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          number?: never;
          order_id?: string | null;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          topic?: Database["public"]["Enums"]["ticket_topic"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_answers: {
        Row: {
          question_id: string;
          response_id: string;
          value: NonNullable<Json>;
        };
        Insert: {
          question_id: string;
          response_id: string;
          value: NonNullable<Json>;
        };
        Update: {
          question_id?: string;
          response_id?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "survey_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "survey_responses";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_credits: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          reason: string;
          response_id: string | null;
          survey_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          reason: string;
          response_id?: string | null;
          survey_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          reason?: string;
          response_id?: string | null;
          survey_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_credits_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "survey_responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_credits_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_questions: {
        Row: {
          attention_answer: string | null;
          id: string;
          kind: string;
          options: string[];
          position: number;
          prompt: string;
          required: boolean;
          survey_id: string;
        };
        Insert: {
          attention_answer?: string | null;
          id?: string;
          kind: string;
          options?: string[];
          position?: number;
          prompt: string;
          required?: boolean;
          survey_id: string;
        };
        Update: {
          attention_answer?: string | null;
          id?: string;
          kind?: string;
          options?: string[];
          position?: number;
          prompt?: string;
          required?: boolean;
          survey_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_reports: {
        Row: {
          created_at: string;
          reason: string;
          survey_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          reason: string;
          survey_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          reason?: string;
          survey_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_reports_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_responses: {
        Row: {
          counted: boolean | null;
          id: string;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
        };
        Insert: {
          counted?: boolean | null;
          id?: string;
          started_at?: string;
          submitted_at?: string | null;
          survey_id: string;
          user_id?: string | null;
        };
        Update: {
          counted?: boolean | null;
          id?: string;
          started_at?: string;
          submitted_at?: string | null;
          survey_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      surveys: {
        Row: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        Insert: {
          closed_at?: string | null;
          closes_at?: string | null;
          consent?: string;
          created_at?: string;
          creator_id?: string | null;
          description?: string;
          ethics_reference?: string | null;
          flags?: string[];
          governorates?: string[];
          held?: number;
          id?: string;
          kind?: string;
          language?: string;
          majors?: string[];
          min_seconds?: number;
          opened_at?: string | null;
          order_id?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward?: number;
          status?: string;
          students_only?: boolean;
          title: string;
          universities?: string[];
          updated_at?: string;
          wanted?: number;
          years?: number[];
        };
        Update: {
          closed_at?: string | null;
          closes_at?: string | null;
          consent?: string;
          created_at?: string;
          creator_id?: string | null;
          description?: string;
          ethics_reference?: string | null;
          flags?: string[];
          governorates?: string[];
          held?: number;
          id?: string;
          kind?: string;
          language?: string;
          majors?: string[];
          min_seconds?: number;
          opened_at?: string | null;
          order_id?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward?: number;
          status?: string;
          students_only?: boolean;
          title?: string;
          universities?: string[];
          updated_at?: string;
          wanted?: number;
          years?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "surveys_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_chats: {
        Row: {
          arrivals_topic: number | null;
          created_at: string;
          events_topic: number | null;
          id: number;
          join_rule: string;
          moderated: boolean;
          news_topic: number | null;
          post_locale: string;
          title: string;
          username: string | null;
        };
        Insert: {
          arrivals_topic?: number | null;
          created_at?: string;
          events_topic?: number | null;
          id: number;
          join_rule?: string;
          moderated?: boolean;
          news_topic?: number | null;
          post_locale?: string;
          title: string;
          username?: string | null;
        };
        Update: {
          arrivals_topic?: number | null;
          created_at?: string;
          events_topic?: number | null;
          id?: number;
          join_rule?: string;
          moderated?: boolean;
          news_topic?: number | null;
          post_locale?: string;
          title?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      telegram_faq: {
        Row: {
          answer_ar: string;
          answer_en: string;
          created_at: string;
          id: string;
          position: number;
          question_ar: string;
          question_en: string;
          topic: string;
        };
        Insert: {
          answer_ar: string;
          answer_en: string;
          created_at?: string;
          id?: string;
          position?: number;
          question_ar: string;
          question_en: string;
          topic: string;
        };
        Update: {
          answer_ar?: string;
          answer_en?: string;
          created_at?: string;
          id?: string;
          position?: number;
          question_ar?: string;
          question_en?: string;
          topic?: string;
        };
        Relationships: [];
      };
      telegram_members: {
        Row: {
          banned_at: string | null;
          chat_status: string | null;
          created_at: string;
          first_name: string | null;
          id: number;
          language_code: string | null;
          last_name: string | null;
          newsletter_opt_in: boolean;
          updated_at: string;
          user_id: string | null;
          username: string | null;
        };
        Insert: {
          banned_at?: string | null;
          chat_status?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: number;
          language_code?: string | null;
          last_name?: string | null;
          newsletter_opt_in?: boolean;
          updated_at?: string;
          user_id?: string | null;
          username?: string | null;
        };
        Update: {
          banned_at?: string | null;
          chat_status?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: number;
          language_code?: string | null;
          last_name?: string | null;
          newsletter_opt_in?: boolean;
          updated_at?: string;
          user_id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      telegram_posts: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["telegram_post_kind"];
          ref_id: string;
          sent_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["telegram_post_kind"];
          ref_id: string;
          sent_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["telegram_post_kind"];
          ref_id?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      telegram_requests: {
        Row: {
          created_at: string;
          id: string;
          member_id: number;
          message: string;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["telegram_request_status"];
          type: Database["public"]["Enums"]["telegram_request_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: number;
          message: string;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["telegram_request_status"];
          type: Database["public"]["Enums"]["telegram_request_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: number;
          message?: string;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["telegram_request_status"];
          type?: Database["public"]["Enums"]["telegram_request_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_requests_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "telegram_members";
            referencedColumns: ["id"];
          },
        ];
      };
      trade_ins: {
        Row: {
          asking_price: number | null;
          category: Database["public"]["Enums"]["trade_in_category"];
          closed_at: string | null;
          condition: Database["public"]["Enums"]["trade_in_condition"];
          contact_phone: string;
          created_at: string;
          description: string | null;
          id: string;
          number: number;
          offer_amount: number | null;
          offer_note: string | null;
          offered_at: string | null;
          payout: Database["public"]["Enums"]["trade_in_payout"];
          photos: string[];
          product_id: string | null;
          responded_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["trade_in_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          asking_price?: number | null;
          category: Database["public"]["Enums"]["trade_in_category"];
          closed_at?: string | null;
          condition: Database["public"]["Enums"]["trade_in_condition"];
          contact_phone: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          number?: never;
          offer_amount?: number | null;
          offer_note?: string | null;
          offered_at?: string | null;
          payout?: Database["public"]["Enums"]["trade_in_payout"];
          photos?: string[];
          product_id?: string | null;
          responded_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["trade_in_status"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          asking_price?: number | null;
          category?: Database["public"]["Enums"]["trade_in_category"];
          closed_at?: string | null;
          condition?: Database["public"]["Enums"]["trade_in_condition"];
          contact_phone?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          number?: never;
          offer_amount?: number | null;
          offer_note?: string | null;
          offered_at?: string | null;
          payout?: Database["public"]["Enums"]["trade_in_payout"];
          photos?: string[];
          product_id?: string | null;
          responded_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["trade_in_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_ins_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      universities: {
        Row: {
          active: boolean;
          domains: string[];
          id: string;
          name_ar: string;
          name_en: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          domains?: string[];
          id: string;
          name_ar: string;
          name_en: string;
          position?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          domains?: string[];
          id?: string;
          name_ar?: string;
          name_en?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_key: string;
          id: number;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          received_at: string;
          reference_id: string | null;
        };
        Insert: {
          event_key: string;
          id?: never;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          reference_id?: string | null;
        };
        Update: {
          event_key?: string;
          id?: never;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          reference_id?: string | null;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          created_at: string;
          position: number;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          position?: number;
          product_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          position?: number;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      product_ratings: {
        Row: {
          average: number | null;
          count: number | null;
          product_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_guardian: { Args: { invite_code: string }; Returns: string };
      accept_invitation: {
        Args: { invitation_token: string };
        Returns: string;
      };
      account_deletion_blockers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          name: string;
          organization_id: string;
          other_members: number;
          slug: string;
        }[];
      };
      activate_plus_seat: {
        Args: { days?: number; seat: string };
        Returns: string;
      };
      adjust_bulbs: {
        Args: { bulbs: number; member: string; why: string };
        Returns: {
          amount: number;
          available_at: string;
          created_at: string;
          created_by: string | null;
          event_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["bulb_kind"];
          order_id: string | null;
          payment_id: string | null;
          product_id: string | null;
          reason: string | null;
          review_id: string | null;
          status: Database["public"]["Enums"]["bulb_status"];
          trade_in_id: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "bulb_entries";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      affiliate_balances: {
        Args: Record<PropertyKey, never>;
        Returns: {
          affiliate_id: string;
          available: number;
          paid: number;
          pending: number;
        }[];
      };
      apply_affiliate: {
        Args: { channel?: string; pitch: string };
        Returns: {
          channel: string | null;
          code: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          payout_account: string | null;
          payout_method: Database["public"]["Enums"]["affiliate_payout_method"];
          pitch: string;
          staff_note: string | null;
          status: Database["public"]["Enums"]["affiliate_status"];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "affiliates";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      approve_pass_sign_in: {
        Args: {
          client: string;
          code_challenge: string;
          nonce?: string;
          redirect_uri: string;
          scopes: string[];
        };
        Returns: string;
      };
      book_kit: {
        Args: {
          delivery_zone: string;
          extra_days?: number;
          games?: string[];
          kit: string;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          shipping: Json;
          starts_on: string;
        };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      book_swap: {
        Args: {
          method?: string;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          returns: string[];
          wants: string[];
        };
        Returns: {
          area_id: string | null;
          counted: boolean;
          created_at: string;
          done_at: string | null;
          fee: number;
          id: string;
          method: string;
          order_id: string | null;
          scheduled_for: string | null;
          status: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "plus_swaps";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      box_slot_copies: {
        Args: { slot: string };
        Returns: {
          price: number;
          product_id: string;
          stock_item: string;
        }[];
      };
      bulbs_outstanding: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          pending: number;
          value_iqd: number;
        }[];
      };
      cancel_order: { Args: { order_id: string }; Returns: undefined };
      cancel_plus: {
        Args: { keep?: boolean };
        Returns: {
          affiliate_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          next_plan_id: string | null;
          organization_id: string | null;
          paused_until: string | null;
          plan_id: string;
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "subscriptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_procurement_request: {
        Args: { request: string };
        Returns: undefined;
      };
      cancel_rental: { Args: { rental: string }; Returns: undefined };
      cancel_swap: {
        Args: { target: string };
        Returns: {
          area_id: string | null;
          counted: boolean;
          created_at: string;
          done_at: string | null;
          fee: number;
          id: string;
          method: string;
          order_id: string | null;
          scheduled_for: string | null;
          status: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "plus_swaps";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      change_plus_plan: {
        Args: { plan: string };
        Returns: {
          affiliate_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          next_plan_id: string | null;
          organization_id: string | null;
          paused_until: string | null;
          plan_id: string;
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "subscriptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      check_in_rsvp: {
        Args: { event: string; member: string };
        Returns: string;
      };
      check_pass: {
        Args: { scanned: string };
        Returns: {
          full_name: string;
          member_number: number;
          member_since: string;
          user_id: string;
          valid: boolean;
        }[];
      };
      checkout_quote: {
        Args: {
          delivery_zone?: string;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          governorate?: string;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          use_bulbs?: number;
        };
        Returns: Json;
      };
      claim_invite: { Args: { code: string }; Returns: string };
      claim_push_notifications: {
        Args: {
          max_age?: string;
          max_rows?: number;
          notification_ids?: string[];
        };
        Returns: {
          data: Json;
          event: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link: string;
          locale: string;
          user_id: string;
        }[];
      };
      claim_telegram_notifications: {
        Args: {
          max_age?: string;
          max_rows?: number;
          notification_ids?: string[];
        };
        Returns: {
          data: Json;
          event: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          link: string;
          locale: string;
          telegram_id: number;
          user_id: string;
        }[];
      };
      claim_telegram_posts: {
        Args: { max_rows?: number };
        Returns: {
          id: string;
          kind: Database["public"]["Enums"]["telegram_post_kind"];
          ref_id: string;
        }[];
      };
      claim_whatsapp_notifications: {
        Args: {
          max_age?: string;
          max_rows?: number;
          notification_ids?: string[];
        };
        Returns: {
          data: Json;
          event: string;
          first_name: string;
          id: string;
          link: string;
          locale: string;
          phone: string;
          user_id: string;
        }[];
      };
      close_job_request: { Args: { job: string }; Returns: undefined };
      close_support_ticket: { Args: { ticket: string }; Returns: undefined };
      close_survey: {
        Args: { target: string };
        Returns: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        SetofOptions: {
          from: "*";
          to: "surveys";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      collect_kit: {
        Args: { damage?: number; target: string };
        Returns: {
          amount_due: number | null;
          created_at: string;
          damage_charge: number | null;
          deposit: number;
          deposit_waived: boolean;
          ends_on: string;
          extra_days: number;
          id: string;
          kit_type: string;
          order_id: string | null;
          refund_due: number | null;
          starts_on: string;
          status: string;
          unit_id: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "kit_bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_order_payment: {
        Args: { order_id: string };
        Returns: undefined;
      };
      complete_swap: {
        Args: { target: string };
        Returns: {
          area_id: string | null;
          counted: boolean;
          created_at: string;
          done_at: string | null;
          fee: number;
          id: string;
          method: string;
          order_id: string | null;
          scheduled_for: string | null;
          status: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "plus_swaps";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_trade_in: {
        Args: { create_product?: boolean; trade_in: string };
        Returns: string;
      };
      confirm_student_email: {
        Args: { code: string };
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_id: string;
          user_id: string;
          valid_until: string;
          verified_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_badges";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_order: {
        Args: {
          delivery_zone?: string;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          shipping: Json;
          use_bulbs?: number;
        };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "organizations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_rental_order: {
        Args: {
          delivery_zone?: string;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          rental_product: string;
          rental_variant?: string;
          shipping: Json;
        };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_support_ticket: {
        Args: {
          ticket_body: string;
          ticket_order?: string;
          ticket_subject: string;
          ticket_topic?: Database["public"]["Enums"]["ticket_topic"];
        };
        Returns: {
          assigned_to: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          number: number;
          order_id: string | null;
          priority: Database["public"]["Enums"]["ticket_priority"];
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          topic: Database["public"]["Enums"]["ticket_topic"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "support_tickets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_affiliate: {
        Args: {
          code?: string;
          decision: Database["public"]["Enums"]["affiliate_status"];
          member: string;
          note?: string;
        };
        Returns: {
          channel: string | null;
          code: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          payout_account: string | null;
          payout_method: Database["public"]["Enums"]["affiliate_payout_method"];
          pitch: string;
          staff_note: string | null;
          status: Database["public"]["Enums"]["affiliate_status"];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "affiliates";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_candidate: {
        Args: {
          candidate: string;
          decision: Database["public"]["Enums"]["candidate_status"];
          note?: string;
        };
        Returns: undefined;
      };
      decide_guardian_order: {
        Args: { approve: boolean; target: string };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_quote: {
        Args: { accept: boolean; quote: string; reference?: string };
        Returns: string;
      };
      decline_plus_seat: { Args: { seat: string }; Returns: undefined };
      disconnect_pass_partner: { Args: { client: string }; Returns: undefined };
      end_plus_seat: { Args: { seat: string }; Returns: undefined };
      event_rsvp_count: { Args: { event: string }; Returns: number };
      guardian_invite: {
        Args: { invite_code: string };
        Returns: {
          status: string;
          teen_name: string;
        }[];
      };
      hand_over_kit: {
        Args: { target: string };
        Returns: {
          amount_due: number | null;
          created_at: string;
          damage_charge: number | null;
          deposit: number;
          deposit_waived: boolean;
          ends_on: string;
          extra_days: number;
          id: string;
          kit_type: string;
          order_id: string | null;
          refund_due: number | null;
          starts_on: string;
          status: string;
          unit_id: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "kit_bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      import_products: { Args: { items: Json }; Returns: Json };
      invite_guardian: { Args: Record<PropertyKey, never>; Returns: string };
      invite_to_plus: {
        Args: { member: string };
        Returns: {
          area_id: string | null;
          created_at: string;
          governorate: string;
          invite_expires_at: string | null;
          invited_at: string | null;
          plan_id: string | null;
          status: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "plus_waitlist";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      issue_invoice: {
        Args: { days?: number; purchase_order: string };
        Returns: string;
      };
      issue_student_code: {
        Args: { address: string; member: string; university: string };
        Returns: string;
      };
      join_plus_waitlist: {
        Args: { governorate: string; plan: string };
        Returns: number;
      };
      keep_price: { Args: { target: string }; Returns: number };
      keep_rental: {
        Args: {
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          target: string;
        };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      kit_weekends: {
        Args: { kit: string };
        Returns: {
          extra_day_price: number;
          price: number;
          starts_on: string;
          units_free: number;
        }[];
      };
      leave_plus_waitlist: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      ledger_monthly_summary: {
        Args: {
          from_date: string;
          summary_scenario?: Database["public"]["Enums"]["ledger_scenario"];
          to_date: string;
        };
        Returns: {
          cogs: number;
          expenses: number;
          month: string;
          revenue: number;
        }[];
      };
      link_telegram: {
        Args: {
          first_name?: string;
          last_name?: string;
          member: string;
          telegram_id: number;
          username?: string;
        };
        Returns: undefined;
      };
      listed_categories: {
        Args: { for_rent?: boolean };
        Returns: {
          affiliate_rate: number;
          bulb_multiplier: number;
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          position: number;
          slug: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "product_categories";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      mark_cash_collected: {
        Args: { order_id: string };
        Returns: {
          affiliate_id: string | null;
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          max_bulbs: number | null;
          number: number;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["order_payment_method"];
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mark_newsletter_synced: {
        Args: { user_ids: string[] };
        Returns: undefined;
      };
      mark_notifications_read: {
        Args: { notification_ids?: string[] };
        Returns: number;
      };
      mark_overdue_rentals: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      member_bulbs: {
        Args: { member: string };
        Returns: {
          available: number;
          pending: number;
          rate: number;
        }[];
      };
      my_affiliate: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          code: string;
          orders: number;
          paid: number;
          payout_account: string;
          payout_method: Database["public"]["Enums"]["affiliate_payout_method"];
          pending: number;
          plus_members: number;
          status: Database["public"]["Enums"]["affiliate_status"];
        }[];
      };
      my_affiliate_referrer: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          expires_at: string;
          name: string;
          via: string;
        }[];
      };
      my_birthday: { Args: Record<PropertyKey, never>; Returns: string };
      my_bulbs: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          pending: number;
          rate: number;
        }[];
      };
      my_calendar_token: { Args: Record<PropertyKey, never>; Returns: string };
      my_guardian: {
        Args: Record<PropertyKey, never>;
        Returns: {
          allows_plus: boolean;
          code: string;
          guardian_name: string;
          has_birthday: boolean;
          link_id: string;
          minor: boolean;
          status: string;
        }[];
      };
      my_invites: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          invited: number;
          rewarded: number;
          rewarded_this_month: number;
        }[];
      };
      my_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          name: string;
          organization_id: string;
        }[];
      };
      my_pass_secret: {
        Args: Record<PropertyKey, never>;
        Returns: {
          member_number: number;
          secret: string;
        }[];
      };
      my_rental_allowance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          in_use: number;
          slots: number;
          tier: number;
        }[];
      };
      my_student: {
        Args: Record<PropertyKey, never>;
        Returns: {
          method: string;
          pending: string;
          rejected_reason: string;
          university_id: string;
          valid_until: string;
          verified: boolean;
        }[];
      };
      my_survey_credits: { Args: Record<PropertyKey, never>; Returns: number };
      my_swap_terms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          area_id: string;
          extra_fee: number;
          home_swaps: number;
          home_swaps_used: number;
          next_date: string;
        }[];
      };
      my_teens: {
        Args: Record<PropertyKey, never>;
        Returns: {
          allows_plus: boolean;
          link_id: string;
          pending_orders: Json;
          teen_name: string;
        }[];
      };
      my_telegram: {
        Args: Record<PropertyKey, never>;
        Returns: {
          first_name: string;
          username: string;
        }[];
      };
      my_whatsapp_settings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          opt_in: boolean;
          phone: string;
        }[];
      };
      newsletter_audience: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          full_name: string;
          marketing_opt_in: boolean;
          opt_in_changed_at: string;
          suspended: boolean;
          synced_at: string;
          user_id: string;
        }[];
      };
      notify_rentals_due_soon: { Args: { within?: string }; Returns: number };
      open_support_ticket_for: {
        Args: {
          customer: string;
          ticket_body: string;
          ticket_order?: string;
          ticket_subject: string;
          ticket_topic?: Database["public"]["Enums"]["ticket_topic"];
        };
        Returns: {
          assigned_to: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          number: number;
          order_id: string | null;
          priority: Database["public"]["Enums"]["ticket_priority"];
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          topic: Database["public"]["Enums"]["ticket_topic"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "support_tickets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      pack_box: {
        Args: { picks: string[]; target: string };
        Returns: {
          attributes: NonNullable<Json>;
          box_theme_id: string | null;
          condition: Database["public"]["Enums"]["product_condition"] | null;
          id: string;
          kind: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          packed_at: string | null;
          packed_by: string | null;
          product_id: string | null;
          quantity: number;
          rental_id: string | null;
          unit_price: number;
          variant_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "order_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      partner_check: { Args: { org: string; scanned: string }; Returns: Json };
      pass_card: { Args: { member: string }; Returns: Json };
      pass_card_check: {
        Args: { client: string; scanned: string };
        Returns: Json;
      };
      pass_claims: {
        Args: { client: string; member: string; scopes: string[] };
        Returns: Json;
      };
      pause_plus: {
        Args: { days: number };
        Returns: {
          affiliate_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          next_plan_id: string | null;
          organization_id: string | null;
          paused_until: string | null;
          plan_id: string;
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "subscriptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      pending_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          expires_at: string;
          organization_id: string;
          organization_name: string;
          role: Database["public"]["Enums"]["org_role"];
          token: string;
        }[];
      };
      perk_stats: {
        Args: { org: string };
        Returns: {
          month: string;
          people: number;
          perk_id: string;
          uses: number;
        }[];
      };
      plus_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          can_join: boolean;
          capacity: number;
          invite_expires_at: string;
          join_reason: string;
          places_free: number;
          waiting: number;
          waitlist_governorate: string;
          waitlist_position: number;
          waitlist_status: string;
        }[];
      };
      post_journal_entry: {
        Args: {
          currency?: string;
          description: string;
          entry_date: string;
          exchange_rate?: number;
          lines: Json;
          reference?: string;
          scenario?: Database["public"]["Enums"]["ledger_scenario"];
        };
        Returns: string;
      };
      price_check: {
        Args: { max_rows?: number };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          cost: number;
          floor_amount: number;
          margin: number;
          name_ar: string;
          name_en: string;
          price: number;
          problem: string;
          product_id: string;
          product_slug: string;
          stock_item_id: string;
          variant_label: string;
        }[];
      };
      product_offers: {
        Args: { offer_product: string };
        Returns: {
          available: number;
          condition: Database["public"]["Enums"]["product_condition"];
          price: number;
          purpose: Database["public"]["Enums"]["stock_purpose"];
          variant_id: string;
        }[];
      };
      product_review_list: {
        Args: { max_rows?: number; review_product: string; skip?: number };
        Returns: {
          author_name: string;
          comment: string;
          created_at: string;
          id: string;
          photos: string[];
          rating: number;
          verified_purchase: boolean;
        }[];
      };
      publish_survey: {
        Args: { target: string };
        Returns: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        SetofOptions: {
          from: "*";
          to: "surveys";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      queue_due_telegram_posts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      record_affiliate_payout: {
        Args: { affiliate: string; reference?: string };
        Returns: {
          account: string | null;
          affiliate_id: string;
          amount: number;
          bulbs: number | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["affiliate_payout_method"];
          paid_by: string | null;
          reference: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "affiliate_payouts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      redeem_perk: {
        Args: { perk: string; scanned: string };
        Returns: {
          created_at: string;
          id: string;
          perk_id: string;
          redeemed_by: string | null;
          redeemed_on: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "perk_redemptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      referral_kind: { Args: { code: string }; Returns: string };
      register_push_device: {
        Args: { device_platform: string; device_token: string };
        Returns: string;
      };
      rental_quote: {
        Args: { product: string; variant?: string };
        Returns: {
          days: number;
          deposit: number;
          late_fee: number;
          price: number;
        }[];
      };
      reorder_saved: { Args: { products: string[] }; Returns: undefined };
      report_survey: {
        Args: { reason: string; target: string };
        Returns: undefined;
      };
      request_plus_seat: {
        Args: { member: string; org: string; plan: string };
        Returns: string;
      };
      request_rental: {
        Args: { rental_product: string; rental_variant?: string };
        Returns: {
          amount_due: number | null;
          damage_charge: number | null;
          days: number | null;
          deposit: number;
          due_at: string | null;
          due_reminder_at: string | null;
          id: string;
          kind: string;
          late_charge: number | null;
          late_fee: number;
          name_ar: string;
          name_en: string;
          order_id: string | null;
          product_id: string | null;
          refund_due: number | null;
          requested_at: string;
          return_swap_id: string | null;
          returned_at: string | null;
          settled_at: string | null;
          staff_note: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["rental_status"];
          swap_id: string | null;
          updated_at: string;
          user_id: string | null;
          variant_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "rentals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_student_review: {
        Args: { photo: string; university: string };
        Returns: {
          attempts: number;
          card_path: string | null;
          code_expires_at: string | null;
          code_hash: string | null;
          created_at: string;
          email: string | null;
          id: string;
          method: string;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          university_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      respond_to_trade_in_offer: {
        Args: { accept: boolean; trade_in: string };
        Returns: Database["public"]["Enums"]["trade_in_status"];
      };
      resume_plus: {
        Args: Record<PropertyKey, never>;
        Returns: {
          affiliate_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          next_plan_id: string | null;
          organization_id: string | null;
          paused_until: string | null;
          plan_id: string;
          provider: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "subscriptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_queue: {
        Args: Record<PropertyKey, never>;
        Returns: {
          assigned_to: string;
          author_id: string;
          author_name: string;
          id: string;
          status: Database["public"]["Enums"]["submission_status"];
          submitted_at: string;
          title: string;
          type: Database["public"]["Enums"]["submission_type"];
        }[];
      };
      review_student_card: {
        Args: {
          approve: boolean;
          reason?: string;
          target: string;
          until?: string;
        };
        Returns: string;
      };
      review_survey: {
        Args: { approve: boolean; note?: string; target: string };
        Returns: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        SetofOptions: {
          from: "*";
          to: "surveys";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_guardian: { Args: { link: string }; Returns: undefined };
      rotate_calendar_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      run_birthday_bulbs: { Args: Record<PropertyKey, never>; Returns: number };
      run_bulb_expiry: {
        Args: Record<PropertyKey, never>;
        Returns: Record<string, unknown>;
      };
      run_kit_holds: { Args: Record<PropertyKey, never>; Returns: number };
      run_plus_seat_renewals: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      run_plus_waitlist: { Args: Record<PropertyKey, never>; Returns: number };
      run_student_expiry: { Args: Record<PropertyKey, never>; Returns: number };
      save_survey: {
        Args: { body: Json };
        Returns: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        SetofOptions: {
          from: "*";
          to: "surveys";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_products: {
        Args: {
          search_category?: string;
          search_kind?: Database["public"]["Enums"]["product_kind"];
          search_term: string;
        };
        Returns: {
          age_rating: number | null;
          bulb_multiplier: number | null;
          category_id: string | null;
          compare_at_price: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          currency: string;
          description_ar: string | null;
          description_en: string | null;
          details: NonNullable<Json>;
          featured: boolean;
          id: string;
          images: string[];
          kind: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          price: number;
          rentable: boolean;
          rental_stock: number;
          rental_tier: number | null;
          seller: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_count: number;
          updated_at: string;
          variant_text: string;
          verified: boolean;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      send_quote: { Args: { quote: string }; Returns: undefined };
      set_affiliate_payout: {
        Args: {
          account?: string;
          method: Database["public"]["Enums"]["affiliate_payout_method"];
        };
        Returns: undefined;
      };
      set_affiliate_rates: { Args: { rates: Json }; Returns: undefined };
      set_guardian_plus: {
        Args: { allow: boolean; link: string };
        Returns: undefined;
      };
      set_invoice_status: {
        Args: {
          invoice: string;
          new_status: Database["public"]["Enums"]["invoice_status"];
        };
        Returns: undefined;
      };
      set_money_rules: {
        Args: { multipliers?: Json; rules: Json };
        Returns: undefined;
      };
      set_plus_home: {
        Args: { address: string; area: string; phone: string };
        Returns: {
          address: string;
          area_id: string;
          phone: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "plus_homes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_plus_settings: {
        Args: { capacity: number; invite_hours: number; swap_fee: number };
        Returns: undefined;
      };
      set_purchase_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["purchase_order_status"];
          purchase_order: string;
        };
        Returns: undefined;
      };
      set_rental_deposit_rate: { Args: { rate: number }; Returns: undefined };
      set_staff_role: {
        Args: {
          new_role: Database["public"]["Enums"]["staff_role"];
          staff_title?: string;
          target: string;
        };
        Returns: undefined;
      };
      set_student_profile: {
        Args: { governorate: string; major: string; study_year: number };
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_id: string;
          user_id: string;
          valid_until: string;
          verified_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_badges";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      settle_rental: {
        Args: { damage?: number; target: string };
        Returns: {
          amount_due: number | null;
          damage_charge: number | null;
          days: number | null;
          deposit: number;
          due_at: string | null;
          due_reminder_at: string | null;
          id: string;
          kind: string;
          late_charge: number | null;
          late_fee: number;
          name_ar: string;
          name_en: string;
          order_id: string | null;
          product_id: string | null;
          refund_due: number | null;
          requested_at: string;
          return_swap_id: string | null;
          returned_at: string | null;
          settled_at: string | null;
          staff_note: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["rental_status"];
          swap_id: string | null;
          updated_at: string;
          user_id: string | null;
          variant_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "rentals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_survey: {
        Args: { target: string };
        Returns: {
          counted: boolean | null;
          id: string;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_survey: {
        Args: { answers: Json; target: string };
        Returns: {
          counted: boolean | null;
          id: string;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      survey_results: {
        Args: { target: string };
        Returns: {
          answers: Json;
          counted: boolean;
          response_id: string;
          submitted_at: string;
        }[];
      };
      surveys_for_me: {
        Args: Record<PropertyKey, never>;
        Returns: {
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          description: string;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          kind: string;
          language: string;
          majors: string[];
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          status: string;
          students_only: boolean;
          title: string;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        }[];
        SetofOptions: {
          from: "*";
          to: "surveys";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      telegram_join_check: {
        Args: { chat: number; member: number };
        Returns: {
          allowed: boolean;
          linked: boolean;
          rule: string;
        }[];
      };
      touch_affiliate: {
        Args: { affiliate_code: string; via?: string };
        Returns: {
          code: string;
          name: string;
        }[];
      };
      unlink_telegram: { Args: Record<PropertyKey, never>; Returns: undefined };
      waive_kit_deposit: {
        Args: { target: string };
        Returns: {
          amount_due: number | null;
          created_at: string;
          damage_charge: number | null;
          deposit: number;
          deposit_waived: boolean;
          ends_on: string;
          extra_days: number;
          id: string;
          kit_type: string;
          order_id: string | null;
          refund_due: number | null;
          starts_on: string;
          status: string;
          unit_id: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "kit_bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      withdraw_trade_in: { Args: { trade_in: string }; Returns: undefined };
    };
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
      affiliate_commission_kind: "order" | "plus" | "clawback";
      affiliate_commission_status: "pending" | "void" | "paid";
      affiliate_payout_method: "zaincash" | "fib" | "qi" | "bank" | "bulbs";
      affiliate_status: "applied" | "approved" | "rejected" | "suspended";
      billing_interval: "month" | "year";
      bulb_kind:
        | "purchase"
        | "bonus"
        | "trade_in"
        | "redemption"
        | "adjustment"
        | "expiry";
      bulb_status: "pending" | "available" | "void";
      candidate_status:
        | "proposed"
        | "shortlisted"
        | "rejected"
        | "hired"
        | "withdrawn";
      crm_status: "lead" | "customer" | "vip" | "churned";
      employment_type: "full_time" | "part_time" | "contract" | "internship";
      invoice_status: "issued" | "paid" | "void";
      job_status: "open" | "filled" | "closed";
      ledger_scenario: "actual" | "forecast" | "budget";
      notification_kind:
        | "order"
        | "rental"
        | "support"
        | "plus"
        | "promo"
        | "system"
        | "trade_in";
      order_fulfilment: "delivery" | "pickup";
      order_payment_method: "online" | "cash_on_delivery";
      order_status:
        | "pending"
        | "confirmed"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";
      org_role: "owner" | "admin" | "member";
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "canceled"
        | "expired"
        | "refunded";
      plus_seat_status: "requested" | "active" | "ended" | "declined";
      post_section: "news" | "stories" | "members" | "learn";
      procurement_status:
        | "submitted"
        | "quoted"
        | "ordered"
        | "delivered"
        | "cancelled";
      product_condition: "new" | "used" | "refurbished" | "open_box";
      product_kind: "sale" | "rental";
      product_status: "draft" | "active" | "archived";
      purchase_order_status: "open" | "delivered" | "cancelled";
      quote_status: "draft" | "sent" | "accepted" | "declined" | "withdrawn";
      referral_status: "pending" | "rewarded" | "void";
      rental_status:
        | "requested"
        | "active"
        | "returned"
        | "overdue"
        | "cancelled"
        | "kept";
      review_status: "published" | "hidden";
      staff_role:
        | "superadmin"
        | "admin"
        | "editor"
        | "finance"
        | "marketing"
        | "support";
      stock_purpose: "sale" | "rental" | "business";
      stock_status:
        | "available"
        | "reserved"
        | "sold"
        | "rented"
        | "repair"
        | "retired";
      submission_status:
        | "pending"
        | "under_review"
        | "revisions_requested"
        | "accepted"
        | "rejected"
        | "withdrawn";
      submission_type:
        | "essay"
        | "poetry"
        | "fiction"
        | "theatre"
        | "visual_art"
        | "other";
      subscription_status:
        | "incomplete"
        | "active"
        | "past_due"
        | "canceled"
        | "expired";
      telegram_post_kind: "news" | "events" | "arrivals";
      telegram_request_status: "open" | "resolved" | "rejected";
      telegram_request_type: "unban" | "support";
      ticket_priority: "low" | "normal" | "high" | "urgent";
      ticket_status: "open" | "pending" | "resolved" | "closed";
      ticket_topic: "order" | "rental" | "plus" | "account" | "other";
      trade_in_category:
        | "vinyl"
        | "cd_cassette"
        | "game"
        | "book"
        | "console_tech"
        | "other";
      trade_in_condition: "sealed" | "like_new" | "good" | "fair" | "poor";
      trade_in_payout: "cash" | "store_credit";
      trade_in_status:
        | "submitted"
        | "reviewing"
        | "offer_made"
        | "accepted"
        | "declined"
        | "completed"
        | "rejected"
        | "withdrawn";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      affiliate_commission_kind: ["order", "plus", "clawback"],
      affiliate_commission_status: ["pending", "void", "paid"],
      affiliate_payout_method: ["zaincash", "fib", "qi", "bank", "bulbs"],
      affiliate_status: ["applied", "approved", "rejected", "suspended"],
      billing_interval: ["month", "year"],
      bulb_kind: [
        "purchase",
        "bonus",
        "trade_in",
        "redemption",
        "adjustment",
        "expiry",
      ],
      bulb_status: ["pending", "available", "void"],
      candidate_status: [
        "proposed",
        "shortlisted",
        "rejected",
        "hired",
        "withdrawn",
      ],
      crm_status: ["lead", "customer", "vip", "churned"],
      employment_type: ["full_time", "part_time", "contract", "internship"],
      invoice_status: ["issued", "paid", "void"],
      job_status: ["open", "filled", "closed"],
      ledger_scenario: ["actual", "forecast", "budget"],
      notification_kind: [
        "order",
        "rental",
        "support",
        "plus",
        "promo",
        "system",
        "trade_in",
      ],
      order_fulfilment: ["delivery", "pickup"],
      order_payment_method: ["online", "cash_on_delivery"],
      order_status: [
        "pending",
        "confirmed",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      org_role: ["owner", "admin", "member"],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "canceled",
        "expired",
        "refunded",
      ],
      plus_seat_status: ["requested", "active", "ended", "declined"],
      post_section: ["news", "stories", "members", "learn"],
      procurement_status: [
        "submitted",
        "quoted",
        "ordered",
        "delivered",
        "cancelled",
      ],
      product_condition: ["new", "used", "refurbished", "open_box"],
      product_kind: ["sale", "rental"],
      product_status: ["draft", "active", "archived"],
      purchase_order_status: ["open", "delivered", "cancelled"],
      quote_status: ["draft", "sent", "accepted", "declined", "withdrawn"],
      referral_status: ["pending", "rewarded", "void"],
      rental_status: [
        "requested",
        "active",
        "returned",
        "overdue",
        "cancelled",
        "kept",
      ],
      review_status: ["published", "hidden"],
      staff_role: [
        "superadmin",
        "admin",
        "editor",
        "finance",
        "marketing",
        "support",
      ],
      stock_purpose: ["sale", "rental", "business"],
      stock_status: [
        "available",
        "reserved",
        "sold",
        "rented",
        "repair",
        "retired",
      ],
      submission_status: [
        "pending",
        "under_review",
        "revisions_requested",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      submission_type: [
        "essay",
        "poetry",
        "fiction",
        "theatre",
        "visual_art",
        "other",
      ],
      subscription_status: [
        "incomplete",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      telegram_post_kind: ["news", "events", "arrivals"],
      telegram_request_status: ["open", "resolved", "rejected"],
      telegram_request_type: ["unban", "support"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "pending", "resolved", "closed"],
      ticket_topic: ["order", "rental", "plus", "account", "other"],
      trade_in_category: [
        "vinyl",
        "cd_cassette",
        "game",
        "book",
        "console_tech",
        "other",
      ],
      trade_in_condition: ["sealed", "like_new", "good", "fair", "poor"],
      trade_in_payout: ["cash", "store_credit"],
      trade_in_status: [
        "submitted",
        "reviewing",
        "offer_made",
        "accepted",
        "declined",
        "completed",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const;

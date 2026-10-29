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
      academic_terms: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          starts_on?: string;
          updated_at?: string;
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
      banned_terms: {
        Row: {
          created_at: string;
          term: string;
        };
        Insert: {
          created_at?: string;
          term: string;
        };
        Update: {
          created_at?: string;
          term?: string;
        };
        Relationships: [];
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
        ];
      };
      bundle_items: {
        Row: {
          bundle_id: string;
          id: string;
          position: number;
          quantity: number;
          variant_id: string;
        };
        Insert: {
          bundle_id: string;
          id?: string;
          position?: number;
          quantity?: number;
          variant_id: string;
        };
        Update: {
          bundle_id?: string;
          id?: string;
          position?: number;
          quantity?: number;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_entries: {
        Row: {
          campaign_id: string;
          created_at: string;
          discount_rate: number;
          seller_id: string;
          updated_at: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          discount_rate: number;
          seller_id: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          discount_rate?: number;
          seller_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_entries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_entries_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          created_at: string;
          created_by: string | null;
          description_ar: string | null;
          description_en: string | null;
          ends_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          published: boolean;
          slug: string;
          starts_at: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at: string;
          id?: string;
          name_ar: string;
          name_en: string;
          published?: boolean;
          slug: string;
          starts_at: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          published?: boolean;
          slug?: string;
          starts_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_coupons: {
        Row: {
          applied_at: string;
          coupon_id: string;
          user_id: string;
        };
        Insert: {
          applied_at?: string;
          coupon_id: string;
          user_id: string;
        };
        Update: {
          applied_at?: string;
          coupon_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_coupons_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"] | null;
          created_at: string;
          id: string;
          product_id: string;
          purpose: string;
          quantity: number;
          seller_id: string;
          updated_at: string;
          user_id: string;
          variant_id: string;
        };
        Insert: {
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          created_at?: string;
          id?: string;
          product_id: string;
          purpose?: string;
          quantity?: number;
          seller_id?: string;
          updated_at?: string;
          user_id?: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          purpose?: string;
          quantity?: number;
          seller_id?: string;
          updated_at?: string;
          user_id?: string;
          variant_id?: string;
        };
        Relationships: [
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
          {
            foreignKeyName: "cart_items_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_kits: {
        Row: {
          created_at: string;
          extra_days: number;
          games: string[];
          id: string;
          kit_type: string;
          starts_on: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          extra_days?: number;
          games?: string[];
          id?: string;
          kit_type: string;
          starts_on: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          extra_days?: number;
          games?: string[];
          id?: string;
          kit_type?: string;
          starts_on?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_kits_kit_type_fkey";
            columns: ["kit_type"];
            isOneToOne: false;
            referencedRelation: "kit_types";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_plus_gifts: {
        Row: {
          created_at: string;
          months: number;
          plan_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          months: number;
          plan_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          months?: number;
          plan_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_plus_gifts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
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
      commission_rates: {
        Row: {
          category_id: string;
          pro_rate: number;
          standard_rate: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          pro_rate: number;
          standard_rate: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          pro_rate?: number;
          standard_rate?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commission_rates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: true;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          amount: number;
          code: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["coupon_kind"];
          max_discount: number | null;
          max_uses: number | null;
          min_subtotal: number;
          starts_at: string;
          updated_at: string;
          uses_per_member: number;
        };
        Insert: {
          active?: boolean;
          amount: number;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["coupon_kind"];
          max_discount?: number | null;
          max_uses?: number | null;
          min_subtotal?: number;
          starts_at?: string;
          updated_at?: string;
          uses_per_member?: number;
        };
        Update: {
          active?: boolean;
          amount?: number;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["coupon_kind"];
          max_discount?: number | null;
          max_uses?: number | null;
          min_subtotal?: number;
          starts_at?: string;
          updated_at?: string;
          uses_per_member?: number;
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
          blaze: boolean;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          blaze?: boolean;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          event_id: string;
          user_id?: string;
        };
        Update: {
          blaze?: boolean;
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
          blaze_seats: number;
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
          rsvp_opens_at: string | null;
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          blaze_seats?: number;
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
          rsvp_opens_at?: string | null;
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          blaze_seats?: number;
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
          rsvp_opens_at?: string | null;
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
      gifts: {
        Row: {
          claimed_at: string | null;
          created_at: string;
          hide_price: boolean;
          message: string | null;
          order_id: string;
          recipient_id: string | null;
          sender_id: string | null;
          token_hash: string | null;
        };
        Insert: {
          claimed_at?: string | null;
          created_at?: string;
          hide_price?: boolean;
          message?: string | null;
          order_id: string;
          recipient_id?: string | null;
          sender_id?: string | null;
          token_hash?: string | null;
        };
        Update: {
          claimed_at?: string | null;
          created_at?: string;
          hide_price?: boolean;
          message?: string | null;
          order_id?: string;
          recipient_id?: string | null;
          sender_id?: string | null;
          token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gifts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
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
      listing_sales: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          sale_price: number;
          seller_id: string;
          starts_at: string;
          variant_id: string;
        };
        Insert: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          sale_price: number;
          seller_id: string;
          starts_at: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          sale_price?: number;
          seller_id?: string;
          starts_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_sales_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_sales_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      offer_settings: {
        Row: {
          accept_offers: boolean;
          auto_accept_at: number | null;
          auto_decline_below: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          accept_offers?: boolean;
          auto_accept_at?: number | null;
          auto_decline_below?: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          seller_id: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          accept_offers?: boolean;
          auto_accept_at?: number | null;
          auto_decline_below?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          seller_id?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offer_settings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offer_settings_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          accepted_at: string | null;
          amount: number;
          answered_by: string | null;
          buyer_amount: number;
          buyer_counter: number | null;
          buyer_id: string;
          cart_until: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          expires_at: string;
          id: string;
          list_price: number;
          number: number;
          order_item_id: string | null;
          product_id: string;
          seller_counter: number | null;
          seller_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          amount: number;
          answered_by?: string | null;
          buyer_amount: number;
          buyer_counter?: number | null;
          buyer_id: string;
          cart_until?: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          expires_at?: string;
          id?: string;
          list_price: number;
          number?: never;
          order_item_id?: string | null;
          product_id: string;
          seller_counter?: number | null;
          seller_id: string;
          status?: Database["public"]["Enums"]["offer_status"];
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          accepted_at?: string | null;
          amount?: number;
          answered_by?: string | null;
          buyer_amount?: number;
          buyer_counter?: number | null;
          buyer_id?: string;
          cart_until?: string | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          expires_at?: string;
          id?: string;
          list_price?: number;
          number?: never;
          order_item_id?: string | null;
          product_id?: string;
          seller_counter?: number | null;
          seller_id?: string;
          status?: Database["public"]["Enums"]["offer_status"];
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          attributes: NonNullable<Json>;
          commission: number | null;
          commission_rate: number | null;
          condition: Database["public"]["Enums"]["product_condition"] | null;
          id: string;
          kind: string;
          location_id: string | null;
          name_ar: string;
          name_en: string;
          order_id: string;
          packed_at: string | null;
          packed_by: string | null;
          product_id: string | null;
          quantity: number;
          ready_at: string | null;
          ready_by: string | null;
          refunded_at: string | null;
          rental_id: string | null;
          seller_id: string | null;
          seller_name: string | null;
          seller_payout: number | null;
          seller_status:
            | Database["public"]["Enums"]["seller_line_status"]
            | null;
          shipment_id: string | null;
          unit_price: number;
          variant_id: string | null;
        };
        Insert: {
          attributes?: NonNullable<Json>;
          commission?: number | null;
          commission_rate?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          id?: string;
          kind?: string;
          location_id?: string | null;
          name_ar: string;
          name_en: string;
          order_id: string;
          packed_at?: string | null;
          packed_by?: string | null;
          product_id?: string | null;
          quantity: number;
          ready_at?: string | null;
          ready_by?: string | null;
          refunded_at?: string | null;
          rental_id?: string | null;
          seller_id?: string | null;
          seller_name?: string | null;
          seller_payout?: number | null;
          seller_status?:
            | Database["public"]["Enums"]["seller_line_status"]
            | null;
          shipment_id?: string | null;
          unit_price: number;
          variant_id?: string | null;
        };
        Update: {
          attributes?: NonNullable<Json>;
          commission?: number | null;
          commission_rate?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"] | null;
          id?: string;
          kind?: string;
          location_id?: string | null;
          name_ar?: string;
          name_en?: string;
          order_id?: string;
          packed_at?: string | null;
          packed_by?: string | null;
          product_id?: string | null;
          quantity?: number;
          ready_at?: string | null;
          ready_by?: string | null;
          refunded_at?: string | null;
          rental_id?: string | null;
          seller_id?: string | null;
          seller_name?: string | null;
          seller_payout?: number | null;
          seller_status?:
            | Database["public"]["Enums"]["seller_line_status"]
            | null;
          shipment_id?: string | null;
          unit_price?: number;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "seller_locations";
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
            foreignKeyName: "order_items_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
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
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
          bulbs_discount?: number;
          bulbs_used?: number;
          cash_collected_by?: string | null;
          confirmation_emailed_at?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          currency?: string;
          delivery_zone_id?: string | null;
          discount?: number;
          discount_source?: string | null;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status?: string | null;
          id?: string;
          is_gift?: boolean;
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
          bulbs_discount?: number;
          bulbs_used?: number;
          cash_collected_by?: string | null;
          confirmation_emailed_at?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          currency?: string;
          delivery_zone_id?: string | null;
          discount?: number;
          discount_source?: string | null;
          fulfilment?: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status?: string | null;
          id?: string;
          is_gift?: boolean;
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
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
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
      organization_members: {
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
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          features: string[];
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          features?: string[];
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          features?: string[];
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_webhook_events: {
        Row: {
          attempts: number;
          claimed_until: string | null;
          client_id: string;
          created_at: string;
          delivered_at: string | null;
          id: string;
          last_error: string | null;
          next_attempt_at: string;
          payload: NonNullable<Json>;
          type: string;
        };
        Insert: {
          attempts?: number;
          claimed_until?: string | null;
          client_id: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload: NonNullable<Json>;
          type: string;
        };
        Update: {
          attempts?: number;
          claimed_until?: string | null;
          client_id?: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload?: NonNullable<Json>;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_webhook_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
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
      pass_card_embeds: {
        Row: {
          client_id: string;
          created_at: string;
          expires_at: string;
          last_shown_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          expires_at?: string;
          last_shown_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          expires_at?: string;
          last_shown_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_card_embeds_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
        ];
      };
      pass_client_assertions: {
        Row: {
          client_id: string;
          expires_at: string;
          jti: string;
        };
        Insert: {
          client_id: string;
          expires_at: string;
          jti: string;
        };
        Update: {
          client_id?: string;
          expires_at?: string;
          jti?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_client_assertions_client_id_fkey";
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
      pass_partner_domains: {
        Row: {
          checked_at: string | null;
          created_at: string;
          created_by: string | null;
          domain: string;
          id: string;
          organization_id: string;
          token: string;
          verified_at: string | null;
        };
        Insert: {
          checked_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          domain: string;
          id?: string;
          organization_id: string;
          token?: string;
          verified_at?: string | null;
        };
        Update: {
          checked_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          domain?: string;
          id?: string;
          organization_id?: string;
          token?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pass_partner_domains_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pass_partners: {
        Row: {
          active: boolean;
          answers: string[];
          approved_answers: string[];
          client_id: string;
          created_at: string;
          created_by: string | null;
          enabled: boolean;
          mode: string;
          name: string;
          organization_id: string | null;
          previous_secret_hash: string | null;
          previous_secret_until: string | null;
          public_jwks: Json | null;
          redirect_uris: string[];
          requested_answers: string[];
          review_note: string | null;
          review_status: string | null;
          reviewed_at: string | null;
          secret_hash: string;
          suspended_at: string | null;
          updated_at: string;
          webhook_url: string | null;
          website: string;
        };
        Insert: {
          active?: boolean;
          answers?: string[];
          approved_answers?: string[];
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          mode?: string;
          name: string;
          organization_id?: string | null;
          previous_secret_hash?: string | null;
          previous_secret_until?: string | null;
          public_jwks?: Json | null;
          redirect_uris: string[];
          requested_answers?: string[];
          review_note?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          secret_hash: string;
          suspended_at?: string | null;
          updated_at?: string;
          webhook_url?: string | null;
          website: string;
        };
        Update: {
          active?: boolean;
          answers?: string[];
          approved_answers?: string[];
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          mode?: string;
          name?: string;
          organization_id?: string | null;
          previous_secret_hash?: string | null;
          previous_secret_until?: string | null;
          public_jwks?: Json | null;
          redirect_uris?: string[];
          requested_answers?: string[];
          review_note?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          secret_hash?: string;
          suspended_at?: string | null;
          updated_at?: string;
          webhook_url?: string | null;
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
      pass_refresh_tokens: {
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
          expires_at?: string;
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
            foreignKeyName: "pass_refresh_tokens_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
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
      payout_lines: {
        Row: {
          amount: number;
          covers_until: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["payout_line_kind"];
          order_item_id: string | null;
          payout_id: string;
          return_id: string | null;
        };
        Insert: {
          amount: number;
          covers_until?: string | null;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["payout_line_kind"];
          order_item_id?: string | null;
          payout_id: string;
          return_id?: string | null;
        };
        Update: {
          amount?: number;
          covers_until?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["payout_line_kind"];
          order_item_id?: string | null;
          payout_id?: string;
          return_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_lines_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_lines_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "payouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_lines_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          number: number;
          paid_at: string | null;
          paid_by: string | null;
          period_end: string;
          prepared_by: string | null;
          reference: string | null;
          seller_id: string;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          number?: never;
          paid_at?: string | null;
          paid_by?: string | null;
          period_end: string;
          prepared_by?: string | null;
          reference?: string | null;
          seller_id: string;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          number?: never;
          paid_at?: string | null;
          paid_by?: string | null;
          period_end?: string;
          prepared_by?: string | null;
          reference?: string | null;
          seller_id?: string;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
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
      plus_gift_months: {
        Row: {
          created_at: string;
          months: number;
          order_id: string;
          plan_id: string;
          used: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          months: number;
          order_id: string;
          plan_id: string;
          used?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          months?: number;
          order_id?: string;
          plan_id?: string;
          used?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plus_gift_months_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_gift_months_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
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
      plus_prices: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          id: string;
          price: number;
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          price: number;
          seller_id: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          price?: number;
          seller_id?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plus_prices_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plus_prices_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
          topics: Database["public"]["Enums"]["post_topic"][];
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
          topics?: Database["public"]["Enums"]["post_topic"][];
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
          topics?: Database["public"]["Enums"]["post_topic"][];
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
      price_history: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"];
          ended_at: string | null;
          id: string;
          price: number;
          seller_id: string;
          started_at: string;
          variant_id: string;
        };
        Insert: {
          condition: Database["public"]["Enums"]["product_condition"];
          ended_at?: string | null;
          id?: string;
          price: number;
          seller_id: string;
          started_at?: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"];
          ended_at?: string | null;
          id?: string;
          price?: number;
          seller_id?: string;
          started_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_history_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_history_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          parent_id: string | null;
          position: number;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en: string;
          parent_id?: string | null;
          position?: number;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          parent_id?: string | null;
          position?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_checks: {
        Row: {
          created_at: string;
          id: string;
          other_product_id: string | null;
          product_id: string;
          reason: Database["public"]["Enums"]["product_check_reason"];
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          other_product_id?: string | null;
          product_id: string;
          reason: Database["public"]["Enums"]["product_check_reason"];
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          other_product_id?: string | null;
          product_id?: string;
          reason?: Database["public"]["Enums"]["product_check_reason"];
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_checks_other_product_id_fkey";
            columns: ["other_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_checks_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_flags: {
        Row: {
          created_at: string;
          flagged_by: string | null;
          id: string;
          note: string;
          product_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          seller_id: string;
        };
        Insert: {
          created_at?: string;
          flagged_by?: string | null;
          id?: string;
          note: string;
          product_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          seller_id: string;
        };
        Update: {
          created_at?: string;
          flagged_by?: string | null;
          id?: string;
          note?: string;
          product_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          seller_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_flags_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_flags_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
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
          category_id: string | null;
          compare_at_price: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by_seller: string | null;
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
          release_date: string | null;
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
          category_id?: string | null;
          compare_at_price?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by_seller?: string | null;
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
          release_date?: string | null;
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
          category_id?: string | null;
          compare_at_price?: number | null;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by_seller?: string | null;
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
          release_date?: string | null;
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
          {
            foreignKeyName: "products_created_by_seller_fkey";
            columns: ["created_by_seller"];
            isOneToOne: false;
            referencedRelation: "sellers";
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
          checkout_payment:
            | Database["public"]["Enums"]["order_payment_method"]
            | null;
          created_at: string;
          full_name: string | null;
          id: string;
          invite_code: string;
          locale: string;
          marketing_opt_in: boolean;
          member_number: number;
          student_only: boolean;
          updated_at: string;
          whatsapp_opt_in: boolean;
          whatsapp_phone: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          banned_at?: string | null;
          birthday?: string | null;
          calendar_token?: string;
          checkout_payment?:
            | Database["public"]["Enums"]["order_payment_method"]
            | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          invite_code?: string;
          locale?: string;
          marketing_opt_in?: boolean;
          member_number?: never;
          student_only?: boolean;
          updated_at?: string;
          whatsapp_opt_in?: boolean;
          whatsapp_phone?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          banned_at?: string | null;
          birthday?: string | null;
          calendar_token?: string;
          checkout_payment?:
            | Database["public"]["Enums"]["order_payment_method"]
            | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          invite_code?: string;
          locale?: string;
          marketing_opt_in?: boolean;
          member_number?: never;
          student_only?: boolean;
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
      quantity_deals: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          discount_rate: number;
          id: string;
          min_quantity: number;
          seller_id: string;
          variant_id: string;
        };
        Insert: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          discount_rate: number;
          id?: string;
          min_quantity: number;
          seller_id: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          discount_rate?: number;
          id?: string;
          min_quantity?: number;
          seller_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quantity_deals_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quantity_deals_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
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
      rental_queue_items: {
        Row: {
          created_at: string;
          position: number;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          position: number;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          position?: number;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rental_queue_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      rental_rates: {
        Row: {
          category_id: string;
          days: number;
          late_fee: number;
          per_term: boolean;
          price: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          days: number;
          late_fee: number;
          per_term?: boolean;
          price: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          days?: number;
          late_fee?: number;
          per_term?: boolean;
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
      returns: {
        Row: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          check_by?: string | null;
          collection_fee?: number | null;
          condition_note?: string | null;
          condition_ok?: boolean | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          delivery_refund?: number;
          details?: string | null;
          disputed_at?: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id?: string;
          needs_collection?: boolean;
          number?: never;
          order_id: string;
          order_item_id: string;
          photos?: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at?: string | null;
          refund_amount?: number | null;
          refund_bulbs?: number | null;
          refund_claimed_at?: string | null;
          refund_due_at?: string | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
          respond_by?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          seller_id: string;
          shop_note?: string | null;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          unopened?: boolean;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          check_by?: string | null;
          collection_fee?: number | null;
          condition_note?: string | null;
          condition_ok?: boolean | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          delivery_refund?: number;
          details?: string | null;
          disputed_at?: string | null;
          fault?: Database["public"]["Enums"]["return_fault"];
          id?: string;
          needs_collection?: boolean;
          number?: never;
          order_id?: string;
          order_item_id?: string;
          photos?: string[];
          quantity?: number;
          reason?: Database["public"]["Enums"]["return_reason"];
          received_at?: string | null;
          refund_amount?: number | null;
          refund_bulbs?: number | null;
          refund_claimed_at?: string | null;
          refund_due_at?: string | null;
          refund_reference?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
          respond_by?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          seller_id?: string;
          shop_note?: string | null;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["return_status"];
          unopened?: boolean;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_lists: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          share_token: string;
          shared: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          share_token?: string;
          shared?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          share_token?: string;
          shared?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      seller_details: {
        Row: {
          deposit_held: number;
          deposit_required: number;
          documents: string[];
          payout_account_name: string | null;
          payout_bank: string | null;
          payout_iban: string | null;
          review_note: string | null;
          seller_id: string;
          updated_at: string;
        };
        Insert: {
          deposit_held?: number;
          deposit_required?: number;
          documents?: string[];
          payout_account_name?: string | null;
          payout_bank?: string | null;
          payout_iban?: string | null;
          review_note?: string | null;
          seller_id: string;
          updated_at?: string;
        };
        Update: {
          deposit_held?: number;
          deposit_required?: number;
          documents?: string[];
          payout_account_name?: string | null;
          payout_bank?: string | null;
          payout_iban?: string | null;
          review_note?: string | null;
          seller_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_details_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: true;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_locations: {
        Row: {
          active: boolean;
          address: string;
          boxy_uid: string | null;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          region_id: string;
          seller_id: string;
          synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address: string;
          boxy_uid?: string | null;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          region_id: string;
          seller_id: string;
          synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string;
          boxy_uid?: string | null;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          region_id?: string;
          seller_id?: string;
          synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_locations_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "delivery_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_locations_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_offers: {
        Row: {
          active: boolean;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          id: string;
          price: number;
          seller_id: string;
          sku: string | null;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          active?: boolean;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          id?: string;
          price: number;
          seller_id: string;
          sku?: string | null;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          active?: boolean;
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          id?: string;
          price?: number;
          seller_id?: string;
          sku?: string | null;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_offers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_offers_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      sellers: {
        Row: {
          applied_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          is_house: boolean;
          name: string;
          organization_id: string | null;
          plan: Database["public"]["Enums"]["seller_plan"];
          plan_billing: string | null;
          plan_since: string | null;
          score: number;
          score_updated_at: string | null;
          status: Database["public"]["Enums"]["seller_status"];
          updated_at: string;
        };
        Insert: {
          applied_at?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          is_house?: boolean;
          name: string;
          organization_id?: string | null;
          plan?: Database["public"]["Enums"]["seller_plan"];
          plan_billing?: string | null;
          plan_since?: string | null;
          score?: number;
          score_updated_at?: string | null;
          status?: Database["public"]["Enums"]["seller_status"];
          updated_at?: string;
        };
        Update: {
          applied_at?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          is_house?: boolean;
          name?: string;
          organization_id?: string | null;
          plan?: Database["public"]["Enums"]["seller_plan"];
          plan_billing?: string | null;
          plan_since?: string | null;
          score?: number;
          score_updated_at?: string | null;
          status?: Database["public"]["Enums"]["seller_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sellers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          action_required: string | null;
          active: boolean;
          back_confirmed_at: string | null;
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
          location_id: string | null;
          order_id: string;
          pickup_id: string | null;
          return_id: string | null;
          returned_at: string | null;
          seller_id: string;
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
          back_confirmed_at?: string | null;
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
          location_id?: string | null;
          order_id: string;
          pickup_id?: string | null;
          return_id?: string | null;
          returned_at?: string | null;
          seller_id?: string;
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
          back_confirmed_at?: string | null;
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
          location_id?: string | null;
          order_id?: string;
          pickup_id?: string | null;
          return_id?: string | null;
          returned_at?: string | null;
          seller_id?: string;
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
            foreignKeyName: "shipments_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "seller_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
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
          seller_id: string;
          serial: string | null;
          status: Database["public"]["Enums"]["stock_status"];
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
          seller_id?: string;
          serial?: string | null;
          status?: Database["public"]["Enums"]["stock_status"];
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
          seller_id?: string;
          serial?: string | null;
          status?: Database["public"]["Enums"]["stock_status"];
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
            foreignKeyName: "stock_items_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          bulb_rate: number;
          cash_limit: number | null;
          cash_on_delivery_enabled: boolean;
          delivery_cost: number;
          extra_swap_fee: number;
          id: boolean;
          max_giveaway_rate: number;
          min_margin_rate: number;
          offer_floor_rate: number;
          payment_fee_rate: number;
          plus_capacity: number;
          plus_invite_hours: number;
          plus_survey_credits: number[];
          refused_cash_limit: number;
          rental_deposit_rate: number;
          require_verified_phone: boolean;
          return_days: number;
          shipping_fee: number;
          survey_daily_boosted: number;
          survey_early_hours: number;
          survey_early_share: number;
          survey_fee_rate: number;
          survey_trusted_answers: number;
          survey_trusted_window: number;
          survey_welcome_credits: number;
          updated_at: string;
          wayl_return_refunds: boolean;
        };
        Insert: {
          bulb_rate?: number;
          cash_limit?: number | null;
          cash_on_delivery_enabled?: boolean;
          delivery_cost?: number;
          extra_swap_fee?: number;
          id?: boolean;
          max_giveaway_rate?: number;
          min_margin_rate?: number;
          offer_floor_rate?: number;
          payment_fee_rate?: number;
          plus_capacity?: number;
          plus_invite_hours?: number;
          plus_survey_credits?: number[];
          refused_cash_limit?: number;
          rental_deposit_rate?: number;
          require_verified_phone?: boolean;
          return_days?: number;
          shipping_fee?: number;
          survey_daily_boosted?: number;
          survey_early_hours?: number;
          survey_early_share?: number;
          survey_fee_rate?: number;
          survey_trusted_answers?: number;
          survey_trusted_window?: number;
          survey_welcome_credits?: number;
          updated_at?: string;
          wayl_return_refunds?: boolean;
        };
        Update: {
          bulb_rate?: number;
          cash_limit?: number | null;
          cash_on_delivery_enabled?: boolean;
          delivery_cost?: number;
          extra_swap_fee?: number;
          id?: boolean;
          max_giveaway_rate?: number;
          min_margin_rate?: number;
          offer_floor_rate?: number;
          payment_fee_rate?: number;
          plus_capacity?: number;
          plus_invite_hours?: number;
          plus_survey_credits?: number[];
          refused_cash_limit?: number;
          rental_deposit_rate?: number;
          require_verified_phone?: boolean;
          return_days?: number;
          shipping_fee?: number;
          survey_daily_boosted?: number;
          survey_early_hours?: number;
          survey_early_share?: number;
          survey_fee_rate?: number;
          survey_trusted_answers?: number;
          survey_trusted_window?: number;
          survey_welcome_credits?: number;
          updated_at?: string;
          wayl_return_refunds?: boolean;
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
          university_email: string | null;
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
          university_email?: string | null;
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
          university_email?: string | null;
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
      student_prices: {
        Row: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          id: string;
          price: number;
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          price: number;
          seller_id: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          condition?: Database["public"]["Enums"]["product_condition"];
          created_at?: string;
          created_by?: string | null;
          id?: string;
          price?: number;
          seller_id?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_prices_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_prices_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      student_verifications: {
        Row: {
          attempts: number;
          client_id: string;
          code_expires_at: string | null;
          code_hash: string | null;
          created_at: string;
          delete_token_hash: string | null;
          document_kind: string | null;
          document_path: string | null;
          email: string | null;
          email_hash: string | null;
          id: string;
          method: string | null;
          reject_reason: string | null;
          return_url: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          university_id: string | null;
          updated_at: string;
          user_id: string | null;
          valid_until: string | null;
          verified_at: string | null;
        };
        Insert: {
          attempts?: number;
          client_id: string;
          code_expires_at?: string | null;
          code_hash?: string | null;
          created_at?: string;
          delete_token_hash?: string | null;
          document_kind?: string | null;
          document_path?: string | null;
          email?: string | null;
          email_hash?: string | null;
          id?: string;
          method?: string | null;
          reject_reason?: string | null;
          return_url: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          university_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          valid_until?: string | null;
          verified_at?: string | null;
        };
        Update: {
          attempts?: number;
          client_id?: string;
          code_expires_at?: string | null;
          code_hash?: string | null;
          created_at?: string;
          delete_token_hash?: string | null;
          document_kind?: string | null;
          document_path?: string | null;
          email?: string | null;
          email_hash?: string | null;
          id?: string;
          method?: string | null;
          reject_reason?: string | null;
          return_url?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          university_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          valid_until?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_verifications_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "pass_partners";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "student_verifications_university_id_fkey";
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
          renewal_bulbs: number;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
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
          renewal_bulbs?: number;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
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
          renewal_bulbs?: number;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
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
          period: string | null;
          reason: string;
          response_id: string | null;
          survey_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          period?: string | null;
          reason: string;
          response_id?: string | null;
          survey_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          period?: string | null;
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
      survey_debriefs: {
        Row: {
          body: string;
          survey_id: string;
        };
        Insert: {
          body: string;
          survey_id: string;
        };
        Update: {
          body?: string;
          survey_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_debriefs_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: true;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_questions: {
        Row: {
          attention_answer: string | null;
          id: string;
          is_attention: boolean | null;
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
          is_attention?: never;
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
          is_attention?: never;
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
          appeal_decided_at: string | null;
          appeal_decided_by: string | null;
          appeal_note: string | null;
          appeal_upheld: boolean | null;
          appealed_at: string | null;
          counted: boolean | null;
          early: boolean;
          excluded_reason: string | null;
          failed_checks: number;
          id: string;
          respondent: NonNullable<Json>;
          reward_paid: number;
          seconds: number | null;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
          withdrawn_at: string | null;
        };
        Insert: {
          appeal_decided_at?: string | null;
          appeal_decided_by?: string | null;
          appeal_note?: string | null;
          appeal_upheld?: boolean | null;
          appealed_at?: string | null;
          counted?: boolean | null;
          early?: boolean;
          excluded_reason?: string | null;
          failed_checks?: number;
          id?: string;
          respondent?: NonNullable<Json>;
          reward_paid?: number;
          seconds?: number | null;
          started_at?: string;
          submitted_at?: string | null;
          survey_id: string;
          user_id?: string | null;
          withdrawn_at?: string | null;
        };
        Update: {
          appeal_decided_at?: string | null;
          appeal_decided_by?: string | null;
          appeal_note?: string | null;
          appeal_upheld?: boolean | null;
          appealed_at?: string | null;
          counted?: boolean | null;
          early?: boolean;
          excluded_reason?: string | null;
          failed_checks?: number;
          id?: string;
          respondent?: NonNullable<Json>;
          reward_paid?: number;
          seconds?: number | null;
          started_at?: string;
          submitted_at?: string | null;
          survey_id?: string;
          user_id?: string | null;
          withdrawn_at?: string | null;
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
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
          universities: string[];
          updated_at: string;
          wanted: number;
          years: number[];
        };
        Insert: {
          answers_deleted_at?: string | null;
          answers_warned_at?: string | null;
          closed_at?: string | null;
          closes_at?: string | null;
          consent?: string;
          created_at?: string;
          creator_id?: string | null;
          deception?: boolean;
          description?: string;
          estimated_seconds?: number | null;
          ethics_reference?: string | null;
          flags?: string[];
          governorates?: string[];
          held?: number;
          id?: string;
          keep_months?: number;
          kind?: string;
          language?: string;
          majors?: string[];
          median_seconds?: number | null;
          min_seconds?: number;
          opened_at?: string | null;
          order_id?: string | null;
          paused_at?: string | null;
          purpose?: string | null;
          quotas?: NonNullable<Json>;
          refund_amount?: number;
          refund_claimed_at?: string | null;
          refund_reference?: string | null;
          refunded_amount?: number;
          refunded_at?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward?: number;
          reward_pending?: number | null;
          run_by?: string | null;
          share_summary?: boolean;
          status?: string;
          students_only?: boolean;
          title: string;
          topup_order_id?: string | null;
          universities?: string[];
          updated_at?: string;
          wanted?: number;
          years?: number[];
        };
        Update: {
          answers_deleted_at?: string | null;
          answers_warned_at?: string | null;
          closed_at?: string | null;
          closes_at?: string | null;
          consent?: string;
          created_at?: string;
          creator_id?: string | null;
          deception?: boolean;
          description?: string;
          estimated_seconds?: number | null;
          ethics_reference?: string | null;
          flags?: string[];
          governorates?: string[];
          held?: number;
          id?: string;
          keep_months?: number;
          kind?: string;
          language?: string;
          majors?: string[];
          median_seconds?: number | null;
          min_seconds?: number;
          opened_at?: string | null;
          order_id?: string | null;
          paused_at?: string | null;
          purpose?: string | null;
          quotas?: NonNullable<Json>;
          refund_amount?: number;
          refund_claimed_at?: string | null;
          refund_reference?: string | null;
          refunded_amount?: number;
          refunded_at?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reward?: number;
          reward_pending?: number | null;
          run_by?: string | null;
          share_summary?: boolean;
          status?: string;
          students_only?: boolean;
          title?: string;
          topup_order_id?: string | null;
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
          {
            foreignKeyName: "surveys_topup_order_id_fkey";
            columns: ["topup_order_id"];
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
      user_addresses: {
        Row: {
          area: string;
          created_at: string;
          full_name: string;
          governorate: string;
          id: string;
          is_default: boolean;
          label: string;
          landmark: string;
          latitude: number | null;
          longitude: number | null;
          phone: string;
          street: string;
          updated_at: string;
          user_id: string;
          zone_id: string | null;
        };
        Insert: {
          area?: string;
          created_at?: string;
          full_name: string;
          governorate?: string;
          id?: string;
          is_default?: boolean;
          label: string;
          landmark?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone: string;
          street: string;
          updated_at?: string;
          user_id?: string;
          zone_id?: string | null;
        };
        Update: {
          area?: string;
          created_at?: string;
          full_name?: string;
          governorate?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          landmark?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string;
          street?: string;
          updated_at?: string;
          user_id?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_addresses_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      verified_phones: {
        Row: {
          phone: string;
          user_id: string;
          verified_at: string;
        };
        Insert: {
          phone: string;
          user_id: string;
          verified_at?: string;
        };
        Update: {
          phone?: string;
          user_id?: string;
          verified_at?: string;
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
          alerted_price: number | null;
          created_at: string;
          list_id: string | null;
          notify: boolean;
          position: number;
          price_target: number | null;
          product_id: string;
          saved_price: number | null;
          user_id: string;
        };
        Insert: {
          alerted_price?: number | null;
          created_at?: string;
          list_id?: string | null;
          notify?: boolean;
          position?: number;
          price_target?: number | null;
          product_id: string;
          saved_price?: number | null;
          user_id?: string;
        };
        Update: {
          alerted_price?: number | null;
          created_at?: string;
          list_id?: string | null;
          notify?: boolean;
          position?: number;
          price_target?: number | null;
          product_id?: string;
          saved_price?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "saved_lists";
            referencedColumns: ["id"];
          },
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
      add_pass_domain: {
        Args: { name: string; org: string };
        Returns: {
          checked_at: string | null;
          created_at: string;
          created_by: string | null;
          domain: string;
          id: string;
          organization_id: string;
          token: string;
          verified_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "pass_partner_domains";
          isOneToOne: true;
          isSetofReturn: false;
        };
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
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "bulb_entries";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      answer_offer: {
        Args: { answer: string; counter?: number; target: string };
        Returns: {
          accepted_at: string | null;
          amount: number;
          answered_by: string | null;
          buyer_amount: number;
          buyer_counter: number | null;
          buyer_id: string;
          cart_until: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          expires_at: string;
          id: string;
          list_price: number;
          number: number;
          order_item_id: string | null;
          product_id: string;
          seller_counter: number | null;
          seller_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "offers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      appeal_survey_response: {
        Args: { note: string; target: string };
        Returns: {
          appeal_decided_at: string | null;
          appeal_decided_by: string | null;
          appeal_note: string | null;
          appeal_upheld: boolean | null;
          appealed_at: string | null;
          counted: boolean | null;
          early: boolean;
          excluded_reason: string | null;
          failed_checks: number;
          id: string;
          respondent: NonNullable<Json>;
          reward_paid: number;
          seconds: number | null;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
          withdrawn_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_coupon: { Args: { entered: string }; Returns: string };
      apply_to_sell: {
        Args: { org: string; seller_name: string };
        Returns: {
          applied_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          is_house: boolean;
          name: string;
          organization_id: string | null;
          plan: Database["public"]["Enums"]["seller_plan"];
          plan_billing: string | null;
          plan_since: string | null;
          score: number;
          score_updated_at: string | null;
          status: Database["public"]["Enums"]["seller_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sellers";
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
      begin_student_check: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
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
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      bulbs_outstanding: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          pending: number;
          value_iqd: number;
        }[];
      };
      campaign_listings: {
        Args: { campaign_slug: string };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          images: string[];
          name_ar: string;
          name_en: string;
          price: number;
          product_id: string;
          regular_price: number;
          seller_id: string;
          seller_name: string;
          slug: string;
          variant_id: string;
        }[];
      };
      cancel_order: { Args: { order_id: string }; Returns: undefined };
      cancel_payout: {
        Args: { target: string };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          number: number;
          paid_at: string | null;
          paid_by: string | null;
          period_end: string;
          prepared_by: string | null;
          reference: string | null;
          seller_id: string;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "payouts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_plus: {
        Args: { keep?: boolean };
        Returns: {
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
          renewal_bulbs: number;
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
      cancel_return: {
        Args: { target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
          renewal_bulbs: number;
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
      claim_gift: { Args: { shipping?: Json; token: string }; Returns: string };
      claim_invite: { Args: { code: string }; Returns: string };
      claim_partner_webhooks: {
        Args: { max_rows?: number };
        Returns: {
          attempts: number;
          client_id: string;
          id: string;
          payload: Json;
          type: string;
          url: string;
        }[];
      };
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
      claim_return_refunds: {
        Args: { max_rows?: number };
        Returns: {
          amount: number;
          item_name: string;
          number: number;
          order_number: string;
          payment_reference: string;
          reason: Database["public"]["Enums"]["return_reason"];
          refundable: number;
          return_id: string;
        }[];
      };
      claim_student_from_email: {
        Args: { university: string };
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_email: string | null;
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
      claim_student_from_identity: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_email: string | null;
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
      claim_survey_refunds: {
        Args: { max_rows?: number };
        Returns: {
          amount: number;
          order_number: string;
          payment_id: string;
          payment_reference: string;
          refundable: number;
          survey_id: string;
          title: string;
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
      close_support_ticket: { Args: { ticket: string }; Returns: undefined };
      close_survey: {
        Args: { target: string };
        Returns: {
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      confirm_parcel_back: { Args: { parcel: string }; Returns: string };
      confirm_return_condition: {
        Args: { note?: string; ok: boolean; target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_student_email: {
        Args: { code: string };
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_email: string | null;
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
      confirm_student_verification_email: {
        Args: { code: string; target: string };
        Returns: {
          delete_token: string;
          email: string;
          verified: boolean;
        }[];
      };
      confirm_survey_reward: {
        Args: { target: string };
        Returns: {
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      create_bundle: {
        Args: {
          bundle_seller: string;
          category: string;
          images: string[];
          items: Json;
          name_ar: string;
          name_en: string;
          offer_condition: Database["public"]["Enums"]["product_condition"];
          offer_price: number;
          offer_sku?: string;
          quantity: number;
        };
        Returns: string;
      };
      create_gift_order: {
        Args: {
          delivery_zone: string;
          hide_price?: boolean;
          message?: string;
          use_bulbs?: number;
        };
        Returns: {
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      create_listing: {
        Args: {
          barcode: string;
          category: string;
          details: Json;
          images: string[];
          listing_seller: string;
          name_ar: string;
          name_en: string;
          offer_condition: Database["public"]["Enums"]["product_condition"];
          offer_price: number;
          offer_sku?: string;
          quantity: number;
        };
        Returns: string;
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
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
          features: string[];
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
      create_pass_app: {
        Args: {
          answers: string[];
          name: string;
          org: string;
          redirect_uris: string[];
          website: string;
        };
        Returns: Json;
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
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      create_rentals_order: {
        Args: {
          delivery_zone?: string;
          items: Json;
          payment_method?: Database["public"]["Enums"]["order_payment_method"];
          shipping: Json;
        };
        Returns: {
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      create_student_verification: {
        Args: { client: string; return_url: string };
        Returns: string;
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
      decide_guardian_order: {
        Args: { approve: boolean; target: string };
        Returns: {
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      decide_return: {
        Args: {
          approve: boolean;
          fault?: Database["public"]["Enums"]["return_fault"];
          note: string;
          target: string;
        };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_seller: {
        Args: {
          decision: Database["public"]["Enums"]["seller_status"];
          deposit?: number;
          note?: string;
          target: string;
        };
        Returns: {
          applied_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          is_house: boolean;
          name: string;
          organization_id: string | null;
          plan: Database["public"]["Enums"]["seller_plan"];
          plan_billing: string | null;
          plan_since: string | null;
          score: number;
          score_updated_at: string | null;
          status: Database["public"]["Enums"]["seller_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sellers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_survey_appeal: {
        Args: { target: string; upheld: boolean };
        Returns: {
          appeal_decided_at: string | null;
          appeal_decided_by: string | null;
          appeal_note: string | null;
          appeal_upheld: boolean | null;
          appealed_at: string | null;
          counted: boolean | null;
          early: boolean;
          excluded_reason: string | null;
          failed_checks: number;
          id: string;
          respondent: NonNullable<Json>;
          reward_paid: number;
          seconds: number | null;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
          withdrawn_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decline_plus_seat: { Args: { seat: string }; Returns: undefined };
      delete_quantity_deal: { Args: { target: string }; Returns: undefined };
      delete_student_verification: {
        Args: { target: string; token: string };
        Returns: boolean;
      };
      disconnect_pass_partner: { Args: { client: string }; Returns: undefined };
      end_listing_sale: { Args: { target: string }; Returns: undefined };
      end_pass_card_embed: { Args: { client: string }; Returns: undefined };
      end_plus_seat: { Args: { seat: string }; Returns: undefined };
      end_previous_pass_secret: {
        Args: { client: string };
        Returns: undefined;
      };
      event_rsvp_count: { Args: { event: string }; Returns: number };
      event_rsvp_window: {
        Args: { event: string };
        Returns: {
          opens_at: string;
          plus_opens_at: string;
          seats_left: number;
        }[];
      };
      find_by_barcode: {
        Args: { code: string };
        Returns: {
          name_ar: string;
          name_en: string;
          product_id: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          variant_id: string;
        }[];
      };
      finish_partner_webhook: {
        Args: { delivered: boolean; error?: string; target: string };
        Returns: undefined;
      };
      forget_student_status: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      gift_link: { Args: { target: string }; Returns: string };
      gift_preview: { Args: { token: string }; Returns: Json };
      grant_plus_survey_credits: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
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
      is_phone_verified: { Args: { phone: string }; Returns: boolean };
      issue_invoice: {
        Args: { days?: number; purchase_order: string };
        Returns: string;
      };
      issue_student_code: {
        Args: { address: string; member: string; university: string };
        Returns: string;
      };
      join_campaign: {
        Args: { campaign: string; rate: number; seller: string };
        Returns: {
          campaign_id: string;
          created_at: string;
          discount_rate: number;
          seller_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "campaign_entries";
          isOneToOne: true;
          isSetofReturn: false;
        };
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
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      leave_campaign: {
        Args: { campaign: string; seller: string };
        Returns: undefined;
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
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          parent_id: string | null;
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
      make_offer: {
        Args: {
          offered: number;
          seller: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          accepted_at: string | null;
          amount: number;
          answered_by: string | null;
          buyer_amount: number;
          buyer_counter: number | null;
          buyer_id: string;
          cart_until: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          expires_at: string;
          id: string;
          list_price: number;
          number: number;
          order_item_id: string | null;
          product_id: string;
          seller_counter: number | null;
          seller_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "offers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mark_cash_collected: {
        Args: { order_id: string };
        Returns: {
          bulbs_discount: number;
          bulbs_used: number;
          cash_collected_by: string | null;
          confirmation_emailed_at: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          delivery_zone_id: string | null;
          discount: number;
          discount_source: string | null;
          fulfilment: Database["public"]["Enums"]["order_fulfilment"];
          guardian_status: string | null;
          id: string;
          is_gift: boolean;
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
      mark_line_out_of_stock: {
        Args: { line: string };
        Returns: Database["public"]["Enums"]["seller_line_status"];
      };
      mark_line_refunded: { Args: { line: string }; Returns: string };
      mark_lines_ready: {
        Args: { lines: string[]; location: string };
        Returns: string[];
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
      mark_payout_paid: {
        Args: { method: string; reference: string; target: string };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          number: number;
          paid_at: string | null;
          paid_by: string | null;
          period_end: string;
          prepared_by: string | null;
          reference: string | null;
          seller_id: string;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "payouts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mark_return_received: {
        Args: { target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mark_return_refunded: {
        Args: { reference: string; target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      member_bulbs: {
        Args: { member: string };
        Returns: {
          available: number;
          pending: number;
          rate: number;
        }[];
      };
      must_pay_online: { Args: Record<PropertyKey, never>; Returns: boolean };
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
      my_survey_access: {
        Args: Record<PropertyKey, never>;
        Returns: {
          boosted_today: number;
          daily_limit: number;
          own_phone: boolean;
          phone_required: boolean;
          trusted: boolean;
        }[];
      };
      my_survey_credits: { Args: Record<PropertyKey, never>; Returns: number };
      my_survey_record: { Args: Record<PropertyKey, never>; Returns: Json };
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
      offerable_listings: {
        Args: { item: string };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          min_offer: number;
          seller_id: string;
          variant_id: string;
        }[];
      };
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
      partner_check: { Args: { org: string; scanned: string }; Returns: Json };
      pass_app_webhooks: {
        Args: { org: string };
        Returns: {
          client_id: string;
          webhook_url: string;
        }[];
      };
      pass_apps: {
        Args: { org?: string };
        Returns: {
          answers: string[];
          card_checks_30d: number;
          client_id: string;
          connections: number;
          created_at: string;
          enabled: boolean;
          has_keys: boolean;
          mode: string;
          name: string;
          organization_id: string;
          organization_name: string;
          previous_secret_until: string;
          redirect_uris: string[];
          requested_answers: string[];
          review_note: string;
          review_status: string;
          sign_ins_30d: number;
          suspended: boolean;
          website: string;
        }[];
      };
      pass_card: { Args: { member: string }; Returns: Json };
      pass_card_check: {
        Args: { client: string; scanned: string };
        Returns: Json;
      };
      pass_card_embed: {
        Args: { client: string; token: string };
        Returns: Json;
      };
      pass_card_embed_site: {
        Args: { client: string };
        Returns: {
          name: string;
          origins: string[];
        }[];
      };
      pass_claims: {
        Args: { client: string; member: string; scopes: string[] };
        Returns: Json;
      };
      pause_plus: {
        Args: { days: number };
        Returns: {
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
          renewal_bulbs: number;
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
      plus_renewal_bulbs: { Args: { subscription: string }; Returns: number };
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
      prepare_payouts: {
        Args: { period_end?: string };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          number: number;
          paid_at: string | null;
          paid_by: string | null;
          period_end: string;
          prepared_by: string | null;
          reference: string | null;
          seller_id: string;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "payouts";
          isOneToOne: false;
          isSetofReturn: true;
        };
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
          deals: Json;
          lowest_30d: number;
          plus_price: number;
          price: number;
          purpose: Database["public"]["Enums"]["stock_purpose"];
          sale_ends_at: string;
          seller_id: string;
          seller_name: string;
          student_price: number;
          variant_id: string;
          was_price: number;
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
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      queue_add: { Args: { product: string }; Returns: undefined };
      queue_due_telegram_posts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      received_gifts: { Args: Record<PropertyKey, never>; Returns: Json[] };
      record_return_refund: {
        Args: { reference: string; target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_survey_refund: {
        Args: {
          amount: number;
          payment: string;
          reference: string;
          target: string;
        };
        Returns: {
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      refresh_seller_scores: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      refresh_was_prices: { Args: Record<PropertyKey, never>; Returns: number };
      register_push_device: {
        Args: { device_platform: string; device_token: string };
        Returns: string;
      };
      release_return_refund: { Args: { target: string }; Returns: undefined };
      release_survey_refund: { Args: { target: string }; Returns: undefined };
      remove_coupon: { Args: Record<PropertyKey, never>; Returns: undefined };
      remove_pass_domain: { Args: { target: string }; Returns: undefined };
      remove_plus_price: { Args: { target: string }; Returns: undefined };
      remove_student_price: { Args: { target: string }; Returns: undefined };
      rental_quote: {
        Args: { product: string; variant?: string };
        Returns: {
          days: number;
          deposit: number;
          late_fee: number;
          price: number;
        }[];
      };
      rental_term: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "academic_terms";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      rentals_quote: {
        Args: { delivery_zone?: string; items: Json };
        Returns: Json;
      };
      reorder_queue: { Args: { products: string[] }; Returns: undefined };
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
      request_return: {
        Args: {
          details?: string;
          line: string;
          photos?: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          unopened?: boolean;
        };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
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
      respond_to_return: {
        Args: { accept: boolean; note?: string; target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resume_plus: {
        Args: Record<PropertyKey, never>;
        Returns: {
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
          renewal_bulbs: number;
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
      review_pass_app: {
        Args: { approve: boolean; client: string; note?: string };
        Returns: undefined;
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
      review_student_verification: {
        Args: { approve: boolean; reason?: string; target: string };
        Returns: {
          delete_token: string;
          document_path: string;
          email: string;
        }[];
      };
      review_survey: {
        Args: { approve: boolean; note?: string; target: string };
        Returns: {
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      rotate_pass_app_secret: {
        Args: { client: string; keep_previous?: boolean };
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
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
          category_id: string | null;
          compare_at_price: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by_seller: string | null;
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
          release_date: string | null;
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
      seller_listings: {
        Args: { listing_seller: string };
        Returns: {
          active: boolean;
          available: number;
          barcode: string;
          condition: Database["public"]["Enums"]["product_condition"];
          name_ar: string;
          name_en: string;
          offer_id: string;
          price: number;
          product_id: string;
          product_status: Database["public"]["Enums"]["product_status"];
          sku: string;
          slug: string;
          sold: number;
          updated_at: string;
          variant_id: string;
        }[];
      };
      seller_order_lines: {
        Args: { shop: string };
        Returns: {
          attributes: Json;
          commission: number;
          condition: Database["public"]["Enums"]["product_condition"];
          customer: string;
          line_id: string;
          location_id: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          order_number: string;
          ordered_at: string;
          quantity: number;
          ready_at: string;
          ready_by: string;
          seller_payout: number;
          shipment_id: string;
          shipment_status: string;
          status: Database["public"]["Enums"]["seller_line_status"];
          tracking_code: string;
          unit_price: number;
        }[];
      };
      seller_parcels_back: {
        Args: { shop: string };
        Returns: {
          customer: string;
          items: string;
          order_number: string;
          returned_at: string;
          shipment_id: string;
          tracking_code: string;
        }[];
      };
      seller_plan_price: { Args: { billing: string }; Returns: number };
      seller_returns: {
        Args: { shop: string };
        Returns: {
          attributes: Json;
          check_by: string;
          collection_fee: number;
          condition: Database["public"]["Enums"]["product_condition"];
          condition_note: string;
          condition_ok: boolean;
          created_at: string;
          customer: string;
          details: string;
          fault: Database["public"]["Enums"]["return_fault"];
          name_ar: string;
          name_en: string;
          number: number;
          order_number: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string;
          refund_amount: number;
          respond_by: string;
          return_id: string;
          shop_note: string;
          staff_note: string;
          status: Database["public"]["Enums"]["return_status"];
          unit_price: number;
          unopened: boolean;
        }[];
      };
      send_quote: { Args: { quote: string }; Returns: undefined };
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
      set_listing_sale: {
        Args: {
          ends: string;
          price: number;
          seller: string;
          starts: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          sale_price: number;
          seller_id: string;
          starts_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "listing_sales";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_money_rules: { Args: { rules: Json }; Returns: undefined };
      set_offer: {
        Args: {
          offer_condition: Database["public"]["Enums"]["product_condition"];
          offer_price: number;
          offer_seller: string;
          offer_sku?: string;
          offer_variant: string;
          quantity: number;
        };
        Returns: {
          active: boolean;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          id: string;
          price: number;
          seller_id: string;
          sku: string | null;
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "seller_offers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_offer_settings: {
        Args: {
          accept: boolean;
          accept_at?: number;
          decline_below?: number;
          seller: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          accept_offers: boolean;
          auto_accept_at: number | null;
          auto_decline_below: number | null;
          condition: Database["public"]["Enums"]["product_condition"];
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "offer_settings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_pass_app_keys: {
        Args: { client: string; jwks: Json };
        Returns: undefined;
      };
      set_pass_app_state: {
        Args: { client: string; enabled: boolean; live: boolean };
        Returns: undefined;
      };
      set_pass_app_webhook: {
        Args: { client: string; url: string };
        Returns: string;
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
      set_plus_price: {
        Args: {
          price: number;
          seller: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          id: string;
          price: number;
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "plus_prices";
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
      set_quantity_deal: {
        Args: {
          from_quantity: number;
          rate: number;
          seller: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          discount_rate: number;
          id: string;
          min_quantity: number;
          seller_id: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "quantity_deals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_renewal_bulbs: {
        Args: { amount: number };
        Returns: {
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
          renewal_bulbs: number;
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
      set_rental_deposit_rate: { Args: { rate: number }; Returns: undefined };
      set_seller_plan: {
        Args: {
          billing?: string;
          new_plan: Database["public"]["Enums"]["seller_plan"];
          target: string;
        };
        Returns: {
          applied_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          is_house: boolean;
          name: string;
          organization_id: string | null;
          plan: Database["public"]["Enums"]["seller_plan"];
          plan_billing: string | null;
          plan_since: string | null;
          score: number;
          score_updated_at: string | null;
          status: Database["public"]["Enums"]["seller_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sellers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_staff_role: {
        Args: {
          new_role: Database["public"]["Enums"]["staff_role"];
          staff_title?: string;
          target: string;
        };
        Returns: undefined;
      };
      set_student_price: {
        Args: {
          price: number;
          seller: string;
          variant: string;
          wanted: Database["public"]["Enums"]["product_condition"];
        };
        Returns: {
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          created_by: string | null;
          id: string;
          price: number;
          seller_id: string;
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_prices";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_student_profile: {
        Args: { governorate: string; major: string; study_year: number };
        Returns: {
          email_hash: string | null;
          governorate: string | null;
          major: string | null;
          method: string;
          study_year: number | null;
          university_email: string | null;
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
      share_student_verification: {
        Args: { member: string; target: string };
        Returns: {
          delete_token: string;
          email: string;
        }[];
      };
      shared_list: {
        Args: { token: string };
        Returns: {
          list_name: string;
          owner_name: string;
          product_id: string;
        }[];
      };
      spend_renewal_bulbs: {
        Args: { bulbs: number; subscription: string };
        Returns: number;
      };
      staff_mark_return_received: {
        Args: { target: string };
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_pass_card_embed: { Args: { client: string }; Returns: string };
      start_student_verification_email: {
        Args: { address: string; target: string; university: string };
        Returns: string;
      };
      start_survey: {
        Args: { target: string };
        Returns: {
          appeal_decided_at: string | null;
          appeal_decided_by: string | null;
          appeal_note: string | null;
          appeal_upheld: boolean | null;
          appealed_at: string | null;
          counted: boolean | null;
          early: boolean;
          excluded_reason: string | null;
          failed_checks: number;
          id: string;
          respondent: NonNullable<Json>;
          reward_paid: number;
          seconds: number | null;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
          withdrawn_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      student_verification_origins: {
        Args: { target: string };
        Returns: string[];
      };
      student_verification_page: { Args: { target: string }; Returns: Json };
      submit_student_verification_document: {
        Args: {
          address: string;
          kind: string;
          path: string;
          target: string;
          university: string;
        };
        Returns: undefined;
      };
      submit_survey: {
        Args: { answers: Json; target: string };
        Returns: {
          appeal_decided_at: string | null;
          appeal_decided_by: string | null;
          appeal_note: string | null;
          appeal_upheld: boolean | null;
          appealed_at: string | null;
          counted: boolean | null;
          early: boolean;
          excluded_reason: string | null;
          failed_checks: number;
          id: string;
          respondent: NonNullable<Json>;
          reward_paid: number;
          seconds: number | null;
          started_at: string;
          submitted_at: string | null;
          survey_id: string;
          user_id: string | null;
          withdrawn_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "survey_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      survey_appeals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          appealed_at: string;
          excluded_reason: string;
          failed_checks: number;
          median_seconds: number;
          min_seconds: number;
          note: string;
          response_id: string;
          seconds: number;
          survey_id: string;
          title: string;
        }[];
      };
      survey_attention_answers: {
        Args: { target: string };
        Returns: {
          answer: string;
          question_id: string;
        }[];
      };
      survey_audience: { Args: { target: string }; Returns: Json };
      survey_results: {
        Args: { target: string };
        Returns: {
          answers: Json;
          counted: boolean;
          response_id: string;
          submitted_at: string;
        }[];
      };
      survey_summary: { Args: { target: string }; Returns: Json };
      surveys_for_me: {
        Args: Record<PropertyKey, never>;
        Returns: {
          answers_deleted_at: string | null;
          answers_warned_at: string | null;
          closed_at: string | null;
          closes_at: string | null;
          consent: string;
          created_at: string;
          creator_id: string | null;
          deception: boolean;
          description: string;
          estimated_seconds: number | null;
          ethics_reference: string | null;
          flags: string[];
          governorates: string[];
          held: number;
          id: string;
          keep_months: number;
          kind: string;
          language: string;
          majors: string[];
          median_seconds: number | null;
          min_seconds: number;
          opened_at: string | null;
          order_id: string | null;
          paused_at: string | null;
          purpose: string | null;
          quotas: NonNullable<Json>;
          refund_amount: number;
          refund_claimed_at: string | null;
          refund_reference: string | null;
          refunded_amount: number;
          refunded_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reward: number;
          reward_pending: number | null;
          run_by: string | null;
          share_summary: boolean;
          status: string;
          students_only: boolean;
          title: string;
          topup_order_id: string | null;
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
      suspend_pass_app: {
        Args: { client: string; suspend: boolean };
        Returns: undefined;
      };
      sweep_listing_sales: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      sweep_offers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          accepted_at: string | null;
          amount: number;
          answered_by: string | null;
          buyer_amount: number;
          buyer_counter: number | null;
          buyer_id: string;
          cart_until: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          expires_at: string;
          id: string;
          list_price: number;
          number: number;
          order_item_id: string | null;
          product_id: string;
          seller_counter: number | null;
          seller_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          updated_at: string;
          variant_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "offers";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      sweep_returns: {
        Args: Record<PropertyKey, never>;
        Returns: {
          check_by: string | null;
          collection_fee: number | null;
          condition_note: string | null;
          condition_ok: boolean | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          delivery_refund: number;
          details: string | null;
          disputed_at: string | null;
          fault: Database["public"]["Enums"]["return_fault"];
          id: string;
          needs_collection: boolean;
          number: number;
          order_id: string;
          order_item_id: string;
          photos: string[];
          quantity: number;
          reason: Database["public"]["Enums"]["return_reason"];
          received_at: string | null;
          refund_amount: number | null;
          refund_bulbs: number | null;
          refund_claimed_at: string | null;
          refund_due_at: string | null;
          refund_reference: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          respond_by: string;
          responded_at: string | null;
          responded_by: string | null;
          seller_id: string;
          shop_note: string | null;
          staff_note: string | null;
          status: Database["public"]["Enums"]["return_status"];
          unopened: boolean;
          updated_at: string;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "returns";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      sweep_student_checks: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      sweep_student_verifications: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      sweep_surveys: { Args: Record<PropertyKey, never>; Returns: number };
      telegram_join_check: {
        Args: { chat: number; member: number };
        Returns: {
          allowed: boolean;
          linked: boolean;
          rule: string;
        }[];
      };
      unlink_telegram: { Args: Record<PropertyKey, never>; Returns: undefined };
      update_pass_app: {
        Args: {
          answers: string[];
          client: string;
          name: string;
          redirect_uris: string[];
          website: string;
        };
        Returns: undefined;
      };
      use_plus_gift_month: { Args: { subscription: string }; Returns: boolean };
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
      withdraw_offer: {
        Args: { target: string };
        Returns: {
          accepted_at: string | null;
          amount: number;
          answered_by: string | null;
          buyer_amount: number;
          buyer_counter: number | null;
          buyer_id: string;
          cart_until: string | null;
          condition: Database["public"]["Enums"]["product_condition"];
          created_at: string;
          expires_at: string;
          id: string;
          list_price: number;
          number: number;
          order_item_id: string | null;
          product_id: string;
          seller_counter: number | null;
          seller_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          updated_at: string;
          variant_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "offers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      withdraw_survey_response: {
        Args: { target: string };
        Returns: undefined;
      };
    };
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
      billing_interval: "month" | "year";
      bulb_kind:
        | "purchase"
        | "bonus"
        | "trade_in"
        | "redemption"
        | "adjustment"
        | "expiry"
        | "return";
      bulb_status: "pending" | "available" | "void";
      coupon_kind: "percent" | "amount";
      crm_status: "lead" | "customer" | "vip" | "churned";
      invoice_status: "issued" | "paid" | "void";
      ledger_scenario: "actual" | "forecast" | "budget";
      notification_kind:
        | "order"
        | "rental"
        | "support"
        | "plus"
        | "promo"
        | "system"
        | "trade_in";
      offer_status:
        | "open"
        | "countered"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
        | "purchased";
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
      payout_line_kind: "sale" | "collection_fee" | "pro_fee" | "delivery_fee";
      payout_status: "pending" | "paid" | "cancelled";
      plus_seat_status: "requested" | "active" | "ended" | "declined";
      post_section: "news" | "stories" | "members" | "learn";
      post_topic: "news" | "stories" | "guides";
      procurement_status:
        | "submitted"
        | "quoted"
        | "ordered"
        | "delivered"
        | "cancelled";
      product_check_reason:
        | "missing_fields"
        | "missing_photo"
        | "banned"
        | "duplicate";
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
      return_fault: "shop" | "customer" | "the_idea";
      return_reason:
        | "wrong_item"
        | "faulty"
        | "not_as_described"
        | "changed_mind"
        | "never_arrived";
      return_status:
        | "requested"
        | "disputed"
        | "approved"
        | "collecting"
        | "received"
        | "refund_due"
        | "refunded"
        | "rejected"
        | "cancelled";
      review_status: "published" | "hidden";
      seller_line_status:
        | "waiting"
        | "ready"
        | "picked_up"
        | "out_of_stock"
        | "cancelled";
      seller_plan: "free" | "pro";
      seller_status: "pending" | "approved" | "rejected" | "suspended";
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
      billing_interval: ["month", "year"],
      bulb_kind: [
        "purchase",
        "bonus",
        "trade_in",
        "redemption",
        "adjustment",
        "expiry",
        "return",
      ],
      bulb_status: ["pending", "available", "void"],
      coupon_kind: ["percent", "amount"],
      crm_status: ["lead", "customer", "vip", "churned"],
      invoice_status: ["issued", "paid", "void"],
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
      offer_status: [
        "open",
        "countered",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
        "purchased",
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
      payout_line_kind: ["sale", "collection_fee", "pro_fee", "delivery_fee"],
      payout_status: ["pending", "paid", "cancelled"],
      plus_seat_status: ["requested", "active", "ended", "declined"],
      post_section: ["news", "stories", "members", "learn"],
      post_topic: ["news", "stories", "guides"],
      procurement_status: [
        "submitted",
        "quoted",
        "ordered",
        "delivered",
        "cancelled",
      ],
      product_check_reason: [
        "missing_fields",
        "missing_photo",
        "banned",
        "duplicate",
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
      return_fault: ["shop", "customer", "the_idea"],
      return_reason: [
        "wrong_item",
        "faulty",
        "not_as_described",
        "changed_mind",
        "never_arrived",
      ],
      return_status: [
        "requested",
        "disputed",
        "approved",
        "collecting",
        "received",
        "refund_due",
        "refunded",
        "rejected",
        "cancelled",
      ],
      review_status: ["published", "hidden"],
      seller_line_status: [
        "waiting",
        "ready",
        "picked_up",
        "out_of_stock",
        "cancelled",
      ],
      seller_plan: ["free", "pro"],
      seller_status: ["pending", "approved", "rejected", "suspended"],
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
    },
  },
} as const;

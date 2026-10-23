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
      cart_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
          user_id: string;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
          variant_id?: string | null;
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
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      crm_contacts: {
        Row: {
          notes: string | null;
          status: Database["public"]["Enums"]["crm_status"];
          tags: string[];
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          notes?: string | null;
          status?: Database["public"]["Enums"]["crm_status"];
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          notes?: string | null;
          status?: Database["public"]["Enums"]["crm_status"];
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      equity_holders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          round_id: string | null;
          shares: number;
          type: Database["public"]["Enums"]["equity_holder_type"];
          vesting_start: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          round_id?: string | null;
          shares: number;
          type: Database["public"]["Enums"]["equity_holder_type"];
          vesting_start?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          round_id?: string | null;
          shares?: number;
          type?: Database["public"]["Enums"]["equity_holder_type"];
          vesting_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equity_holders_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "equity_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      equity_rounds: {
        Row: {
          closed_on: string | null;
          created_at: string;
          currency: string;
          id: string;
          name: string;
          price_per_share: number | null;
          valuation_cap: number | null;
        };
        Insert: {
          closed_on?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          name: string;
          price_per_share?: number | null;
          valuation_cap?: number | null;
        };
        Update: {
          closed_on?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          price_per_share?: number | null;
          valuation_cap?: number | null;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          user_id?: string;
        };
        Update: {
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
      journal_issues: {
        Row: {
          cover_image: string | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          issue: number;
          pdf_path: string | null;
          published_at: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
          volume: number;
        };
        Insert: {
          cover_image?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          issue: number;
          pdf_path?: string | null;
          published_at?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          volume: number;
        };
        Update: {
          cover_image?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          issue?: number;
          pdf_path?: string | null;
          published_at?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          volume?: number;
        };
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          entry_date: string;
          id: string;
          reference: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description: string;
          entry_date: string;
          id?: string;
          reference?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          entry_date?: string;
          id?: string;
          reference?: string | null;
        };
        Relationships: [];
      };
      ledger_lines: {
        Row: {
          account_id: string;
          credit: number;
          debit: number;
          entry_id: string;
          id: string;
          memo: string | null;
        };
        Insert: {
          account_id: string;
          credit?: number;
          debit?: number;
          entry_id: string;
          id?: string;
          memo?: string | null;
        };
        Update: {
          account_id?: string;
          credit?: number;
          debit?: number;
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
      marketing_campaigns: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          segment_id: string | null;
          sent_at: string | null;
          sent_count: number;
          status: Database["public"]["Enums"]["campaign_status"];
          subject: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          segment_id?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          status?: Database["public"]["Enums"]["campaign_status"];
          subject: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          segment_id?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          status?: Database["public"]["Enums"]["campaign_status"];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "marketing_segments";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_segments: {
        Row: {
          created_at: string;
          created_by: string | null;
          criteria: NonNullable<Json>;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          criteria?: NonNullable<Json>;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          criteria?: NonNullable<Json>;
          id?: string;
          name?: string;
        };
        Relationships: [];
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
      order_items: {
        Row: {
          attributes: NonNullable<Json>;
          id: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          variant_id: string | null;
        };
        Insert: {
          attributes?: NonNullable<Json>;
          id?: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          unit_price: number;
          variant_id?: string | null;
        };
        Update: {
          attributes?: NonNullable<Json>;
          id?: string;
          name_ar?: string;
          name_en?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          variant_id?: string | null;
        };
        Relationships: [
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
          created_at: string;
          currency: string;
          id: string;
          number: number;
          paid_at: string | null;
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          number?: never;
          paid_at?: string | null;
          shipping_address: NonNullable<Json>;
          shipping_fee?: number;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          number?: never;
          paid_at?: string | null;
          shipping_address?: NonNullable<Json>;
          shipping_fee?: number;
          staff_note?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
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
      plans: {
        Row: {
          active: boolean;
          amount: number;
          audience: string;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          created_at: string;
          currency: string;
          description: string | null;
          features_ar: string[];
          features_en: string[];
          id: string;
          name: string;
          position: number;
          rental_slots: number | null;
        };
        Insert: {
          active?: boolean;
          amount: number;
          audience?: string;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          created_at?: string;
          currency?: string;
          description?: string | null;
          features_ar?: string[];
          features_en?: string[];
          id: string;
          name: string;
          position?: number;
          rental_slots?: number | null;
        };
        Update: {
          active?: boolean;
          amount?: number;
          audience?: string;
          billing_interval?: Database["public"]["Enums"]["billing_interval"];
          created_at?: string;
          currency?: string;
          description?: string | null;
          features_ar?: string[];
          features_en?: string[];
          id?: string;
          name?: string;
          position?: number;
          rental_slots?: number | null;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          author_id: string | null;
          body_ar: string;
          body_en: string;
          cover_image: string | null;
          created_at: string;
          excerpt_ar: string | null;
          excerpt_en: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body_ar?: string;
          body_en?: string;
          cover_image?: string | null;
          created_at?: string;
          excerpt_ar?: string | null;
          excerpt_en?: string | null;
          id?: string;
          published_at?: string | null;
          slug: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body_ar?: string;
          body_en?: string;
          cover_image?: string | null;
          created_at?: string;
          excerpt_ar?: string | null;
          excerpt_en?: string | null;
          id?: string;
          published_at?: string | null;
          slug?: string;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          position: number;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          position?: number;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar?: string;
          name_en?: string;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          attributes: NonNullable<Json>;
          created_at: string;
          id: string;
          image: string | null;
          position: number;
          price_override: number | null;
          product_id: string;
          sku: string | null;
          stock_count: number;
        };
        Insert: {
          attributes?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          image?: string | null;
          position?: number;
          price_override?: number | null;
          product_id: string;
          sku?: string | null;
          stock_count?: number;
        };
        Update: {
          attributes?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          image?: string | null;
          position?: number;
          price_override?: number | null;
          product_id?: string;
          sku?: string | null;
          stock_count?: number;
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
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_count: number;
          updated_at: string;
        };
        Insert: {
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
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_count?: number;
          updated_at?: string;
        };
        Update: {
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
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_count?: number;
          updated_at?: string;
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
          calendar_token: string;
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          marketing_opt_in: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          banned_at?: string | null;
          calendar_token?: string;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          marketing_opt_in?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          banned_at?: string | null;
          calendar_token?: string;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          marketing_opt_in?: boolean;
          updated_at?: string;
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
      rentals: {
        Row: {
          due_at: string | null;
          id: string;
          name_ar: string;
          name_en: string;
          product_id: string | null;
          requested_at: string;
          returned_at: string | null;
          staff_note: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["rental_status"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          due_at?: string | null;
          id?: string;
          name_ar: string;
          name_en: string;
          product_id?: string | null;
          requested_at?: string;
          returned_at?: string | null;
          staff_note?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["rental_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          due_at?: string | null;
          id?: string;
          name_ar?: string;
          name_en?: string;
          product_id?: string | null;
          requested_at?: string;
          returned_at?: string | null;
          staff_note?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["rental_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rentals_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
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
      staff_plan: {
        Row: {
          annual_increase_pct: number;
          created_at: string;
          department: string;
          id: string;
          monthly_salary: number;
          role_title: string;
          start_date: string | null;
          status: Database["public"]["Enums"]["staff_plan_status"];
          updated_at: string;
        };
        Insert: {
          annual_increase_pct?: number;
          created_at?: string;
          department: string;
          id?: string;
          monthly_salary: number;
          role_title: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["staff_plan_status"];
          updated_at?: string;
        };
        Update: {
          annual_increase_pct?: number;
          created_at?: string;
          department?: string;
          id?: string;
          monthly_salary?: number;
          role_title?: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["staff_plan_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          free_shipping_threshold: number | null;
          id: boolean;
          shipping_fee: number;
          updated_at: string;
        };
        Insert: {
          free_shipping_threshold?: number | null;
          id?: boolean;
          shipping_fee?: number;
          updated_at?: string;
        };
        Update: {
          free_shipping_threshold?: number | null;
          id?: boolean;
          shipping_fee?: number;
          updated_at?: string;
        };
        Relationships: [];
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
          organization_id: string | null;
          plan_id: string;
          provider: string;
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
          organization_id?: string | null;
          plan_id: string;
          provider: string;
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
          organization_id?: string | null;
          plan_id?: string;
          provider?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
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
      telegram_chats: {
        Row: {
          created_at: string;
          id: number;
          moderated: boolean;
          title: string;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          id: number;
          moderated?: boolean;
          title: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          moderated?: boolean;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      cancel_order: { Args: { order_id: string }; Returns: undefined };
      cancel_rental: { Args: { rental: string }; Returns: undefined };
      complete_order_payment: {
        Args: { order_id: string };
        Returns: undefined;
      };
      create_order: {
        Args: { shipping: Json };
        Returns: {
          created_at: string;
          currency: string;
          id: string;
          number: number;
          paid_at: string | null;
          shipping_address: NonNullable<Json>;
          shipping_fee: number;
          staff_note: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
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
      event_rsvp_count: { Args: { event: string }; Returns: number };
      ledger_monthly_summary: {
        Args: { from_date: string; to_date: string };
        Returns: {
          cogs: number;
          expenses: number;
          month: string;
          revenue: number;
        }[];
      };
      mark_overdue_rentals: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      my_calendar_token: { Args: Record<PropertyKey, never>; Returns: string };
      my_rental_allowance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          in_use: number;
          slots: number;
        }[];
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
      post_journal_entry: {
        Args: {
          description: string;
          entry_date: string;
          lines: Json;
          reference?: string;
        };
        Returns: string;
      };
      request_rental: {
        Args: { rental_product: string };
        Returns: {
          due_at: string | null;
          id: string;
          name_ar: string;
          name_en: string;
          product_id: string | null;
          requested_at: string;
          returned_at: string | null;
          staff_note: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["rental_status"];
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "rentals";
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
      rotate_calendar_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      set_staff_role: {
        Args: {
          new_role: Database["public"]["Enums"]["staff_role"];
          staff_title?: string;
          target: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
      billing_interval: "month" | "year";
      campaign_status: "draft" | "sending" | "sent" | "failed";
      crm_status: "lead" | "customer" | "vip" | "churned";
      equity_holder_type: "founder" | "investor" | "employee" | "advisor";
      order_status:
        | "pending"
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
      product_condition: "new" | "used" | "refurbished" | "open_box";
      product_kind: "sale" | "rental";
      product_status: "draft" | "active" | "archived";
      rental_status:
        | "requested"
        | "active"
        | "returned"
        | "overdue"
        | "cancelled";
      staff_plan_status: "planned" | "hiring" | "active" | "terminated";
      staff_role:
        | "superadmin"
        | "admin"
        | "editor"
        | "finance"
        | "marketing"
        | "support";
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
      telegram_request_status: "open" | "resolved" | "rejected";
      telegram_request_type: "unban" | "support";
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
      campaign_status: ["draft", "sending", "sent", "failed"],
      crm_status: ["lead", "customer", "vip", "churned"],
      equity_holder_type: ["founder", "investor", "employee", "advisor"],
      order_status: [
        "pending",
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
      product_condition: ["new", "used", "refurbished", "open_box"],
      product_kind: ["sale", "rental"],
      product_status: ["draft", "active", "archived"],
      rental_status: [
        "requested",
        "active",
        "returned",
        "overdue",
        "cancelled",
      ],
      staff_plan_status: ["planned", "hiring", "active", "terminated"],
      staff_role: [
        "superadmin",
        "admin",
        "editor",
        "finance",
        "marketing",
        "support",
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
      telegram_request_status: ["open", "resolved", "rejected"],
      telegram_request_type: ["unban", "support"],
    },
  },
} as const;

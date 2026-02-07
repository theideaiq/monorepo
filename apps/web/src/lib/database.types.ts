export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          type: 'sale' | 'rental' | 'auction'; // inferred from context
          category: string; // inferred
          stock_count: number;
          rental_tier: string | null;
          created_at: string;
          updated_at: string;
          details: Json;
          condition: 'new' | 'used' | 'refurbished' | 'open_box'; // inferred
          seller: string;
          is_verified: boolean;
          slug: string | null;
          images: string[] | null;
        };
        Insert: {
          id?: string;
          name: string;
          // ... (omitting insert types for brevity as we primarily read in frontend)
        };
        Update: {
          // ...
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          stock_count: number | null;
          price_override: number | null;
          attributes: Json; // e.g., { color: "Red", size: "L" }
          image_url: string | null;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          total_amount: number;
          shipping_address: Json | null;
          tracking_number: string | null;
          created_at: string;
          gateway_link_id: string | null;
          gateway_provider: string | null;
          gateway_metadata: Json | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          // ... other fields
        };
      };
      rentals: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          due_date: string;
          status: 'active' | 'returned' | 'overdue';
          created_at: string;
          updated_at: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

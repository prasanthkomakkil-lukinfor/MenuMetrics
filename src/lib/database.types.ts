export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise';
export type Role = 'owner' | 'manager' | 'supervisor' | 'waiter' | 'cashier' | 'kitchen';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'zomato' | 'swiggy' | 'qr';
export type OrderStatus = 'active' | 'billed' | 'cancelled';
export type TableStatus = 'free' | 'occupied' | 'reserved' | 'bill_requested' | 'merged';
export type ItemType = 'veg' | 'non_veg' | 'egg';
export type PaymentMode = 'cash' | 'card' | 'upi' | 'zomato_pay' | 'swiggy_pay' | 'loyalty_points' | 'coupon' | 'foc';
export type KOTStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'done';

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          plan: Plan;
          trial_ends_at: string | null;
          logo_url: string | null;
          theme_color: string | null;
          gst_number: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      staff: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          name: string;
          role: Role;
          pin: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          display_order: number;
          is_active: boolean;
          available_from: string | null;
          available_until: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      items: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          item_type: ItemType;
          gst_percent: number;
          hsn_code: string | null;
          photo_url: string | null;
          is_active: boolean;
          is_sold_out: boolean;
          available_dine_in: boolean;
          available_takeaway: boolean;
          available_zomato: boolean;
          available_swiggy: boolean;
          available_qr: boolean;
          recipe_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
      };
      tables: {
        Row: {
          id: string;
          business_id: string;
          section_id: string | null;
          table_number: string;
          capacity: number;
          status: TableStatus;
          qr_code: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tables']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tables']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          business_id: string;
          order_type: OrderType;
          table_id: string | null;
          token_number: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_mobile: string | null;
          staff_id: string | null;
          guest_count: number;
          status: OrderStatus;
          subtotal: number;
          discount_amount: number;
          discount_percent: number;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      bills: {
        Row: {
          id: string;
          business_id: string;
          order_id: string;
          bill_number: string;
          subtotal: number;
          discount_amount: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          total_amount: number;
          payment_status: 'pending' | 'partial' | 'paid';
          paid_amount: number;
          customer_gstin: string | null;
          generated_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bills']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bills']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

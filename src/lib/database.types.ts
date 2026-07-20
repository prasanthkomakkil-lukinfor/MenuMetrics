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
          plan: string;
          trial_ends_at: string | null;
          logo_url: string | null;
          theme_color: string | null;
          gst_number: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          loyalty_points_per_rupee: number;
          loyalty_redemption_rate: number;
          loyalty_gold_threshold: number;
          loyalty_silver_threshold: number;
          cgst_rate: number;
          sgst_rate: number;
          igst_rate: number;
          service_charge_rate: number;
          enable_service_charge: boolean;
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
          role: string;
          pin: string | null;
          is_active: boolean;
          permissions: string[] | null;
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
          stock_qty: number | null;
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
          status: string;
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
          order_type: string;
          table_id: string | null;
          token_number: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_mobile: string | null;
          staff_id: string | null;
          guest_count: number;
          status: string;
          subtotal: number;
          discount_amount: number;
          discount_percent: number;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
          delivery_address: string | null;
          delivery_instructions: string | null;
          delivery_charge: number;
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
          payment_status: string;
          paid_amount: number;
          customer_gstin: string | null;
          generated_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bills']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bills']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string | null;
          mobile: string | null;
          email: string | null;
          birthday: string | null;
          anniversary: string | null;
          total_visits: number;
          total_spent: number;
          loyalty_points: number;
          loyalty_tier: string;
          last_visit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      kots: {
        Row: {
          id: string;
          business_id: string;
          order_id: string;
          kot_number: string;
          kot_type: string;
          status: string;
          created_by: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['kots']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['kots']['Insert']>;
      };
      reservations: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          customer_name: string;
          customer_mobile: string;
          email: string | null;
          party_size: number;
          reservation_date: string;
          reservation_time: string;
          table_id: string | null;
          section_id: string | null;
          special_requests: string | null;
          status: string;
          auto_release_minutes: number;
          confirmation_sent: boolean;
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>;
      };
      advance_orders: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_mobile: string | null;
          order_date: string;
          order_time: string;
          order_type: string;
          deposit_amount: number;
          total_amount: number;
          special_instructions: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          delivery_address: string | null;
          customer_email: string | null;
          delivery_instructions: string | null;
        };
        Insert: Omit<Database['public']['Tables']['advance_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['advance_orders']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          business_id: string;
          bill_id: string;
          payment_mode: string;
          amount: number;
          reference_number: string | null;
          card_last_4: string | null;
          card_type: string | null;
          upi_ref: string | null;
          approval_code: string | null;
          processed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      table_sections: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['table_sections']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['table_sections']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          item_id: string | null;
          combo_id: string | null;
          item_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          gst_percent: number;
          is_foc: boolean;
          foc_reason: string | null;
          foc_approved_by: string | null;
          kot_status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      ingredients: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          unit: string;
          stock_qty: number;
          reorder_level: number;
          cost_per_unit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ingredients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['ingredients']['Insert']>;
      };
      recipes: {
        Row: {
          id: string;
          business_id: string;
          item_id: string;
          ingredient_id: string;
          quantity_needed: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          ingredient_id: string | null;
          item_id: string | null;
          movement_type: string;
          quantity: number;
          reason: string | null;
          staff_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact_person: string | null;
          mobile: string | null;
          email: string | null;
          address: string | null;
          gstin: string | null;
          lead_time_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      purchase_orders: {
        Row: {
          id: string;
          business_id: string;
          supplier_id: string | null;
          po_number: string;
          status: string;
          total_amount: number;
          expected_delivery: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          item_name: string;
          quantity: number;
          unit: string;
          unit_cost: number;
          total_cost: number;
          received_quantity: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['purchase_order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Insert']>;
      };
      loyalty_transactions: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          bill_id: string | null;
          type: string;
          points: number;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loyalty_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>;
      };
      staff_attendance: {
        Row: {
          id: string;
          business_id: string;
          staff_id: string;
          date: string;
          check_in: string | null;
          check_out: string | null;
          shift: string;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff_attendance']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['staff_attendance']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

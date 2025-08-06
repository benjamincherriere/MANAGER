export interface Database {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          supplier_id: string;
          meeting_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          meeting_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          meeting_date?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      financial_data: {
        Row: {
          id: string;
          date: string;
          revenue: number;
          costs: number;
          margin: number;
          margin_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          revenue: number;
          costs: number;
          margin?: number;
          margin_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          revenue?: number;
          costs?: number;
          margin?: number;
          margin_percentage?: number;
          created_at?: string;
        };
      };
    };
  };
}
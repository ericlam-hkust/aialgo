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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      backtests: {
        Row: {
          annualized_return: number | null
          avg_trade_return: number | null
          benchmark_return: number | null
          commission: number
          created_at: string
          end_date: string
          equity_curve: Json
          id: string
          initial_capital: number
          max_drawdown: number | null
          monthly_returns: Json
          overfitting_score: number
          profit_factor: number | null
          sharpe_ratio: number | null
          slippage: number
          start_date: string
          strategy_id: string | null
          strategy_name: string | null
          symbol: string
          total_return: number | null
          total_trades: number | null
          trades_log: Json
          user_id: string
          win_rate: number | null
        }
        Insert: {
          annualized_return?: number | null
          avg_trade_return?: number | null
          benchmark_return?: number | null
          commission?: number
          created_at?: string
          end_date: string
          equity_curve?: Json
          id?: string
          initial_capital?: number
          max_drawdown?: number | null
          monthly_returns?: Json
          overfitting_score?: number
          profit_factor?: number | null
          sharpe_ratio?: number | null
          slippage?: number
          start_date: string
          strategy_id?: string | null
          strategy_name?: string | null
          symbol: string
          total_return?: number | null
          total_trades?: number | null
          trades_log?: Json
          user_id: string
          win_rate?: number | null
        }
        Update: {
          annualized_return?: number | null
          avg_trade_return?: number | null
          benchmark_return?: number | null
          commission?: number
          created_at?: string
          end_date?: string
          equity_curve?: Json
          id?: string
          initial_capital?: number
          max_drawdown?: number | null
          monthly_returns?: Json
          overfitting_score?: number
          profit_factor?: number | null
          sharpe_ratio?: number | null
          slippage?: number
          start_date?: string
          strategy_id?: string | null
          strategy_name?: string | null
          symbol?: string
          total_return?: number | null
          total_trades?: number | null
          trades_log?: Json
          user_id?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backtests_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_connections: {
        Row: {
          account_balance: number
          broker_name: string
          buying_power: number
          created_at: string
          credentials: Json | null
          id: string
          last_synced_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_balance?: number
          broker_name: string
          buying_power?: number
          created_at?: string
          credentials?: Json | null
          id?: string
          last_synced_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_balance?: number
          broker_name?: string
          buying_power?: number
          created_at?: string
          credentials?: Json | null
          id?: string
          last_synced_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      market_data_daily: {
        Row: {
          close: number
          date: string
          high: number
          id: number
          low: number
          market: string
          open: number
          symbol: string
          volume: number
        }
        Insert: {
          close: number
          date: string
          high: number
          id?: number
          low: number
          market: string
          open: number
          symbol: string
          volume: number
        }
        Update: {
          close?: number
          date?: string
          high?: number
          id?: number
          low?: number
          market?: string
          open?: number
          symbol?: string
          volume?: number
        }
        Relationships: []
      }
      marketplace_subscriptions: {
        Row: {
          creator_id: string | null
          id: string
          price_paid: number
          strategy_id: string
          subscribed_at: string
          subscriber_id: string
        }
        Insert: {
          creator_id?: string | null
          id?: string
          price_paid?: number
          strategy_id: string
          subscribed_at?: string
          subscriber_id: string
        }
        Update: {
          creator_id?: string | null
          id?: string
          price_paid?: number
          strategy_id?: string
          subscribed_at?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_subscriptions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_positions: {
        Row: {
          avg_entry_price: number
          created_at: string
          current_price: number
          id: string
          market: string
          quantity: number
          sector: string | null
          stop_loss: number | null
          strategy_id: string | null
          strategy_name: string | null
          symbol: string
          take_profit: number | null
          unrealized_pnl: number
          unrealized_pnl_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_entry_price: number
          created_at?: string
          current_price: number
          id?: string
          market?: string
          quantity: number
          sector?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol: string
          take_profit?: number | null
          unrealized_pnl?: number
          unrealized_pnl_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_entry_price?: number
          created_at?: string
          current_price?: number
          id?: string
          market?: string
          quantity?: number
          sector?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol?: string
          take_profit?: number | null
          unrealized_pnl?: number
          unrealized_pnl_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_positions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trades: {
        Row: {
          closed_at: string | null
          entry_price: number
          exit_price: number | null
          id: string
          opened_at: string
          order_type: string
          pnl: number
          pnl_percent: number
          quantity: number
          side: string
          status: string
          stop_loss: number | null
          strategy_id: string | null
          strategy_name: string | null
          symbol: string
          take_profit: number | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          entry_price: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          order_type?: string
          pnl?: number
          pnl_percent?: number
          quantity: number
          side: string
          status?: string
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol: string
          take_profit?: number | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          entry_price?: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          order_type?: string
          pnl?: number
          pnl_percent?: number
          quantity?: number
          side?: string
          status?: string
          stop_loss?: number | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol?: string
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          risk_tolerance: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          event_type: string
          id: string
          message: string
          resolved_at: string | null
          severity: string
          strategy_id: string | null
          strategy_name: string | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          event_type: string
          id?: string
          message: string
          resolved_at?: string | null
          severity?: string
          strategy_id?: string | null
          strategy_name?: string | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          event_type?: string
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          strategy_id?: string | null
          strategy_name?: string | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_settings: {
        Row: {
          max_correlated_exposure_pct: number
          max_daily_loss_pct: number
          max_drawdown_pct: number
          max_position_size_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          max_correlated_exposure_pct?: number
          max_daily_loss_pct?: number
          max_drawdown_pct?: number
          max_position_size_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          max_correlated_exposure_pct?: number
          max_daily_loss_pct?: number
          max_drawdown_pct?: number
          max_position_size_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          category: string
          created_at: string
          creator_name: string | null
          description: string | null
          graph: Json
          id: string
          is_public: boolean
          is_template: boolean
          market_condition: string | null
          name: string
          parameters: Json
          parent_strategy_id: string | null
          price: number
          rating: number
          risk_level: string | null
          subscriber_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          creator_name?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_public?: boolean
          is_template?: boolean
          market_condition?: string | null
          name: string
          parameters?: Json
          parent_strategy_id?: string | null
          price?: number
          rating?: number
          risk_level?: string | null
          subscriber_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          creator_name?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_public?: boolean
          is_template?: boolean
          market_condition?: string | null
          name?: string
          parameters?: Json
          parent_strategy_id?: string | null
          price?: number
          rating?: number
          risk_level?: string | null
          subscriber_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_parent_strategy_id_fkey"
            columns: ["parent_strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_deployments: {
        Row: {
          deployed_at: string
          id: string
          status: string
          strategy_id: string
          strategy_name: string
          symbol: string
          total_pnl: number
          trades_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          deployed_at?: string
          id?: string
          status?: string
          strategy_id: string
          strategy_name: string
          symbol?: string
          total_pnl?: number
          trades_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          deployed_at?: string
          id?: string
          status?: string
          strategy_id?: string
          strategy_name?: string
          symbol?: string
          total_pnl?: number
          trades_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_deployments_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "free" | "pro" | "admin"
      risk_tolerance: "conservative" | "moderate" | "aggressive"
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
      app_role: ["free", "pro", "admin"],
      risk_tolerance: ["conservative", "moderate", "aggressive"],
    },
  },
} as const

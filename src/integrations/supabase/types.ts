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
      ai_models: {
        Row: {
          active_users: number
          api_auth_encrypted: string | null
          api_endpoint: string | null
          asset_class: Database["public"]["Enums"]["asset_class"]
          cagr: number
          contributor_id: string
          created_at: string
          currency: string
          description: string
          executions: number
          id: string
          listed_at: string | null
          live_return_30d: number
          max_drawdown: number
          name: string
          package_kind: string
          package_path: string | null
          parameters: Json
          price: number
          pricing_model: Database["public"]["Enums"]["model_pricing_model"]
          rating: number
          rating_count: number
          risk_disclosure: string | null
          risk_level: Database["public"]["Enums"]["model_risk_level"]
          sharpe: number
          slug: string
          status: Database["public"]["Enums"]["model_listing_status"]
          strategy_type: Database["public"]["Enums"]["model_strategy_type"]
          tagline: string | null
          tags: string[]
          timeframe: string
          updated_at: string
          user_id: string | null
          win_rate: number
        }
        Insert: {
          active_users?: number
          api_auth_encrypted?: string | null
          api_endpoint?: string | null
          asset_class?: Database["public"]["Enums"]["asset_class"]
          cagr?: number
          contributor_id: string
          created_at?: string
          currency?: string
          description?: string
          executions?: number
          id?: string
          listed_at?: string | null
          live_return_30d?: number
          max_drawdown?: number
          name: string
          package_kind?: string
          package_path?: string | null
          parameters?: Json
          price?: number
          pricing_model?: Database["public"]["Enums"]["model_pricing_model"]
          rating?: number
          rating_count?: number
          risk_disclosure?: string | null
          risk_level?: Database["public"]["Enums"]["model_risk_level"]
          sharpe?: number
          slug: string
          status?: Database["public"]["Enums"]["model_listing_status"]
          strategy_type?: Database["public"]["Enums"]["model_strategy_type"]
          tagline?: string | null
          tags?: string[]
          timeframe?: string
          updated_at?: string
          user_id?: string | null
          win_rate?: number
        }
        Update: {
          active_users?: number
          api_auth_encrypted?: string | null
          api_endpoint?: string | null
          asset_class?: Database["public"]["Enums"]["asset_class"]
          cagr?: number
          contributor_id?: string
          created_at?: string
          currency?: string
          description?: string
          executions?: number
          id?: string
          listed_at?: string | null
          live_return_30d?: number
          max_drawdown?: number
          name?: string
          package_kind?: string
          package_path?: string | null
          parameters?: Json
          price?: number
          pricing_model?: Database["public"]["Enums"]["model_pricing_model"]
          rating?: number
          rating_count?: number
          risk_disclosure?: string | null
          risk_level?: Database["public"]["Enums"]["model_risk_level"]
          sharpe?: number
          slug?: string
          status?: Database["public"]["Enums"]["model_listing_status"]
          strategy_type?: Database["public"]["Enums"]["model_strategy_type"]
          tagline?: string | null
          tags?: string[]
          timeframe?: string
          updated_at?: string
          user_id?: string | null
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          account_id: string | null
          auto_sync_minutes: number
          broker_name: string
          buying_power: number
          config: Json
          created_at: string
          credentials: Json | null
          credentials_encrypted: string | null
          currency: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          mode: string
          status: string
          user_id: string
        }
        Insert: {
          account_balance?: number
          account_id?: string | null
          auto_sync_minutes?: number
          broker_name: string
          buying_power?: number
          config?: Json
          created_at?: string
          credentials?: Json | null
          credentials_encrypted?: string | null
          currency?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          mode?: string
          status?: string
          user_id: string
        }
        Update: {
          account_balance?: number
          account_id?: string | null
          auto_sync_minutes?: number
          broker_name?: string
          buying_power?: number
          config?: Json
          created_at?: string
          credentials?: Json | null
          credentials_encrypted?: string | null
          currency?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          mode?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      broker_orders: {
        Row: {
          account_id: string | null
          avg_fill_price: number | null
          broker_connection_id: string
          broker_order_id: string
          filled_quantity: number
          id: string
          limit_price: number | null
          order_type: string | null
          placed_at: string | null
          quantity: number
          side: string
          status: string
          symbol: string
          synced_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          avg_fill_price?: number | null
          broker_connection_id: string
          broker_order_id: string
          filled_quantity?: number
          id?: string
          limit_price?: number | null
          order_type?: string | null
          placed_at?: string | null
          quantity?: number
          side: string
          status?: string
          symbol: string
          synced_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          avg_fill_price?: number | null
          broker_connection_id?: string
          broker_order_id?: string
          filled_quantity?: number
          id?: string
          limit_price?: number | null
          order_type?: string | null
          placed_at?: string | null
          quantity?: number
          side?: string
          status?: string
          symbol?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_orders_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_positions: {
        Row: {
          account_id: string | null
          avg_cost: number
          broker_connection_id: string
          currency: string | null
          id: string
          market_price: number
          market_value: number
          quantity: number
          symbol: string
          synced_at: string
          unrealized_pnl: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          avg_cost?: number
          broker_connection_id: string
          currency?: string | null
          id?: string
          market_price?: number
          market_value?: number
          quantity: number
          symbol: string
          synced_at?: string
          unrealized_pnl?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          avg_cost?: number
          broker_connection_id?: string
          currency?: string | null
          id?: string
          market_price?: number
          market_value?: number
          quantity?: number
          symbol?: string
          synced_at?: string
          unrealized_pnl?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_positions_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          payout_email: string | null
          payout_status: string
          stripe_account_id: string | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          handle: string
          id?: string
          payout_email?: string | null
          payout_status?: string
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          payout_email?: string | null
          payout_status?: string
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      creator_payouts: {
        Row: {
          created_at: string
          creator_id: string
          currency: string
          fee_amount: number
          fee_rate: number
          gross_amount: number
          id: string
          net_amount: number
          status: string
          strategy_id: string | null
          strategy_name: string | null
          subscriber_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          currency?: string
          fee_amount?: number
          fee_rate?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          status?: string
          strategy_id?: string | null
          strategy_name?: string | null
          subscriber_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          currency?: string
          fee_amount?: number
          fee_rate?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          status?: string
          strategy_id?: string | null
          strategy_name?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_connections: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          enabled: boolean
          id: string
          key_suffix: string | null
          label: string | null
          last_checked_at: string | null
          priority: number
          provider: string
          status: string
          status_message: string | null
          updated_at: string
          use_platform_key: boolean
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          key_suffix?: string | null
          label?: string | null
          last_checked_at?: string | null
          priority?: number
          provider: string
          status?: string
          status_message?: string | null
          updated_at?: string
          use_platform_key?: boolean
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          key_suffix?: string | null
          label?: string | null
          last_checked_at?: string | null
          priority?: number
          provider?: string
          status?: string
          status_message?: string | null
          updated_at?: string
          use_platform_key?: boolean
          user_id?: string
        }
        Relationships: []
      }
      data_sync_runs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          id: string
          kind: string
          provider: string
          range_end: string | null
          range_start: string | null
          rows_written: number
          status: string
          symbol: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          kind: string
          provider: string
          range_end?: string | null
          range_start?: string | null
          rows_written?: number
          status?: string
          symbol?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          kind?: string
          provider?: string
          range_end?: string | null
          range_start?: string | null
          rows_written?: number
          status?: string
          symbol?: string | null
          user_id?: string | null
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
      market_data_intraday: {
        Row: {
          close: number
          high: number
          id: number
          interval: string
          low: number
          open: number
          provider: string | null
          symbol: string
          ts: string
          volume: number
        }
        Insert: {
          close: number
          high: number
          id?: number
          interval: string
          low: number
          open: number
          provider?: string | null
          symbol: string
          ts: string
          volume?: number
        }
        Update: {
          close?: number
          high?: number
          id?: number
          interval?: string
          low?: number
          open?: number
          provider?: string | null
          symbol?: string
          ts?: string
          volume?: number
        }
        Relationships: []
      }
      market_quotes: {
        Row: {
          change_pct: number | null
          currency: string | null
          day_high: number | null
          day_low: number | null
          day_open: number | null
          prev_close: number | null
          price: number
          provider: string | null
          quoted_at: string
          symbol: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          change_pct?: number | null
          currency?: string | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          prev_close?: number | null
          price: number
          provider?: string | null
          quoted_at?: string
          symbol: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          change_pct?: number | null
          currency?: string | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          prev_close?: number | null
          price?: number
          provider?: string | null
          quoted_at?: string
          symbol?: string
          updated_at?: string
          volume?: number | null
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
      model_activations: {
        Row: {
          activated_at: string
          broker_connection_id: string | null
          capital_allocation: number
          daily_loss_limit_pct: number
          id: string
          max_position_size_pct: number
          mode: string
          model_id: string
          parameters: Json
          pnl: number
          pnl_pct: number
          purchase_id: string | null
          status: string
          stop_loss_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          broker_connection_id?: string | null
          capital_allocation?: number
          daily_loss_limit_pct?: number
          id?: string
          max_position_size_pct?: number
          mode?: string
          model_id: string
          parameters?: Json
          pnl?: number
          pnl_pct?: number
          purchase_id?: string | null
          status?: string
          stop_loss_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          broker_connection_id?: string | null
          capital_allocation?: number
          daily_loss_limit_pct?: number
          id?: string
          max_position_size_pct?: number
          mode?: string
          model_id?: string
          parameters?: Json
          pnl?: number
          pnl_pct?: number
          purchase_id?: string | null
          status?: string
          stop_loss_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_activations_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_activations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_activations_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "model_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      model_metrics: {
        Row: {
          created_at: string
          id: string
          kind: string
          model_id: string
          monthly_returns: Json
          series: Json
          stats: Json
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          model_id: string
          monthly_returns?: Json
          series?: Json
          stats?: Json
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          model_id?: string
          monthly_returns?: Json
          series?: Json
          stats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "model_metrics_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          environment: string
          id: string
          model_id: string
          pricing_model: Database["public"]["Enums"]["model_pricing_model"]
          status: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          model_id: string
          pricing_model: Database["public"]["Enums"]["model_pricing_model"]
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          model_id?: string
          pricing_model?: Database["public"]["Enums"]["model_pricing_model"]
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_purchases_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          model_id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          model_id: string
          rating: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          model_id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_reviews_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_submissions: {
        Row: {
          created_at: string
          id: string
          model_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["model_listing_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["model_listing_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["model_listing_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_submissions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_transactions: {
        Row: {
          buyer_id: string | null
          commission_amount: number
          commission_rate: number
          contributor_id: string | null
          created_at: string
          currency: string
          gross_amount: number
          id: string
          kind: string
          model_id: string | null
          model_name: string | null
          net_amount: number
          payout_batch_id: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          commission_amount?: number
          commission_rate?: number
          contributor_id?: string | null
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          kind?: string
          model_id?: string | null
          model_name?: string | null
          net_amount?: number
          payout_batch_id?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          commission_amount?: number
          commission_rate?: number
          contributor_id?: string | null
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          kind?: string
          model_id?: string | null
          model_name?: string | null
          net_amount?: number
          payout_batch_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_transactions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          changelog: string
          created_at: string
          id: string
          is_current: boolean
          model_id: string
          released_at: string
          version: string
        }
        Insert: {
          changelog?: string
          created_at?: string
          id?: string
          is_current?: boolean
          model_id: string
          released_at?: string
          version: string
        }
        Update: {
          changelog?: string
          created_at?: string
          id?: string
          is_current?: boolean
          model_id?: string
          released_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
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
      payout_batches: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          period: string
          status: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id: string | null
        }
        Insert: {
          amount?: number
          contributor_id: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          period: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          period?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_batches_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ai_calls: number
          backtests_run: number
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_calls?: number
          backtests_run?: number
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_calls?: number
          backtests_run?: number
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_wallets: {
        Row: {
          balance: number
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          updated_at?: string
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
      my_plan_tier: {
        Args: { _env?: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
    }
    Enums: {
      app_role: "free" | "pro" | "admin"
      asset_class: "stocks" | "crypto" | "forex" | "futures"
      model_listing_status:
        | "draft"
        | "pending_review"
        | "backtest_validation"
        | "paper_trading"
        | "live"
        | "rejected"
        | "paused"
        | "delisted"
      model_pricing_model: "one_time" | "subscription" | "per_signal"
      model_risk_level: "low" | "medium" | "high"
      model_strategy_type:
        | "momentum"
        | "mean_reversion"
        | "ml_signal"
        | "arbitrage"
      payout_status: "pending" | "processing" | "paid" | "failed"
      plan_tier: "free" | "pro" | "elite"
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
      asset_class: ["stocks", "crypto", "forex", "futures"],
      model_listing_status: [
        "draft",
        "pending_review",
        "backtest_validation",
        "paper_trading",
        "live",
        "rejected",
        "paused",
        "delisted",
      ],
      model_pricing_model: ["one_time", "subscription", "per_signal"],
      model_risk_level: ["low", "medium", "high"],
      model_strategy_type: [
        "momentum",
        "mean_reversion",
        "ml_signal",
        "arbitrage",
      ],
      payout_status: ["pending", "processing", "paid", "failed"],
      plan_tier: ["free", "pro", "elite"],
      risk_tolerance: ["conservative", "moderate", "aggressive"],
    },
  },
} as const

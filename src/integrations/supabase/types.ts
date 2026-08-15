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
          avg_fee_per_trade: number | null
          avg_holding_hours: number
          avg_monthly_fee_per_1k: number | null
          backtest_config: Json
          backtest_ran_at: string | null
          base_model_id: string | null
          base_version: string | null
          cagr: number
          consistency_score: number
          contributor_id: string
          created_at: string
          currency: string
          data_source_id: string | null
          data_source_kind: string
          data_source_label: string | null
          declared_frequency: Database["public"]["Enums"]["frequency_class"]
          description: string
          divergence_flagged: boolean
          executions: number
          fee_able_rate: number | null
          finetune_method: string | null
          gateway_secret_hash: string | null
          hosting_mode: Database["public"]["Enums"]["hosting_mode"]
          id: string
          interface_manifest: Json
          last_validated_at: string | null
          listed_at: string | null
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          live_return_30d: number
          live_since: string | null
          loss_rate: number
          max_drawdown: number
          measured_frequency:
            | Database["public"]["Enums"]["frequency_class"]
            | null
          measured_latency_ms: number
          name: string
          next_revalidation_at: string | null
          overfitting_risk: boolean
          package_kind: string
          package_path: string | null
          parameters: Json
          performance_fee_pct: number
          pipeline: Json | null
          price: number
          pricing_model: Database["public"]["Enums"]["model_pricing_model"]
          pricing_score: number | null
          profit_factor: number
          promoted: boolean
          rating: number
          rating_count: number
          resources: Json | null
          risk_disclosure: string | null
          risk_level: Database["public"]["Enums"]["model_risk_level"]
          sandbox_runs_used: number
          sharpe: number
          slug: string
          status: Database["public"]["Enums"]["model_listing_status"]
          strategy_id: string | null
          strategy_type: Database["public"]["Enums"]["model_strategy_type"]
          suggested_price: number | null
          tagline: string | null
          tags: string[]
          team_id: string | null
          timeframe: string
          total_return: number
          total_trades: number
          trust_tier: Database["public"]["Enums"]["trust_tier"]
          updated_at: string
          user_id: string | null
          validation_job_id: string | null
          visibility: Database["public"]["Enums"]["model_visibility"]
          win_rate: number
        }
        Insert: {
          active_users?: number
          api_auth_encrypted?: string | null
          api_endpoint?: string | null
          asset_class?: Database["public"]["Enums"]["asset_class"]
          avg_fee_per_trade?: number | null
          avg_holding_hours?: number
          avg_monthly_fee_per_1k?: number | null
          backtest_config?: Json
          backtest_ran_at?: string | null
          base_model_id?: string | null
          base_version?: string | null
          cagr?: number
          consistency_score?: number
          contributor_id: string
          created_at?: string
          currency?: string
          data_source_id?: string | null
          data_source_kind?: string
          data_source_label?: string | null
          declared_frequency?: Database["public"]["Enums"]["frequency_class"]
          description?: string
          divergence_flagged?: boolean
          executions?: number
          fee_able_rate?: number | null
          finetune_method?: string | null
          gateway_secret_hash?: string | null
          hosting_mode?: Database["public"]["Enums"]["hosting_mode"]
          id?: string
          interface_manifest?: Json
          last_validated_at?: string | null
          listed_at?: string | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          live_return_30d?: number
          live_since?: string | null
          loss_rate?: number
          max_drawdown?: number
          measured_frequency?:
            | Database["public"]["Enums"]["frequency_class"]
            | null
          measured_latency_ms?: number
          name: string
          next_revalidation_at?: string | null
          overfitting_risk?: boolean
          package_kind?: string
          package_path?: string | null
          parameters?: Json
          performance_fee_pct?: number
          pipeline?: Json | null
          price?: number
          pricing_model?: Database["public"]["Enums"]["model_pricing_model"]
          pricing_score?: number | null
          profit_factor?: number
          promoted?: boolean
          rating?: number
          rating_count?: number
          resources?: Json | null
          risk_disclosure?: string | null
          risk_level?: Database["public"]["Enums"]["model_risk_level"]
          sandbox_runs_used?: number
          sharpe?: number
          slug: string
          status?: Database["public"]["Enums"]["model_listing_status"]
          strategy_id?: string | null
          strategy_type?: Database["public"]["Enums"]["model_strategy_type"]
          suggested_price?: number | null
          tagline?: string | null
          tags?: string[]
          team_id?: string | null
          timeframe?: string
          total_return?: number
          total_trades?: number
          trust_tier?: Database["public"]["Enums"]["trust_tier"]
          updated_at?: string
          user_id?: string | null
          validation_job_id?: string | null
          visibility?: Database["public"]["Enums"]["model_visibility"]
          win_rate?: number
        }
        Update: {
          active_users?: number
          api_auth_encrypted?: string | null
          api_endpoint?: string | null
          asset_class?: Database["public"]["Enums"]["asset_class"]
          avg_fee_per_trade?: number | null
          avg_holding_hours?: number
          avg_monthly_fee_per_1k?: number | null
          backtest_config?: Json
          backtest_ran_at?: string | null
          base_model_id?: string | null
          base_version?: string | null
          cagr?: number
          consistency_score?: number
          contributor_id?: string
          created_at?: string
          currency?: string
          data_source_id?: string | null
          data_source_kind?: string
          data_source_label?: string | null
          declared_frequency?: Database["public"]["Enums"]["frequency_class"]
          description?: string
          divergence_flagged?: boolean
          executions?: number
          fee_able_rate?: number | null
          finetune_method?: string | null
          gateway_secret_hash?: string | null
          hosting_mode?: Database["public"]["Enums"]["hosting_mode"]
          id?: string
          interface_manifest?: Json
          last_validated_at?: string | null
          listed_at?: string | null
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          live_return_30d?: number
          live_since?: string | null
          loss_rate?: number
          max_drawdown?: number
          measured_frequency?:
            | Database["public"]["Enums"]["frequency_class"]
            | null
          measured_latency_ms?: number
          name?: string
          next_revalidation_at?: string | null
          overfitting_risk?: boolean
          package_kind?: string
          package_path?: string | null
          parameters?: Json
          performance_fee_pct?: number
          pipeline?: Json | null
          price?: number
          pricing_model?: Database["public"]["Enums"]["model_pricing_model"]
          pricing_score?: number | null
          profit_factor?: number
          promoted?: boolean
          rating?: number
          rating_count?: number
          resources?: Json | null
          risk_disclosure?: string | null
          risk_level?: Database["public"]["Enums"]["model_risk_level"]
          sandbox_runs_used?: number
          sharpe?: number
          slug?: string
          status?: Database["public"]["Enums"]["model_listing_status"]
          strategy_id?: string | null
          strategy_type?: Database["public"]["Enums"]["model_strategy_type"]
          suggested_price?: number | null
          tagline?: string | null
          tags?: string[]
          team_id?: string | null
          timeframe?: string
          total_return?: number
          total_trades?: number
          trust_tier?: Database["public"]["Enums"]["trust_tier"]
          updated_at?: string
          user_id?: string | null
          validation_job_id?: string | null
          visibility?: Database["public"]["Enums"]["model_visibility"]
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_base_model_id_fkey"
            columns: ["base_model_id"]
            isOneToOne: false
            referencedRelation: "base_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_source_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_changelog: {
        Row: {
          body: string
          breaking: boolean
          created_at: string
          deprecation_notice: string | null
          id: string
          kind: string
          released_at: string
          sunset_on: string | null
          title: string
          version: string
        }
        Insert: {
          body: string
          breaking?: boolean
          created_at?: string
          deprecation_notice?: string | null
          id?: string
          kind?: string
          released_at?: string
          sunset_on?: string | null
          title: string
          version: string
        }
        Update: {
          body?: string
          breaking?: boolean
          created_at?: string
          deprecation_notice?: string | null
          id?: string
          kind?: string
          released_at?: string
          sunset_on?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      api_incidents: {
        Row: {
          component: string
          created_at: string
          id: string
          impact: string
          resolved_at: string | null
          started_at: string
          status: string
          summary: string
          title: string
          uptime_pct: number
        }
        Insert: {
          component?: string
          created_at?: string
          id?: string
          impact?: string
          resolved_at?: string | null
          started_at?: string
          status?: string
          summary: string
          title: string
          uptime_pct?: number
        }
        Update: {
          component?: string
          created_at?: string
          id?: string
          impact?: string
          resolved_at?: string | null
          started_at?: string
          status?: string
          summary?: string
          title?: string
          uptime_pct?: number
        }
        Relationships: []
      }
      approvals: {
        Row: {
          change_kind: string
          created_at: string
          decided_at: string | null
          deployment_id: string | null
          diff: string
          id: string
          release_id: string | null
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          change_kind?: string
          created_at?: string
          decided_at?: string | null
          deployment_id?: string | null
          diff?: string
          id?: string
          release_id?: string | null
          status?: string
          summary?: string
          user_id: string
        }
        Update: {
          change_kind?: string
          created_at?: string
          decided_at?: string | null
          deployment_id?: string | null
          diff?: string
          id?: string
          release_id?: string | null
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
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
      backtest_jobs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          eta_seconds: number
          failure_code: string | null
          failure_reason: string | null
          id: string
          kind: string
          model_id: string | null
          model_version: string
          progress: number
          protocol: Json
          results: Json | null
          stage: string
          stage_message: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          eta_seconds?: number
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          kind?: string
          model_id?: string | null
          model_version?: string
          progress?: number
          protocol?: Json
          results?: Json | null
          stage?: string
          stage_message?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          eta_seconds?: number
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          kind?: string
          model_id?: string | null
          model_version?: string
          progress?: number
          protocol?: Json
          results?: Json | null
          stage?: string
          stage_message?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_jobs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
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
      base_models: {
        Row: {
          architecture: string
          baseline_metrics: Json
          compute_estimate: string
          created_at: string
          data_end: string | null
          data_start: string | null
          description: string
          docs: string
          feature_schema: Json
          frozen: Json
          id: string
          instruments: string[]
          listing_kind: string
          name: string
          package_contents: Json
          recommended_settings: Json
          tagline: string
          timeframes: string[]
          trainable: Json
          updated_at: string
          version: string
        }
        Insert: {
          architecture: string
          baseline_metrics?: Json
          compute_estimate?: string
          created_at?: string
          data_end?: string | null
          data_start?: string | null
          description?: string
          docs?: string
          feature_schema?: Json
          frozen?: Json
          id: string
          instruments?: string[]
          listing_kind?: string
          name: string
          package_contents?: Json
          recommended_settings?: Json
          tagline?: string
          timeframes?: string[]
          trainable?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          architecture?: string
          baseline_metrics?: Json
          compute_estimate?: string
          created_at?: string
          data_end?: string | null
          data_start?: string | null
          description?: string
          docs?: string
          feature_schema?: Json
          frozen?: Json
          id?: string
          instruments?: string[]
          listing_kind?: string
          name?: string
          package_contents?: Json
          recommended_settings?: Json
          tagline?: string
          timeframes?: string[]
          trainable?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      broker_connections: {
        Row: {
          account_balance: number
          account_id: string | null
          auth_status: string
          auto_sync_minutes: number
          broker_name: string
          buying_power: number
          config: Json
          created_at: string
          credentials: Json | null
          currency: string
          id: string
          is_default: boolean
          last_error: string | null
          last_synced_at: string | null
          linking_mode: string
          mode: string
          nickname: string | null
          scope: string | null
          status: string
          token_ref: string | null
          user_id: string
        }
        Insert: {
          account_balance?: number
          account_id?: string | null
          auth_status?: string
          auto_sync_minutes?: number
          broker_name: string
          buying_power?: number
          config?: Json
          created_at?: string
          credentials?: Json | null
          currency?: string
          id?: string
          is_default?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          linking_mode?: string
          mode?: string
          nickname?: string | null
          scope?: string | null
          status?: string
          token_ref?: string | null
          user_id: string
        }
        Update: {
          account_balance?: number
          account_id?: string | null
          auth_status?: string
          auto_sync_minutes?: number
          broker_name?: string
          buying_power?: number
          config?: Json
          created_at?: string
          credentials?: Json | null
          currency?: string
          id?: string
          is_default?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          linking_mode?: string
          mode?: string
          nickname?: string | null
          scope?: string | null
          status?: string
          token_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      broker_orders: {
        Row: {
          account_id: string | null
          activation_id: string | null
          avg_fill_price: number | null
          broker_connection_id: string
          broker_order_id: string
          client_order_id: string | null
          filled_quantity: number
          id: string
          limit_price: number | null
          model_id: string | null
          order_type: string | null
          placed_at: string | null
          placed_by_user_id: string | null
          quantity: number
          reject_reason: string | null
          side: string
          source: string
          status: string
          strategy_id: string | null
          symbol: string
          synced_at: string
          time_in_force: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          activation_id?: string | null
          avg_fill_price?: number | null
          broker_connection_id: string
          broker_order_id: string
          client_order_id?: string | null
          filled_quantity?: number
          id?: string
          limit_price?: number | null
          model_id?: string | null
          order_type?: string | null
          placed_at?: string | null
          placed_by_user_id?: string | null
          quantity?: number
          reject_reason?: string | null
          side: string
          source?: string
          status?: string
          strategy_id?: string | null
          symbol: string
          synced_at?: string
          time_in_force?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          activation_id?: string | null
          avg_fill_price?: number | null
          broker_connection_id?: string
          broker_order_id?: string
          client_order_id?: string | null
          filled_quantity?: number
          id?: string
          limit_price?: number | null
          model_id?: string | null
          order_type?: string | null
          placed_at?: string | null
          placed_by_user_id?: string | null
          quantity?: number
          reject_reason?: string | null
          side?: string
          source?: string
          status?: string
          strategy_id?: string | null
          symbol?: string
          synced_at?: string
          time_in_force?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_orders_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "model_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_orders_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_orders_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_orders_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
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
      compliance_acks: {
        Row: {
          acknowledged_at: string
          id: string
          reference: string | null
          scope: string
          user_id: string
          version: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          reference?: string | null
          scope: string
          user_id: string
          version?: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          reference?: string | null
          scope?: string
          user_id?: string
          version?: string
        }
        Relationships: []
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
          kyc_status: string
          payout_email: string | null
          payout_status: string
          stripe_account_id: string | null
          tax_form_status: string
          tax_form_submitted_at: string | null
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
          kyc_status?: string
          payout_email?: string | null
          payout_status?: string
          stripe_account_id?: string | null
          tax_form_status?: string
          tax_form_submitted_at?: string | null
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
          kyc_status?: string
          payout_email?: string | null
          payout_status?: string
          stripe_account_id?: string | null
          tax_form_status?: string
          tax_form_submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      data_catalog: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          coverage_end: string
          coverage_start: string
          created_at: string
          display_name: string
          fields: string[]
          id: string
          market: string
          notes: string | null
          provider: string
          row_count: number
          symbol: string
          timeframes: string[]
          update_frequency: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          coverage_end: string
          coverage_start: string
          created_at?: string
          display_name: string
          fields?: string[]
          id?: string
          market: string
          notes?: string | null
          provider?: string
          row_count?: number
          symbol: string
          timeframes?: string[]
          update_frequency?: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          coverage_end?: string
          coverage_start?: string
          created_at?: string
          display_name?: string
          fields?: string[]
          id?: string
          market?: string
          notes?: string | null
          provider?: string
          row_count?: number
          symbol?: string
          timeframes?: string[]
          update_frequency?: string
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          admin_notes: string | null
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at: string
          id: string
          provider_hint: string | null
          reason: string | null
          status: string
          symbol: string
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          id?: string
          provider_hint?: string | null
          reason?: string | null
          status?: string
          symbol: string
          timeframe: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          id?: string
          provider_hint?: string | null
          reason?: string | null
          status?: string
          symbol?: string
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_source_connections: {
        Row: {
          api_key_encrypted: string | null
          broker_connection_id: string | null
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
          broker_connection_id?: string | null
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
          broker_connection_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "data_source_connections_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
        ]
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
      deployment_events: {
        Row: {
          created_at: string
          deployment_id: string | null
          from_version: string | null
          id: string
          message: string | null
          phase: string
          status: string
          to_version: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment_id?: string | null
          from_version?: string | null
          id?: string
          message?: string | null
          phase: string
          status?: string
          to_version?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deployment_id?: string | null
          from_version?: string | null
          id?: string
          message?: string | null
          phase?: string
          status?: string
          to_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_events_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          agent_token_hash: string | null
          channel: string
          created_at: string
          host_kind: string
          id: string
          last_heartbeat_at: string | null
          last_known_good_version: string | null
          machine_label: string
          notes: string | null
          package_version: string
          pinned_version: string | null
          status: string
          strategy_id: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_token_hash?: string | null
          channel?: string
          created_at?: string
          host_kind?: string
          id?: string
          last_heartbeat_at?: string | null
          last_known_good_version?: string | null
          machine_label: string
          notes?: string | null
          package_version?: string
          pinned_version?: string | null
          status?: string
          strategy_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_token_hash?: string | null
          channel?: string
          created_at?: string
          host_kind?: string
          id?: string
          last_heartbeat_at?: string | null
          last_known_good_version?: string | null
          machine_label?: string
          notes?: string | null
          package_version?: string
          pinned_version?: string | null
          status?: string
          strategy_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      execution_orders: {
        Row: {
          activation_id: string
          broker_connection_id: string | null
          broker_order_id: string | null
          created_at: string
          id: string
          notional: number
          price: number
          quantity: number
          realized_pnl: number
          side: string
          signal_id: string | null
          source: string
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          activation_id: string
          broker_connection_id?: string | null
          broker_order_id?: string | null
          created_at?: string
          id?: string
          notional?: number
          price?: number
          quantity?: number
          realized_pnl?: number
          side: string
          signal_id?: string | null
          source?: string
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          activation_id?: string
          broker_connection_id?: string | null
          broker_order_id?: string | null
          created_at?: string
          id?: string
          notional?: number
          price?: number
          quantity?: number
          realized_pnl?: number
          side?: string
          signal_id?: string | null
          source?: string
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_orders_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "model_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_orders_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_orders_broker_order_id_fkey"
            columns: ["broker_order_id"]
            isOneToOne: false
            referencedRelation: "broker_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_orders_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "execution_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_signals: {
        Row: {
          action: string
          activation_id: string
          block_reason: string | null
          confidence: number
          created_at: string
          id: string
          model_id: string | null
          position_size_pct: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          user_id: string
        }
        Insert: {
          action: string
          activation_id: string
          block_reason?: string | null
          confidence?: number
          created_at?: string
          id?: string
          model_id?: string | null
          position_size_pct?: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          user_id: string
        }
        Update: {
          action?: string
          activation_id?: string
          block_reason?: string | null
          confidence?: number
          created_at?: string
          id?: string
          model_id?: string | null
          position_size_pct?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_signals_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "model_activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_signals_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_tune_jobs: {
        Row: {
          backtest_job_id: string | null
          base_model_id: string
          base_version: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          instruments: string[]
          loss_curve: Json
          model_id: string | null
          params: Json
          progress: number
          stage: string
          stage_message: string
          started_at: string
          status: string
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backtest_job_id?: string | null
          base_model_id: string
          base_version?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          instruments?: string[]
          loss_curve?: Json
          model_id?: string | null
          params?: Json
          progress?: number
          stage?: string
          stage_message?: string
          started_at?: string
          status?: string
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backtest_job_id?: string | null
          base_model_id?: string
          base_version?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          instruments?: string[]
          loss_curve?: Json
          model_id?: string | null
          params?: Json
          progress?: number
          stage?: string
          stage_message?: string
          started_at?: string
          status?: string
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fine_tune_jobs_base_model_id_fkey"
            columns: ["base_model_id"]
            isOneToOne: false
            referencedRelation: "base_models"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          high: number
          id: string
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
          created_at?: string
          high: number
          id?: string
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
          created_at?: string
          high?: number
          id?: string
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
      model_activations: {
        Row: {
          activated_at: string
          auto_upgrade: boolean
          broker_connection_id: string | null
          capital_allocation: number
          daily_loss_limit_pct: number
          executions_count: number
          id: string
          kill_switch_drawdown_pct: number
          last_signal_at: string | null
          max_open_positions: number
          max_position_size_pct: number
          mode: string
          model_id: string
          parameters: Json
          paused_at: string | null
          paused_reason: string | null
          peak_equity: number
          pinned_version: string | null
          pnl: number
          pnl_pct: number
          purchase_id: string | null
          signals_consumed: number
          status: string
          stop_loss_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          auto_upgrade?: boolean
          broker_connection_id?: string | null
          capital_allocation?: number
          daily_loss_limit_pct?: number
          executions_count?: number
          id?: string
          kill_switch_drawdown_pct?: number
          last_signal_at?: string | null
          max_open_positions?: number
          max_position_size_pct?: number
          mode?: string
          model_id: string
          parameters?: Json
          paused_at?: string | null
          paused_reason?: string | null
          peak_equity?: number
          pinned_version?: string | null
          pnl?: number
          pnl_pct?: number
          purchase_id?: string | null
          signals_consumed?: number
          status?: string
          stop_loss_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          auto_upgrade?: boolean
          broker_connection_id?: string | null
          capital_allocation?: number
          daily_loss_limit_pct?: number
          executions_count?: number
          id?: string
          kill_switch_drawdown_pct?: number
          last_signal_at?: string | null
          max_open_positions?: number
          max_position_size_pct?: number
          mode?: string
          model_id?: string
          parameters?: Json
          paused_at?: string | null
          paused_reason?: string | null
          peak_equity?: number
          pinned_version?: string | null
          pnl?: number
          pnl_pct?: number
          purchase_id?: string | null
          signals_consumed?: number
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
      model_reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          days_active: number
          id: string
          model_id: string
          rating: number
          user_id: string | null
          verified: boolean
        }
        Insert: {
          author_name?: string
          comment?: string
          created_at?: string
          days_active?: number
          id?: string
          model_id: string
          rating: number
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          days_active?: number
          id?: string
          model_id?: string
          rating?: number
          user_id?: string | null
          verified?: boolean
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
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
          base_currency: string
          bio: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notify_fills: boolean
          notify_payouts: boolean
          notify_risk: boolean
          onboarding_completed: boolean
          preferred_language: string
          risk_tolerance: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_currency?: string
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          notify_fills?: boolean
          notify_payouts?: boolean
          notify_risk?: boolean
          onboarding_completed?: boolean
          preferred_language?: string
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_currency?: string
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notify_fills?: boolean
          notify_payouts?: boolean
          notify_risk?: boolean
          onboarding_completed?: boolean
          preferred_language?: string
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance"]
          subscription_tier?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      releases: {
        Row: {
          artifact_hash: string | null
          changelog: string
          channel: string
          created_at: string
          id: string
          kind: string
          min_tier: string
          published_at: string
          signature: string | null
          title: string
          version: string
        }
        Insert: {
          artifact_hash?: string | null
          changelog?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          min_tier?: string
          published_at?: string
          signature?: string | null
          title: string
          version: string
        }
        Update: {
          artifact_hash?: string | null
          changelog?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          min_tier?: string
          published_at?: string
          signature?: string | null
          title?: string
          version?: string
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
          code: string | null
          code_mode: string
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
          code?: string | null
          code_mode?: string
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
          code?: string | null
          code_mode?: string
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
      sync_consents: {
        Row: {
          accepted_at: string | null
          created_at: string
          enabled: boolean
          scope: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          enabled?: boolean
          scope?: string
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          enabled?: boolean
          scope?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      team_api_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          team_id: string
          token_hash: string
          token_prefix: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          team_id: string
          token_hash: string
          token_prefix: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          team_id?: string
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_api_tokens_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      update_policies: {
        Row: {
          auto_rollback: boolean
          canary_pct: number
          created_at: string
          infra_patches: string
          logic_changes: string
          paper_run_first: boolean
          param_bound_pct: number
          parameter_changes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_rollback?: boolean
          canary_pct?: number
          created_at?: string
          infra_patches?: string
          logic_changes?: string
          paper_run_first?: boolean
          param_bound_pct?: number
          parameter_changes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_rollback?: boolean
          canary_pct?: number
          created_at?: string
          infra_patches?: string
          logic_changes?: string
          paper_run_first?: boolean
          param_bound_pct?: number
          parameter_changes?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_model: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_model: {
        Args: { _model_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      my_plan_tier: {
        Args: { _env?: string }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      team_role_of: {
        Args: { _team_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
    }
    Enums: {
      app_role: "free" | "pro" | "admin"
      asset_class: "stocks" | "crypto" | "forex" | "futures"
      frequency_class: "hft" | "intraday" | "swing" | "position"
      hosting_mode: "hosted" | "remote"
      listing_kind: "algo" | "ai_model"
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
      model_visibility: "public" | "unlisted" | "private"
      payout_status: "pending" | "processing" | "paid" | "failed"
      plan_tier: "free" | "pro" | "elite"
      risk_tolerance: "conservative" | "moderate" | "aggressive"
      team_role: "owner" | "maintainer" | "viewer"
      trust_tier: "platform_verified" | "live_verified" | "unproven"
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
      frequency_class: ["hft", "intraday", "swing", "position"],
      hosting_mode: ["hosted", "remote"],
      listing_kind: ["algo", "ai_model"],
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
      model_visibility: ["public", "unlisted", "private"],
      payout_status: ["pending", "processing", "paid", "failed"],
      plan_tier: ["free", "pro", "elite"],
      risk_tolerance: ["conservative", "moderate", "aggressive"],
      team_role: ["owner", "maintainer", "viewer"],
      trust_tier: ["platform_verified", "live_verified", "unproven"],
    },
  },
} as const

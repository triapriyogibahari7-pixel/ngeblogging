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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          site_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          site_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          content_id: string
          created_at: string
          editor_id: string
          id: number
          note: string
          snapshot: Json
        }
        Insert: {
          content_id: string
          created_at?: string
          editor_id: string
          id?: never
          note?: string
          snapshot: Json
        }
        Update: {
          content_id?: string
          created_at?: string
          editor_id?: string
          id?: never
          note?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_terms: {
        Row: {
          content_id: string
          created_at: string
          term_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          term_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_terms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          author_id: string
          body_html: string
          body_json: Json
          created_at: string
          excerpt: string
          featured_image_path: string | null
          id: string
          kind: Database["public"]["Enums"]["content_kind"]
          published_at: string | null
          scheduled_at: string | null
          search_vector: unknown
          seo: Json
          site_id: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          author_id: string
          body_html?: string
          body_json?: Json
          created_at?: string
          excerpt?: string
          featured_image_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          published_at?: string | null
          scheduled_at?: string | null
          search_vector?: unknown
          seo?: Json
          site_id: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          author_id?: string
          body_html?: string
          body_json?: Json
          created_at?: string
          excerpt?: string
          featured_image_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          published_at?: string | null
          scheduled_at?: string | null
          search_vector?: unknown
          seo?: Json
          site_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "contents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          bucket_id: string
          bytes: number | null
          created_at: string
          filename: string
          height: number | null
          id: string
          metadata: Json
          mime_type: string
          object_path: string
          site_id: string
          updated_at: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          bucket_id?: string
          bytes?: number | null
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type: string
          object_path: string
          site_id: string
          updated_at?: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          bucket_id?: string
          bytes?: number | null
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string
          object_path?: string
          site_id?: string
          updated_at?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_conversations: {
        Row: {
          context: Json
          created_at: string
          id: string
          site_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          site_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          site_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nara_conversations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nara_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_memories: {
        Row: {
          content_id: string | null
          created_at: string
          embedding: string | null
          id: string
          memory_key: string
          memory_text: string
          metadata: Json
          owner_user_id: string | null
          scope: Database["public"]["Enums"]["memory_scope"]
          site_id: string
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          memory_key: string
          memory_text: string
          metadata?: Json
          owner_user_id?: string | null
          scope: Database["public"]["Enums"]["memory_scope"]
          site_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          memory_key?: string
          memory_text?: string
          metadata?: Json
          owner_user_id?: string | null
          scope?: Database["public"]["Enums"]["memory_scope"]
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nara_memories_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nara_memories_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nara_memories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_messages: {
        Row: {
          citations: Json
          content: string
          conversation_id: string
          created_at: string
          id: number
          model: string | null
          owner_id: string
          role: Database["public"]["Enums"]["nara_message_role"]
          token_count: number | null
        }
        Insert: {
          citations?: Json
          content: string
          conversation_id: string
          created_at?: string
          id?: never
          model?: string | null
          owner_id: string
          role: Database["public"]["Enums"]["nara_message_role"]
          token_count?: number | null
        }
        Update: {
          citations?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: never
          model?: string | null
          owner_id?: string
          role?: Database["public"]["Enums"]["nara_message_role"]
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nara_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "nara_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nara_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_usage_daily: {
        Row: {
          last_intelligence: string | null
          last_model: string | null
          request_count: number
          total_tokens: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          last_intelligence?: string | null
          last_model?: string | null
          request_count?: number
          total_tokens?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          last_intelligence?: string | null
          last_model?: string | null
          request_count?: number
          total_tokens?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nara_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_upgrade_requests: {
        Row: {
          created_at: string
          id: string
          requested_plan: string
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_plan?: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_plan?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          locale: string
          onboarding_completed: boolean
          plan: string
          plan_expires_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id: string
          locale?: string
          onboarding_completed?: boolean
          plan?: string
          plan_expires_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          onboarding_completed?: boolean
          plan?: string
          plan_expires_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          is_primary: boolean
          site_id: string
          status: Database["public"]["Enums"]["domain_status"]
          updated_at: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          is_primary?: boolean
          site_id: string
          status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          site_id?: string
          status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_domains_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["member_role"]
          site_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["member_role"]
          site_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["member_role"]
          site_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_invitations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_members: {
        Row: {
          created_at: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          description: string
          id: string
          is_public: boolean
          locale: string
          name: string
          owner_id: string
          published_at: string | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["site_status"]
          theme_key: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          locale?: string
          name: string
          owner_id: string
          published_at?: string | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["site_status"]
          theme_key?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          locale?: string
          name?: string
          owner_id?: string
          published_at?: string | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["site_status"]
          theme_key?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["term_kind"]
          name: string
          site_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          kind: Database["public"]["Enums"]["term_kind"]
          name: string
          site_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["term_kind"]
          name?: string
          site_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_nara_quota: {
        Args: { requested_intelligence: string; requested_model: string }
        Returns: {
          account_plan: string
          allowed: boolean
          daily_limit: number
          reason: string
          remaining: number
        }[]
      }
    }
    Enums: {
      content_kind: "article" | "page"
      content_status:
        | "draft"
        | "review"
        | "scheduled"
        | "published"
        | "archived"
      content_visibility: "public" | "members" | "private"
      domain_status: "pending" | "verifying" | "active" | "failed"
      member_role:
        | "owner"
        | "admin"
        | "editor"
        | "author"
        | "contributor"
        | "viewer"
      memory_scope: "user" | "site" | "content"
      nara_message_role: "user" | "assistant" | "system" | "tool"
      site_status: "draft" | "active" | "suspended" | "archived"
      term_kind: "category" | "tag"
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
      content_kind: ["article", "page"],
      content_status: ["draft", "review", "scheduled", "published", "archived"],
      content_visibility: ["public", "members", "private"],
      domain_status: ["pending", "verifying", "active", "failed"],
      member_role: [
        "owner",
        "admin",
        "editor",
        "author",
        "contributor",
        "viewer",
      ],
      memory_scope: ["user", "site", "content"],
      nara_message_role: ["user", "assistant", "system", "tool"],
      site_status: ["draft", "active", "suspended", "archived"],
      term_kind: ["category", "tag"],
    },
  },
} as const

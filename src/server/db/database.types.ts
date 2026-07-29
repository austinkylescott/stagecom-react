export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
          theater_id: string | null
          visibility: Database['public']['Enums']['activity_visibility']
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
          theater_id?: string | null
          visibility?: Database['public']['Enums']['activity_visibility']
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
          theater_id?: string | null
          visibility?: Database['public']['Enums']['activity_visibility']
        }
        Relationships: [
          {
            foreignKeyName: 'activity_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      email_outbox: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          payload: Json | null
          sent_at: string | null
          status: Database['public']['Enums']['email_outbox_status']
          template: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: Database['public']['Enums']['email_outbox_status']
          template: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: Database['public']['Enums']['email_outbox_status']
          template?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_outbox_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string
          entity_id: string
          entity_type: Database['public']['Enums']['notification_entity']
          id: string
          payload: Json | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          entity_id: string
          entity_type: Database['public']['Enums']['notification_entity']
          id?: string
          payload?: Json | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          entity_id?: string
          entity_type?: Database['public']['Enums']['notification_entity']
          id?: string
          payload?: Json | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          availability: Json | null
          avatar_url: string | null
          bio: string | null
          casting_notes: string | null
          city: string | null
          contact_links: Json
          created_at: string
          deleted_at: string | null
          display_name: string
          field_visibility: Json
          handle: string | null
          home_theater_id: string | null
          id: string
          notification_preferences: Json
          pronouns: string | null
          public_cast_credit_preference: boolean
          timezone: string | null
          trust_flags: Json
          updated_at: string
          verified_at: string | null
          visibility: Database['public']['Enums']['profile_visibility']
        }
        Insert: {
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          casting_notes?: string | null
          city?: string | null
          contact_links?: Json
          created_at?: string
          deleted_at?: string | null
          display_name: string
          field_visibility?: Json
          handle?: string | null
          home_theater_id?: string | null
          id?: string
          notification_preferences?: Json
          pronouns?: string | null
          public_cast_credit_preference?: boolean
          timezone?: string | null
          trust_flags?: Json
          updated_at?: string
          verified_at?: string | null
          visibility?: Database['public']['Enums']['profile_visibility']
        }
        Update: {
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          casting_notes?: string | null
          city?: string | null
          contact_links?: Json
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          field_visibility?: Json
          handle?: string | null
          home_theater_id?: string | null
          id?: string
          notification_preferences?: Json
          pronouns?: string | null
          public_cast_credit_preference?: boolean
          timezone?: string | null
          trust_flags?: Json
          updated_at?: string
          verified_at?: string | null
          visibility?: Database['public']['Enums']['profile_visibility']
        }
        Relationships: [
          {
            foreignKeyName: 'fk_profiles_home_theater'
            columns: ['home_theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      show_acts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position: number
          show_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          show_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          show_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_acts_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
        ]
      }
      show_availability_responses: {
        Row: {
          actor_user_id: string
          candidate_slot_id: string
          last_command_id: string
          responded_at: string
          response: Database['public']['Enums']['availability_response']
          user_id: string
          version: number
        }
        Insert: {
          actor_user_id: string
          candidate_slot_id: string
          last_command_id: string
          responded_at?: string
          response: Database['public']['Enums']['availability_response']
          user_id: string
          version?: number
        }
        Update: {
          actor_user_id?: string
          candidate_slot_id?: string
          last_command_id?: string
          responded_at?: string
          response?: Database['public']['Enums']['availability_response']
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'show_availability_responses_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_availability_responses_candidate_slot_id_fkey'
            columns: ['candidate_slot_id']
            isOneToOne: false
            referencedRelation: 'show_candidate_slots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_availability_responses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_candidate_slots: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          local_starts_at: string
          location_kind: Database['public']['Enums']['slot_location_kind']
          location_name: string
          occurrence_id: string
          off_site_approved: boolean
          position: number
          resource_id: string | null
          starts_at: string
          timezone_name: string
          timezone_source: Database['public']['Enums']['timezone_source']
          updated_at: string
          utc_offset_minutes: number
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          local_starts_at: string
          location_kind: Database['public']['Enums']['slot_location_kind']
          location_name: string
          occurrence_id: string
          off_site_approved?: boolean
          position?: number
          resource_id?: string | null
          starts_at: string
          timezone_name: string
          timezone_source?: Database['public']['Enums']['timezone_source']
          updated_at?: string
          utc_offset_minutes: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          local_starts_at?: string
          location_kind?: Database['public']['Enums']['slot_location_kind']
          location_name?: string
          occurrence_id?: string
          off_site_approved?: boolean
          position?: number
          resource_id?: string | null
          starts_at?: string
          timezone_name?: string
          timezone_source?: Database['public']['Enums']['timezone_source']
          updated_at?: string
          utc_offset_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: 'show_candidate_slots_occurrence_id_fkey'
            columns: ['occurrence_id']
            isOneToOne: false
            referencedRelation: 'show_occurrences'
            referencedColumns: ['id']
          },
        ]
      }
      show_cast: {
        Row: {
          act_id: string | null
          created_at: string
          invited_at: string | null
          invited_by_user_id: string | null
          note: string | null
          program_order: number | null
          public_credit_enabled: boolean
          responded_at: string | null
          show_id: string
          source: Database['public']['Enums']['show_cast_source']
          status: Database['public']['Enums']['show_cast_status']
          user_id: string
        }
        Insert: {
          act_id?: string | null
          created_at?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          note?: string | null
          program_order?: number | null
          public_credit_enabled: boolean
          responded_at?: string | null
          show_id: string
          source: Database['public']['Enums']['show_cast_source']
          status?: Database['public']['Enums']['show_cast_status']
          user_id: string
        }
        Update: {
          act_id?: string | null
          created_at?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          note?: string | null
          program_order?: number | null
          public_credit_enabled?: boolean
          responded_at?: string | null
          show_id?: string
          source?: Database['public']['Enums']['show_cast_source']
          status?: Database['public']['Enums']['show_cast_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_cast_act_id_fkey'
            columns: ['act_id']
            isOneToOne: false
            referencedRelation: 'show_acts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_cast_invited_by_user_id_fkey'
            columns: ['invited_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_cast_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_cast_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_leadership: {
        Row: {
          assigned_by_user_id: string | null
          created_at: string
          role: Database['public']['Enums']['event_leadership_role']
          show_id: string
          user_id: string
        }
        Insert: {
          assigned_by_user_id?: string | null
          created_at?: string
          role: Database['public']['Enums']['event_leadership_role']
          show_id: string
          user_id: string
        }
        Update: {
          assigned_by_user_id?: string | null
          created_at?: string
          role?: Database['public']['Enums']['event_leadership_role']
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_leadership_assigned_by_user_id_fkey'
            columns: ['assigned_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_leadership_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_leadership_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_occurrence_calls: {
        Row: {
          actor_user_id: string
          assigned_at: string
          call: Database['public']['Enums']['occurrence_call']
          last_command_id: string
          occurrence_id: string
          show_id: string
          user_id: string
          version: number
        }
        Insert: {
          actor_user_id: string
          assigned_at?: string
          call: Database['public']['Enums']['occurrence_call']
          last_command_id: string
          occurrence_id: string
          show_id: string
          user_id: string
          version?: number
        }
        Update: {
          actor_user_id?: string
          assigned_at?: string
          call?: Database['public']['Enums']['occurrence_call']
          last_command_id?: string
          occurrence_id?: string
          show_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'show_occurrence_calls_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_occurrence_calls_occurrence_id_fkey'
            columns: ['occurrence_id']
            isOneToOne: false
            referencedRelation: 'show_occurrences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_occurrence_calls_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_occurrence_calls_show_id_user_id_fkey'
            columns: ['show_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'show_cast'
            referencedColumns: ['show_id', 'user_id']
          },
          {
            foreignKeyName: 'show_occurrence_calls_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_occurrences: {
        Row: {
          confirmed_candidate_slot_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          occurrence_type: Database['public']['Enums']['occurrence_type']
          position: number
          show_id: string
          starts_at: string | null
          status: Database['public']['Enums']['show_occurrence_status']
          updated_at: string
          visibility: Database['public']['Enums']['occurrence_visibility']
        }
        Insert: {
          confirmed_candidate_slot_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          occurrence_type?: Database['public']['Enums']['occurrence_type']
          position?: number
          show_id: string
          starts_at?: string | null
          status?: Database['public']['Enums']['show_occurrence_status']
          updated_at?: string
          visibility?: Database['public']['Enums']['occurrence_visibility']
        }
        Update: {
          confirmed_candidate_slot_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          occurrence_type?: Database['public']['Enums']['occurrence_type']
          position?: number
          show_id?: string
          starts_at?: string | null
          status?: Database['public']['Enums']['show_occurrence_status']
          updated_at?: string
          visibility?: Database['public']['Enums']['occurrence_visibility']
        }
        Relationships: [
          {
            foreignKeyName: 'show_occurrences_confirmed_candidate_slot_id_fkey'
            columns: ['confirmed_candidate_slot_id']
            isOneToOne: false
            referencedRelation: 'show_candidate_slots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_occurrences_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
        ]
      }
      show_proposal_revisions: {
        Row: {
          command_id: string
          decision_state: Database['public']['Enums']['proposal_decision_state']
          id: string
          revision_number: number
          show_id: string
          snapshot: Json
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          command_id: string
          decision_state?: Database['public']['Enums']['proposal_decision_state']
          id?: string
          revision_number: number
          show_id: string
          snapshot: Json
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          command_id?: string
          decision_state?: Database['public']['Enums']['proposal_decision_state']
          id?: string
          revision_number?: number
          show_id?: string
          snapshot?: Json
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_proposal_revisions_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_proposal_revisions_submitted_by_fkey'
            columns: ['submitted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_proposed_cast: {
        Row: {
          selected_at: string
          selected_by: string
          show_id: string
          user_id: string
        }
        Insert: {
          selected_at?: string
          selected_by: string
          show_id: string
          user_id: string
        }
        Update: {
          selected_at?: string
          selected_by?: string
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_proposed_cast_selected_by_fkey'
            columns: ['selected_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_proposed_cast_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_proposed_cast_show_id_user_id_fkey'
            columns: ['show_id', 'user_id']
            isOneToOne: true
            referencedRelation: 'show_cast'
            referencedColumns: ['show_id', 'user_id']
          },
          {
            foreignKeyName: 'show_proposed_cast_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_public_content_credits: {
        Row: {
          display_name: string
          is_publicly_credited: boolean
          position: number
          revision_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          is_publicly_credited: boolean
          position?: number
          revision_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          is_publicly_credited?: boolean
          position?: number
          revision_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_public_content_credits_revision_id_fkey'
            columns: ['revision_id']
            isOneToOne: false
            referencedRelation: 'show_public_content_revisions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_public_content_credits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_public_content_revisions: {
        Row: {
          admission_price_cents: number
          created_at: string
          created_by_user_id: string | null
          description: string
          external_url: string | null
          id: string
          image_url: string | null
          last_command_id: string
          published_at: string | null
          revision_number: number
          sales_channel: Database['public']['Enums']['event_sales_channel']
          show_id: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          admission_price_cents: number
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          last_command_id: string
          published_at?: string | null
          revision_number: number
          sales_channel: Database['public']['Enums']['event_sales_channel']
          show_id: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          admission_price_cents?: number
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          last_command_id?: string
          published_at?: string | null
          revision_number?: number
          sales_channel?: Database['public']['Enums']['event_sales_channel']
          show_id?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'show_public_content_revisions_created_by_user_id_fkey'
            columns: ['created_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_public_content_revisions_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_public_content_revisions_updated_by_user_id_fkey'
            columns: ['updated_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_resource_requests: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          quantity: number
          resource_type: Database['public']['Enums']['event_resource_type']
          show_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          quantity?: number
          resource_type: Database['public']['Enums']['event_resource_type']
          show_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          quantity?: number
          resource_type?: Database['public']['Enums']['event_resource_type']
          show_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_resource_requests_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
        ]
      }
      show_review_events: {
        Row: {
          action: Database['public']['Enums']['review_action']
          actor_user_id: string | null
          created_at: string
          id: string
          note: string | null
          show_id: string
        }
        Insert: {
          action: Database['public']['Enums']['review_action']
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          show_id: string
        }
        Update: {
          action?: Database['public']['Enums']['review_action']
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_review_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_review_events_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
        ]
      }
      show_roles: {
        Row: {
          created_at: string
          role: Database['public']['Enums']['show_role']
          show_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database['public']['Enums']['show_role']
          show_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database['public']['Enums']['show_role']
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_roles_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      show_staff_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          id: string
          note: string | null
          show_id: string
          status: string
          user_id: string
        }
        Insert: {
          assignment_type: string
          created_at?: string
          id?: string
          note?: string | null
          show_id: string
          status?: string
          user_id: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          id?: string
          note?: string | null
          show_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'show_staff_assignments_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_staff_assignments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      shows: {
        Row: {
          cast_max: number | null
          cast_min: number | null
          casting_mode: Database['public']['Enums']['casting_mode']
          created_at: string
          created_by_user_id: string | null
          description: string | null
          event_type: Database['public']['Enums']['event_type']
          id: string
          is_cast_finalized: boolean
          is_public_listed: boolean
          lifecycle_status: Database['public']['Enums']['show_lifecycle_status']
          minimum_viable_cast: number | null
          on_sale_at: string | null
          operational_health: Database['public']['Enums']['show_operational_health']
          poster_url: string | null
          producer_note: string | null
          publication_status: Database['public']['Enums']['show_publication_status']
          published_public_content_revision_id: string | null
          slug: string
          status: Database['public']['Enums']['show_status']
          summary: string | null
          target_cast_size: number | null
          theater_id: string
          ticket_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cast_max?: number | null
          cast_min?: number | null
          casting_mode?: Database['public']['Enums']['casting_mode']
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          event_type?: Database['public']['Enums']['event_type']
          id?: string
          is_cast_finalized?: boolean
          is_public_listed?: boolean
          lifecycle_status?: Database['public']['Enums']['show_lifecycle_status']
          minimum_viable_cast?: number | null
          on_sale_at?: string | null
          operational_health?: Database['public']['Enums']['show_operational_health']
          poster_url?: string | null
          producer_note?: string | null
          publication_status?: Database['public']['Enums']['show_publication_status']
          published_public_content_revision_id?: string | null
          slug: string
          status?: Database['public']['Enums']['show_status']
          summary?: string | null
          target_cast_size?: number | null
          theater_id: string
          ticket_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cast_max?: number | null
          cast_min?: number | null
          casting_mode?: Database['public']['Enums']['casting_mode']
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          event_type?: Database['public']['Enums']['event_type']
          id?: string
          is_cast_finalized?: boolean
          is_public_listed?: boolean
          lifecycle_status?: Database['public']['Enums']['show_lifecycle_status']
          minimum_viable_cast?: number | null
          on_sale_at?: string | null
          operational_health?: Database['public']['Enums']['show_operational_health']
          poster_url?: string | null
          producer_note?: string | null
          publication_status?: Database['public']['Enums']['show_publication_status']
          published_public_content_revision_id?: string | null
          slug?: string
          status?: Database['public']['Enums']['show_status']
          summary?: string | null
          target_cast_size?: number | null
          theater_id?: string
          ticket_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shows_created_by_user_id_fkey'
            columns: ['created_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shows_published_public_content_revision_id_fkey'
            columns: ['published_public_content_revision_id']
            isOneToOne: false
            referencedRelation: 'show_public_content_revisions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shows_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      theater_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string | null
          role: Database['public']['Enums']['theater_role']
          status: Database['public']['Enums']['invite_status']
          theater_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          role?: Database['public']['Enums']['theater_role']
          status?: Database['public']['Enums']['invite_status']
          theater_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          role?: Database['public']['Enums']['theater_role']
          status?: Database['public']['Enums']['invite_status']
          theater_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'theater_invites_accepted_by_user_id_fkey'
            columns: ['accepted_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_invites_invited_by_user_id_fkey'
            columns: ['invited_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_invites_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      theater_join_links: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          revoked_at: string | null
          rotated_from_id: string | null
          theater_id: string
          token_hash: string
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          rotated_from_id?: string | null
          theater_id: string
          token_hash: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          rotated_from_id?: string | null
          theater_id?: string
          token_hash?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'theater_join_links_created_by_user_id_fkey'
            columns: ['created_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_join_links_rotated_from_id_fkey'
            columns: ['rotated_from_id']
            isOneToOne: true
            referencedRelation: 'theater_join_links'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_join_links_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      theater_member_capabilities: {
        Row: {
          capability: Database['public']['Enums']['theater_capability']
          created_at: string
          granted_by_user_id: string | null
          theater_id: string
          user_id: string
        }
        Insert: {
          capability: Database['public']['Enums']['theater_capability']
          created_at?: string
          granted_by_user_id?: string | null
          theater_id: string
          user_id: string
        }
        Update: {
          capability?: Database['public']['Enums']['theater_capability']
          created_at?: string
          granted_by_user_id?: string | null
          theater_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'theater_member_capabilities_granted_by_user_id_fkey'
            columns: ['granted_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_member_capabilities_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_member_capabilities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      theater_memberships: {
        Row: {
          created_at: string
          home_rank: number | null
          is_home: boolean
          roles: Database['public']['Enums']['theater_role'][]
          status: Database['public']['Enums']['membership_status']
          theater_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          home_rank?: number | null
          is_home?: boolean
          roles?: Database['public']['Enums']['theater_role'][]
          status?: Database['public']['Enums']['membership_status']
          theater_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          home_rank?: number | null
          is_home?: boolean
          roles?: Database['public']['Enums']['theater_role'][]
          status?: Database['public']['Enums']['membership_status']
          theater_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'theater_memberships_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'theater_memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      theater_staff_slot_defaults: {
        Row: {
          created_at: string
          event_type: Database['public']['Enums']['event_type']
          id: string
          is_active: boolean
          label: string
          minimum_count: number
          position: number
          recommended_count: number
          slot_type: Database['public']['Enums']['staff_slot_type']
          theater_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: Database['public']['Enums']['event_type']
          id?: string
          is_active?: boolean
          label: string
          minimum_count?: number
          position?: number
          recommended_count?: number
          slot_type: Database['public']['Enums']['staff_slot_type']
          theater_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: Database['public']['Enums']['event_type']
          id?: string
          is_active?: boolean
          label?: string
          minimum_count?: number
          position?: number
          recommended_count?: number
          slot_type?: Database['public']['Enums']['staff_slot_type']
          theater_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'theater_staff_slot_defaults_theater_id_fkey'
            columns: ['theater_id']
            isOneToOne: false
            referencedRelation: 'theaters'
            referencedColumns: ['id']
          },
        ]
      }
      theaters: {
        Row: {
          city: string | null
          counteroffer_response_hours: number
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_self_approval_enabled: boolean
          postal_code: string | null
          primary_venue_id: string
          primary_venue_name: string | null
          producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          published_at: string | null
          setup_buffer_minutes: number
          slug: string
          social_links: Json
          state_region: string | null
          status: Database['public']['Enums']['theater_status']
          street: string | null
          tagline: string | null
          timezone: string | null
          timezone_source: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes: number
          upcoming_other_events_limit: number
          upcoming_shows_limit: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          counteroffer_response_hours?: number
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_self_approval_enabled?: boolean
          postal_code?: string | null
          primary_venue_id?: string
          primary_venue_name?: string | null
          producer_eligibility?: Database['public']['Enums']['producer_eligibility_policy']
          published_at?: string | null
          setup_buffer_minutes?: number
          slug: string
          social_links?: Json
          state_region?: string | null
          status?: Database['public']['Enums']['theater_status']
          street?: string | null
          tagline?: string | null
          timezone?: string | null
          timezone_source?: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes?: number
          upcoming_other_events_limit?: number
          upcoming_shows_limit?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          counteroffer_response_hours?: number
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_self_approval_enabled?: boolean
          postal_code?: string | null
          primary_venue_id?: string
          primary_venue_name?: string | null
          producer_eligibility?: Database['public']['Enums']['producer_eligibility_policy']
          published_at?: string | null
          setup_buffer_minutes?: number
          slug?: string
          social_links?: Json
          state_region?: string | null
          status?: Database['public']['Enums']['theater_status']
          street?: string | null
          tagline?: string | null
          timezone?: string | null
          timezone_source?: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes?: number
          upcoming_other_events_limit?: number
          upcoming_shows_limit?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_reusable_theater_join_link: {
        Args: { p_actor_user_id: string; p_token_hash: string }
        Returns: {
          accepted_at: string
          membership_created: boolean
          result: string
          theater_id: string
          theater_name: string
          theater_slug: string
        }[]
      }
      accept_targeted_theater_invitation: {
        Args: {
          p_actor_email: string
          p_actor_user_id: string
          p_token_hash: string
        }
        Returns: {
          accepted_at: string
          membership_created: boolean
          result: string
          theater_id: string
          theater_name: string
          theater_slug: string
        }[]
      }
      can_assign_occurrence_call: {
        Args: { p_occurrence_id: string }
        Returns: boolean
      }
      can_insert_show_cast: {
        Args: {
          p_show_id: string
          p_source: Database['public']['Enums']['show_cast_source']
          p_status: Database['public']['Enums']['show_cast_status']
          p_user_id: string
        }
        Returns: boolean
      }
      can_insert_show_role: {
        Args: {
          p_role: Database['public']['Enums']['show_role']
          p_show_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_record_candidate_slot_availability: {
        Args: { p_candidate_slot_id: string }
        Returns: boolean
      }
      can_update_show_cast: {
        Args: {
          p_act_id: string
          p_note: string
          p_program_order: number
          p_show_id: string
          p_source: Database['public']['Enums']['show_cast_source']
          p_status: Database['public']['Enums']['show_cast_status']
          p_user_id: string
        }
        Returns: boolean
      }
      can_view_candidate_slot_coordination: {
        Args: { p_actor_user_id: string; p_candidate_slot_id: string }
        Returns: boolean
      }
      can_view_event_cast_row: {
        Args: {
          p_row_status: Database['public']['Enums']['show_cast_status']
          p_row_user_id: string
          p_show_id: string
        }
        Returns: boolean
      }
      can_view_event_coordination: {
        Args: { p_actor_user_id: string; p_show_id: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: {
          p_profile_id: string
          p_visibility: Database['public']['Enums']['profile_visibility']
        }
        Returns: boolean
      }
      can_view_show: { Args: { p_show_id: string }; Returns: boolean }
      create_managed_event: {
        Args: {
          p_actor_user_id: string
          p_director_user_id?: string
          p_producer_user_ids?: string[]
          p_slug: string
          p_theater_id: string
          p_title: string
        }
        Returns: {
          cast_max: number | null
          cast_min: number | null
          casting_mode: Database['public']['Enums']['casting_mode']
          created_at: string
          created_by_user_id: string | null
          description: string | null
          event_type: Database['public']['Enums']['event_type']
          id: string
          is_cast_finalized: boolean
          is_public_listed: boolean
          lifecycle_status: Database['public']['Enums']['show_lifecycle_status']
          minimum_viable_cast: number | null
          on_sale_at: string | null
          operational_health: Database['public']['Enums']['show_operational_health']
          poster_url: string | null
          producer_note: string | null
          publication_status: Database['public']['Enums']['show_publication_status']
          published_public_content_revision_id: string | null
          slug: string
          status: Database['public']['Enums']['show_status']
          summary: string | null
          target_cast_size: number | null
          theater_id: string
          ticket_url: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'shows'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_reusable_theater_join_link: {
        Args: {
          p_actor_user_id: string
          p_expires_at?: string
          p_max_uses?: number
          p_theater_id: string
          p_token_hash: string
        }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          max_uses: number
          theater_id: string
        }[]
      }
      create_targeted_theater_invitation: {
        Args: {
          p_actor_user_id: string
          p_email: string
          p_expires_at?: string
          p_theater_id: string
          p_token_hash: string
        }
        Returns: {
          expires_at: string
          id: string
          theater_id: string
        }[]
      }
      create_theater_with_owner: {
        Args: {
          p_actor_user_id: string
          p_name: string
          p_slug: string
          p_timezone?: string
        }
        Returns: {
          created: boolean
          id: string
          name: string
          slug: string
          status: Database['public']['Enums']['theater_status']
        }[]
      }
      event_cast_status_for_actor: {
        Args: { p_show_id: string; p_user_id?: string }
        Returns: Database['public']['Enums']['show_cast_status']
      }
      get_reusable_theater_join_link: {
        Args: { p_token_hash: string }
        Returns: {
          result: string
          theater_name: string
        }[]
      }
      get_targeted_theater_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          result: string
          theater_name: string
        }[]
      }
      invite_event_cast_member: {
        Args: {
          p_actor_user_id: string
          p_member_user_id: string
          p_show_id: string
        }
        Returns: {
          act_id: string | null
          created_at: string
          invited_at: string | null
          invited_by_user_id: string | null
          note: string | null
          program_order: number | null
          public_credit_enabled: boolean
          responded_at: string | null
          show_id: string
          source: Database['public']['Enums']['show_cast_source']
          status: Database['public']['Enums']['show_cast_status']
          user_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'show_cast'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_member_of_theater: {
        Args: { p_theater_id: string }
        Returns: boolean
      }
      is_eligible_event_producer: {
        Args: { p_theater_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_operational_viewer: {
        Args: { p_show_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_show_leader: {
        Args: { p_show_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_show_producer: { Args: { p_show_id: string }; Returns: boolean }
      is_show_publicly_visible: {
        Args: { p_show_id: string }
        Returns: boolean
      }
      is_theater_admin: { Args: { p_theater_id: string }; Returns: boolean }
      is_theater_owner: { Args: { p_theater_id: string }; Returns: boolean }
      is_theater_staff: { Args: { p_theater_id: string }; Returns: boolean }
      legacy_show_lifecycle_status: {
        Args: { p_status: Database['public']['Enums']['show_status'] }
        Returns: Database['public']['Enums']['show_lifecycle_status']
      }
      legacy_show_publication_status: {
        Args: {
          p_is_public_listed: boolean
          p_status: Database['public']['Enums']['show_status']
        }
        Returns: Database['public']['Enums']['show_publication_status']
      }
      list_reusable_theater_join_links: {
        Args: { p_actor_user_id: string; p_theater_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string
          rotated_from_id: string
          status: string
          use_count: number
        }[]
      }
      list_targeted_theater_invitations: {
        Args: { p_actor_user_id: string; p_theater_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          status: Database['public']['Enums']['invite_status']
        }[]
      }
      project_event_cast_invitation_notification: {
        Args: { p_activity_event_id: string }
        Returns: undefined
      }
      publish_theater: {
        Args: { p_actor_user_id: string; p_theater_id: string }
        Returns: {
          city: string | null
          counteroffer_response_hours: number
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_self_approval_enabled: boolean
          postal_code: string | null
          primary_venue_id: string
          primary_venue_name: string | null
          producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          published_at: string | null
          setup_buffer_minutes: number
          slug: string
          social_links: Json
          state_region: string | null
          status: Database['public']['Enums']['theater_status']
          street: string | null
          tagline: string | null
          timezone: string | null
          timezone_source: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes: number
          upcoming_other_events_limit: number
          upcoming_shows_limit: number
          updated_at: string
          website_url: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'theaters'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_candidate_slot_availability: {
        Args: {
          p_actor_user_id: string
          p_candidate_slot_id: string
          p_command_id: string
          p_expected_version?: number
          p_response: Database['public']['Enums']['availability_response']
        }
        Returns: {
          actor_user_id: string
          candidate_slot_id: string
          last_command_id: string
          responded_at: string
          response: Database['public']['Enums']['availability_response']
          user_id: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'show_availability_responses'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_event_cast_invitation: {
        Args: {
          p_actor_user_id: string
          p_response: Database['public']['Enums']['show_cast_status']
          p_show_id: string
        }
        Returns: {
          act_id: string | null
          created_at: string
          invited_at: string | null
          invited_by_user_id: string | null
          note: string | null
          program_order: number | null
          public_credit_enabled: boolean
          responded_at: string | null
          show_id: string
          source: Database['public']['Enums']['show_cast_source']
          status: Database['public']['Enums']['show_cast_status']
          user_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'show_cast'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_reusable_theater_join_link: {
        Args: { p_actor_user_id: string; p_join_link_id: string }
        Returns: boolean
      }
      revoke_targeted_theater_invitation: {
        Args: { p_actor_user_id: string; p_invitation_id: string }
        Returns: boolean
      }
      rotate_reusable_theater_join_link: {
        Args: {
          p_actor_user_id: string
          p_join_link_id: string
          p_token_hash: string
        }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          max_uses: number
          rotated_from_id: string
          theater_id: string
        }[]
      }
      save_event_operational_plan: {
        Args: {
          p_actor_user_id: string
          p_minimum_viable_cast: number
          p_occurrences: Json
          p_resource_requests: Json
          p_show_id: string
          p_target_cast_size: number
        }
        Returns: Json
      }
      save_event_proposed_cast: {
        Args: {
          p_actor_user_id: string
          p_cast_user_ids: string[]
          p_command_id: string
          p_show_id: string
        }
        Returns: string[]
      }
      save_event_public_content_draft: {
        Args: {
          p_actor_user_id: string
          p_admission_price_cents: number
          p_command_id: string
          p_credits: Json
          p_description: string
          p_expected_version?: number
          p_external_url?: string
          p_image_url?: string
          p_sales_channel: Database['public']['Enums']['event_sales_channel']
          p_show_id: string
          p_title: string
        }
        Returns: {
          admission_price_cents: number
          created_at: string
          created_by_user_id: string | null
          description: string
          external_url: string | null
          id: string
          image_url: string | null
          last_command_id: string
          published_at: string | null
          revision_number: number
          sales_channel: Database['public']['Enums']['event_sales_channel']
          show_id: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'show_public_content_revisions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_default_theater: {
        Args: { p_theater_id: string; p_user_id: string }
        Returns: {
          city: string | null
          counteroffer_response_hours: number
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_self_approval_enabled: boolean
          postal_code: string | null
          primary_venue_id: string
          primary_venue_name: string | null
          producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          published_at: string | null
          setup_buffer_minutes: number
          slug: string
          social_links: Json
          state_region: string | null
          status: Database['public']['Enums']['theater_status']
          street: string | null
          tagline: string | null
          timezone: string | null
          timezone_source: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes: number
          upcoming_other_events_limit: number
          upcoming_shows_limit: number
          updated_at: string
          website_url: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'theaters'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_occurrence_call: {
        Args: {
          p_actor_user_id: string
          p_call: Database['public']['Enums']['occurrence_call']
          p_cast_member_user_id: string
          p_command_id: string
          p_expected_version?: number
          p_occurrence_id: string
        }
        Returns: {
          actor_user_id: string
          assigned_at: string
          call: Database['public']['Enums']['occurrence_call']
          last_command_id: string
          occurrence_id: string
          show_id: string
          user_id: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'show_occurrence_calls'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_theater_member_capability: {
        Args: {
          p_actor_user_id: string
          p_capability: Database['public']['Enums']['theater_capability']
          p_enabled: boolean
          p_theater_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      submit_event_proposal_revision: {
        Args: {
          p_actor_user_id: string
          p_command_id: string
          p_show_id: string
        }
        Returns: {
          command_id: string
          decision_state: Database['public']['Enums']['proposal_decision_state']
          id: string
          revision_number: number
          show_id: string
          snapshot: Json
          submitted_at: string
          submitted_by: string
        }
        SetofOptions: {
          from: '*'
          to: 'show_proposal_revisions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_theater_governance: {
        Args: {
          p_actor_user_id: string
          p_counteroffer_response_hours: number
          p_owner_self_approval_enabled: boolean
          p_primary_venue_name: string
          p_producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          p_setup_buffer_minutes: number
          p_theater_id: string
          p_turnover_buffer_minutes: number
        }
        Returns: {
          city: string | null
          counteroffer_response_hours: number
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_self_approval_enabled: boolean
          postal_code: string | null
          primary_venue_id: string
          primary_venue_name: string | null
          producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          published_at: string | null
          setup_buffer_minutes: number
          slug: string
          social_links: Json
          state_region: string | null
          status: Database['public']['Enums']['theater_status']
          street: string | null
          tagline: string | null
          timezone: string | null
          timezone_source: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes: number
          upcoming_other_events_limit: number
          upcoming_shows_limit: number
          updated_at: string
          website_url: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'theaters'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_theater_setup: {
        Args: { p_actor_user_id: string; p_changes: Json; p_theater_id: string }
        Returns: {
          city: string | null
          counteroffer_response_hours: number
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_self_approval_enabled: boolean
          postal_code: string | null
          primary_venue_id: string
          primary_venue_name: string | null
          producer_eligibility: Database['public']['Enums']['producer_eligibility_policy']
          published_at: string | null
          setup_buffer_minutes: number
          slug: string
          social_links: Json
          state_region: string | null
          status: Database['public']['Enums']['theater_status']
          street: string | null
          tagline: string | null
          timezone: string | null
          timezone_source: Database['public']['Enums']['timezone_source']
          turnover_buffer_minutes: number
          upcoming_other_events_limit: number
          upcoming_shows_limit: number
          updated_at: string
          website_url: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'theaters'
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      activity_visibility: 'admin_only' | 'member_visible' | 'self_only'
      availability_response: 'available' | 'unavailable' | 'uncertain'
      casting_mode: 'direct_invite' | 'theater_casting' | 'public_casting'
      email_outbox_status: 'queued' | 'sent' | 'failed'
      event_leadership_role: 'producer' | 'director'
      event_resource_type: 'staff' | 'equipment' | 'other'
      event_sales_channel: 'external' | 'no_advance_ticketing'
      event_type: 'show' | 'practice' | 'meeting' | 'audition' | 'workshop'
      invite_status: 'pending' | 'accepted' | 'revoked' | 'expired'
      membership_status: 'active' | 'inactive'
      notification_entity: 'show' | 'occurrence' | 'cast'
      occurrence_call: 'required' | 'optional' | 'not_called'
      occurrence_type: 'rehearsal' | 'performance'
      occurrence_visibility: 'public' | 'internal'
      producer_eligibility_policy:
        'all_members' | 'designated_proposers' | 'admins_only'
      profile_visibility: 'public' | 'theater_only' | 'private'
      proposal_decision_state:
        | 'pending'
        | 'changes_requested'
        | 'counteroffered'
        | 'approved'
        | 'denied'
      review_action: 'submitted' | 'approved' | 'rejected' | 'changes_requested'
      show_cast_source: 'invited' | 'requested'
      show_cast_status:
        'pending' | 'accepted' | 'declined' | 'withdrawn' | 'removed'
      show_lifecycle_status:
        'draft' | 'in_review' | 'approved' | 'cancelled' | 'completed'
      show_occurrence_status: 'scheduled' | 'changed' | 'cancelled'
      show_operational_health: 'on_track' | 'at_risk'
      show_publication_status: 'unpublished' | 'published'
      show_role: 'producer'
      show_status:
        'draft' | 'pending_review' | 'approved' | 'rejected' | 'cancelled'
      slot_location_kind: 'primary_venue' | 'off_site'
      staff_slot_type:
        'lead' | 'front_of_house' | 'box_office' | 'bar' | 'tech' | 'other'
      theater_capability: 'proposer' | 'reviewer'
      theater_role:
        'owner' | 'admin' | 'manager' | 'staff' | 'instructor' | 'member'
      theater_status: 'draft' | 'published' | 'archived'
      timezone_source: 'unknown' | 'inferred' | 'manual'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_visibility: ['admin_only', 'member_visible', 'self_only'],
      availability_response: ['available', 'unavailable', 'uncertain'],
      casting_mode: ['direct_invite', 'theater_casting', 'public_casting'],
      email_outbox_status: ['queued', 'sent', 'failed'],
      event_leadership_role: ['producer', 'director'],
      event_resource_type: ['staff', 'equipment', 'other'],
      event_sales_channel: ['external', 'no_advance_ticketing'],
      event_type: ['show', 'practice', 'meeting', 'audition', 'workshop'],
      invite_status: ['pending', 'accepted', 'revoked', 'expired'],
      membership_status: ['active', 'inactive'],
      notification_entity: ['show', 'occurrence', 'cast'],
      occurrence_call: ['required', 'optional', 'not_called'],
      occurrence_type: ['rehearsal', 'performance'],
      occurrence_visibility: ['public', 'internal'],
      producer_eligibility_policy: [
        'all_members',
        'designated_proposers',
        'admins_only',
      ],
      profile_visibility: ['public', 'theater_only', 'private'],
      proposal_decision_state: [
        'pending',
        'changes_requested',
        'counteroffered',
        'approved',
        'denied',
      ],
      review_action: ['submitted', 'approved', 'rejected', 'changes_requested'],
      show_cast_source: ['invited', 'requested'],
      show_cast_status: [
        'pending',
        'accepted',
        'declined',
        'withdrawn',
        'removed',
      ],
      show_lifecycle_status: [
        'draft',
        'in_review',
        'approved',
        'cancelled',
        'completed',
      ],
      show_occurrence_status: ['scheduled', 'changed', 'cancelled'],
      show_operational_health: ['on_track', 'at_risk'],
      show_publication_status: ['unpublished', 'published'],
      show_role: ['producer'],
      show_status: [
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'cancelled',
      ],
      slot_location_kind: ['primary_venue', 'off_site'],
      staff_slot_type: [
        'lead',
        'front_of_house',
        'box_office',
        'bar',
        'tech',
        'other',
      ],
      theater_capability: ['proposer', 'reviewer'],
      theater_role: [
        'owner',
        'admin',
        'manager',
        'staff',
        'instructor',
        'member',
      ],
      theater_status: ['draft', 'published', 'archived'],
      timezone_source: ['unknown', 'inferred', 'manual'],
    },
  },
} as const

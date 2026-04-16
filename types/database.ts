import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export type Gender = "woman" | "man" | "non_binary" | "other";
export type DiscoveryZone = "nearby" | "here_now";
export type MatchStatus = "active" | "archived" | "blocked";
export type PresenceStatus = "in" | "out";
export type SubscriptionStatus = "free" | "active" | "inactive";

export interface User {
  id: string;
  auth_id: string;
  handle: string;
  full_name: string;
  age: number;
  gender: Gender;
  bio: string | null;
  avatar_url: string | null;
  photo_urls: string[] | null;
  prompt_one: string | null;
  prompt_one_answer: string | null;
  prompt_two: string | null;
  prompt_two_answer: string | null;
  intent: string | null;
  city: string | null;
  college: string | null;
  is_approved: boolean;
  is_founder_approved: boolean;
  is_banned: boolean;
  is_invisible: boolean;
  is_paid: boolean;
  subscription_status: SubscriptionStatus;
  payment_expires_at: string | null;
  current_zone: DiscoveryZone;
  current_venue_id: string | null;
  expo_push_token: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  user_one_id: string;
  user_two_id: string;
  status: MatchStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  from_user: string;
  to_user: string;
  prompt_index: number;
  comment_text: string;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface VenuePresence {
  id: string;
  venue_id: string;
  user_id: string;
  status: PresenceStatus;
  is_active: boolean;
  entered_at: string;
  exited_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  category: string | null;
  zone_label: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuthUser = SupabaseAuthUser;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<User>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Match>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Comment>;
        Relationships: [];
      };
      blocks: {
        Row: Block;
        Insert: Omit<Block, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Block>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Report>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Message>;
        Relationships: [];
      };
      venue_presence: {
        Row: VenuePresence;
        Insert: Omit<VenuePresence, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<VenuePresence>;
        Relationships: [];
      };
      venues: {
        Row: Venue;
        Insert: Omit<Venue, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Venue>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_crossed_paths: {
        Args: {
          current_user_id: string;
          venue_id: string;
          limit_count: number;
        };
        Returns: Array<{
          user_id: string;
          full_name: string;
          age: number;
          avatar_url: string | null;
          intent: string | null;
          match_percent: number;
        }>;
      };
    };
  };
}

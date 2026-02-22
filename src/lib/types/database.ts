export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      zonas: {
        Row: {
          id: string;
          nombre: string;
          lat: number;
          lon: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['zonas']['Row']> & { id?: string };
        Update: Partial<Database['public']['Tables']['zonas']['Row']>;
      };
      zona_cache: {
        Row: {
          id: string;
          zona_id: string;
          tipo: 'weather' | 'marine' | 'tides';
          data: Json;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['zona_cache']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['zona_cache']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          experience_level: string;
          experience_points: number;
          member_since: string;
          emergency_contact: string | null;
          depth_limit_m: number;
          share_location: boolean;
          phone: string | null;
          location: string | null;
          fishing_infantry: boolean;
          fishing_boat: boolean;
          is_app_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      dives: {
        Row: {
          id: string;
          user_id: string;
          dive_date: string;
          duration_minutes: number;
          max_depth_m: number | null;
          temperature_c: number | null;
          tide_coefficient: number | null;
          wind_speed_kmh: number | null;
          wind_direction: string | null;
          wave_height_m: number | null;
          location_name: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          dive_spot_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dives']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dives']['Insert']>;
      };
      catches: {
        Row: {
          id: string;
          dive_id: string;
          species: string;
          weight_kg: number | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['catches']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['catches']['Insert']>;
      };
      dive_spots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          lat: number;
          lng: number;
          city: string | null;
          depth_range: string | null;
          conditions: string | null;
          species: string | null;
          description: string | null;
          image_url: string | null;
          rating: number;
          total_dives: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dive_spots']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dive_spots']['Insert']>;
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          location: string | null;
          image_url: string | null;
          species: Json;
          conditions: Json;
          likes_count: number;
          comments_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['community_posts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
          likes_count?: number;
          comments_count?: number;
        };
        Update: Partial<Database['public']['Tables']['community_posts']['Insert']>;
      };
      marketplace_products: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          price: number;
          category: string;
          condition: string | null;
          location: string | null;
          image_url: string | null;
          featured: boolean;
          rating: number;
          sales_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['marketplace_products']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketplace_products']['Insert']>;
      };
      quedadas: {
        Row: {
          id: string;
          admin_id: string;
          tipo: 'quedada' | 'salida';
          title: string | null;
          meetup_date: string;
          meetup_time: string;
          place: string;
          place_lat: number | null;
          place_lng: number | null;
          lugar_pesca: string | null;
          zona_id: string | null;
          dive_spot_id: string | null;
          max_participants: number | null;
          join_mode: 'invite' | 'open' | 'request';
          published_in_novedades: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quedadas']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['quedadas']['Insert']>;
      };
      quedada_participants: {
        Row: {
          quedada_id: string;
          user_id: string;
          role: 'admin' | 'participant';
          joined_at: string;
        };
        Insert: Database['public']['Tables']['quedada_participants']['Row'];
        Update: Partial<Database['public']['Tables']['quedada_participants']['Row']>;
      };
      quedada_invitations: {
        Row: {
          quedada_id: string;
          user_id: string;
          status: 'pending' | 'accepted' | 'denied';
          invited_at: string;
        };
        Insert: Database['public']['Tables']['quedada_invitations']['Row'];
        Update: Partial<Database['public']['Tables']['quedada_invitations']['Row']>;
      };
      quedada_join_requests: {
        Row: {
          quedada_id: string;
          user_id: string;
          status: 'pending' | 'accepted' | 'denied';
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['quedada_join_requests']['Row'], 'reviewed_at' | 'reviewed_by'> & {
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['quedada_join_requests']['Row']>;
      };
      leagues: {
        Row: {
          id: string;
          admin_id: string;
          name: string;
          type: 'liga' | 'campeonato';
          description: string | null;
          created_at: string;
          updated_at: string;
          max_participants: number | null;
          start_date: string | null;
          end_date: string | null;
          zone_description: string | null;
          zone_image_url: string | null;
          zone_point: { lat: number; lng: number } | null;
          zone_polygon: [number, number][] | null;
          additional_rules: string | null;
          species_scoring: Json;
          biggest_catch_prize: boolean;
          biggest_catch_points: number | null;
          biggest_catch_prize_description: string | null;
          is_public: boolean;
          premio: string | null;
          cover_image_url: string | null;
          competition_type: 'pieza_mayor' | 'rancho';
        };
        Insert: Omit<Database['public']['Tables']['leagues']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          species_scoring?: Json;
          biggest_catch_prize?: boolean;
          is_public?: boolean;
        };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
      };
      league_participants: {
        Row: {
          league_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Database['public']['Tables']['league_participants']['Row'];
        Update: Partial<Database['public']['Tables']['league_participants']['Row']>;
      };
      league_join_requests: {
        Row: {
          league_id: string;
          user_id: string;
          status: 'pending' | 'accepted' | 'denied';
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['league_join_requests']['Row'], 'reviewed_at' | 'reviewed_by'> & {
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['league_join_requests']['Row']>;
      };
      league_invitations: {
        Row: {
          league_id: string;
          user_id: string;
          status: 'pending' | 'accepted' | 'denied';
          invited_at: string;
        };
        Insert: Database['public']['Tables']['league_invitations']['Row'];
        Update: Partial<Database['public']['Tables']['league_invitations']['Row']>;
      };
      league_catches: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          species: string;
          score_by: 'weight' | 'length';
          value: number;
          points: number;
          image_url: string | null;
          status: 'pending' | 'approved' | 'rejected';
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['league_catches']['Row'], 'id' | 'submitted_at'> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['league_catches']['Insert']>;
      };
      shared_dives: {
        Row: {
          id: string;
          user_id: string;
          dive_id: string | null;
          description: string | null;
          depth_min: number | null;
          depth_max: number | null;
          apnea_time_seconds: number | null;
          current_type: string | null;
          photo_urls: string[];
          video_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shared_dives']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shared_dives']['Insert']>;
      };
      shared_dive_likes: {
        Row: {
          shared_dive_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shared_dive_likes']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shared_dive_likes']['Insert']>;
      };
      shared_dive_comments: {
        Row: {
          id: string;
          shared_dive_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shared_dive_comments']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shared_dive_comments']['Insert']>;
      };
    };
  };
}

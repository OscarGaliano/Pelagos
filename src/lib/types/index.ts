export type { Database } from './database';
import type { Database } from './database';

export type Dive = Database['public']['Tables']['dives']['Row'] & {
  catches?: Catch[];
};

export type Catch = Database['public']['Tables']['catches']['Row'];

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type DiveSpot = Database['public']['Tables']['dive_spots']['Row'];

export type CommunityPost = Database['public']['Tables']['community_posts']['Row'] & {
  profiles?: Pick<Profile, 'display_name' | 'avatar_url' | 'fishing_infantry' | 'fishing_boat'>;
};

export type MarketplaceProduct = Database['public']['Tables']['marketplace_products']['Row'] & {
  profiles?: Pick<Profile, 'display_name'>;
};

export type EventoTipo = 'quedada' | 'salida';

export type QuedadaListParticipant = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Quedada = Database['public']['Tables']['quedadas']['Row'] & {
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'> | null;
  participants_count?: number;
  is_admin?: boolean;
  is_participant?: boolean;
  my_invitation?: 'pending' | 'accepted' | 'denied';
  my_request?: 'pending' | 'accepted' | 'denied';
  /** Perfil del creador (admin). Solo en lista. */
  creator_profile?: { display_name: string | null; avatar_url: string | null } | null;
  /** Participantes con avatar para la lista. Solo en lista. */
  list_participants?: QuedadaListParticipant[];
};

/** Una especie con puntuación para liga: por peso o por talla, puntos por unidad y talla mínima */
export type SpeciesScoringEntry = {
  species: string;
  scoreBy: 'weight' | 'length';
  pointsPerUnit: number;
  minValue: number;
};

export type League = Database['public']['Tables']['leagues']['Row'] & {
  is_admin?: boolean;
  admin_profile?: { display_name: string | null; avatar_url: string | null } | null;
  participants_count?: number;
  is_participant?: boolean;
  my_join_request?: 'pending' | 'accepted' | 'denied';
  my_invitation?: 'pending' | 'accepted' | 'denied';
};

export type LeagueCatch = Database['public']['Tables']['league_catches']['Row'] & {
  user_profile?: { display_name: string | null; avatar_url: string | null } | null;
};

export type LeagueParticipantWithProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

export type LeagueStandingEntry = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  approved_count: number;
};

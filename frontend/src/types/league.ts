export interface League {
  id: number;
  name: string;
  description?: string;
  club_id: number;
  club_name: string;
  sport: 'padel' | 'tennis';
  type: 'round_robin' | 'single_elimination' | 'double_elimination' | 'groups';
  status:
    | 'draft'
    | 'registration_open'
    | 'registration_closed'
    | 'active'
    | 'completed'
    | 'cancelled';
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  entry_fee?: number;
  currency?: string;
  rules?: string;
  prizes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueDetail extends League {
  organizer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  courts: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  categories: string[];
  scoring_system: {
    win_points: number;
    draw_points: number;
    loss_points: number;
    walkover_points: number;
  };
  tiebreaker_rules: string[];
  match_duration: number; // in minutes
  sets_per_match: number;
  games_per_set: number;
  tie_break: boolean;
  golden_point: boolean;
  allow_substitutions: boolean;
  min_players_per_team: number;
  max_players_per_team: number;
}

export interface LeagueFormData {
  name: string;
  description?: string;
  club_id: number;
  sport: 'padel' | 'tennis';
  type: 'round_robin' | 'single_elimination' | 'double_elimination' | 'groups';
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  entry_fee?: number;
  currency?: string;
  rules?: string;
  prizes?: string;
  categories?: string[];
  scoring_system?: {
    win_points: number;
    draw_points: number;
    loss_points: number;
    walkover_points: number;
  };
  match_settings?: {
    duration: number;
    sets_per_match: number;
    games_per_set: number;
    tie_break: boolean;
    golden_point: boolean;
  };
  team_settings?: {
    allow_substitutions: boolean;
    min_players: number;
    max_players: number;
  };
}

export interface LeagueStanding {
  id: number;
  position: number;
  team_id: number;
  team_name: string;
  players: Array<{
    id: number;
    name: string;
    avatar?: string;
  }>;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
  points: number;
  form: string[]; // Last 5 results: ['W', 'W', 'L', 'W', 'D']
}

export interface LeagueMatch {
  id: number;
  league_id: number;
  round: number;
  home_team: {
    id: number;
    name: string;
    players: Array<{
      id: number;
      name: string;
      avatar?: string;
    }>;
  };
  away_team: {
    id: number;
    name: string;
    players: Array<{
      id: number;
      name: string;
      avatar?: string;
    }>;
  };
  scheduled_date: string;
  actual_date?: string;
  court: {
    id: number;
    name: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  home_score?: number;
  away_score?: number;
  sets?: Array<{
    home_score: number;
    away_score: number;
  }>;
  duration?: number; // in minutes
  notes?: string;
  referee?: {
    id: number;
    name: string;
  };
}

export interface LeagueRegistration {
  id: number;
  league_id: number;
  player_id?: number;
  team_name?: string;
  player_name: string;
  player_email: string;
  player_phone?: string;
  category?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  registration_date: string;
  approval_date?: string;
  rejected_reason?: string;
  notes?: string;
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_date?: string;
  payment_reference?: string;
}

export interface LeagueSchedule {
  id: number;
  league_id: number;
  rounds: Array<{
    round_number: number;
    start_date: string;
    end_date: string;
    matches: LeagueMatch[];
  }>;
  total_rounds: number;
  matches_per_round: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed';
  created_at: string;
  published_at?: string;
}

export interface LeagueStats {
  total_matches: number;
  completed_matches: number;
  upcoming_matches: number;
  total_players: number;
  active_players: number;
  total_sets_played: number;
  total_games_played: number;
  average_match_duration: number;
  highest_scoring_match: {
    match_id: number;
    teams: string;
    score: string;
    total_games: number;
  };
  longest_match: {
    match_id: number;
    teams: string;
    duration: number;
  };
  top_scorers: Array<{
    player_id: number;
    player_name: string;
    matches_won: number;
    win_percentage: number;
  }>;
  recent_results: LeagueMatch[];
}

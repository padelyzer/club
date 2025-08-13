/**
 * Tipos COMPLETOS para tournaments
 * Incluye TODOS los campos del modelo Django
 */

export interface TournamentCategory {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  name: string;
  categoryType: string;
  category_type: string;
  description?: string;
  minAge?: number;
  min_age?: number;
  maxAge?: number;
  max_age?: number;
  minLevel?: string;
  min_level?: string;
  maxLevel?: string;
  max_level?: string;
  gender: string;
  color: string;
  icon?: string;
  slug: string;
  format: string;
  category: string;
  startDate: string;
  start_date: string;
  endDate: string;
  end_date: string;
  registrationStart: string;
  registration_start: string;
  registrationEnd: string;
  registration_end: string;
  maxTeams: number;
  max_teams: number;
  minTeams: number;
  min_teams: number;
  registrationFee: string;
  registration_fee: string;
  requiresPayment: boolean;
  requires_payment: boolean;
  allowSubstitutes: boolean;
  allow_substitutes: boolean;
  maxSubstitutesPerTeam: number;
  max_substitutes_per_team: number;
  visibility: string;
  requiresApproval: boolean;
  requires_approval: boolean;
  status: string;
  currentRound: number;
  current_round: number;
  totalRounds: number;
  total_rounds: number;
  organizer: string;
  contactEmail: string;
  contact_email: string;
  contactPhone?: string;
  contact_phone?: string;
  rules?: string;
  matchFormat: string;
  match_format: string;
  bannerImage?: string;
  banner_image?: string;
  logoImage?: string;
  logo_image?: string;
  tags?: Record<string, any>;
  externalUrl?: string;
  external_url?: string;
  isRegistrationOpen?: any;
  is_registration_open?: any;
  currentTeamsCount?: any;
  current_teams_count?: any;
  isFull?: any;
  is_full?: any;
  canStart?: any;
  can_start?: any;
}

export interface TournamentRegistration {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  teamName: string;
  team_name: string;
  player1: string;
  player2: string;
  substitute1?: string;
  substitute2?: string;
  status: string;
  seed?: number;
  notes?: string;
  paymentStatus: string;
  payment_status: string;
  paymentReference?: string;
  payment_reference?: string;
  contactPhone: string;
  contact_phone: string;
  contactEmail: string;
  contact_email: string;
  teamDisplayName?: any;
  team_display_name?: any;
}

export interface TournamentBracket {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  roundNumber: number;
  round_number: number;
  position: number;
  team1?: string;
  team2?: string;
  advancesTo?: string;
  advances_to?: string;
  match?: string;
  isLosersBracket: boolean;
  is_losers_bracket: boolean;
  matchNumber: number;
  match_number: number;
  scheduledDate: string;
  scheduled_date: string;
  court?: string;
  status: string;
  team1Score: Record<string, any>;
  team1_score: Record<string, any>;
  team2Score: Record<string, any>;
  team2_score: Record<string, any>;
  winner?: string;
  actualStartTime?: string;
  actual_start_time?: string;
  actualEndTime?: string;
  actual_end_time?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  referee?: string;
  notes?: string;
  walkoverReason?: string;
  walkover_reason?: string;
  team1SetsWon?: any;
  team1_sets_won?: any;
  team2SetsWon?: any;
  team2_sets_won?: any;
}

export interface Prize {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  position: number;
  name: string;
  description?: string;
  prizeType: string;
  prize_type: string;
  cashValue?: string;
  cash_value?: string;
  pointsValue?: number;
  points_value?: number;
  awardedTo?: string;
  awarded_to?: string;
  awardedAt?: string;
  awarded_at?: string;
}

export interface TournamentRules {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  ruleType: string;
  rule_type: string;
  title: string;
  description: string;
  order: number;
  isMandatory: boolean;
  is_mandatory: boolean;
  penaltyDescription?: string;
  penalty_description?: string;
}

export interface TournamentStats {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  totalRegistrations: number;
  total_registrations: number;
  confirmedTeams: number;
  confirmed_teams: number;
  waitlistTeams: number;
  waitlist_teams: number;
  cancelledRegistrations: number;
  cancelled_registrations: number;
  totalMatches: number;
  total_matches: number;
  completedMatches: number;
  completed_matches: number;
  walkoverMatches: number;
  walkover_matches: number;
  cancelledMatches: number;
  cancelled_matches: number;
  averageMatchDuration: number;
  average_match_duration: number;
  totalPlayTime: number;
  total_play_time: number;
  totalRegistrationFees: string;
  total_registration_fees: string;
  totalPrizeMoney: string;
  total_prize_money: string;
  avgDuration: any;
  avg_duration: any;
  totalDuration: any;
  total_duration: any;
  total: any;
}

export interface Bracket {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  tournament: string;
  format: string;
  size: number;
  currentRound: number;
  current_round: number;
  seedingMethod: string;
  seeding_method: string;
  isFinalized: boolean;
  is_finalized: boolean;
  bracketData: Record<string, any>;
  bracket_data: Record<string, any>;
}

export interface BracketNode {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  bracket: string;
  position: number;
  round: number;
  match?: string;
  parentNode1?: string;
  parent_node_1?: string;
  parentNode2?: string;
  parent_node_2?: string;
  isLosersBracket: boolean;
  is_losers_bracket: boolean;
  hasBye: boolean;
  has_bye: boolean;
  byeTeam?: string;
  bye_team?: string;
}

export interface MatchSchedule {
  id: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  match: string;
  court?: string;
  datetime: string;
  durationMinutes: number;
  duration_minutes: number;
  status: string;
  priority: number;
  constraints: Record<string, any>;
  hasConflict: boolean;
  has_conflict: boolean;
  conflictReason?: string;
  conflict_reason?: string;
}

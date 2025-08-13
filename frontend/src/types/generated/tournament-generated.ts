/**
 * Tipos TypeScript para tournaments
 * Generado automáticamente desde models.py
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
}

export interface TournamentCategoryForm {
  name?: string;
  categoryType?: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  minLevel?: string;
  maxLevel?: string;
  gender?: string;
  color?: string;
  icon?: string;
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
}

export interface TournamentRegistrationForm {
  tournament?: string;
  teamName?: string;
  player1?: string;
  player2?: string;
  substitute1?: string;
  substitute2?: string;
  status?: string;
  seed?: number;
  notes?: string;
  paymentStatus?: string;
  paymentReference?: string;
  contactPhone?: string;
  contactEmail?: string;
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
}

export interface TournamentBracketForm {
  tournament?: string;
  roundNumber?: number;
  position?: number;
  team1?: string;
  team2?: string;
  advancesTo?: string;
  match?: string;
  isLosersBracket?: boolean;
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

export interface PrizeForm {
  tournament?: string;
  position?: number;
  name?: string;
  description?: string;
  prizeType?: string;
  cashValue?: string;
  pointsValue?: number;
  awardedTo?: string;
  awardedAt?: string;
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

export interface TournamentRulesForm {
  tournament?: string;
  ruleType?: string;
  title?: string;
  description?: string;
  order?: number;
  isMandatory?: boolean;
  penaltyDescription?: string;
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
  total: any;
}

export interface TournamentStatsForm {
  tournament?: string;
  totalRegistrations?: number;
  confirmedTeams?: number;
  waitlistTeams?: number;
  cancelledRegistrations?: number;
  totalMatches?: number;
  completedMatches?: number;
  walkoverMatches?: number;
  cancelledMatches?: number;
  averageMatchDuration?: number;
  totalPlayTime?: number;
  totalRegistrationFees?: string;
  totalPrizeMoney?: string;
  avgDuration?: any;
  totalDuration?: any;
  total?: any;
  total?: any;
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

export interface BracketForm {
  tournament?: string;
  format?: string;
  size?: number;
  currentRound?: number;
  seedingMethod?: string;
  isFinalized?: boolean;
  bracketData?: Record<string, any>;
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

export interface BracketNodeForm {
  bracket?: string;
  position?: number;
  round?: number;
  match?: string;
  parentNode1?: string;
  parentNode2?: string;
  isLosersBracket?: boolean;
  hasBye?: boolean;
  byeTeam?: string;
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

export interface MatchScheduleForm {
  match?: string;
  court?: string;
  datetime?: string;
  durationMinutes?: number;
  status?: string;
  priority?: number;
  constraints?: Record<string, any>;
  hasConflict?: boolean;
  conflictReason?: string;
}

import { Player, Club, Match, LoadingState } from '@/types';

// Tournament format types
export type TournamentFormat =
  | 'elimination'
  | 'round-robin'
  | 'groups'
  | 'mixed';
export type TournamentStatus =
  | 'upcoming'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type TournamentCategory =
  | 'open'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'professional'
  | 'senior'
  | 'junior';

// Tournament entity
export interface Tournament {
  id: string;
  name: string;
  description: string;
  club: Club;
  format: TournamentFormat;
  category: TournamentCategory;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizeMoney: number;
  currency: string;
  rules?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Tournament participant (can be player or team)
export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  type: 'player' | 'team';
  playerId?: string;
  player?: Player;
  teamId?: string;
  team?: TournamentTeam;
  seed?: number;
  registrationDate: string;
  status: 'registered' | 'confirmed' | 'withdrawn' | 'disqualified';
  paid: boolean;
}

// Team for doubles tournaments
export interface TournamentTeam {
  id: string;
  name: string;
  player1: Player;
  player2: Player;
  tournamentId: string;
  seed?: number;
}

// Tournament match extends base Match with tournament-specific fields
export interface TournamentMatch extends Match {
  tournamentId: string;
  round: number;
  roundName?: string; // e.g., "Quarter-finals", "Semi-finals"
  bracketPosition?: number;
  nextMatchId?: string;
  participant1: TournamentParticipant;
  participant2: TournamentParticipant;
  scheduledDate?: string;
  courtAssigned?: string;
  isWalkover?: boolean;
  isBye?: boolean;
}

// Tournament round
export interface TournamentRound {
  id: string;
  tournamentId: string;
  roundNumber: number;
  name: string;
  matches: TournamentMatch[];
  startDate?: string;
  endDate?: string;
  isCompleted: boolean;
}

// Tournament bracket
export interface TournamentBracket {
  tournamentId: string;
  rounds: TournamentRound[];
  totalRounds: number;
  winner?: TournamentParticipant;
  runnerUp?: TournamentParticipant;
}

// Group stage specific
export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  standings: GroupStanding[];
}

// Group standing
export interface GroupStanding {
  participantId: string;
  participant: TournamentParticipant;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  position: number;
}

// Tournament standings (for round-robin or after group stage)
export interface TournamentStandings {
  tournamentId: string;
  standings: Standing[];
  lastUpdated: string;
}

// Individual standing
export interface Standing {
  position: number;
  participant: TournamentParticipant;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  differential: number;
}

// Tournament registration
export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  playerId: string;
  player?: Player;
  partnerId?: string; // For doubles
  partner?: Player;
  registrationDate: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'withdrawn';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentDate?: string;
  notes?: string;
}

// Tournament filters
export interface TournamentFilters {
  status: TournamentStatus[];
  category: TournamentCategory[];
  format: TournamentFormat[];
  dateRange: {
    start: string;
    end: string;
  };
  clubId?: string;
  hasAvailableSpots?: boolean;
}

// Tournament store state
export interface TournamentState extends LoadingState {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  tournamentDetails: {
    bracket?: TournamentBracket;
    groups?: TournamentGroup[];
    standings?: TournamentStandings;
    participants?: TournamentParticipant[];
    matches?: TournamentMatch[];
  };
  filters: TournamentFilters;
  myRegistrations: TournamentRegistration[];
}

// Tournament statistics
export interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  upcomingMatches: number;
  totalParticipants: number;
  averageMatchDuration: number;
  topSeeds: TournamentParticipant[];
  upsets: TournamentMatch[]; // Lower seed victories
}

// Prize distribution
export interface PrizeDistribution {
  position: number;
  amount: number;
  percentage: number;
  description?: string;
}

// Tournament schedule
export interface TournamentSchedule {
  tournamentId: string;
  days: ScheduleDay[];
}

export interface ScheduleDay {
  date: string;
  courts: ScheduleCourt[];
}

export interface ScheduleCourt {
  courtId: string;
  courtName: string;
  matches: TournamentMatch[];
}

// Extended types for tournament registration modal

// Registration types
export type RegistrationType = 'individual' | 'pair' | 'team' | 'waitlist';
export type RegistrationStep =
  | 'verification'
  | 'information'
  | 'category'
  | 'payment'
  | 'confirmation';
export type EligibilityStatus = 'eligible' | 'ineligible' | 'conditional';
export type TournamentPaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'cash'
  | 'membership'
  | 'later';

// Eligibility check result
export interface EligibilityCheck {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  suggestedCategory?: TournamentCategory;
  alternativeTournaments?: Tournament[];
}

export interface EligibilityReason {
  type:
    | 'age'
    | 'skill_level'
    | 'availability'
    | 'membership'
    | 'duplicate'
    | 'tournament_status';
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}

// Registration form data
export interface RegistrationFormData {
  // Type and participants
  registrationType: RegistrationType;
  primaryPlayer: Player;
  secondaryPlayer?: Player; // For pairs
  teamPlayers?: Player[]; // For teams

  // Category and preferences
  selectedCategory?: TournamentCategory;
  suggestedCategory?: TournamentCategory;

  // Payment information
  paymentMethod: TournamentPaymentMethod;
  paymentDetails?: PaymentDetails;

  // Additional information
  notes?: string;
  emergencyContact?: EmergencyContact;
  agreesToTerms: boolean;
  wantsNotifications: boolean;

  // System fields
  registrationDate: string;
  estimatedFee: number;
  discounts?: Discount[];
}

export interface PaymentDetails {
  method: TournamentPaymentMethod;
  amount: number;
  currency: string;
  processingFee?: number;
  discountAmount?: number;
  finalAmount: number;
  cardLast4?: string;
  paymentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Discount {
  type: 'membership' | 'early_bird' | 'group' | 'student' | 'senior';
  amount: number;
  percentage?: number;
  description: string;
  code?: string;
}

// Player search and selection
export interface PlayerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  level?: string;
  club?: string;
  photo?: string;
  isAvailable: boolean;
  conflictingTournaments?: Tournament[];
}

export interface PartnerInvitation {
  id: string;
  tournamentId: string;
  inviterId: string;
  inviteeId: string;
  inviterName: string;
  inviteeName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string;
}

// Category calculation
export interface CategoryCalculation {
  suggestedCategory: TournamentCategory;
  confidence: number; // 0-1
  factors: CategoryFactor[];
  alternativeCategories: TournamentCategory[];
}

export interface CategoryFactor {
  type:
    | 'age'
    | 'skill_level'
    | 'tournament_history'
    | 'ranking'
    | 'coach_recommendation';
  value: any;
  weight: number;
  contribution: number;
}

// Waitlist information
export interface WaitlistInfo {
  position: number;
  estimatedWaitTime?: string;
  automaticPromotion: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Registration result
export interface RegistrationResult {
  success: boolean;
  registrationId?: string;
  status: 'confirmed' | 'waitlisted' | 'pending_payment' | 'failed';
  message: string;
  nextSteps?: string[];
  paymentUrl?: string;
  waitlistInfo?: WaitlistInfo;
  confirmationEmail?: boolean;
}

// Tournament availability
export interface TournamentAvailability {
  isOpen: boolean;
  spotsAvailable: number;
  totalSpots: number;
  waitlistLength: number;
  registrationDeadline: string;
  canJoinWaitlist: boolean;
}

// Registration validation
export interface RegistrationValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  canProceed: boolean;
}

// Modal state management
export interface RegistrationModalState {
  isOpen: boolean;
  tournament: Tournament | null;
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  eligibilityCheck?: EligibilityCheck;
  availability?: TournamentAvailability;
  validation?: RegistrationValidation;
  isLoading: boolean;
  error?: string;
  partnerInvitations: PartnerInvitation[];
}

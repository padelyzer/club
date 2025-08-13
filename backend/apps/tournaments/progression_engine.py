"""
Tournament progression engine.
Handles match results, bracket advancement, and standings calculation.
"""

from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Q, F, Sum, Count
from django.utils import timezone

from .models import (
    Tournament, Match, TournamentRegistration, 
    Bracket, BracketNode, Prize
)


class ProgressionEngine:
    """
    Manages tournament progression including winner advancement,
    bracket updates, and standings calculation.
    """
    
    def __init__(self, tournament: Tournament):
        self.tournament = tournament
        self.bracket = getattr(tournament, 'bracket_structure', None)
    
    @transaction.atomic
    def advance_winner(self, match: Match, winner: TournamentRegistration) -> Optional[BracketNode]:
        """
        Advance the winner to the next round.
        Returns the next bracket node if applicable.
        """
        if match.winner:
            raise ValueError("Match already has a winner")
        
        # Validate winner is in the match
        if winner not in [match.team1, match.team2]:
            raise ValueError("Winner must be one of the match teams")
        
        # Update match
        match.winner = winner
        match.status = 'completed'
        match.actual_end_time = timezone.now()
        
        if match.actual_start_time:
            duration = (match.actual_end_time - match.actual_start_time).seconds // 60
            match.duration_minutes = duration
        
        match.save()
        
        # Handle different tournament formats
        if self.tournament.format == 'elimination':
            return self._advance_single_elimination(match, winner)
        elif self.tournament.format == 'double_elimination':
            return self._advance_double_elimination(match, winner)
        elif self.tournament.format == 'round_robin':
            return self._update_round_robin_standings(match)
        elif self.tournament.format == 'swiss':
            return self._update_swiss_standings(match)
        
        return None
    
    def _advance_single_elimination(self, match: Match, winner: TournamentRegistration) -> Optional[BracketNode]:
        """Handle single elimination advancement."""
        # Find the bracket node for this match
        current_node = BracketNode.objects.filter(match=match).first()
        if not current_node:
            return None
        
        # Find the next round node
        next_node = BracketNode.objects.filter(
            Q(parent_node_1=current_node) | Q(parent_node_2=current_node)
        ).first()
        
        if next_node:
            # Create or update the next match
            if not next_node.match:
                # Create new match
                next_match = Match.objects.create(
                    tournament=self.tournament,
                    club=self.tournament.club,
                    round_number=next_node.round,
                    match_number=next_node.position,
                    team1=winner,
                    team2=None,  # Will be set when other semifinal completes
                    scheduled_date=match.scheduled_date + timezone.timedelta(days=7),
                    status='scheduled'
                )
                next_node.match = next_match
                next_node.save()
            else:
                # Update existing match
                if next_node.match.team1 is None:
                    next_node.match.team1 = winner
                else:
                    next_node.match.team2 = winner
                next_node.match.save()
            
            return next_node
        else:
            # This was the final match
            self._complete_tournament(winner)
            return None
    
    def _advance_double_elimination(self, match: Match, winner: TournamentRegistration) -> Optional[BracketNode]:
        """Handle double elimination advancement."""
        loser = match.team1 if match.winner == match.team2 else match.team2
        current_node = BracketNode.objects.filter(match=match).first()
        
        if not current_node:
            return None
        
        # Advance winner
        if current_node.is_losers_bracket:
            # Winner in losers bracket advances in losers bracket
            next_node = self._find_next_losers_node(current_node)
        else:
            # Winner in winners bracket advances in winners bracket
            next_node = self._find_next_winners_node(current_node)
        
        if next_node:
            self._assign_to_next_match(next_node, winner)
        
        # Send loser to losers bracket (if from winners bracket)
        if not current_node.is_losers_bracket and match.round_number > 1:
            losers_node = self._find_losers_bracket_entry(current_node)
            if losers_node:
                self._assign_to_next_match(losers_node, loser)
        
        return next_node
    
    def _update_round_robin_standings(self, match: Match) -> None:
        """Update standings for round robin format."""
        # Round robin doesn't have bracket advancement
        # Just update the statistics
        self._update_head_to_head_record(match)
        
        # Check if all matches in round are complete
        round_matches = Match.objects.filter(
            tournament=self.tournament,
            round_number=match.round_number
        )
        
        if round_matches.filter(status='completed').count() == round_matches.count():
            # Round complete, check if tournament is complete
            if match.round_number == self.tournament.total_rounds:
                standings = self.calculate_standings()
                if standings:
                    self._complete_tournament(standings[0]['team'])
    
    def _update_swiss_standings(self, match: Match) -> None:
        """Update standings for Swiss system."""
        # Swiss system uses points
        self._update_swiss_points(match)
        
        # Check if round is complete
        round_matches = Match.objects.filter(
            tournament=self.tournament,
            round_number=match.round_number
        )
        
        if round_matches.filter(status='completed').count() == round_matches.count():
            if match.round_number < self.tournament.total_rounds:
                # Generate next round pairings
                self._generate_next_swiss_round()
            else:
                # Tournament complete
                standings = self.calculate_standings()
                if standings:
                    self._complete_tournament(standings[0]['team'])
    
    def update_bracket(self, bracket: Bracket, match_result: Dict) -> None:
        """Update bracket structure after a match result."""
        match = Match.objects.get(id=match_result['match_id'])
        winner_id = match_result['winner_id']
        winner = TournamentRegistration.objects.get(id=winner_id)
        
        # Advance winner
        self.advance_winner(match, winner)
        
        # Update bracket visualization data
        bracket.bracket_data = self._update_bracket_data(bracket)
        bracket.save()
        
        # Check if we need to advance to next round
        current_round_matches = Match.objects.filter(
            tournament=self.tournament,
            round_number=bracket.current_round
        )
        
        if current_round_matches.filter(status='completed').count() == current_round_matches.count():
            # All matches in current round complete
            bracket.current_round += 1
            bracket.save()
    
    def calculate_standings(self) -> List[Dict]:
        """Calculate current tournament standings."""
        if self.tournament.format in ['elimination', 'double_elimination']:
            return self._calculate_elimination_standings()
        elif self.tournament.format == 'round_robin':
            return self._calculate_round_robin_standings()
        elif self.tournament.format == 'swiss':
            return self._calculate_swiss_standings()
        
        return []
    
    def _calculate_elimination_standings(self) -> List[Dict]:
        """Calculate standings for elimination tournaments."""
        standings = []
        
        # Get all teams that have played
        teams = set()
        matches = Match.objects.filter(tournament=self.tournament)
        
        for match in matches:
            teams.add(match.team1)
            teams.add(match.team2)
        
        # Calculate how far each team got
        for team in teams:
            # Find the last match the team played
            last_match = Match.objects.filter(
                Q(team1=team) | Q(team2=team),
                tournament=self.tournament,
                status='completed'
            ).order_by('-round_number').first()
            
            if last_match:
                # Determine placement based on when eliminated
                if last_match.winner == team:
                    # Still in tournament or won
                    placement = self._get_current_placement(team)
                else:
                    # Eliminated
                    round_eliminated = last_match.round_number
                    teams_in_round = 2 ** (self.tournament.total_rounds - round_eliminated + 1)
                    placement = teams_in_round
                
                standings.append({
                    'team': team,
                    'placement': placement,
                    'matches_won': self._count_matches_won(team),
                    'matches_lost': self._count_matches_lost(team),
                    'last_round': last_match.round_number
                })
        
        # Sort by placement
        standings.sort(key=lambda x: x['placement'])
        
        return standings
    
    def _calculate_round_robin_standings(self) -> List[Dict]:
        """Calculate standings for round robin tournaments."""
        teams = TournamentRegistration.objects.filter(
            tournament=self.tournament,
            status='confirmed'
        )
        
        standings = []
        
        for team in teams:
            matches_played = Match.objects.filter(
                Q(team1=team) | Q(team2=team),
                tournament=self.tournament,
                status='completed'
            )
            
            wins = matches_played.filter(winner=team).count()
            losses = matches_played.exclude(winner=team).count()
            
            # Calculate points (3 for win, 1 for draw, 0 for loss)
            points = wins * 3  # No draws in padel typically
            
            # Calculate sets won/lost
            sets_won = 0
            sets_lost = 0
            games_won = 0
            games_lost = 0
            
            for match in matches_played:
                if match.team1 == team:
                    sets_won += match.team1_sets_won
                    sets_lost += match.team2_sets_won
                    games_won += sum(match.team1_score)
                    games_lost += sum(match.team2_score)
                else:
                    sets_won += match.team2_sets_won
                    sets_lost += match.team1_sets_won
                    games_won += sum(match.team2_score)
                    games_lost += sum(match.team1_score)
            
            standings.append({
                'team': team,
                'matches_played': matches_played.count(),
                'wins': wins,
                'losses': losses,
                'points': points,
                'sets_won': sets_won,
                'sets_lost': sets_lost,
                'sets_difference': sets_won - sets_lost,
                'games_won': games_won,
                'games_lost': games_lost,
                'games_difference': games_won - games_lost
            })
        
        # Sort by points, then sets difference, then games difference
        standings.sort(
            key=lambda x: (x['points'], x['sets_difference'], x['games_difference']),
            reverse=True
        )
        
        # Add placement
        for i, standing in enumerate(standings):
            standing['placement'] = i + 1
        
        return standings
    
    def _calculate_swiss_standings(self) -> List[Dict]:
        """Calculate standings for Swiss system tournaments."""
        teams = TournamentRegistration.objects.filter(
            tournament=self.tournament,
            status='confirmed'
        )
        
        standings = []
        
        for team in teams:
            matches = Match.objects.filter(
                Q(team1=team) | Q(team2=team),
                tournament=self.tournament,
                status='completed'
            )
            
            wins = matches.filter(winner=team).count()
            losses = matches.exclude(winner=team).count()
            
            # Calculate opponent match points (Buchholz)
            buchholz = 0
            for match in matches:
                opponent = match.team2 if match.team1 == team else match.team1
                opponent_wins = Match.objects.filter(
                    winner=opponent,
                    tournament=self.tournament,
                    status='completed'
                ).count()
                buchholz += opponent_wins
            
            standings.append({
                'team': team,
                'matches_played': matches.count(),
                'wins': wins,
                'losses': losses,
                'match_points': wins,
                'buchholz': buchholz,
                'head_to_head': self._calculate_head_to_head_tiebreak(team, wins)
            })
        
        # Sort by match points, then buchholz, then head-to-head
        standings.sort(
            key=lambda x: (x['match_points'], x['buchholz'], x['head_to_head']),
            reverse=True
        )
        
        # Add placement
        for i, standing in enumerate(standings):
            standing['placement'] = i + 1
        
        return standings
    
    def determine_next_matches(self) -> List[Match]:
        """Determine which matches should be played next."""
        next_matches = []
        
        if self.tournament.format in ['elimination', 'double_elimination']:
            # Find all scheduled matches that have both teams assigned
            next_matches = Match.objects.filter(
                tournament=self.tournament,
                status='scheduled',
                team1__isnull=False,
                team2__isnull=False
            ).order_by('round_number', 'match_number')
        
        elif self.tournament.format == 'round_robin':
            # Get next round matches
            current_round = self._get_current_round()
            next_matches = Match.objects.filter(
                tournament=self.tournament,
                round_number=current_round + 1,
                status='scheduled'
            ).order_by('match_number')
        
        elif self.tournament.format == 'swiss':
            # Swiss rounds are generated after each round completes
            current_round = self._get_current_round()
            if self._is_round_complete(current_round):
                # Generate next round
                self._generate_next_swiss_round()
                next_matches = Match.objects.filter(
                    tournament=self.tournament,
                    round_number=current_round + 1,
                    status='scheduled'
                ).order_by('match_number')
        
        return list(next_matches)
    
    # Helper methods
    def _find_next_winners_node(self, current_node: BracketNode) -> Optional[BracketNode]:
        """Find next node in winners bracket."""
        return BracketNode.objects.filter(
            Q(parent_node_1=current_node) | Q(parent_node_2=current_node),
            is_losers_bracket=False
        ).first()
    
    def _find_next_losers_node(self, current_node: BracketNode) -> Optional[BracketNode]:
        """Find next node in losers bracket."""
        return BracketNode.objects.filter(
            Q(parent_node_1=current_node) | Q(parent_node_2=current_node),
            is_losers_bracket=True
        ).first()
    
    def _find_losers_bracket_entry(self, winners_node: BracketNode) -> Optional[BracketNode]:
        """Find entry point to losers bracket for a given round."""
        # This is tournament format specific
        # Simplified implementation
        losers_round = (winners_node.round - 1) * 2
        return BracketNode.objects.filter(
            bracket=self.bracket,
            round=losers_round,
            is_losers_bracket=True,
            match__isnull=True
        ).first()
    
    def _assign_to_next_match(self, node: BracketNode, team: TournamentRegistration):
        """Assign team to next match."""
        if not node.match:
            # Create new match
            node.match = Match.objects.create(
                tournament=self.tournament,
                club=self.tournament.club,
                round_number=node.round,
                match_number=node.position,
                team1=team,
                team2=None,
                scheduled_date=timezone.now() + timezone.timedelta(days=7),
                status='scheduled'
            )
            node.save()
        else:
            # Add to existing match
            if node.match.team1 is None:
                node.match.team1 = team
            elif node.match.team2 is None:
                node.match.team2 = team
            node.match.save()
    
    def _complete_tournament(self, winner: TournamentRegistration):
        """Mark tournament as completed and assign prizes."""
        self.tournament.status = 'completed'
        self.tournament.save()
        
        # Award prizes
        standings = self.calculate_standings()
        
        for i, standing in enumerate(standings[:3]):  # Top 3
            prize = Prize.objects.filter(
                tournament=self.tournament,
                position=i + 1
            ).first()
            
            if prize:
                prize.award_to_team(standing['team'])
        
        # Update tournament stats
        if hasattr(self.tournament, 'stats'):
            self.tournament.stats.update_stats()
    
    def _update_bracket_data(self, bracket: Bracket) -> Dict:
        """Update bracket visualization data."""
        from .bracket_generator import BracketGenerator
        generator = BracketGenerator(self.tournament)
        return generator._serialize_bracket_structure(bracket)
    
    def _get_current_placement(self, team: TournamentRegistration) -> int:
        """Get current placement for a team still in tournament."""
        # Find how many teams are still active
        active_teams = set()
        
        scheduled_matches = Match.objects.filter(
            tournament=self.tournament,
            status='scheduled'
        )
        
        for match in scheduled_matches:
            if match.team1:
                active_teams.add(match.team1)
            if match.team2:
                active_teams.add(match.team2)
        
        if team in active_teams:
            # Still playing - placement depends on round
            teams_in_round = len(active_teams)
            return teams_in_round
        else:
            # Won the tournament
            return 1
    
    def _count_matches_won(self, team: TournamentRegistration) -> int:
        """Count matches won by a team."""
        return Match.objects.filter(
            winner=team,
            tournament=self.tournament
        ).count()
    
    def _count_matches_lost(self, team: TournamentRegistration) -> int:
        """Count matches lost by a team."""
        return Match.objects.filter(
            Q(team1=team) | Q(team2=team),
            tournament=self.tournament,
            status='completed'
        ).exclude(winner=team).count()
    
    def _update_head_to_head_record(self, match: Match):
        """Update head-to-head records for round robin."""
        # This would typically update a separate head-to-head table
        # For now, we'll just use the match results directly
        pass
    
    def _update_swiss_points(self, match: Match):
        """Update Swiss system points."""
        # Swiss points are calculated dynamically from match results
        # No separate storage needed
        pass
    
    def _calculate_head_to_head_tiebreak(self, team: TournamentRegistration, 
                                        team_points: int) -> float:
        """Calculate head-to-head tiebreaker for teams with same points."""
        # Get all teams with same points
        standings = self.calculate_standings()
        tied_teams = [s['team'] for s in standings if s.get('match_points', 0) == team_points]
        
        if len(tied_teams) <= 1:
            return 0
        
        # Calculate mini-league between tied teams
        h2h_wins = 0
        h2h_matches = Match.objects.filter(
            Q(team1=team, team2__in=tied_teams) | Q(team2=team, team1__in=tied_teams),
            tournament=self.tournament,
            status='completed'
        )
        
        for match in h2h_matches:
            if match.winner == team:
                h2h_wins += 1
        
        return h2h_wins
    
    def _get_current_round(self) -> int:
        """Get current round number."""
        last_completed = Match.objects.filter(
            tournament=self.tournament,
            status='completed'
        ).order_by('-round_number').first()
        
        if last_completed:
            return last_completed.round_number
        return 0
    
    def _is_round_complete(self, round_number: int) -> bool:
        """Check if a round is complete."""
        round_matches = Match.objects.filter(
            tournament=self.tournament,
            round_number=round_number
        )
        
        if not round_matches.exists():
            return True
        
        return round_matches.filter(status='completed').count() == round_matches.count()
    
    def _generate_next_swiss_round(self):
        """Generate next round of Swiss pairings."""
        from .bracket_generator import BracketGenerator
        
        # Get current standings
        standings = self.calculate_standings()
        
        # Create pairings based on standings
        # This is a simplified version - actual Swiss pairing is more complex
        generator = BracketGenerator(self.tournament)
        
        # The actual pairing would avoid repeat matchups and follow Swiss rules
        # For now, we'll just note that this needs to be implemented
        pass
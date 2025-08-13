"""
Tournament bracket generation system.
Supports multiple tournament formats with automatic seeding and bye assignment.
"""

import math
import random
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.utils import timezone

from .models import (
    Tournament, TournamentRegistration, Bracket, BracketNode, 
    Match, MatchSchedule
)
from apps.clients.models import ClientProfile


class BracketGenerator:
    """
    Main bracket generator for all tournament formats.
    """
    
    def __init__(self, tournament: Tournament):
        self.tournament = tournament
        self.registrations = list(
            tournament.registrations.filter(status="confirmed")
            .select_related('player1', 'player2')
            .order_by('seed', 'created_at')
        )
    
    @transaction.atomic
    def generate(self) -> Bracket:
        """Generate bracket based on tournament format."""
        if self.tournament.format == "elimination":
            return self.generate_single_elimination()
        elif self.tournament.format == "double_elimination":
            return self.generate_double_elimination()
        elif self.tournament.format == "round_robin":
            return self.generate_round_robin()
        elif self.tournament.format == "swiss":
            return self.generate_swiss()
        else:
            raise ValueError(f"Unsupported tournament format: {self.tournament.format}")
    
    def generate_single_elimination(self) -> Bracket:
        """Generate single elimination bracket."""
        players = self._seed_players(self.registrations)
        bracket_size = self._get_bracket_size(len(players))
        
        # Create bracket
        bracket = Bracket.objects.create(
            tournament=self.tournament,
            format="single_elimination",
            size=bracket_size,
            seeding_method=self.tournament.category.category_type or "elo"
        )
        
        # Calculate number of rounds
        num_rounds = int(math.log2(bracket_size))
        
        # Create bracket nodes
        nodes_by_round = {}
        
        # Create nodes from final to first round
        for round_num in range(num_rounds, 0, -1):
            nodes_in_round = 2 ** (round_num - 1)
            nodes_by_round[round_num] = []
            
            for position in range(nodes_in_round):
                node = BracketNode.objects.create(
                    bracket=bracket,
                    round=round_num,
                    position=position
                )
                nodes_by_round[round_num].append(node)
        
        # Link parent-child relationships
        for round_num in range(num_rounds, 1, -1):
            for i, node in enumerate(nodes_by_round[round_num]):
                # Each node has two parent nodes from previous round
                parent_idx_1 = i * 2
                parent_idx_2 = i * 2 + 1
                
                if parent_idx_1 < len(nodes_by_round[round_num - 1]):
                    node.parent_node_1 = nodes_by_round[round_num - 1][parent_idx_1]
                if parent_idx_2 < len(nodes_by_round[round_num - 1]):
                    node.parent_node_2 = nodes_by_round[round_num - 1][parent_idx_2]
                node.save()
        
        # Assign players and byes to first round
        first_round_nodes = nodes_by_round[1]
        num_byes = bracket_size - len(players)
        
        # Distribute byes properly
        bye_positions = self._calculate_bye_positions(bracket_size, num_byes)
        
        player_idx = 0
        for i, node in enumerate(first_round_nodes):
            if i in bye_positions:
                # This position gets a bye
                node.has_bye = True
                if player_idx < len(players):
                    node.bye_team = players[player_idx]
                    player_idx += 1
                node.save()
            else:
                # Create match for this position
                if player_idx < len(players) - 1:
                    match = Match.objects.create(
                        tournament=self.tournament,
                        club=self.tournament.club,
                        round_number=1,
                        match_number=i,
                        team1=players[player_idx],
                        team2=players[player_idx + 1],
                        scheduled_date=timezone.now() + timezone.timedelta(days=1),
                        status="scheduled"
                    )
                    node.match = match
                    node.save()
                    player_idx += 2
        
        # Update bracket data for visualization
        bracket.bracket_data = self._serialize_bracket_structure(bracket)
        bracket.save()
        
        return bracket
    
    def generate_double_elimination(self) -> Bracket:
        """Generate double elimination bracket."""
        players = self._seed_players(self.registrations)
        bracket_size = self._get_bracket_size(len(players))
        
        # Create bracket
        bracket = Bracket.objects.create(
            tournament=self.tournament,
            format="double_elimination",
            size=bracket_size,
            seeding_method=self.tournament.category.category_type or "elo"
        )
        
        # Calculate rounds
        winners_rounds = int(math.log2(bracket_size))
        losers_rounds = (winners_rounds - 1) * 2
        
        # Create winners bracket nodes
        winners_nodes = self._create_elimination_nodes(
            bracket, winners_rounds, is_losers=False
        )
        
        # Create losers bracket nodes
        losers_nodes = self._create_elimination_nodes(
            bracket, losers_rounds, is_losers=True
        )
        
        # Assign initial matches
        self._assign_initial_matches(bracket, players, winners_nodes[1])
        
        # Create grand final nodes
        grand_final = BracketNode.objects.create(
            bracket=bracket,
            round=winners_rounds + 1,
            position=0,
            is_losers_bracket=False
        )
        
        # Update bracket data
        bracket.bracket_data = self._serialize_bracket_structure(bracket)
        bracket.save()
        
        return bracket
    
    def generate_round_robin(self) -> List[Match]:
        """Generate round robin matches using Berger tables."""
        players = list(self.registrations)
        n = len(players)
        
        # Create bracket (different structure for round robin)
        bracket = Bracket.objects.create(
            tournament=self.tournament,
            format="round_robin",
            size=n,
            seeding_method="none"
        )
        
        # If odd number of players, add a bye
        if n % 2 == 1:
            players.append(None)  # None represents bye
            n += 1
        
        matches = []
        rounds = n - 1
        matches_per_round = n // 2
        
        # Berger table algorithm
        for round_num in range(rounds):
            round_matches = []
            
            for match_num in range(matches_per_round):
                if round_num % 2 == 0:
                    home = (round_num + match_num) % (n - 1)
                    away = (n - 1 - match_num + round_num) % (n - 1)
                else:
                    away = (round_num + match_num) % (n - 1)
                    home = (n - 1 - match_num + round_num) % (n - 1)
                
                # Last player stays fixed
                if match_num == 0:
                    away = n - 1
                
                # Skip bye matches
                if players[home] is not None and players[away] is not None:
                    match = Match.objects.create(
                        tournament=self.tournament,
                        club=self.tournament.club,
                        round_number=round_num + 1,
                        match_number=len(round_matches),
                        team1=players[home],
                        team2=players[away],
                        scheduled_date=timezone.now() + timezone.timedelta(
                            days=round_num * 7  # One round per week
                        ),
                        status="scheduled"
                    )
                    round_matches.append(match)
            
            matches.extend(round_matches)
        
        # Store match schedule in bracket data
        bracket.bracket_data = {
            "type": "round_robin",
            "rounds": rounds,
            "matches_per_round": matches_per_round,
            "total_matches": len(matches)
        }
        bracket.save()
        
        return matches
    
    def generate_swiss(self, rounds: Optional[int] = None) -> List[Match]:
        """Generate Swiss system pairings."""
        players = list(self.registrations)
        n = len(players)
        
        if rounds is None:
            rounds = int(math.ceil(math.log2(n)))
        
        # Create bracket
        bracket = Bracket.objects.create(
            tournament=self.tournament,
            format="swiss",
            size=n,
            seeding_method="elo"
        )
        
        # Swiss system tracking
        standings = {player.id: {
            'player': player,
            'points': 0,
            'opponents': [],
            'buchholz': 0
        } for player in players}
        
        all_matches = []
        
        for round_num in range(1, rounds + 1):
            # Sort players by points, then by buchholz
            sorted_players = sorted(
                standings.values(),
                key=lambda x: (x['points'], x['buchholz']),
                reverse=True
            )
            
            # Pair players
            round_matches = []
            paired = set()
            
            for i in range(0, len(sorted_players), 2):
                if i + 1 < len(sorted_players):
                    player1 = sorted_players[i]['player']
                    
                    # Find suitable opponent (not already played)
                    for j in range(i + 1, len(sorted_players)):
                        player2 = sorted_players[j]['player']
                        if (player2.id not in standings[player1.id]['opponents'] and
                            player2.id not in paired):
                            # Create match
                            match = Match.objects.create(
                                tournament=self.tournament,
                                club=self.tournament.club,
                                round_number=round_num,
                                match_number=len(round_matches),
                                team1=player1,
                                team2=player2,
                                scheduled_date=timezone.now() + timezone.timedelta(
                                    days=(round_num - 1) * 3
                                ),
                                status="scheduled"
                            )
                            round_matches.append(match)
                            
                            # Update opponents list
                            standings[player1.id]['opponents'].append(player2.id)
                            standings[player2.id]['opponents'].append(player1.id)
                            paired.add(player1.id)
                            paired.add(player2.id)
                            break
            
            all_matches.extend(round_matches)
        
        # Store Swiss data in bracket
        bracket.bracket_data = {
            "type": "swiss",
            "rounds": rounds,
            "total_matches": len(all_matches)
        }
        bracket.save()
        
        return all_matches
    
    # Helper methods
    def _seed_players(self, registrations: List[TournamentRegistration]) -> List[TournamentRegistration]:
        """Seed players based on seeding method."""
        seeding_strategy = SeedingStrategy()
        
        if self.tournament.category.category_type == "level":
            return seeding_strategy.seed_by_elo(registrations)
        elif hasattr(self.tournament, 'seeding_method') and self.tournament.seeding_method == "geographic":
            return seeding_strategy.distribute_geographically(registrations)
        else:
            return seeding_strategy.seed_by_elo(registrations)
    
    def _get_bracket_size(self, num_players: int) -> int:
        """Get next power of 2 for bracket size."""
        return 2 ** math.ceil(math.log2(num_players))
    
    def _calculate_bye_positions(self, bracket_size: int, num_byes: int) -> List[int]:
        """Calculate optimal bye positions to avoid early round byes."""
        positions = []
        if num_byes > 0:
            # Distribute byes evenly across the bracket
            interval = bracket_size // (num_byes + 1)
            for i in range(num_byes):
                positions.append((i + 1) * interval - 1)
        return positions
    
    def _create_elimination_nodes(self, bracket: Bracket, num_rounds: int, 
                                 is_losers: bool) -> Dict[int, List[BracketNode]]:
        """Create elimination bracket nodes."""
        nodes_by_round = {}
        
        for round_num in range(num_rounds, 0, -1):
            nodes_in_round = 2 ** (round_num - 1) if not is_losers else self._losers_round_size(round_num, num_rounds)
            nodes_by_round[round_num] = []
            
            for position in range(nodes_in_round):
                node = BracketNode.objects.create(
                    bracket=bracket,
                    round=round_num,
                    position=position,
                    is_losers_bracket=is_losers
                )
                nodes_by_round[round_num].append(node)
        
        return nodes_by_round
    
    def _losers_round_size(self, round_num: int, total_rounds: int) -> int:
        """Calculate number of matches in losers bracket round."""
        # Complex calculation for double elimination losers bracket
        # This is simplified - actual implementation would be more complex
        return 2 ** ((total_rounds - round_num) // 2)
    
    def _assign_initial_matches(self, bracket: Bracket, players: List[TournamentRegistration], 
                               first_round_nodes: List[BracketNode]):
        """Assign players to initial matches."""
        player_idx = 0
        for node in first_round_nodes:
            if player_idx < len(players) - 1:
                match = Match.objects.create(
                    tournament=self.tournament,
                    club=self.tournament.club,
                    round_number=1,
                    match_number=node.position,
                    team1=players[player_idx],
                    team2=players[player_idx + 1],
                    scheduled_date=timezone.now() + timezone.timedelta(days=1),
                    status="scheduled"
                )
                node.match = match
                node.save()
                player_idx += 2
    
    def _serialize_bracket_structure(self, bracket: Bracket) -> Dict:
        """Serialize bracket structure for frontend visualization."""
        nodes = bracket.nodes.all().order_by('round', 'position')
        
        structure = {
            "format": bracket.format,
            "size": bracket.size,
            "rounds": {},
            "current_round": bracket.current_round
        }
        
        for node in nodes:
            round_key = f"round_{node.round}"
            if round_key not in structure["rounds"]:
                structure["rounds"][round_key] = []
            
            node_data = {
                "id": node.id,
                "position": node.position,
                "has_bye": node.has_bye,
                "match_id": node.match.id if node.match else None,
                "parent_1_id": node.parent_node_1.id if node.parent_node_1 else None,
                "parent_2_id": node.parent_node_2.id if node.parent_node_2 else None,
                "is_losers": node.is_losers_bracket
            }
            
            if node.match:
                node_data["team1"] = node.match.team1.team_display_name
                node_data["team2"] = node.match.team2.team_display_name
                node_data["winner"] = node.match.winner.team_display_name if node.match.winner else None
            elif node.has_bye and node.bye_team:
                node_data["bye_team"] = node.bye_team.team_display_name
            
            structure["rounds"][round_key].append(node_data)
        
        return structure


class SeedingStrategy:
    """
    Strategies for seeding players in tournaments.
    """
    
    def seed_by_elo(self, players: List[TournamentRegistration]) -> List[TournamentRegistration]:
        """Seed players by their ELO rating."""
        # Calculate average ELO for each team
        for reg in players:
            player1_elo = getattr(reg.player1, 'rating', 1200)
            player2_elo = getattr(reg.player2, 'rating', 1200)
            reg._avg_elo = (player1_elo + player2_elo) / 2
        
        # Sort by average ELO (highest first)
        return sorted(players, key=lambda x: x._avg_elo, reverse=True)
    
    def distribute_geographically(self, players: List[TournamentRegistration]) -> List[TournamentRegistration]:
        """Distribute players to avoid same club matchups in early rounds."""
        # Group by club
        clubs = {}
        for reg in players:
            club_id = reg.player1.user.club_id if hasattr(reg.player1.user, 'club_id') else 'no_club'
            if club_id not in clubs:
                clubs[club_id] = []
            clubs[club_id].append(reg)
        
        # Sort each club's players by ELO
        for club_players in clubs.values():
            self.seed_by_elo(club_players)
        
        # Interleave players from different clubs
        result = []
        while any(clubs.values()):
            for club_id in list(clubs.keys()):
                if clubs[club_id]:
                    result.append(clubs[club_id].pop(0))
                if not clubs[club_id]:
                    del clubs[club_id]
        
        return result
    
    def assign_byes(self, bracket_size: int, player_count: int) -> List[int]:
        """Calculate which positions should receive byes."""
        num_byes = bracket_size - player_count
        if num_byes == 0:
            return []
        
        # Distribute byes to avoid consecutive byes
        bye_positions = []
        # Place byes at regular intervals
        interval = player_count / (num_byes + 1)
        
        for i in range(num_byes):
            position = int((i + 1) * interval)
            bye_positions.append(position)
        
        return bye_positions
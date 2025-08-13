"""
Services for tournaments module.
"""

import math
import random
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Match, Tournament, TournamentBracket, TournamentRegistration


class TournamentBracketGenerator:
    """
    Service for generating tournament brackets.
    """

    def __init__(self, tournament):
        self.tournament = tournament

    def generate(self):
        """Generate bracket based on tournament format."""
        if self.tournament.format == "elimination":
            return self._generate_elimination_bracket()
        elif self.tournament.format == "double_elimination":
            return self._generate_double_elimination_bracket()
        elif self.tournament.format == "round_robin":
            return self._generate_round_robin_bracket()
        elif self.tournament.format == "swiss":
            return self._generate_swiss_bracket()
        else:
            raise ValidationError(
                f"Unsupported tournament format: {self.tournament.format}"
            )

    def _get_confirmed_teams(self):
        """Get confirmed teams for the tournament."""
        return list(
            self.tournament.registrations.filter(status="confirmed").order_by(
                "seed", "created_at"
            )
        )

    def _generate_elimination_bracket(self):
        """Generate single elimination bracket."""
        teams = self._get_confirmed_teams()
        num_teams = len(teams)

        # Calculate rounds needed
        rounds = math.ceil(math.log2(num_teams))

        # Seed teams and add byes if needed
        bracket_size = 2**rounds
        seeded_teams = self._seed_teams(teams, bracket_size)

        # Generate first round
        with transaction.atomic():
            position = 1
            for i in range(0, len(seeded_teams), 2):
                team1 = seeded_teams[i] if i < len(teams) else None
                team2 = seeded_teams[i + 1] if (i + 1) < len(teams) else None

                bracket = TournamentBracket.objects.create(
                    tournament=self.tournament,
                    round_number=1,
                    position=position,
                    team1=team1,
                    team2=team2,
                )

                # Create match if both teams exist
                if team1 and team2:
                    Match.objects.create(
                        tournament=self.tournament,
                        round_number=1,
                        match_number=position,
                        team1=team1,
                        team2=team2,
                        scheduled_date=timezone.now() + timedelta(days=1),
                        organization=self.tournament.organization,
                        club=self.tournament.club,
                    )

                position += 1

            # Generate subsequent rounds
            for round_num in range(2, rounds + 1):
                prev_round_matches = bracket_size // (2**round_num)
                for pos in range(1, prev_round_matches + 1):
                    TournamentBracket.objects.create(
                        tournament=self.tournament, round_number=round_num, position=pos
                    )

    def _generate_double_elimination_bracket(self):
        """Generate double elimination bracket."""
        # For now, implement as single elimination
        # TODO: Implement proper double elimination logic
        return self._generate_elimination_bracket()

    def _generate_round_robin_bracket(self):
        """Generate round robin bracket."""
        teams = self._get_confirmed_teams()
        num_teams = len(teams)

        if num_teams < 2:
            raise ValidationError("Need at least 2 teams for round robin")

        # Generate all possible matches
        with transaction.atomic():
            match_number = 1
            round_number = 1

            for i in range(num_teams):
                for j in range(i + 1, num_teams):
                    # Create bracket entry
                    bracket = TournamentBracket.objects.create(
                        tournament=self.tournament,
                        round_number=round_number,
                        position=match_number,
                        team1=teams[i],
                        team2=teams[j],
                    )

                    # Create match
                    Match.objects.create(
                        tournament=self.tournament,
                        round_number=round_number,
                        match_number=match_number,
                        team1=teams[i],
                        team2=teams[j],
                        scheduled_date=timezone.now() + timedelta(days=round_number),
                        organization=self.tournament.organization,
                        club=self.tournament.club,
                    )

                    match_number += 1

                    # Move to next round after certain number of matches
                    if match_number > num_teams // 2:
                        round_number += 1
                        match_number = 1

    def _generate_swiss_bracket(self):
        """Generate first round of Swiss system."""
        teams = self._get_confirmed_teams()
        num_teams = len(teams)

        if num_teams < 4:
            raise ValidationError("Need at least 4 teams for Swiss system")

        # Shuffle teams for first round
        random.shuffle(teams)

        # Generate first round pairings
        with transaction.atomic():
            position = 1
            for i in range(0, num_teams - 1, 2):
                team1 = teams[i]
                team2 = teams[i + 1] if (i + 1) < num_teams else None

                if team1 and team2:
                    bracket = TournamentBracket.objects.create(
                        tournament=self.tournament,
                        round_number=1,
                        position=position,
                        team1=team1,
                        team2=team2,
                    )

                    Match.objects.create(
                        tournament=self.tournament,
                        round_number=1,
                        match_number=position,
                        team1=team1,
                        team2=team2,
                        scheduled_date=timezone.now() + timedelta(days=1),
                        organization=self.tournament.organization,
                        club=self.tournament.club,
                    )

                    position += 1

    def _seed_teams(self, teams, bracket_size):
        """Seed teams for tournament bracket."""
        seeded = [None] * bracket_size

        for i, team in enumerate(teams):
            if i < bracket_size:
                seeded[i] = team

        return seeded


class TournamentService:
    """
    Service for tournament operations.
    """

    def __init__(self, tournament):
        self.tournament = tournament

    def get_standings(self):
        """Calculate tournament standings."""
        registrations = self.tournament.registrations.filter(status="confirmed")
        standings = []

        for registration in registrations:
            wins = registration.won_matches.filter(status="completed").count()
            losses = (
                registration.matches_as_team1.filter(status="completed")
                .exclude(winner=registration)
                .count()
                + registration.matches_as_team2.filter(status="completed")
                .exclude(winner=registration)
                .count()
            )

            # Calculate match points
            matches_played = wins + losses
            win_percentage = (wins / matches_played * 100) if matches_played > 0 else 0

            # Calculate set points (for more detailed ranking)
            set_wins = 0
            set_losses = 0

            for match in registration.matches_as_team1.filter(status="completed"):
                if match.winner == registration:
                    set_wins += match.team1_sets_won
                    set_losses += match.team2_sets_won
                else:
                    set_wins += match.team1_sets_won
                    set_losses += match.team2_sets_won

            for match in registration.matches_as_team2.filter(status="completed"):
                if match.winner == registration:
                    set_wins += match.team2_sets_won
                    set_losses += match.team1_sets_won
                else:
                    set_wins += match.team2_sets_won
                    set_losses += match.team1_sets_won

            standings.append(
                {
                    "registration": registration,
                    "team_name": registration.team_display_name,
                    "wins": wins,
                    "losses": losses,
                    "matches_played": matches_played,
                    "win_percentage": round(win_percentage, 2),
                    "set_wins": set_wins,
                    "set_losses": set_losses,
                    "set_differential": set_wins - set_losses,
                }
            )

        # Sort by wins, then win percentage, then set differential
        standings.sort(
            key=lambda x: (x["wins"], x["win_percentage"], x["set_differential"]),
            reverse=True,
        )

        return standings

    def generate_schedule(
        self, start_time, match_duration, break_time, court_ids, dates
    ):
        """Generate match schedule for tournament."""
        from apps.clubs.models import Court

        courts = Court.objects.filter(id__in=court_ids, club=self.tournament.club)
        matches = Match.objects.filter(
            tournament=self.tournament, scheduled_date__isnull=True
        ).order_by("round_number", "match_number")

        if not courts.exists():
            raise ValidationError("No valid courts found")

        current_date_idx = 0
        current_time = datetime.combine(dates[0], start_time)
        court_schedules = {court.id: current_time for court in courts}

        with transaction.atomic():
            for match in matches:
                # Find the court with earliest available time
                available_court = min(court_schedules.items(), key=lambda x: x[1])
                court_id, available_time = available_court

                # If available time is past end of day, move to next day
                if available_time.hour >= 22:  # 10 PM cutoff
                    current_date_idx = (current_date_idx + 1) % len(dates)
                    available_time = datetime.combine(
                        dates[current_date_idx], start_time
                    )

                # Schedule the match
                match.scheduled_date = timezone.make_aware(available_time)
                match.court_id = court_id
                match.save()

                # Update court schedule
                next_available = available_time + timedelta(
                    minutes=match_duration + break_time
                )
                court_schedules[court_id] = next_available

    def advance_round(self):
        """Advance tournament to next round (for elimination formats)."""
        if self.tournament.format not in ["elimination", "double_elimination"]:
            raise ValidationError("Can only advance rounds for elimination tournaments")

        current_round = self.tournament.current_round
        current_matches = Match.objects.filter(
            tournament=self.tournament, round_number=current_round
        )

        # Check if all matches in current round are completed
        incomplete_matches = current_matches.exclude(status="completed")
        if incomplete_matches.exists():
            raise ValidationError("Cannot advance round with incomplete matches")

        # Generate next round matches
        winners = []
        for match in current_matches:
            if match.winner:
                winners.append(match.winner)

        if len(winners) < 2:
            # Tournament is complete
            self.tournament.status = "completed"
            self.tournament.save()
            return

        # Create next round matches
        next_round = current_round + 1
        with transaction.atomic():
            position = 1
            for i in range(0, len(winners), 2):
                if i + 1 < len(winners):
                    team1 = winners[i]
                    team2 = winners[i + 1]

                    Match.objects.create(
                        tournament=self.tournament,
                        round_number=next_round,
                        match_number=position,
                        team1=team1,
                        team2=team2,
                        scheduled_date=timezone.now() + timedelta(days=1),
                        organization=self.tournament.organization,
                        club=self.tournament.club,
                    )

                    position += 1

            self.tournament.current_round = next_round
            self.tournament.save()


class MatchService:
    """
    Service for match operations.
    """

    def __init__(self, match):
        self.match = match

    def update_player_stats(self):
        """Update player statistics after match completion."""
        if self.match.status != "completed" or not self.match.winner:
            return

        # Determine match duration
        duration = 0
        if self.match.actual_start_time and self.match.actual_end_time:
            duration = int(
                (
                    self.match.actual_end_time - self.match.actual_start_time
                ).total_seconds()
                / 60
            )

        # Update team 1 players
        for player in [self.match.team1.player1, self.match.team1.player2]:
            if hasattr(player, "stats"):
                stats = player.stats
                won = self.match.winner == self.match.team1
                # Assuming player position based on their preference
                position = (
                    "right"
                    if player.preferred_position in ["right", "both"]
                    else "left"
                )
                stats.record_match(won, position, duration)

        # Update team 2 players
        for player in [self.match.team2.player1, self.match.team2.player2]:
            if hasattr(player, "stats"):
                stats = player.stats
                won = self.match.winner == self.match.team2
                position = (
                    "right"
                    if player.preferred_position in ["right", "both"]
                    else "left"
                )
                stats.record_match(won, position, duration)

    def validate_score(self, team1_score, team2_score):
        """Validate match score according to padel rules."""
        if not isinstance(team1_score, list) or not isinstance(team2_score, list):
            raise ValidationError("Scores must be lists")

        if len(team1_score) != len(team2_score):
            raise ValidationError("Score arrays must have same length")

        format_sets = 3 if self.match.tournament.match_format == "best_of_3" else 5
        required_sets = (format_sets // 2) + 1

        team1_sets = sum(
            1 for i, (s1, s2) in enumerate(zip(team1_score, team2_score)) if s1 > s2
        )
        team2_sets = sum(
            1 for i, (s1, s2) in enumerate(zip(team1_score, team2_score)) if s2 > s1
        )

        # Check if enough sets have been played
        if max(team1_sets, team2_sets) < required_sets:
            raise ValidationError(
                f"Match not complete, need {required_sets} sets to win"
            )

        # Check individual set scores
        for s1, s2 in zip(team1_score, team2_score):
            if s1 < 0 or s2 < 0:
                raise ValidationError("Games cannot be negative")
            if s1 > 7 or s2 > 7:
                raise ValidationError("Maximum 7 games per set")
            if s1 == s2 == 6:
                raise ValidationError("Sets cannot end 6-6")
            if max(s1, s2) > 6:
                if abs(s1 - s2) < 1:
                    raise ValidationError(
                        "When games > 6, winner must win by at least 1"
                    )

        return True

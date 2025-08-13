"""
Business logic services for leagues module.
"""

import itertools
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    League,
    LeagueMatch,
    LeagueSchedule,
    LeagueSeason,
    LeagueStanding,
    LeagueTeam,
)


class LeagueFixtureGenerator:
    """
    Service for generating league fixtures automatically.
    """

    def __init__(self, season: LeagueSeason):
        self.season = season
        self.league = season.league
        self.teams = list(season.teams.filter(status="active"))
        self.teams_count = len(self.teams)

    def generate(self) -> List[LeagueMatch]:
        """Generate fixtures for the league season."""
        if self.teams_count < 2:
            raise ValidationError("At least 2 teams are required to generate fixtures")

        if self.league.format == "round_robin":
            return self._generate_round_robin()
        elif self.league.format == "round_robin_double":
            return self._generate_round_robin_double()
        elif self.league.format == "group_stage":
            return self._generate_group_stage()
        else:
            raise ValidationError(f"Unsupported league format: {self.league.format}")

    def _generate_round_robin(self) -> List[LeagueMatch]:
        """Generate single round-robin fixtures."""
        matches = []
        matchday = 1

        # Use round-robin algorithm
        if self.teams_count % 2 == 0:
            # Even number of teams
            rounds = self.teams_count - 1
            matches_per_round = self.teams_count // 2
        else:
            # Odd number of teams (add bye)
            rounds = self.teams_count
            matches_per_round = self.teams_count // 2

        teams = self.teams.copy()

        for round_num in range(rounds):
            round_matches = []

            # Pair teams for this round
            for i in range(matches_per_round):
                if self.teams_count % 2 == 0:
                    home_team = teams[i]
                    away_team = teams[self.teams_count - 1 - i]
                else:
                    if i < len(teams) // 2:
                        home_team = teams[i]
                        away_team = teams[len(teams) - 1 - i]
                    else:
                        continue  # Bye week

                if home_team and away_team:
                    match = self._create_match(
                        matchday=matchday,
                        match_number=len(round_matches) + 1,
                        home_team=home_team,
                        away_team=away_team,
                    )
                    round_matches.append(match)

            matches.extend(round_matches)
            matchday += 1

            # Rotate teams (keep first team fixed for even, rotate all for odd)
            if self.teams_count % 2 == 0:
                teams = [teams[0]] + [teams[-1]] + teams[1:-1]
            else:
                teams = teams[1:] + [teams[0]]

        return matches

    def _generate_round_robin_double(self) -> List[LeagueMatch]:
        """Generate double round-robin fixtures."""
        # Generate first round
        first_round = self._generate_round_robin()

        # Generate second round (reverse home/away)
        second_round = []
        max_matchday = max(match.matchday for match in first_round)

        for match in first_round:
            reverse_match = self._create_match(
                matchday=match.matchday + max_matchday,
                match_number=match.match_number,
                home_team=match.away_team,
                away_team=match.home_team,
            )
            second_round.append(reverse_match)

        return first_round + second_round

    def _generate_group_stage(self) -> List[LeagueMatch]:
        """Generate group stage fixtures (same as round-robin for now)."""
        return self._generate_round_robin()

    def _create_match(
        self,
        matchday: int,
        match_number: int,
        home_team: LeagueTeam,
        away_team: LeagueTeam,
    ) -> LeagueMatch:
        """Create a league match."""
        # Calculate scheduled date based on league schedule
        scheduled_date = self._calculate_match_date(matchday, match_number)

        match = LeagueMatch.objects.create(
            season=self.season,
            matchday=matchday,
            match_number=match_number,
            home_team=home_team,
            away_team=away_team,
            scheduled_date=scheduled_date,
            status="scheduled",
        )

        return match

    def _calculate_match_date(self, matchday: int, match_number: int) -> datetime:
        """Calculate the scheduled date for a match."""
        schedule = self.season.schedules.filter(auto_schedule=True).first()

        if not schedule:
            # Default: weekly schedule starting from season start date
            base_date = self.season.start_date
            days_offset = (matchday - 1) * 7  # Weekly
            match_date = base_date + timedelta(days=days_offset)
            match_datetime = timezone.make_aware(
                datetime.combine(
                    match_date, timezone.datetime.strptime("18:00", "%H:%M").time()
                )
            )
            return match_datetime

        # Use schedule configuration
        base_date = self.season.start_date

        if schedule.schedule_type == "weekly":
            days_offset = (matchday - 1) * 7
        elif schedule.schedule_type == "biweekly":
            days_offset = (matchday - 1) * 14
        else:
            days_offset = (matchday - 1) * 7  # Default to weekly

        match_date = base_date + timedelta(days=days_offset)

        # Adjust to preferred days
        if schedule.preferred_days:
            # Find next available preferred day
            while match_date.weekday() not in schedule.preferred_days:
                match_date += timedelta(days=1)

        # Check if date is available
        while not schedule.is_day_available(match_date):
            match_date += timedelta(days=1)

        # Create datetime with start time
        match_datetime = timezone.make_aware(
            datetime.combine(match_date, schedule.start_time)
        )

        return match_datetime


class LeagueStandingsService:
    """
    Service for managing league standings and statistics.
    """

    def __init__(self, season: LeagueSeason):
        self.season = season
        self.league = season.league
        self.rules = season.league.rules.filter(is_active=True).first()

    def update_standings_for_match(self, match: LeagueMatch):
        """Update standings after a match is completed."""
        if not match.winner or not match.is_confirmed:
            return

        with transaction.atomic():
            home_standing = self._get_or_create_standing(match.home_team)
            away_standing = self._get_or_create_standing(match.away_team)

            # Update match statistics
            home_standing.matches_played += 1
            away_standing.matches_played += 1

            # Update win/loss statistics
            if match.winner == match.home_team:
                home_standing.matches_won += 1
                home_standing.home_wins += 1
                away_standing.matches_lost += 1
            else:
                away_standing.matches_won += 1
                away_standing.away_wins += 1
                home_standing.matches_lost += 1

            # Update set and game statistics
            home_sets = match.home_sets_won
            away_sets = match.away_sets_won

            home_standing.sets_won += home_sets
            home_standing.sets_lost += away_sets
            away_standing.sets_won += away_sets
            away_standing.sets_lost += home_sets

            # Calculate games
            home_games = sum(match.home_score) if match.home_score else 0
            away_games = sum(match.away_score) if match.away_score else 0

            home_standing.games_won += home_games
            home_standing.games_lost += away_games
            away_standing.games_won += away_games
            away_standing.games_lost += home_games

            # Update points based on rules
            if self.rules:
                if match.winner == match.home_team:
                    if match.status == "walkover":
                        home_standing.points += self.rules.points_for_walkover_win
                        away_standing.points += self.rules.points_for_walkover_loss
                        away_standing.walkovers_against += 1
                        home_standing.walkovers_for += 1
                    else:
                        home_standing.points += self.rules.points_for_win
                        away_standing.points += self.rules.points_for_loss
                else:
                    if match.status == "walkover":
                        away_standing.points += self.rules.points_for_walkover_win
                        home_standing.points += self.rules.points_for_walkover_loss
                        home_standing.walkovers_against += 1
                        away_standing.walkovers_for += 1
                    else:
                        away_standing.points += self.rules.points_for_win
                        home_standing.points += self.rules.points_for_loss
            else:
                # Default points system
                if match.winner == match.home_team:
                    home_standing.points += 3
                else:
                    away_standing.points += 3

            # Update differences
            home_standing.sets_difference = (
                home_standing.sets_won - home_standing.sets_lost
            )
            away_standing.sets_difference = (
                away_standing.sets_won - away_standing.sets_lost
            )
            home_standing.games_difference = (
                home_standing.games_won - home_standing.games_lost
            )
            away_standing.games_difference = (
                away_standing.games_won - away_standing.games_lost
            )

            # Update form
            home_result = "W" if match.winner == match.home_team else "L"
            away_result = "L" if match.winner == match.home_team else "W"

            home_standing.update_form(home_result)
            away_standing.update_form(away_result)

            # Save standings
            home_standing.save()
            away_standing.save()

            # Recalculate positions
            self._recalculate_positions()

    def _get_or_create_standing(self, team: LeagueTeam) -> LeagueStanding:
        """Get or create standing for a team."""
        standing, created = LeagueStanding.objects.get_or_create(
            season=self.season, team=team, defaults={"position": 0}
        )
        return standing

    def _recalculate_positions(self):
        """Recalculate positions in the standings table."""
        standings = LeagueStanding.objects.filter(season=self.season).order_by(
            "-points", "-sets_difference", "-games_difference"
        )

        for position, standing in enumerate(standings, 1):
            standing.position = position
            standing.save(update_fields=["position"])

    def get_standings_table(self) -> List[LeagueStanding]:
        """Get the current standings table."""
        return LeagueStanding.objects.filter(season=self.season).order_by(
            "-points", "-sets_difference", "-games_difference"
        )

    def get_playoff_teams(self) -> List[LeagueTeam]:
        """Get teams qualified for playoffs."""
        if not self.league.allow_playoffs:
            return []

        standings = self.get_standings_table()[: self.league.playoff_teams_count]
        return [standing.team for standing in standings]

    def get_promotion_teams(self) -> List[LeagueTeam]:
        """Get teams eligible for promotion."""
        if not self.league.allow_promotion_relegation:
            return []

        standings = self.get_standings_table()[: self.league.promotion_spots]
        return [standing.team for standing in standings]

    def get_relegation_teams(self) -> List[LeagueTeam]:
        """Get teams facing relegation."""
        if not self.league.allow_promotion_relegation:
            return []

        standings = self.get_standings_table()
        relegation_standings = standings[-self.league.relegation_spots :]
        return [standing.team for standing in relegation_standings]


class LeagueSchedulingService:
    """
    Service for managing league match scheduling.
    """

    def __init__(self, season: LeagueSeason):
        self.season = season
        self.league = season.league

    def generate_schedule(self, schedule_config: LeagueSchedule) -> Dict[str, Any]:
        """Generate a complete schedule for the season."""
        matches = self.season.matches.filter(status="scheduled").order_by(
            "matchday", "match_number"
        )

        if not matches.exists():
            raise ValidationError("No matches found to schedule")

        scheduled_matches = []
        court_availability = self._get_court_availability(schedule_config)

        for match in matches:
            scheduled_date = self._find_available_slot(
                match, schedule_config, court_availability
            )

            if scheduled_date:
                match.scheduled_date = scheduled_date["datetime"]
                match.court = scheduled_date["court"]
                match.save()

                scheduled_matches.append(
                    {
                        "match": match,
                        "scheduled_date": scheduled_date["datetime"],
                        "court": scheduled_date["court"],
                    }
                )

                # Update court availability
                self._update_court_availability(
                    court_availability,
                    scheduled_date["court"],
                    scheduled_date["datetime"],
                )

        return {
            "scheduled_matches": len(scheduled_matches),
            "total_matches": matches.count(),
            "success_rate": len(scheduled_matches) / matches.count() * 100,
            "matches": scheduled_matches,
        }

    def _get_court_availability(
        self, schedule_config: LeagueSchedule
    ) -> Dict[str, List]:
        """Get available courts and time slots."""
        courts = schedule_config.preferred_courts.all()
        if not courts.exists():
            courts = self.season.league.club.courts.filter(
                is_active=True, maintenance_mode=False, sport_type="padel"
            )

        availability = {}
        for court in courts:
            availability[court.id] = []

        return availability

    def _find_available_slot(
        self,
        match: LeagueMatch,
        schedule_config: LeagueSchedule,
        court_availability: Dict,
    ) -> Dict[str, Any]:
        """Find an available time slot for a match."""
        # Start from the calculated match date
        base_date = match.scheduled_date.date()

        # Try to find a slot within a reasonable time window
        for days_offset in range(0, 30):  # Try for 30 days
            check_date = base_date + timedelta(days=days_offset)

            # Check if date is available
            if not schedule_config.is_day_available(check_date):
                continue

            # Check if it's a preferred day
            if (
                schedule_config.preferred_days
                and check_date.weekday() not in schedule_config.preferred_days
            ):
                continue

            # Find available time slot
            current_time = datetime.combine(check_date, schedule_config.start_time)
            end_time = datetime.combine(check_date, schedule_config.end_time)

            while current_time < end_time:
                # Check each court
                for court_id in court_availability.keys():
                    court = schedule_config.preferred_courts.filter(id=court_id).first()
                    if not court:
                        continue

                    # Check if court is available at this time
                    if self._is_court_available(court, current_time):
                        return {
                            "datetime": timezone.make_aware(current_time),
                            "court": court,
                        }

                # Move to next time slot (assume 1.5 hour matches)
                current_time += timedelta(hours=1.5)

        return None

    def _is_court_available(self, court, datetime_slot: datetime) -> bool:
        """Check if a court is available at a specific datetime."""
        # Check for existing league matches
        existing_matches = LeagueMatch.objects.filter(
            court=court,
            scheduled_date__date=datetime_slot.date(),
            scheduled_date__time__range=[
                (datetime_slot - timedelta(hours=1)).time(),
                (datetime_slot + timedelta(hours=2)).time(),
            ],
            status__in=["scheduled", "confirmed", "in_progress"],
        )

        return not existing_matches.exists()

    def _update_court_availability(
        self, court_availability: Dict, court, datetime_slot: datetime
    ):
        """Update court availability after scheduling."""
        # This would update the availability tracking
        # For now, we'll just mark the slot as used
        pass

    def reschedule_match(
        self, match: LeagueMatch, new_datetime: datetime, new_court=None
    ) -> bool:
        """Reschedule a match to a new datetime."""
        if match.status not in ["scheduled", "confirmed"]:
            raise ValidationError("Can only reschedule scheduled or confirmed matches")

        schedule_config = self.season.schedules.filter(allow_reschedule=True).first()
        if not schedule_config:
            raise ValidationError("Rescheduling is not allowed for this league")

        # Check reschedule deadline
        hours_until_match = (
            match.scheduled_date - timezone.now()
        ).total_seconds() / 3600
        if hours_until_match < schedule_config.reschedule_deadline_hours:
            raise ValidationError("Reschedule deadline has passed")

        # Check if new datetime is available
        if new_court and not self._is_court_available(new_court, new_datetime):
            raise ValidationError("Court is not available at the requested time")

        # Store original date if not already stored
        if not match.original_date:
            match.original_date = match.scheduled_date

        # Update match
        match.scheduled_date = new_datetime
        if new_court:
            match.court = new_court
        match.reschedule_requests += 1
        match.save()

        return True


class LeagueStatisticsService:
    """
    Service for generating league statistics and analytics.
    """

    def __init__(self, season: LeagueSeason):
        self.season = season
        self.league = season.league

    def get_season_statistics(self) -> Dict[str, Any]:
        """Get comprehensive season statistics."""
        teams = self.season.teams.filter(status="active")
        matches = self.season.matches.all()
        completed_matches = matches.filter(status="completed")

        stats = {
            "teams": {
                "total": teams.count(),
                "active": teams.filter(status="active").count(),
                "withdrawn": teams.filter(status="withdrawn").count(),
            },
            "matches": {
                "total": matches.count(),
                "completed": completed_matches.count(),
                "scheduled": matches.filter(status="scheduled").count(),
                "in_progress": matches.filter(status="in_progress").count(),
                "cancelled": matches.filter(status="cancelled").count(),
                "walkovers": matches.filter(status="walkover").count(),
                "completion_rate": (
                    (completed_matches.count() / matches.count() * 100)
                    if matches.count() > 0
                    else 0
                ),
            },
            "scoring": {
                "total_sets": completed_matches.aggregate(
                    total=models.Sum(
                        models.F("home_score__len") + models.F("away_score__len")
                    )
                )["total"]
                or 0,
                "average_match_duration": completed_matches.filter(
                    duration_minutes__isnull=False
                ).aggregate(avg=models.Avg("duration_minutes"))["avg"]
                or 0,
            },
        }

        return stats

    def get_team_statistics(self, team: LeagueTeam) -> Dict[str, Any]:
        """Get detailed statistics for a specific team."""
        standing = team.current_standing
        home_matches = team.home_matches.filter(season=self.season, status="completed")
        away_matches = team.away_matches.filter(season=self.season, status="completed")
        all_matches = home_matches.union(away_matches)

        stats = {
            "standing": {
                "position": standing.position if standing else None,
                "points": standing.points if standing else 0,
                "matches_played": standing.matches_played if standing else 0,
                "wins": standing.matches_won if standing else 0,
                "losses": standing.matches_lost if standing else 0,
                "win_percentage": standing.win_percentage if standing else 0,
            },
            "performance": {
                "home_record": (
                    f"{standing.home_wins}-{home_matches.filter(winner__ne=team).count()}"
                    if standing
                    else "0-0"
                ),
                "away_record": (
                    f"{standing.away_wins}-{away_matches.filter(winner__ne=team).count()}"
                    if standing
                    else "0-0"
                ),
                "current_form": (
                    standing.form[-5:] if standing and standing.form else []
                ),
                "longest_win_streak": standing.longest_win_streak if standing else 0,
            },
            "scoring": {
                "sets_for": standing.sets_won if standing else 0,
                "sets_against": standing.sets_lost if standing else 0,
                "sets_difference": standing.sets_difference if standing else 0,
                "games_for": standing.games_won if standing else 0,
                "games_against": standing.games_lost if standing else 0,
                "games_difference": standing.games_difference if standing else 0,
            },
        }

        return stats

    def get_top_performers(self) -> Dict[str, Any]:
        """Get top performing teams and players."""
        standings = LeagueStanding.objects.filter(season=self.season).order_by(
            "-points"
        )

        from django.db import models

        return {
            "top_teams": standings[:5],
            "most_wins": standings.order_by("-matches_won")[:5],
            "best_attack": standings.order_by("-sets_won")[:5],
            "best_defense": standings.order_by("sets_lost")[:5],
            "most_consistent": standings.filter(matches_played__gte=5).order_by(
                "-win_percentage"
            )[:5],
        }

    def get_matchday_results(self, matchday: int) -> Dict[str, Any]:
        """Get results for a specific matchday."""
        matches = self.season.matches.filter(matchday=matchday).order_by("match_number")

        results = []
        for match in matches:
            result = {
                "match": match,
                "home_team": match.home_team.team_display_name,
                "away_team": match.away_team.team_display_name,
                "score": (
                    f"{'-'.join(map(str, match.home_score))} vs {'-'.join(map(str, match.away_score))}"
                    if match.home_score and match.away_score
                    else "Not played"
                ),
                "winner": match.winner.team_display_name if match.winner else None,
                "status": match.get_status_display(),
            }
            results.append(result)

        return {
            "matchday": matchday,
            "matches": results,
            "completed_matches": matches.filter(status="completed").count(),
            "total_matches": matches.count(),
        }

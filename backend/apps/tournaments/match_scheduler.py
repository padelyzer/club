"""
Tournament match scheduling system.
Handles court availability, player constraints, and schedule optimization.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Count

from .models import Match, MatchSchedule, Tournament
from apps.clubs.models import Court
from apps.reservations.models import Reservation
from apps.clients.models import ClientProfile


class MatchScheduler:
    """
    Intelligent match scheduler that considers court availability,
    player preferences, and tournament constraints.
    """
    
    def __init__(self, tournament: Tournament):
        self.tournament = tournament
        self.courts = self._get_available_courts()
        self.match_duration = 90  # Default match duration in minutes
        
    def schedule_matches(self, matches: List[Match], 
                        start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None) -> List[MatchSchedule]:
        """
        Schedule multiple matches considering all constraints.
        """
        if not start_date:
            start_date = timezone.make_aware(
                datetime.combine(self.tournament.start_date, datetime.min.time())
            )
        if not end_date:
            end_date = timezone.make_aware(
                datetime.combine(self.tournament.end_date, datetime.max.time())
            )
        
        schedules = []
        
        with transaction.atomic():
            # Group matches by round for better scheduling
            matches_by_round = self._group_matches_by_round(matches)
            
            for round_num, round_matches in matches_by_round.items():
                # Calculate time window for this round
                round_start = start_date + timedelta(days=(round_num - 1) * 2)
                round_end = min(round_start + timedelta(days=3), end_date)
                
                # Schedule matches for this round
                round_schedules = self._schedule_round(
                    round_matches, round_start, round_end
                )
                schedules.extend(round_schedules)
        
        # Optimize the complete schedule
        optimized_schedules = self.optimize_schedule(schedules)
        
        return optimized_schedules
    
    def _schedule_round(self, matches: List[Match], 
                       start_date: datetime, 
                       end_date: datetime) -> List[MatchSchedule]:
        """Schedule matches for a single round."""
        schedules = []
        time_slots = self._generate_time_slots(start_date, end_date)
        
        # Sort matches by priority (finals, semifinals get priority)
        sorted_matches = sorted(
            matches,
            key=lambda m: self._calculate_match_priority(m),
            reverse=True
        )
        
        for match in sorted_matches:
            # Find best time slot for this match
            best_slot = self._find_best_time_slot(
                match, time_slots, schedules
            )
            
            if best_slot:
                schedule = MatchSchedule.objects.create(
                    match=match,
                    court=best_slot['court'],
                    datetime=best_slot['datetime'],
                    duration_minutes=self.match_duration,
                    priority=self._calculate_match_priority(match),
                    status='tentative'
                )
                
                # Check for conflicts
                if schedule.check_conflicts():
                    schedule.status = 'confirmed'
                else:
                    schedule.status = 'conflict'
                
                schedule.save()
                schedules.append(schedule)
                
                # Remove used slot
                time_slots.remove(best_slot)
        
        return schedules
    
    def check_player_availability(self, player: ClientProfile, 
                                 datetime: datetime) -> bool:
        """Check if a player is available at a given time."""
        # Check for other matches at the same time
        player_matches = Match.objects.filter(
            Q(team1__player1=player) | Q(team1__player2=player) |
            Q(team2__player1=player) | Q(team2__player2=player),
            tournament__status='in_progress'
        ).exclude(status__in=['completed', 'cancelled'])
        
        for match in player_matches:
            if hasattr(match, 'schedule'):
                # Check for time overlap (with buffer time)
                buffer = timedelta(minutes=30)  # 30 min buffer between matches
                match_start = match.schedule.datetime - buffer
                match_end = match.schedule.datetime + timedelta(
                    minutes=match.schedule.duration_minutes
                ) + buffer
                
                if match_start <= datetime <= match_end:
                    return False
        
        # Check for reservations
        reservations = Reservation.objects.filter(
            user=player.user,
            date=datetime.date(),
            status='confirmed'
        )
        
        for reservation in reservations:
            res_start = timezone.make_aware(
                datetime.combine(reservation.date, reservation.time_slot.start_time)
            )
            res_end = timezone.make_aware(
                datetime.combine(reservation.date, reservation.time_slot.end_time)
            )
            
            if res_start <= datetime <= res_end:
                return False
        
        return True
    
    def optimize_schedule(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]:
        """
        Optimize match schedule to minimize travel time,
        maximize court utilization, and respect player preferences.
        """
        # Score current schedule
        current_score = self._calculate_schedule_score(schedules)
        
        # Try various optimizations
        optimizations = [
            self._optimize_minimize_travel,
            self._optimize_court_utilization,
            self._optimize_player_preferences,
            self._optimize_prime_time_for_finals
        ]
        
        best_schedules = schedules
        best_score = current_score
        
        for optimize_func in optimizations:
            candidate_schedules = optimize_func(list(schedules))
            candidate_score = self._calculate_schedule_score(candidate_schedules)
            
            if candidate_score > best_score:
                best_schedules = candidate_schedules
                best_score = candidate_score
        
        return best_schedules
    
    def resolve_conflicts(self, conflicts: List[Dict]) -> List[MatchSchedule]:
        """Resolve scheduling conflicts."""
        resolved_schedules = []
        
        for conflict in conflicts:
            schedule = conflict['schedule']
            
            # Try alternative time slots
            alternative_slots = self._find_alternative_slots(
                schedule.match,
                schedule.datetime,
                radius_days=3
            )
            
            for slot in alternative_slots:
                # Create new schedule attempt
                new_schedule = MatchSchedule(
                    match=schedule.match,
                    court=slot['court'],
                    datetime=slot['datetime'],
                    duration_minutes=schedule.duration_minutes,
                    priority=schedule.priority
                )
                
                if new_schedule.check_conflicts():
                    # Update the original schedule
                    schedule.court = slot['court']
                    schedule.datetime = slot['datetime']
                    schedule.status = 'rescheduled'
                    schedule.save()
                    resolved_schedules.append(schedule)
                    break
        
        return resolved_schedules
    
    # Helper methods
    def _get_available_courts(self) -> List[Court]:
        """Get courts available for tournament matches."""
        return list(
            Court.objects.filter(
                club=self.tournament.club,
                is_active=True,
                surface_type__in=['hard', 'clay', 'grass']  # Tournament courts
            ).order_by('display_order')
        )
    
    def _group_matches_by_round(self, matches: List[Match]) -> Dict[int, List[Match]]:
        """Group matches by round number."""
        grouped = {}
        for match in matches:
            if match.round_number not in grouped:
                grouped[match.round_number] = []
            grouped[match.round_number].append(match)
        return grouped
    
    def _generate_time_slots(self, start_date: datetime, 
                           end_date: datetime) -> List[Dict]:
        """Generate available time slots for matches."""
        slots = []
        current_date = start_date
        
        while current_date <= end_date:
            # Tournament hours (9 AM to 9 PM)
            for hour in range(9, 21):
                for court in self.courts:
                    slot_time = current_date.replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    
                    # Check if court is available
                    if self._is_court_available(court, slot_time):
                        slots.append({
                            'court': court,
                            'datetime': slot_time,
                            'quality_score': self._calculate_slot_quality(
                                court, slot_time
                            )
                        })
            
            current_date += timedelta(days=1)
        
        return sorted(slots, key=lambda x: x['quality_score'], reverse=True)
    
    def _is_court_available(self, court: Court, datetime: datetime) -> bool:
        """Check if court is available at given time."""
        # Check existing reservations
        existing = Reservation.objects.filter(
            court=court,
            date=datetime.date(),
            status='confirmed'
        )
        
        for reservation in existing:
            res_start = timezone.make_aware(
                datetime.combine(reservation.date, reservation.time_slot.start_time)
            )
            res_end = res_start + timedelta(minutes=90)
            
            if res_start <= datetime < res_end:
                return False
        
        # Check other tournament matches
        existing_matches = MatchSchedule.objects.filter(
            court=court,
            datetime__date=datetime.date(),
            status__in=['confirmed', 'tentative']
        )
        
        for match_schedule in existing_matches:
            match_end = match_schedule.datetime + timedelta(
                minutes=match_schedule.duration_minutes
            )
            if match_schedule.datetime <= datetime < match_end:
                return False
        
        return True
    
    def _calculate_match_priority(self, match: Match) -> int:
        """Calculate priority score for a match."""
        # Finals get highest priority
        total_rounds = match.tournament.total_rounds
        
        if match.round_number == total_rounds:
            return 100  # Final
        elif match.round_number == total_rounds - 1:
            return 90   # Semifinals
        elif match.round_number == total_rounds - 2:
            return 80   # Quarterfinals
        else:
            # Earlier rounds get lower priority
            return 50 - (total_rounds - match.round_number) * 5
    
    def _find_best_time_slot(self, match: Match, 
                           time_slots: List[Dict],
                           existing_schedules: List[MatchSchedule]) -> Optional[Dict]:
        """Find the best available time slot for a match."""
        valid_slots = []
        
        for slot in time_slots:
            # Check player availability
            players = [
                match.team1.player1, match.team1.player2,
                match.team2.player1, match.team2.player2
            ]
            
            if all(self.check_player_availability(p, slot['datetime']) 
                   for p in players):
                # Calculate slot score considering various factors
                score = self._calculate_slot_score(match, slot, existing_schedules)
                valid_slots.append((slot, score))
        
        if valid_slots:
            # Return slot with highest score
            valid_slots.sort(key=lambda x: x[1], reverse=True)
            return valid_slots[0][0]
        
        return None
    
    def _calculate_slot_score(self, match: Match, slot: Dict, 
                            existing_schedules: List[MatchSchedule]) -> float:
        """Calculate score for a time slot considering various factors."""
        score = slot['quality_score']
        
        # Prefer prime time for important matches
        hour = slot['datetime'].hour
        if self._calculate_match_priority(match) > 80:
            if 17 <= hour <= 20:  # Prime time
                score += 20
        
        # Avoid scheduling same players too close
        for schedule in existing_schedules:
            if self._matches_share_players(match, schedule.match):
                time_diff = abs((slot['datetime'] - schedule.datetime).total_seconds() / 3600)
                if time_diff < 2:  # Less than 2 hours
                    score -= 50
                elif time_diff < 4:  # Less than 4 hours
                    score -= 20
        
        return score
    
    def _calculate_slot_quality(self, court: Court, datetime: datetime) -> float:
        """Calculate quality score for a time slot."""
        score = 50.0
        
        # Prefer center courts for tournaments
        if court.display_order == 1:
            score += 20
        elif court.display_order == 2:
            score += 10
        
        # Time preferences
        hour = datetime.hour
        if 10 <= hour <= 12 or 17 <= hour <= 20:
            score += 15  # Preferred hours
        elif hour < 9 or hour > 21:
            score -= 20  # Non-ideal hours
        
        # Weekend bonus
        if datetime.weekday() in [5, 6]:
            score += 10
        
        return score
    
    def _matches_share_players(self, match1: Match, match2: Match) -> bool:
        """Check if two matches share any players."""
        players1 = {
            match1.team1.player1.id, match1.team1.player2.id,
            match1.team2.player1.id, match1.team2.player2.id
        }
        players2 = {
            match2.team1.player1.id, match2.team1.player2.id,
            match2.team2.player1.id, match2.team2.player2.id
        }
        
        return bool(players1 & players2)
    
    def _calculate_schedule_score(self, schedules: List[MatchSchedule]) -> float:
        """Calculate overall quality score for a schedule."""
        if not schedules:
            return 0
        
        score = 0
        
        # Court utilization
        court_usage = {}
        for schedule in schedules:
            if schedule.court.id not in court_usage:
                court_usage[schedule.court.id] = 0
            court_usage[schedule.court.id] += 1
        
        # Prefer balanced court usage
        usage_variance = sum((u - len(schedules) / len(court_usage)) ** 2 
                           for u in court_usage.values())
        score -= usage_variance * 0.5
        
        # Prime time utilization for important matches
        for schedule in schedules:
            if schedule.priority > 80 and 17 <= schedule.datetime.hour <= 20:
                score += 10
        
        # Minimize back-to-back matches for same players
        for i, schedule1 in enumerate(schedules):
            for schedule2 in schedules[i+1:]:
                if self._matches_share_players(schedule1.match, schedule2.match):
                    time_diff = abs((schedule1.datetime - schedule2.datetime).total_seconds() / 3600)
                    if time_diff < 2:
                        score -= 20
        
        return score
    
    def _optimize_minimize_travel(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]:
        """Optimize to minimize travel between courts for players."""
        # Group by players
        player_schedules = {}
        
        for schedule in schedules:
            for player in [schedule.match.team1.player1, schedule.match.team1.player2,
                          schedule.match.team2.player1, schedule.match.team2.player2]:
                if player.id not in player_schedules:
                    player_schedules[player.id] = []
                player_schedules[player.id].append(schedule)
        
        # Try to schedule player's matches on same court
        for player_id, player_matches in player_schedules.items():
            if len(player_matches) > 1:
                # Find most used court
                court_counts = {}
                for schedule in player_matches:
                    court_id = schedule.court.id
                    court_counts[court_id] = court_counts.get(court_id, 0) + 1
                
                preferred_court_id = max(court_counts, key=court_counts.get)
                
                # Try to move other matches to preferred court
                for schedule in player_matches:
                    if schedule.court.id != preferred_court_id:
                        # Check if preferred court is available
                        preferred_court = Court.objects.get(id=preferred_court_id)
                        if self._is_court_available(preferred_court, schedule.datetime):
                            schedule.court = preferred_court
                            schedule.save()
        
        return schedules
    
    def _optimize_court_utilization(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]:
        """Optimize for balanced court utilization."""
        # Calculate current utilization
        court_usage = {}
        for schedule in schedules:
            court_id = schedule.court.id
            court_usage[court_id] = court_usage.get(court_id, 0) + 1
        
        avg_usage = len(schedules) / len(self.courts)
        
        # Try to balance
        for court_id, usage in court_usage.items():
            if usage > avg_usage * 1.5:  # Overused court
                # Try to move some matches to underused courts
                court_schedules = [s for s in schedules if s.court.id == court_id]
                
                for schedule in court_schedules[:int(usage - avg_usage)]:
                    # Find underused court
                    for alt_court in self.courts:
                        if court_usage.get(alt_court.id, 0) < avg_usage * 0.8:
                            if self._is_court_available(alt_court, schedule.datetime):
                                schedule.court = alt_court
                                schedule.save()
                                court_usage[court_id] -= 1
                                court_usage[alt_court.id] = court_usage.get(alt_court.id, 0) + 1
                                break
        
        return schedules
    
    def _optimize_player_preferences(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]:
        """Optimize based on player preferences (if available)."""
        # This would integrate with player preference data
        # For now, we'll optimize for consistent match times
        
        for schedule in schedules:
            # Try to schedule matches at similar times for consistency
            player_matches = [s for s in schedules 
                            if self._matches_share_players(s.match, schedule.match)]
            
            if player_matches:
                # Calculate average match time
                avg_hour = sum(s.datetime.hour for s in player_matches) / len(player_matches)
                
                # Try to move this match closer to average time
                target_hour = int(avg_hour)
                if abs(schedule.datetime.hour - target_hour) > 2:
                    # Look for slot closer to target time
                    new_datetime = schedule.datetime.replace(hour=target_hour)
                    if self._is_court_available(schedule.court, new_datetime):
                        schedule.datetime = new_datetime
                        schedule.save()
        
        return schedules
    
    def _optimize_prime_time_for_finals(self, schedules: List[MatchSchedule]) -> List[MatchSchedule]:
        """Ensure finals and important matches get prime time slots."""
        # Sort by priority
        priority_schedules = sorted(schedules, key=lambda s: s.priority, reverse=True)
        
        # Prime time hours
        prime_hours = [18, 19, 20, 17]  # 6-8 PM preferred
        
        for schedule in priority_schedules[:4]:  # Top 4 matches
            if schedule.priority > 80:  # Important matches
                current_hour = schedule.datetime.hour
                
                if current_hour not in prime_hours:
                    # Try to find prime time slot
                    for target_hour in prime_hours:
                        new_datetime = schedule.datetime.replace(hour=target_hour)
                        if self._is_court_available(schedule.court, new_datetime):
                            schedule.datetime = new_datetime
                            schedule.save()
                            break
        
        return schedules
    
    def _find_alternative_slots(self, match: Match, 
                              original_datetime: datetime,
                              radius_days: int = 3) -> List[Dict]:
        """Find alternative time slots for a match."""
        alternatives = []
        
        start_date = original_datetime - timedelta(days=radius_days)
        end_date = original_datetime + timedelta(days=radius_days)
        
        current = start_date
        while current <= end_date:
            for hour in range(9, 21):  # Tournament hours
                for court in self.courts:
                    slot_time = current.replace(hour=hour, minute=0)
                    
                    if (slot_time != original_datetime and 
                        self._is_court_available(court, slot_time)):
                        
                        # Check player availability
                        players = [
                            match.team1.player1, match.team1.player2,
                            match.team2.player1, match.team2.player2
                        ]
                        
                        if all(self.check_player_availability(p, slot_time) 
                              for p in players):
                            alternatives.append({
                                'court': court,
                                'datetime': slot_time,
                                'distance': abs((slot_time - original_datetime).total_seconds())
                            })
            
            current += timedelta(days=1)
        
        # Sort by distance from original time
        alternatives.sort(key=lambda x: x['distance'])
        
        return alternatives[:10]  # Return top 10 alternatives
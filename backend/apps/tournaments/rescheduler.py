"""
Match Rescheduler for League Scheduling.
Handles dynamic rescheduling needs including weather, conflicts, and schedule adjustments.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass

from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import League, LeagueMatch, ScheduleConstraint, ScheduleOptimization
from .league_scheduler import LeagueScheduler

logger = logging.getLogger(__name__)


@dataclass
class RescheduleReason:
    """Represents a reason for rescheduling."""
    type: str  # weather, conflict, request, emergency
    description: str
    priority: int  # 1=critical, 2=high, 3=medium, 4=low
    affects_multiple: bool = False
    deadline: Optional[datetime] = None


@dataclass
class AlternativeSlot:
    """Represents an alternative time slot for a match."""
    datetime: datetime
    court: Optional[object] = None
    quality_score: float = 0.0
    conflicts: List[str] = None
    travel_impact: float = 0.0
    
    def __post_init__(self):
        if self.conflicts is None:
            self.conflicts = []


class MatchRescheduler:
    """
    Handle dynamic rescheduling needs for league matches.
    """
    
    def __init__(self, league: League):
        self.league = league
        self.scheduler = LeagueScheduler(league)
    
    def reschedule_match(
        self, 
        match: LeagueMatch, 
        reason: RescheduleReason,
        preferred_datetime: Optional[datetime] = None
    ) -> bool:
        """
        Reschedule a single match to an optimal alternative slot.
        """
        logger.info(f"Rescheduling match {match.id} due to {reason.type}: {reason.description}")
        
        try:
            with transaction.atomic():
                # Find alternative slots
                alternatives = self._find_alternative_slots(match, reason, preferred_datetime)
                
                if not alternatives:
                    logger.warning(f"No alternative slots found for match {match.id}")
                    return False
                
                # Select best alternative
                best_slot = self._select_optimal_slot(alternatives, match, reason)
                
                # Check for cascading effects
                cascading_matches = self._check_cascading_effects(match, best_slot)
                
                # Update match
                original_datetime = match.scheduled_datetime
                original_court = match.court
                
                match.scheduled_datetime = best_slot.datetime
                match.court = best_slot.court
                match.status = "scheduled"  # Reset status if it was postponed
                match.save()
                
                # Handle cascading rescheduling if needed
                if cascading_matches:
                    self._handle_cascading_reschedules(cascading_matches, reason)
                
                # Log the change
                self._log_reschedule(match, original_datetime, original_court, reason, best_slot)
                
                logger.info(f"Successfully rescheduled match {match.id} to {best_slot.datetime}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to reschedule match {match.id}: {str(e)}")
            return False
    
    def bulk_reschedule(
        self, 
        matches: List[LeagueMatch], 
        reason: RescheduleReason
    ) -> Dict[str, List[LeagueMatch]]:
        """
        Bulk reschedule multiple matches (e.g., weather cancellations).
        """
        logger.info(f"Bulk rescheduling {len(matches)} matches due to {reason.type}")
        
        results = {
            "successfully_rescheduled": [],
            "failed_to_reschedule": [],
            "requires_manual_intervention": []
        }
        
        try:
            with transaction.atomic():
                # Sort matches by priority
                prioritized_matches = self._prioritize_matches_for_rescheduling(matches, reason)
                
                # Find alternative slots for all matches
                match_alternatives = {}
                for match in prioritized_matches:
                    alternatives = self._find_alternative_slots(match, reason)
                    if alternatives:
                        match_alternatives[match] = alternatives
                    else:
                        results["failed_to_reschedule"].append(match)
                
                # Optimize global assignment
                optimal_assignments = self._optimize_bulk_assignment(match_alternatives, reason)
                
                # Apply assignments
                for match, slot in optimal_assignments.items():
                    try:
                        original_datetime = match.scheduled_datetime
                        original_court = match.court
                        
                        match.scheduled_datetime = slot.datetime
                        match.court = slot.court
                        match.status = "scheduled"
                        match.save()
                        
                        self._log_reschedule(match, original_datetime, original_court, reason, slot)
                        results["successfully_rescheduled"].append(match)
                        
                    except Exception as e:
                        logger.error(f"Failed to apply assignment for match {match.id}: {str(e)}")
                        results["requires_manual_intervention"].append(match)
                
                # Handle unassigned matches
                unassigned = set(match_alternatives.keys()) - set(optimal_assignments.keys())
                results["requires_manual_intervention"].extend(unassigned)
                
        except Exception as e:
            logger.error(f"Bulk reschedule failed: {str(e)}")
            # All matches require manual intervention
            results["requires_manual_intervention"] = matches
            results["successfully_rescheduled"] = []
        
        logger.info(
            f"Bulk reschedule results: "
            f"{len(results['successfully_rescheduled'])} successful, "
            f"{len(results['failed_to_reschedule'])} failed, "
            f"{len(results['requires_manual_intervention'])} need manual intervention"
        )
        
        return results
    
    def handle_weather_cancellation(
        self, 
        date: datetime.date, 
        affected_courts: List = None,
        weather_type: str = "rain"
    ) -> Dict[str, List[LeagueMatch]]:
        """
        Handle weather-related cancellations for a specific date.
        """
        logger.info(f"Handling weather cancellation for {date} ({weather_type})")
        
        # Find affected matches
        affected_matches = LeagueMatch.objects.filter(
            league=self.league,
            scheduled_datetime__date=date,
            status__in=["scheduled", "in_progress"]
        )
        
        # Filter by affected courts if specified
        if affected_courts:
            affected_matches = affected_matches.filter(court__in=affected_courts)
        
        reason = RescheduleReason(
            type="weather",
            description=f"Weather cancellation: {weather_type}",
            priority=1,  # Critical
            affects_multiple=True
        )
        
        # Set matches as postponed first
        affected_matches.update(status="postponed")
        
        # Attempt to reschedule
        return self.bulk_reschedule(list(affected_matches), reason)
    
    def compress_schedule(
        self, 
        target_end_date: datetime.date,
        max_matches_per_day: int = 5
    ) -> bool:
        """
        Compress league schedule to finish by target date.
        """
        logger.info(f"Compressing schedule to end by {target_end_date}")
        
        # Get all remaining matches
        remaining_matches = LeagueMatch.objects.filter(
            league=self.league,
            status__in=["scheduled", "postponed"],
            scheduled_datetime__date__gt=timezone.now().date()
        ).order_by('scheduled_datetime')
        
        if not remaining_matches:
            return True
        
        try:
            with transaction.atomic():
                # Calculate available time slots until target date
                available_slots = self._generate_compressed_slots(
                    timezone.now().date(),
                    target_end_date,
                    max_matches_per_day
                )
                
                if len(available_slots) < len(remaining_matches):
                    logger.warning(
                        f"Not enough slots ({len(available_slots)}) for all matches ({len(remaining_matches)})"
                    )
                    return False
                
                # Assign matches to slots
                assignments = self._optimize_compressed_assignment(remaining_matches, available_slots)
                
                # Apply assignments
                for match, slot in assignments.items():
                    match.scheduled_datetime = slot.datetime
                    match.court = slot.court
                    match.status = "scheduled"
                    match.save()
                
                logger.info(f"Successfully compressed {len(assignments)} matches")
                return True
                
        except Exception as e:
            logger.error(f"Schedule compression failed: {str(e)}")
            return False
    
    def expand_schedule(
        self, 
        new_end_date: datetime.date,
        reason: str = "Season extension"
    ) -> bool:
        """
        Expand league schedule to accommodate more time.
        """
        logger.info(f"Expanding schedule to {new_end_date}: {reason}")
        
        try:
            # Update league end date
            self.league.end_date = new_end_date
            self.league.save()
            
            # Re-optimize remaining matches with more time slots
            remaining_matches = LeagueMatch.objects.filter(
                league=self.league,
                status__in=["scheduled", "postponed"],
                scheduled_datetime__date__gt=timezone.now().date()
            )
            
            if remaining_matches:
                # Generate new time slots
                new_slots = self._generate_expanded_slots(
                    self.league.end_date,
                    new_end_date
                )
                
                # Re-optimize if beneficial
                self._reoptimize_with_expanded_slots(remaining_matches, new_slots)
            
            return True
            
        except Exception as e:
            logger.error(f"Schedule expansion failed: {str(e)}")
            return False
    
    def handle_team_withdrawal(self, team) -> bool:
        """
        Handle a team withdrawing from the league mid-season.
        """
        logger.info(f"Handling withdrawal of team {team.name}")
        
        try:
            with transaction.atomic():
                # Find all matches involving this team
                team_matches = LeagueMatch.objects.filter(
                    league=self.league,
                    models.Q(home_team=team) | models.Q(away_team=team),
                    status__in=["scheduled", "postponed"]
                )
                
                # Cancel future matches
                cancelled_count = team_matches.update(
                    status="cancelled",
                    winner=None
                )
                
                # Award walkovers for completed matches if needed
                # This would depend on league rules
                
                # Rebalance schedule if necessary
                self._rebalance_after_withdrawal(team)
                
                logger.info(f"Cancelled {cancelled_count} matches for withdrawn team {team.name}")
                return True
                
        except Exception as e:
            logger.error(f"Team withdrawal handling failed: {str(e)}")
            return False
    
    def add_makeup_matches(
        self, 
        missed_pairs: List[Tuple],
        priority: int = 2
    ) -> bool:
        """
        Add makeup matches for missed pairings.
        """
        logger.info(f"Adding {len(missed_pairs)} makeup matches")
        
        try:
            with transaction.atomic():
                # Find available slots
                available_slots = self._find_available_slots_for_makeup()
                
                if len(available_slots) < len(missed_pairs):
                    logger.warning("Not enough slots for all makeup matches")
                
                # Create and assign makeup matches
                makeup_matches = []
                for i, (home_team, away_team) in enumerate(missed_pairs):
                    if i >= len(available_slots):
                        break
                    
                    slot = available_slots[i]
                    
                    # Get next match number
                    max_match_num = LeagueMatch.objects.filter(
                        league=self.league
                    ).aggregate(
                        max_num=models.Max('match_number')
                    )['max_num'] or 0
                    
                    makeup_match = LeagueMatch.objects.create(
                        club=self.league.club,
                        league=self.league,
                        round_number=99,  # Special round for makeup matches
                        match_number=max_match_num + 1,
                        home_team=home_team,
                        away_team=away_team,
                        scheduled_datetime=slot.datetime,
                        court=slot.court,
                        scheduling_priority=priority
                    )
                    
                    makeup_matches.append(makeup_match)
                
                logger.info(f"Created {len(makeup_matches)} makeup matches")
                return True
                
        except Exception as e:
            logger.error(f"Makeup match creation failed: {str(e)}")
            return False
    
    def _find_alternative_slots(
        self, 
        match: LeagueMatch, 
        reason: RescheduleReason,
        preferred_datetime: Optional[datetime] = None
    ) -> List[AlternativeSlot]:
        """Find alternative time slots for a match."""
        alternatives = []
        
        # Time window for alternatives
        start_date = timezone.now().date()
        end_date = reason.deadline.date() if reason.deadline else self.league.end_date
        
        # Generate potential slots
        current_date = max(start_date, timezone.now().date() + timedelta(days=1))
        
        while current_date <= end_date:
            if self.scheduler._is_date_allowed(current_date):
                date_slots = self.scheduler._generate_date_time_slots(current_date)
                
                for slot_data in date_slots:
                    slot_datetime = slot_data['datetime']
                    
                    # Skip if too close to preferred time (if specified)
                    if preferred_datetime:
                        time_diff = abs((slot_datetime - preferred_datetime).total_seconds() / 3600)
                        if time_diff > 72:  # More than 72 hours away
                            continue
                    
                    # Check availability
                    conflicts = self._check_slot_conflicts(slot_datetime, slot_data.get('court'), match)
                    
                    alternative = AlternativeSlot(
                        datetime=slot_datetime,
                        court=slot_data.get('court'),
                        quality_score=slot_data['quality_score'],
                        conflicts=conflicts
                    )
                    
                    # Calculate travel impact
                    alternative.travel_impact = self._calculate_travel_impact(match, alternative)
                    
                    alternatives.append(alternative)
            
            current_date += timedelta(days=1)
        
        # Filter out slots with critical conflicts for high-priority reschedules
        if reason.priority <= 2:  # Critical or high priority
            alternatives = [alt for alt in alternatives if not alt.conflicts]
        
        # Sort by quality score and travel impact
        alternatives.sort(
            key=lambda alt: (len(alt.conflicts), -alt.quality_score, alt.travel_impact)
        )
        
        return alternatives[:20]  # Return top 20 alternatives
    
    def _select_optimal_slot(
        self, 
        alternatives: List[AlternativeSlot], 
        match: LeagueMatch, 
        reason: RescheduleReason
    ) -> AlternativeSlot:
        """Select the optimal alternative slot."""
        if not alternatives:
            raise ValueError("No alternative slots available")
        
        # Score each alternative
        scored_alternatives = []
        
        for alt in alternatives:
            score = 0
            
            # Base quality score
            score += alt.quality_score * 0.3
            
            # Penalty for conflicts
            score -= len(alt.conflicts) * 20
            
            # Travel impact penalty
            score -= alt.travel_impact * 0.2
            
            # Time preference bonus (sooner is better for high priority)
            if reason.priority <= 2:
                days_away = (alt.datetime.date() - timezone.now().date()).days
                score += max(0, 10 - days_away)  # Bonus for sooner dates
            
            scored_alternatives.append((alt, score))
        
        # Return best scored alternative
        best_alternative, _ = max(scored_alternatives, key=lambda x: x[1])
        return best_alternative
    
    def _check_slot_conflicts(
        self, 
        datetime_slot: datetime, 
        court, 
        original_match: LeagueMatch
    ) -> List[str]:
        """Check for conflicts in a time slot."""
        conflicts = []
        
        # Check for court conflicts
        if court:
            conflicting_matches = LeagueMatch.objects.filter(
                scheduled_datetime=datetime_slot,
                court=court,
                status__in=["scheduled", "in_progress"]
            ).exclude(id=original_match.id)
            
            if conflicting_matches.exists():
                conflicts.append(f"Court conflict with match {conflicting_matches.first().id}")
        
        # Check for team conflicts
        team_matches = LeagueMatch.objects.filter(
            models.Q(home_team=original_match.home_team) | 
            models.Q(away_team=original_match.home_team) |
            models.Q(home_team=original_match.away_team) | 
            models.Q(away_team=original_match.away_team),
            scheduled_datetime=datetime_slot,
            status__in=["scheduled", "in_progress"]
        ).exclude(id=original_match.id)
        
        if team_matches.exists():
            conflicts.append("Team already has match at this time")
        
        # Check rest period
        rest_conflicts = self._check_rest_period_conflicts(
            datetime_slot, original_match.home_team, original_match.away_team
        )
        conflicts.extend(rest_conflicts)
        
        return conflicts
    
    def _check_rest_period_conflicts(self, datetime_slot: datetime, *teams) -> List[str]:
        """Check if teams have adequate rest period."""
        conflicts = []
        min_rest_hours = 48
        
        for team in teams:
            # Check matches before this slot
            recent_matches = LeagueMatch.objects.filter(
                models.Q(home_team=team) | models.Q(away_team=team),
                scheduled_datetime__gt=datetime_slot - timedelta(hours=min_rest_hours),
                scheduled_datetime__lt=datetime_slot,
                status__in=["scheduled", "completed", "in_progress"]
            )
            
            if recent_matches.exists():
                last_match = recent_matches.order_by('-scheduled_datetime').first()
                hours_diff = (datetime_slot - last_match.scheduled_datetime).total_seconds() / 3600
                
                if hours_diff < min_rest_hours:
                    conflicts.append(f"Insufficient rest for {team.name} ({hours_diff:.1f}h)")
        
        return conflicts
    
    def _calculate_travel_impact(self, match: LeagueMatch, alternative: AlternativeSlot) -> float:
        """Calculate travel impact of moving to alternative slot."""
        # This would calculate the difference in travel burden
        # For now, return a simple estimate based on time difference
        
        if not match.scheduled_datetime:
            return 0.0
        
        # Time change impact (more change = higher impact)
        original_time = match.scheduled_datetime
        new_time = alternative.datetime
        
        time_diff_hours = abs((new_time - original_time).total_seconds() / 3600)
        
        # Impact increases with time difference
        return min(time_diff_hours / 24, 10.0)  # Cap at 10.0
    
    def _prioritize_matches_for_rescheduling(
        self, 
        matches: List[LeagueMatch], 
        reason: RescheduleReason
    ) -> List[LeagueMatch]:
        """Prioritize matches for rescheduling based on various factors."""
        def priority_key(match):
            priority_score = 0
            
            # Matches closer to now get higher priority
            days_away = (match.scheduled_datetime.date() - timezone.now().date()).days
            priority_score += max(0, 30 - days_away)
            
            # Important matches (higher round numbers) get priority
            priority_score += match.round_number * 2
            
            # Matches with higher scheduling priority
            priority_score += match.scheduling_priority
            
            return priority_score
        
        return sorted(matches, key=priority_key, reverse=True)
    
    def _optimize_bulk_assignment(
        self, 
        match_alternatives: Dict[LeagueMatch, List[AlternativeSlot]], 
        reason: RescheduleReason
    ) -> Dict[LeagueMatch, AlternativeSlot]:
        """Optimize assignment of matches to slots globally."""
        # This is a simplified assignment algorithm
        # In practice, this could use more sophisticated optimization
        
        assignments = {}
        used_slots = set()
        
        # Sort matches by number of available alternatives (least flexible first)
        sorted_matches = sorted(
            match_alternatives.items(),
            key=lambda x: len(x[1])
        )
        
        for match, alternatives in sorted_matches:
            # Find best available slot
            for alt in alternatives:
                slot_key = (alt.datetime, alt.court)
                
                if slot_key not in used_slots:
                    assignments[match] = alt
                    used_slots.add(slot_key)
                    break
        
        return assignments
    
    def _generate_compressed_slots(
        self, 
        start_date: datetime.date, 
        end_date: datetime.date,
        max_per_day: int
    ) -> List[AlternativeSlot]:
        """Generate time slots for compressed scheduling."""
        slots = []
        current_date = start_date
        
        while current_date <= end_date:
            if self.scheduler._is_date_allowed(current_date):
                # Generate more slots per day for compression
                daily_slots = self._generate_dense_time_slots(current_date, max_per_day)
                slots.extend(daily_slots)
            
            current_date += timedelta(days=1)
        
        return slots
    
    def _generate_dense_time_slots(self, date: datetime.date, max_slots: int) -> List[AlternativeSlot]:
        """Generate dense time slots for a specific date."""
        slots = []
        
        # Extended hours for compression
        start_time = datetime.combine(date, timezone.now().time().replace(hour=8, minute=0))
        end_time = datetime.combine(date, timezone.now().time().replace(hour=23, minute=0))
        
        current_time = start_time
        slot_duration = timedelta(minutes=90)  # Match duration
        slot_interval = timedelta(minutes=45)  # Reduced interval
        
        slot_count = 0
        while current_time + slot_duration <= end_time and slot_count < max_slots:
            available_courts = self.scheduler._get_available_courts(date)
            
            for court in available_courts:
                if slot_count >= max_slots:
                    break
                
                slot = AlternativeSlot(
                    datetime=current_time,
                    court=court,
                    quality_score=self.scheduler._calculate_slot_quality(current_time, court)
                )
                slots.append(slot)
                slot_count += 1
            
            current_time += slot_interval
        
        return slots
    
    def _optimize_compressed_assignment(
        self, 
        matches: List[LeagueMatch], 
        slots: List[AlternativeSlot]
    ) -> Dict[LeagueMatch, AlternativeSlot]:
        """Optimize assignment for compressed schedule."""
        # Simple greedy assignment for now
        assignments = {}
        used_slots = set()
        
        for match in matches:
            best_slot = None
            best_score = float('-inf')
            
            for slot in slots:
                slot_key = (slot.datetime, slot.court)
                if slot_key in used_slots:
                    continue
                
                # Score this assignment
                score = slot.quality_score
                
                # Prefer slots that don't conflict with team constraints
                conflicts = self._check_slot_conflicts(slot.datetime, slot.court, match)
                score -= len(conflicts) * 50
                
                if score > best_score:
                    best_score = score
                    best_slot = slot
            
            if best_slot:
                assignments[match] = best_slot
                used_slots.add((best_slot.datetime, best_slot.court))
        
        return assignments
    
    def _log_reschedule(
        self, 
        match: LeagueMatch, 
        original_datetime: datetime, 
        original_court, 
        reason: RescheduleReason,
        new_slot: AlternativeSlot
    ):
        """Log rescheduling action."""
        logger.info(
            f"RESCHEDULE: Match {match.id} ({match.home_team.name} vs {match.away_team.name}) "
            f"moved from {original_datetime} at {original_court} "
            f"to {new_slot.datetime} at {new_slot.court}. "
            f"Reason: {reason.description}"
        )
    
    def _check_cascading_effects(
        self, 
        match: LeagueMatch, 
        new_slot: AlternativeSlot
    ) -> List[LeagueMatch]:
        """Check if rescheduling this match affects others."""
        # Find matches that might be affected by this change
        cascading = []
        
        # Check if new slot conflicts with other matches
        slot_conflicts = LeagueMatch.objects.filter(
            scheduled_datetime=new_slot.datetime,
            court=new_slot.court,
            status__in=["scheduled", "in_progress"]
        ).exclude(id=match.id)
        
        cascading.extend(slot_conflicts)
        
        return cascading
    
    def _handle_cascading_reschedules(
        self, 
        affected_matches: List[LeagueMatch], 
        original_reason: RescheduleReason
    ):
        """Handle matches affected by cascading rescheduling."""
        cascade_reason = RescheduleReason(
            type="cascade",
            description=f"Cascading from {original_reason.type}: {original_reason.description}",
            priority=original_reason.priority + 1,
            affects_multiple=len(affected_matches) > 1
        )
        
        for affected_match in affected_matches:
            self.reschedule_match(affected_match, cascade_reason)
    
    def _generate_expanded_slots(
        self, 
        old_end_date: datetime.date, 
        new_end_date: datetime.date
    ) -> List[AlternativeSlot]:
        """Generate additional slots from schedule expansion."""
        slots = []
        current_date = old_end_date + timedelta(days=1)
        
        while current_date <= new_end_date:
            if self.scheduler._is_date_allowed(current_date):
                date_slots = self.scheduler._generate_date_time_slots(current_date)
                for slot_data in date_slots:
                    slot = AlternativeSlot(
                        datetime=slot_data['datetime'],
                        court=slot_data.get('court'),
                        quality_score=slot_data['quality_score']
                    )
                    slots.append(slot)
            
            current_date += timedelta(days=1)
        
        return slots
    
    def _reoptimize_with_expanded_slots(
        self, 
        matches: List[LeagueMatch], 
        new_slots: List[AlternativeSlot]
    ):
        """Re-optimize matches with additional available slots."""
        # This could move matches to better slots now that more time is available
        # For now, just log that expansion occurred
        logger.info(f"Schedule expanded with {len(new_slots)} additional slots")
    
    def _rebalance_after_withdrawal(self, withdrawn_team):
        """Rebalance schedule after team withdrawal."""
        # This would implement logic to rebalance the league
        # such as adjusting divisions or adding makeup matches
        logger.info(f"Rebalancing schedule after {withdrawn_team.name} withdrawal")
    
    def _find_available_slots_for_makeup(self) -> List[AlternativeSlot]:
        """Find available slots for makeup matches."""
        # Use the scheduler to find available slots
        return self.scheduler._get_available_time_slots()[:10]  # Limit to 10 for now
"""
Geographic Optimizer for League Scheduling.
Uses KMeans clustering and geographic algorithms to optimize travel and venue assignments.
"""

import math
import logging
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass

import numpy as np
from sklearn.cluster import KMeans
from geopy.distance import geodesic
from geopy.geocoders import Nominatim

from .models import League, LeagueTeam

logger = logging.getLogger(__name__)


@dataclass
class Location:
    """Represents a geographic location."""
    lat: float
    lng: float
    name: str = ""
    
    def distance_to(self, other: 'Location') -> float:
        """Calculate distance in kilometers to another location."""
        return geodesic((self.lat, self.lng), (other.lat, other.lng)).kilometers


@dataclass
class TeamLocation:
    """Represents a team with its location."""
    team: LeagueTeam
    location: Location
    cluster_id: Optional[int] = None


class GeographicOptimizer:
    """
    Optimize league schedules based on geographic constraints.
    Implements clustering, venue assignment, and travel minimization.
    """
    
    def __init__(self, league: League):
        self.league = league
        self.teams = list(league.teams.all())
        self.team_locations = []
        self._initialize_team_locations()
    
    def _initialize_team_locations(self):
        """Initialize team locations from database or geocoding."""
        for team in self.teams:
            location = self._get_team_location(team)
            if location:
                team_location = TeamLocation(team=team, location=location)
                self.team_locations.append(team_location)
    
    def _get_team_location(self, team: LeagueTeam) -> Optional[Location]:
        """Get location for a team."""
        # Try to get from team data first
        if team.location_lat and team.location_lng:
            return Location(
                lat=team.location_lat,
                lng=team.location_lng,
                name=f"{team.name} Home"
            )
        
        # Try to get from home venue
        if team.home_venue:
            venue_location = self._get_venue_location(team.home_venue)
            if venue_location:
                # Update team location in database
                team.location_lat = venue_location.lat
                team.location_lng = venue_location.lng
                team.save()
                return venue_location
        
        # Try geocoding based on player locations
        player_location = self._geocode_player_location(team)
        if player_location:
            team.location_lat = player_location.lat
            team.location_lng = player_location.lng
            team.save()
            return player_location
        
        logger.warning(f"Could not determine location for team {team.name}")
        return None
    
    def _get_venue_location(self, club) -> Optional[Location]:
        """Get location from club/venue."""
        if hasattr(club, 'latitude') and club.latitude and club.longitude:
            return Location(
                lat=club.latitude,
                lng=club.longitude,
                name=club.name
            )
        
        # Try geocoding club address
        if hasattr(club, 'address') and club.address:
            geocoded = self._geocode_address(club.address)
            if geocoded:
                # Update club coordinates if possible
                if hasattr(club, 'latitude'):
                    club.latitude = geocoded.lat
                    club.longitude = geocoded.lng
                    club.save()
                return geocoded
        
        return None
    
    def _geocode_player_location(self, team: LeagueTeam) -> Optional[Location]:
        """Try to geocode location based on player information."""
        # This would use player addresses or city information
        # For now, return None to indicate no location available
        return None
    
    def _geocode_address(self, address: str) -> Optional[Location]:
        """Geocode an address string."""
        try:
            geolocator = Nominatim(user_agent="padelyzer-scheduler")
            location = geolocator.geocode(address, timeout=10)
            
            if location:
                return Location(
                    lat=location.latitude,
                    lng=location.longitude,
                    name=address
                )
        except Exception as e:
            logger.warning(f"Geocoding failed for address '{address}': {str(e)}")
        
        return None
    
    def cluster_teams_by_location(self, num_clusters: Optional[int] = None) -> Dict[int, List[TeamLocation]]:
        """
        Cluster teams by geographic location using KMeans.
        """
        if len(self.team_locations) < 2:
            logger.warning("Not enough team locations for clustering")
            return {0: self.team_locations}
        
        if num_clusters is None:
            num_clusters = self._determine_optimal_clusters()
        
        # Prepare data for clustering
        coordinates = np.array([
            [tl.location.lat, tl.location.lng] 
            for tl in self.team_locations
        ])
        
        # Perform KMeans clustering
        kmeans = KMeans(
            n_clusters=num_clusters, 
            random_state=42,
            n_init=10
        )
        cluster_labels = kmeans.fit_predict(coordinates)
        
        # Assign cluster IDs to team locations
        for i, team_location in enumerate(self.team_locations):
            team_location.cluster_id = cluster_labels[i]
        
        # Group teams by cluster
        clusters = {}
        for team_location in self.team_locations:
            cluster_id = team_location.cluster_id
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(team_location)
        
        logger.info(f"Created {len(clusters)} geographic clusters")
        for cluster_id, teams in clusters.items():
            team_names = [tl.team.name for tl in teams]
            logger.info(f"Cluster {cluster_id}: {team_names}")
        
        return clusters
    
    def _determine_optimal_clusters(self) -> int:
        """Determine optimal number of clusters using elbow method."""
        n_teams = len(self.team_locations)
        
        # Don't cluster if too few teams
        if n_teams <= 4:
            return 1
        
        # Use elbow method for 2 to min(10, n_teams//2) clusters
        max_clusters = min(10, n_teams // 2)
        
        coordinates = np.array([
            [tl.location.lat, tl.location.lng] 
            for tl in self.team_locations
        ])
        
        wcss = []  # Within-cluster sum of squares
        k_range = range(1, max_clusters + 1)
        
        for k in k_range:
            if k > n_teams:
                break
            
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(coordinates)
            wcss.append(kmeans.inertia_)
        
        # Find elbow point (simplified method)
        if len(wcss) <= 2:
            return 1
        
        # Calculate rate of change
        differences = [wcss[i-1] - wcss[i] for i in range(1, len(wcss))]
        
        # Find the point where improvement starts to diminish
        for i in range(1, len(differences)):
            if differences[i] < differences[i-1] * 0.7:  # 30% reduction in improvement
                return i + 1
        
        # Default to a reasonable number
        return min(4, max(2, n_teams // 8))
    
    def assign_home_venues(self, clusters: Dict[int, List[TeamLocation]]) -> Dict[LeagueTeam, Location]:
        """
        Assign optimal home venues to teams based on clusters and availability.
        """
        venue_assignments = {}
        available_venues = self._get_available_venues()
        
        for cluster_id, team_locations in clusters.items():
            # Find cluster centroid
            cluster_center = self._calculate_cluster_center(team_locations)
            
            # Assign venues to teams in this cluster
            cluster_assignments = self._assign_venues_to_cluster(
                team_locations, available_venues, cluster_center
            )
            
            venue_assignments.update(cluster_assignments)
        
        # Update team home venues in database
        for team, venue_location in venue_assignments.items():
            # Find the closest actual venue/club to this location
            closest_club = self._find_closest_club(venue_location)
            if closest_club:
                team.home_venue = closest_club
                team.save()
        
        return venue_assignments
    
    def _calculate_cluster_center(self, team_locations: List[TeamLocation]) -> Location:
        """Calculate the geographic center of a cluster."""
        if not team_locations:
            return Location(0, 0, "Center")
        
        avg_lat = sum(tl.location.lat for tl in team_locations) / len(team_locations)
        avg_lng = sum(tl.location.lng for tl in team_locations) / len(team_locations)
        
        return Location(avg_lat, avg_lng, f"Cluster Center")
    
    def _get_available_venues(self) -> List[Location]:
        """Get list of available venues/courts."""
        venues = []
        
        # Get courts from the league's club
        if hasattr(self.league, 'club') and self.league.club:
            club_location = self._get_venue_location(self.league.club)
            if club_location:
                venues.append(club_location)
        
        # Get courts from partner clubs (if available)
        # This would be expanded based on club partnerships
        
        # If no venues found, use team locations as potential venues
        if not venues:
            venues = [tl.location for tl in self.team_locations]
        
        return venues
    
    def _assign_venues_to_cluster(
        self, 
        team_locations: List[TeamLocation],
        available_venues: List[Location],
        cluster_center: Location
    ) -> Dict[LeagueTeam, Location]:
        """Assign venues to teams within a cluster."""
        assignments = {}
        
        for team_location in team_locations:
            # Find the best venue for this team
            best_venue = self._find_best_venue_for_team(
                team_location, available_venues, cluster_center
            )
            
            if best_venue:
                assignments[team_location.team] = best_venue
        
        return assignments
    
    def _find_best_venue_for_team(
        self, 
        team_location: TeamLocation,
        available_venues: List[Location],
        cluster_center: Location
    ) -> Optional[Location]:
        """Find the best venue for a specific team."""
        if not available_venues:
            return None
        
        # Score venues based on distance to team and cluster center
        venue_scores = []
        
        for venue in available_venues:
            # Distance from team to venue
            team_distance = team_location.location.distance_to(venue)
            
            # Distance from venue to cluster center
            center_distance = venue.distance_to(cluster_center)
            
            # Combined score (lower is better)
            # Weight team distance more heavily
            score = (team_distance * 0.7) + (center_distance * 0.3)
            
            venue_scores.append((venue, score))
        
        # Return venue with lowest score
        best_venue, _ = min(venue_scores, key=lambda x: x[1])
        return best_venue
    
    def _find_closest_club(self, location: Location):
        """Find the closest actual club to a location."""
        # This would query the clubs database to find the nearest club
        # For now, return the league's club
        return getattr(self.league, 'club', None)
    
    def calculate_travel_matrix(self) -> Dict[Tuple[int, int], float]:
        """
        Calculate travel distance matrix between all teams.
        Returns dictionary with (team1_id, team2_id) -> distance_km
        """
        travel_matrix = {}
        
        for i, tl1 in enumerate(self.team_locations):
            for j, tl2 in enumerate(self.team_locations):
                if i != j:
                    distance = tl1.location.distance_to(tl2.location)
                    travel_matrix[(tl1.team.id, tl2.team.id)] = distance
        
        return travel_matrix
    
    def optimize_match_venues(
        self, 
        match_pairs: List[Tuple[LeagueTeam, LeagueTeam]]
    ) -> Dict[Tuple[LeagueTeam, LeagueTeam], Location]:
        """
        Optimize venue selection for each match to minimize total travel.
        """
        venue_assignments = {}
        travel_matrix = self.calculate_travel_matrix()
        available_venues = self._get_available_venues()
        
        for home_team, away_team in match_pairs:
            # Find optimal venue for this match
            best_venue = self._find_optimal_match_venue(
                home_team, away_team, available_venues, travel_matrix
            )
            
            if best_venue:
                venue_assignments[(home_team, away_team)] = best_venue
        
        return venue_assignments
    
    def _find_optimal_match_venue(
        self,
        home_team: LeagueTeam,
        away_team: LeagueTeam,
        available_venues: List[Location],
        travel_matrix: Dict[Tuple[int, int], float]
    ) -> Optional[Location]:
        """Find optimal venue for a specific match."""
        if not available_venues:
            return None
        
        home_location = self._get_team_location(home_team)
        away_location = self._get_team_location(away_team)
        
        if not home_location or not away_location:
            return available_venues[0]  # Return first venue as fallback
        
        venue_scores = []
        
        for venue in available_venues:
            # Calculate total travel for both teams
            home_travel = home_location.distance_to(venue)
            away_travel = away_location.distance_to(venue)
            
            # Weight home team travel less (home advantage)
            total_travel = (home_travel * 0.3) + (away_travel * 0.7)
            
            venue_scores.append((venue, total_travel))
        
        # Return venue with minimum total travel
        best_venue, _ = min(venue_scores, key=lambda x: x[1])
        return best_venue
    
    def generate_travel_report(self) -> Dict:
        """Generate a comprehensive travel analysis report."""
        if not self.team_locations:
            return {"error": "No team locations available"}
        
        travel_matrix = self.calculate_travel_matrix()
        clusters = self.cluster_teams_by_location()
        
        # Calculate statistics
        all_distances = list(travel_matrix.values())
        
        report = {
            "total_teams": len(self.team_locations),
            "teams_with_locations": len([tl for tl in self.team_locations if tl.location]),
            "geographic_clusters": len(clusters),
            "travel_statistics": {
                "min_distance_km": min(all_distances) if all_distances else 0,
                "max_distance_km": max(all_distances) if all_distances else 0,
                "avg_distance_km": sum(all_distances) / len(all_distances) if all_distances else 0,
                "total_possible_distance_km": sum(all_distances)
            },
            "cluster_details": {},
            "recommendations": []
        }
        
        # Cluster analysis
        for cluster_id, team_locations in clusters.items():
            cluster_center = self._calculate_cluster_center(team_locations)
            
            # Calculate intra-cluster distances
            intra_distances = []
            for i, tl1 in enumerate(team_locations):
                for tl2 in team_locations[i+1:]:
                    distance = tl1.location.distance_to(tl2.location)
                    intra_distances.append(distance)
            
            cluster_info = {
                "team_count": len(team_locations),
                "team_names": [tl.team.name for tl in team_locations],
                "center": {"lat": cluster_center.lat, "lng": cluster_center.lng},
                "avg_intra_distance_km": sum(intra_distances) / len(intra_distances) if intra_distances else 0,
                "max_intra_distance_km": max(intra_distances) if intra_distances else 0
            }
            
            report["cluster_details"][cluster_id] = cluster_info
        
        # Generate recommendations
        if report["travel_statistics"]["max_distance_km"] > self.league.max_travel_distance:
            report["recommendations"].append(
                f"Some teams exceed max travel distance ({self.league.max_travel_distance}km). "
                "Consider regional divisions or venue adjustments."
            )
        
        if len(clusters) > 4:
            report["recommendations"].append(
                "High geographic dispersion detected. Consider creating regional divisions."
            )
        
        avg_distance = report["travel_statistics"]["avg_distance_km"]
        if avg_distance > 30:
            report["recommendations"].append(
                f"Average travel distance ({avg_distance:.1f}km) is high. "
                "Consider more local venue assignments."
            )
        
        return report
    
    def suggest_optimal_divisions(self, max_teams_per_division: int = 12) -> List[List[LeagueTeam]]:
        """
        Suggest optimal division structure based on geographic clusters.
        """
        clusters = self.cluster_teams_by_location()
        divisions = []
        
        for cluster_id, team_locations in clusters.items():
            teams = [tl.team for tl in team_locations]
            
            # If cluster is too large, split it further
            while len(teams) > max_teams_per_division:
                # Split the cluster
                mid_point = len(teams) // 2
                divisions.append(teams[:mid_point])
                teams = teams[mid_point:]
            
            if teams:  # Add remaining teams
                divisions.append(teams)
        
        # Ensure minimum viable division size
        min_division_size = 4
        final_divisions = []
        
        for division in divisions:
            if len(division) >= min_division_size:
                final_divisions.append(division)
            elif final_divisions:
                # Merge small divisions with the last division
                final_divisions[-1].extend(division)
            else:
                # First division, keep it even if small
                final_divisions.append(division)
        
        return final_divisions
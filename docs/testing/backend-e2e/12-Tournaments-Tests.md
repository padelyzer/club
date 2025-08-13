# 🏆 Tournaments Module Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el módulo de torneos, cubriendo creación de torneos, inscripciones, gestión de partidos, rankings y premios.

## 🎯 Objetivos de Testing

### Cobertura Target: 90%
- **Unit Tests**: 60% - Lógica de negocio y algoritmos
- **Integration Tests**: 25% - Endpoints y flujos de API
- **E2E Tests**: 15% - Flujos completos de torneo

### Endpoints a Cubrir
- ✅ GET `/api/v1/tournaments/`
- ✅ POST `/api/v1/tournaments/`
- ✅ GET `/api/v1/tournaments/{id}/`
- ✅ PUT `/api/v1/tournaments/{id}/`
- ✅ DELETE `/api/v1/tournaments/{id}/`
- ✅ POST `/api/v1/tournaments/{id}/register/`
- ✅ POST `/api/v1/tournaments/{id}/withdraw/`
- ✅ GET `/api/v1/tournaments/{id}/matches/`
- ✅ PUT `/api/v1/tournaments/{id}/matches/{match_id}/`
- ✅ GET `/api/v1/tournaments/{id}/rankings/`
- ✅ POST `/api/v1/tournaments/{id}/generate-draw/`

## 🧪 Unit Tests

### 1. Tournament Model Tests
```python
# backend/tests/unit/tournaments/test_models.py
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from apps.tournaments.models import Tournament, TournamentRegistration, Match, TournamentRound
from tests.factories import UserFactory, ClubFactory, CourtFactory

class TournamentModelTest(TestCase):
    """Test Tournament model functionality"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.court = CourtFactory(club=self.club)
    
    def test_create_tournament(self):
        """Test tournament creation"""
        tournament = Tournament.objects.create(
            name="Summer Championship 2023",
            club=self.club,
            start_date=timezone.now() + timedelta(days=7),
            end_date=timezone.now() + timedelta(days=14),
            registration_deadline=timezone.now() + timedelta(days=5),
            max_participants=16,
            format='KNOCKOUT',
            category='OPEN',
            entry_fee=25.00,
            prize_pool=500.00,
            status='DRAFT'
        )
        
        self.assertEqual(tournament.name, "Summer Championship 2023")
        self.assertEqual(tournament.max_participants, 16)
        self.assertEqual(tournament.format, 'KNOCKOUT')
        self.assertTrue(tournament.is_registration_open)
    
    def test_tournament_status_transitions(self):
        """Test tournament status transitions"""
        tournament = Tournament.objects.create(
            name="Test Tournament",
            club=self.club,
            start_date=timezone.now() + timedelta(days=1),
            registration_deadline=timezone.now() + timedelta(hours=12),
            status='DRAFT'
        )
        
        # Draft -> Published
        tournament.publish()
        self.assertEqual(tournament.status, 'PUBLISHED')
        
        # Cannot unpublish
        with self.assertRaises(ValueError):
            tournament.status = 'DRAFT'
            tournament.save()
    
    def test_registration_validation(self):
        """Test registration deadline validation"""
        # Registration deadline after start date should fail
        with self.assertRaises(ValidationError):
            Tournament.objects.create(
                name="Invalid Tournament",
                club=self.club,
                start_date=timezone.now() + timedelta(days=1),
                registration_deadline=timezone.now() + timedelta(days=2)
            )

class TournamentRegistrationTest(TestCase):
    """Test tournament registration functionality"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            club=ClubFactory(),
            start_date=timezone.now() + timedelta(days=7),
            registration_deadline=timezone.now() + timedelta(days=5),
            max_participants=4,
            entry_fee=20.00
        )
        self.player1 = UserFactory()
        self.player2 = UserFactory()
    
    def test_single_registration(self):
        """Test single player registration"""
        registration = TournamentRegistration.objects.create(
            tournament=self.tournament,
            player=self.player1,
            registration_type='SINGLE'
        )
        
        self.assertEqual(registration.status, 'PENDING')
        self.assertIsNone(registration.partner)
        
    def test_doubles_registration(self):
        """Test doubles registration"""
        registration = TournamentRegistration.objects.create(
            tournament=self.tournament,
            player=self.player1,
            partner=self.player2,
            registration_type='DOUBLES'
        )
        
        self.assertEqual(registration.registration_type, 'DOUBLES')
        self.assertEqual(registration.partner, self.player2)
    
    def test_max_participants_limit(self):
        """Test maximum participants limit"""
        # Fill tournament
        for i in range(4):
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=UserFactory(),
                status='CONFIRMED'
            )
        
        # Next registration should go to waiting list
        registration = TournamentRegistration.objects.create(
            tournament=self.tournament,
            player=UserFactory()
        )
        
        self.assertEqual(registration.status, 'WAITLIST')
    
    def test_duplicate_registration_prevented(self):
        """Test duplicate registration prevention"""
        TournamentRegistration.objects.create(
            tournament=self.tournament,
            player=self.player1
        )
        
        # Second registration should fail
        with self.assertRaises(IntegrityError):
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=self.player1
            )

class MatchModelTest(TestCase):
    """Test match functionality"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            club=ClubFactory(),
            start_date=timezone.now(),
            format='KNOCKOUT'
        )
        self.player1 = UserFactory()
        self.player2 = UserFactory()
        self.court = CourtFactory(club=self.tournament.club)
    
    def test_create_match(self):
        """Test match creation"""
        match = Match.objects.create(
            tournament=self.tournament,
            round=TournamentRound.objects.create(
                tournament=self.tournament,
                round_number=1,
                name="Round of 16"
            ),
            player1=self.player1,
            player2=self.player2,
            court=self.court,
            scheduled_time=timezone.now() + timedelta(hours=2),
            match_number=1
        )
        
        self.assertEqual(match.status, 'SCHEDULED')
        self.assertIsNone(match.winner)
        self.assertEqual(match.get_players(), [self.player1, self.player2])
    
    def test_record_match_result(self):
        """Test recording match result"""
        match = Match.objects.create(
            tournament=self.tournament,
            round=TournamentRound.objects.create(
                tournament=self.tournament,
                round_number=1
            ),
            player1=self.player1,
            player2=self.player2
        )
        
        # Record result
        match.record_result(
            winner=self.player1,
            score_player1_set1=6,
            score_player2_set1=4,
            score_player1_set2=6,
            score_player2_set2=3
        )
        
        self.assertEqual(match.winner, self.player1)
        self.assertEqual(match.status, 'COMPLETED')
        self.assertEqual(match.sets_won_player1, 2)
        self.assertEqual(match.sets_won_player2, 0)
    
    def test_walkover(self):
        """Test walkover functionality"""
        match = Match.objects.create(
            tournament=self.tournament,
            round=TournamentRound.objects.create(
                tournament=self.tournament,
                round_number=1
            ),
            player1=self.player1,
            player2=self.player2
        )
        
        match.record_walkover(winner=self.player1, reason="No show")
        
        self.assertEqual(match.winner, self.player1)
        self.assertEqual(match.status, 'WALKOVER')
        self.assertEqual(match.walkover_reason, "No show")
```

### 2. Tournament Algorithm Tests
```python
# backend/tests/unit/tournaments/test_algorithms.py
from django.test import TestCase
from apps.tournaments.services import TournamentDrawGenerator, SwissSystemManager
from apps.tournaments.models import Tournament, TournamentRegistration
from tests.factories import UserFactory, ClubFactory

class TournamentDrawGeneratorTest(TestCase):
    """Test tournament draw generation algorithms"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            club=ClubFactory(),
            format='KNOCKOUT',
            max_participants=16
        )
        self.generator = TournamentDrawGenerator(self.tournament)
    
    def test_knockout_draw_power_of_two(self):
        """Test knockout draw with power of 2 participants"""
        # Create 8 participants
        players = [UserFactory() for _ in range(8)]
        for player in players:
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=player,
                status='CONFIRMED'
            )
        
        draw = self.generator.generate_knockout_draw()
        
        # Should have 4 matches in first round
        self.assertEqual(len(draw['rounds'][0]['matches']), 4)
        # Should have 3 rounds total (8->4->2->1)
        self.assertEqual(len(draw['rounds']), 3)
    
    def test_knockout_draw_with_byes(self):
        """Test knockout draw with byes"""
        # Create 13 participants (need byes to reach 16)
        players = [UserFactory() for _ in range(13)]
        for player in players:
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=player,
                status='CONFIRMED'
            )
        
        draw = self.generator.generate_knockout_draw()
        
        # First round should have some byes
        first_round_matches = draw['rounds'][0]['matches']
        byes = [m for m in first_round_matches if m['player2'] is None]
        self.assertEqual(len(byes), 3)  # 16 - 13 = 3 byes
    
    def test_seeded_draw(self):
        """Test seeded tournament draw"""
        # Create players with rankings
        seeded_players = []
        for i in range(8):
            player = UserFactory()
            player.ranking_points = 1000 - (i * 100)
            player.save()
            seeded_players.append(player)
            
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=player,
                status='CONFIRMED',
                seed=i + 1 if i < 4 else None
            )
        
        draw = self.generator.generate_knockout_draw(seeded=True)
        
        # Verify top seeds don't meet early
        first_round = draw['rounds'][0]['matches']
        seed1_match = next(m for m in first_round if m['player1'] == seeded_players[0])
        seed2_match = next(m for m in first_round if m['player1'] == seeded_players[1])
        
        # Seeds 1 and 2 should be in different halves
        self.assertNotEqual(
            seed1_match['match_number'] // 4,
            seed2_match['match_number'] // 4
        )

class SwissSystemTest(TestCase):
    """Test Swiss system tournament logic"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Swiss Tournament",
            club=ClubFactory(),
            format='SWISS',
            swiss_rounds=5
        )
        self.swiss_manager = SwissSystemManager(self.tournament)
    
    def test_first_round_pairing(self):
        """Test first round Swiss pairing"""
        # Create 16 players
        players = [UserFactory() for _ in range(16)]
        for player in players:
            TournamentRegistration.objects.create(
                tournament=self.tournament,
                player=player,
                status='CONFIRMED'
            )
        
        pairings = self.swiss_manager.generate_round_pairings(round_number=1)
        
        # Should have 8 matches
        self.assertEqual(len(pairings), 8)
        # No player should appear twice
        all_players = []
        for pairing in pairings:
            all_players.extend([pairing['player1'], pairing['player2']])
        self.assertEqual(len(all_players), len(set(all_players)))
    
    def test_subsequent_round_pairing(self):
        """Test Swiss pairing based on standings"""
        # Simulate first round results
        standings = {
            'player1': {'points': 1, 'opponents': ['player2']},
            'player2': {'points': 0, 'opponents': ['player1']},
            'player3': {'points': 1, 'opponents': ['player4']},
            'player4': {'points': 0, 'opponents': ['player3']},
        }
        
        pairings = self.swiss_manager.generate_round_pairings(
            round_number=2,
            standings=standings
        )
        
        # Winners should play winners, losers play losers
        for pairing in pairings:
            p1_points = standings[pairing['player1']]['points']
            p2_points = standings[pairing['player2']]['points']
            self.assertEqual(p1_points, p2_points)
```

### 3. Tournament Service Tests
```python
# backend/tests/unit/tournaments/test_services.py
from django.test import TestCase
from unittest.mock import patch, Mock
from apps.tournaments.services import (
    TournamentNotificationService,
    TournamentPaymentService,
    TournamentStatsService
)

class TournamentNotificationServiceTest(TestCase):
    """Test tournament notification service"""
    
    def setUp(self):
        self.service = TournamentNotificationService()
        self.tournament = Mock()
        self.tournament.name = "Summer Open"
        self.tournament.start_date = timezone.now() + timedelta(days=7)
    
    @patch('apps.notifications.services.email_service.send')
    def test_registration_confirmation_email(self, mock_send):
        """Test registration confirmation email"""
        player = Mock()
        player.email = "player@test.com"
        player.first_name = "John"
        
        self.service.send_registration_confirmation(
            tournament=self.tournament,
            player=player,
            registration_id="REG123"
        )
        
        mock_send.assert_called_once()
        call_args = mock_send.call_args[1]
        self.assertEqual(call_args['to'], ["player@test.com"])
        self.assertIn("Summer Open", call_args['context']['tournament_name'])
    
    @patch('apps.notifications.services.sms_service.send')
    def test_match_reminder_sms(self, mock_send):
        """Test match reminder SMS"""
        match = Mock()
        match.scheduled_time = timezone.now() + timedelta(hours=2)
        match.court.name = "Court 1"
        
        player = Mock()
        player.phone = "+34600000000"
        player.first_name = "Maria"
        
        self.service.send_match_reminder(match=match, player=player)
        
        mock_send.assert_called_once()
        call_args = mock_send.call_args[1]
        self.assertEqual(call_args['to'], "+34600000000")
        self.assertIn("Court 1", call_args['body'])

class TournamentPaymentServiceTest(TestCase):
    """Test tournament payment processing"""
    
    def setUp(self):
        self.service = TournamentPaymentService()
    
    @patch('stripe.PaymentIntent.create')
    def test_process_entry_fee(self, mock_create):
        """Test entry fee payment processing"""
        mock_create.return_value = {
            'id': 'pi_test123',
            'client_secret': 'secret_123',
            'status': 'requires_payment_method'
        }
        
        registration = Mock()
        registration.tournament.entry_fee = 25.00
        registration.player.email = "player@test.com"
        
        result = self.service.process_entry_fee(registration)
        
        mock_create.assert_called_once_with(
            amount=2500,  # 25.00 EUR in cents
            currency='eur',
            customer=ANY,
            metadata={
                'tournament_id': registration.tournament.id,
                'registration_id': registration.id,
                'type': 'tournament_entry_fee'
            }
        )
        
        self.assertEqual(result['payment_intent_id'], 'pi_test123')
```

## 🔌 Integration Tests

### 1. Tournament API Tests
```python
# backend/tests/integration/tournaments/test_tournament_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from tests.factories import UserFactory, ClubFactory, StaffUserFactory

class TournamentAPITest(APITestCase):
    """Test tournament CRUD operations"""
    
    def setUp(self):
        self.club = ClubFactory()
        self.admin = StaffUserFactory(club=self.club)
        self.player = UserFactory()
        
    def test_create_tournament(self):
        """Test tournament creation by admin"""
        self.client.force_authenticate(user=self.admin)
        
        data = {
            'name': 'Winter Championship 2023',
            'club': self.club.id,
            'start_date': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=32)).isoformat(),
            'registration_deadline': (timezone.now() + timedelta(days=25)).isoformat(),
            'max_participants': 32,
            'format': 'KNOCKOUT',
            'category': 'OPEN',
            'entry_fee': 30.00,
            'prize_pool': 1000.00,
            'description': 'Annual winter championship',
            'rules': 'Standard padel rules apply'
        }
        
        response = self.client.post('/api/v1/tournaments/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Winter Championship 2023')
        self.assertEqual(response.data['status'], 'DRAFT')
    
    def test_list_tournaments_filtering(self):
        """Test tournament listing with filters"""
        # Create tournaments with different statuses
        Tournament.objects.create(
            name="Active Tournament",
            club=self.club,
            start_date=timezone.now() - timedelta(days=1),
            status='IN_PROGRESS'
        )
        Tournament.objects.create(
            name="Upcoming Tournament",
            club=self.club,
            start_date=timezone.now() + timedelta(days=7),
            status='PUBLISHED'
        )
        Tournament.objects.create(
            name="Completed Tournament",
            club=self.club,
            start_date=timezone.now() - timedelta(days=30),
            status='COMPLETED'
        )
        
        # Test status filter
        response = self.client.get('/api/v1/tournaments/?status=IN_PROGRESS')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Active Tournament")
        
        # Test date range filter
        response = self.client.get(
            f'/api/v1/tournaments/?start_date_after={timezone.now().date()}'
        )
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Upcoming Tournament")
    
    def test_tournament_permissions(self):
        """Test tournament access permissions"""
        tournament = Tournament.objects.create(
            name="Test Tournament",
            club=self.club,
            status='DRAFT'
        )
        
        # Anonymous user cannot see draft tournaments
        response = self.client.get(f'/api/v1/tournaments/{tournament.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Regular player cannot edit
        self.client.force_authenticate(user=self.player)
        response = self.client.patch(
            f'/api/v1/tournaments/{tournament.id}/',
            {'name': 'Modified Name'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin can edit
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/tournaments/{tournament.id}/',
            {'name': 'Modified Name'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

### 2. Registration API Tests
```python
# backend/tests/integration/tournaments/test_registration_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch

class TournamentRegistrationAPITest(APITestCase):
    """Test tournament registration endpoints"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Open Tournament",
            club=ClubFactory(),
            start_date=timezone.now() + timedelta(days=14),
            registration_deadline=timezone.now() + timedelta(days=7),
            max_participants=16,
            entry_fee=20.00,
            status='PUBLISHED'
        )
        self.player = UserFactory()
        self.partner = UserFactory()
    
    @patch('stripe.PaymentIntent.create')
    def test_tournament_registration(self, mock_payment):
        """Test player registration for tournament"""
        mock_payment.return_value = {
            'id': 'pi_test123',
            'client_secret': 'secret_test123'
        }
        
        self.client.force_authenticate(user=self.player)
        
        data = {
            'registration_type': 'SINGLE',
            'payment_method_id': 'pm_test_visa'
        }
        
        response = self.client.post(
            f'/api/v1/tournaments/{self.tournament.id}/register/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertIn('payment_intent', response.data)
        
        # Verify registration created
        registration = TournamentRegistration.objects.get(
            tournament=self.tournament,
            player=self.player
        )
        self.assertEqual(registration.registration_type, 'SINGLE')
    
    def test_doubles_registration(self):
        """Test doubles team registration"""
        self.client.force_authenticate(user=self.player)
        
        data = {
            'registration_type': 'DOUBLES',
            'partner_id': self.partner.id,
            'payment_method_id': 'pm_test_visa'
        }
        
        with patch('stripe.PaymentIntent.create') as mock_payment:
            mock_payment.return_value = {
                'id': 'pi_test123',
                'client_secret': 'secret_test123'
            }
            
            response = self.client.post(
                f'/api/v1/tournaments/{self.tournament.id}/register/',
                data,
                format='json'
            )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registration = TournamentRegistration.objects.get(
            tournament=self.tournament,
            player=self.player
        )
        self.assertEqual(registration.partner, self.partner)
    
    def test_registration_closed(self):
        """Test registration after deadline"""
        # Set deadline to past
        self.tournament.registration_deadline = timezone.now() - timedelta(days=1)
        self.tournament.save()
        
        self.client.force_authenticate(user=self.player)
        
        response = self.client.post(
            f'/api/v1/tournaments/{self.tournament.id}/register/',
            {'registration_type': 'SINGLE'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Registration deadline has passed', str(response.data))
    
    def test_withdrawal(self):
        """Test tournament withdrawal"""
        # Create registration
        registration = TournamentRegistration.objects.create(
            tournament=self.tournament,
            player=self.player,
            status='CONFIRMED'
        )
        
        self.client.force_authenticate(user=self.player)
        
        response = self.client.post(
            f'/api/v1/tournaments/{self.tournament.id}/withdraw/',
            {'reason': 'Injury'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        registration.refresh_from_db()
        self.assertEqual(registration.status, 'WITHDRAWN')
        self.assertEqual(registration.withdrawal_reason, 'Injury')
```

### 3. Match Management Tests
```python
# backend/tests/integration/tournaments/test_match_api.py
class MatchManagementAPITest(APITestCase):
    """Test match management endpoints"""
    
    def setUp(self):
        self.tournament = Tournament.objects.create(
            name="Test Tournament",
            club=ClubFactory(),
            status='IN_PROGRESS'
        )
        self.round = TournamentRound.objects.create(
            tournament=self.tournament,
            round_number=1,
            name="Quarter Finals"
        )
        self.admin = StaffUserFactory(club=self.tournament.club)
        self.player1 = UserFactory()
        self.player2 = UserFactory()
        
        self.match = Match.objects.create(
            tournament=self.tournament,
            round=self.round,
            player1=self.player1,
            player2=self.player2,
            scheduled_time=timezone.now() + timedelta(hours=2),
            court=CourtFactory(club=self.tournament.club)
        )
    
    def test_update_match_result(self):
        """Test recording match result"""
        self.client.force_authenticate(user=self.admin)
        
        data = {
            'winner_id': self.player1.id,
            'score_player1_set1': 6,
            'score_player2_set1': 4,
            'score_player1_set2': 7,
            'score_player2_set2': 5,
            'duration_minutes': 75
        }
        
        response = self.client.put(
            f'/api/v1/tournaments/{self.tournament.id}/matches/{self.match.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.match.refresh_from_db()
        self.assertEqual(self.match.winner, self.player1)
        self.assertEqual(self.match.status, 'COMPLETED')
        self.assertEqual(self.match.duration_minutes, 75)
    
    def test_reschedule_match(self):
        """Test match rescheduling"""
        self.client.force_authenticate(user=self.admin)
        
        new_time = timezone.now() + timedelta(days=1)
        data = {
            'scheduled_time': new_time.isoformat(),
            'court_id': self.match.court.id
        }
        
        response = self.client.patch(
            f'/api/v1/tournaments/{self.tournament.id}/matches/{self.match.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.match.refresh_from_db()
        self.assertEqual(
            self.match.scheduled_time.date(),
            new_time.date()
        )
```

## 🔄 E2E Flow Tests

### 1. Complete Tournament Flow
```python
# backend/tests/e2e/tournaments/test_tournament_flow.py
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

class TournamentCompleteFlowE2ETest(TestCase):
    """Test complete tournament lifecycle"""
    
    def setUp(self):
        self.client = APIClient()
        self.club = ClubFactory()
        self.admin = StaffUserFactory(club=self.club)
        self.courts = [CourtFactory(club=self.club) for _ in range(4)]
        
    def test_complete_tournament_lifecycle(self):
        """Test tournament from creation to completion"""
        
        # Step 1: Admin creates tournament
        self.client.force_authenticate(user=self.admin)
        
        tournament_data = {
            'name': 'Spring Championship 2023',
            'club': self.club.id,
            'start_date': (timezone.now() + timedelta(days=14)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=16)).isoformat(),
            'registration_deadline': (timezone.now() + timedelta(days=7)).isoformat(),
            'max_participants': 8,
            'format': 'KNOCKOUT',
            'entry_fee': 25.00,
            'prize_pool': 500.00
        }
        
        response = self.client.post('/api/v1/tournaments/', tournament_data)
        self.assertEqual(response.status_code, 201)
        tournament_id = response.data['id']
        
        # Step 2: Publish tournament
        response = self.client.post(f'/api/v1/tournaments/{tournament_id}/publish/')
        self.assertEqual(response.status_code, 200)
        
        # Step 3: Players register
        players = [UserFactory() for _ in range(8)]
        registrations = []
        
        for player in players:
            self.client.force_authenticate(user=player)
            
            with patch('stripe.PaymentIntent.create') as mock_payment:
                mock_payment.return_value = {
                    'id': f'pi_test_{player.id}',
                    'client_secret': f'secret_{player.id}'
                }
                
                response = self.client.post(
                    f'/api/v1/tournaments/{tournament_id}/register/',
                    {'registration_type': 'SINGLE'}
                )
                self.assertEqual(response.status_code, 201)
                registrations.append(response.data['id'])
            
            # Simulate payment confirmation
            with patch('stripe.PaymentIntent.retrieve') as mock_retrieve:
                mock_retrieve.return_value = {
                    'id': f'pi_test_{player.id}',
                    'status': 'succeeded'
                }
                
                self.client.post(
                    f'/api/v1/tournaments/{tournament_id}/confirm-payment/',
                    {'payment_intent_id': f'pi_test_{player.id}'}
                )
        
        # Step 4: Generate draw
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/tournaments/{tournament_id}/generate-draw/')
        self.assertEqual(response.status_code, 200)
        
        # Verify matches created
        response = self.client.get(f'/api/v1/tournaments/{tournament_id}/matches/')
        self.assertEqual(len(response.data['results']), 4)  # First round matches
        
        # Step 5: Play first round matches
        first_round_matches = response.data['results']
        for i, match in enumerate(first_round_matches):
            # Simulate match results
            winner = match['player1'] if i % 2 == 0 else match['player2']
            
            result_data = {
                'winner_id': winner['id'],
                'score_player1_set1': 6 if i % 2 == 0 else 4,
                'score_player2_set1': 4 if i % 2 == 0 else 6,
                'score_player1_set2': 6 if i % 2 == 0 else 3,
                'score_player2_set2': 3 if i % 2 == 0 else 6
            }
            
            response = self.client.put(
                f'/api/v1/tournaments/{tournament_id}/matches/{match["id"]}/',
                result_data
            )
            self.assertEqual(response.status_code, 200)
        
        # Step 6: Verify semifinals created
        response = self.client.get(
            f'/api/v1/tournaments/{tournament_id}/matches/?round=2'
        )
        self.assertEqual(len(response.data['results']), 2)  # Semifinals
        
        # Continue playing matches...
        # (Similar process for semifinals and final)
        
        # Step 7: Complete tournament
        response = self.client.post(f'/api/v1/tournaments/{tournament_id}/complete/')
        self.assertEqual(response.status_code, 200)
        
        # Step 8: Verify final rankings
        response = self.client.get(f'/api/v1/tournaments/{tournament_id}/rankings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['rankings']), 8)
        self.assertIsNotNone(response.data['rankings'][0]['prize_amount'])
```

### 2. Swiss System Tournament Flow
```python
# backend/tests/e2e/tournaments/test_swiss_flow.py
class SwissSystemTournamentE2ETest(TestCase):
    """Test Swiss system tournament flow"""
    
    def test_swiss_tournament_complete_flow(self):
        """Test Swiss tournament with multiple rounds"""
        
        # Create Swiss tournament
        self.client.force_authenticate(user=self.admin)
        
        tournament_data = {
            'name': 'Swiss Open 2023',
            'club': self.club.id,
            'format': 'SWISS',
            'swiss_rounds': 5,
            'max_participants': 16,
            'start_date': (timezone.now() + timedelta(days=7)).isoformat()
        }
        
        response = self.client.post('/api/v1/tournaments/', tournament_data)
        tournament_id = response.data['id']
        
        # Register 16 players
        players = [UserFactory() for _ in range(16)]
        for player in players:
            self._register_player(tournament_id, player)
        
        # Start tournament and generate first round
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/tournaments/{tournament_id}/start/')
        self.assertEqual(response.status_code, 200)
        
        # Play 5 rounds
        for round_num in range(1, 6):
            # Get round matches
            response = self.client.get(
                f'/api/v1/tournaments/{tournament_id}/matches/?round={round_num}'
            )
            matches = response.data['results']
            
            # Play all matches in round
            for match in matches:
                self._play_match(tournament_id, match)
            
            # Generate next round pairings (except for last round)
            if round_num < 5:
                response = self.client.post(
                    f'/api/v1/tournaments/{tournament_id}/generate-round/',
                    {'round_number': round_num + 1}
                )
                self.assertEqual(response.status_code, 200)
        
        # Verify final standings
        response = self.client.get(f'/api/v1/tournaments/{tournament_id}/standings/')
        standings = response.data['standings']
        
        # Check standings are properly sorted
        for i in range(len(standings) - 1):
            self.assertGreaterEqual(
                standings[i]['points'],
                standings[i + 1]['points']
            )
```

### 3. Tournament with Cancellations
```python
# backend/tests/e2e/tournaments/test_edge_cases.py
class TournamentEdgeCasesE2ETest(TestCase):
    """Test tournament edge cases and error handling"""
    
    def test_tournament_with_withdrawals(self):
        """Test tournament handling player withdrawals"""
        
        # Setup tournament with 8 players
        tournament = self._create_tournament(max_participants=8)
        players = self._register_players(tournament, 8)
        
        # Generate initial draw
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/v1/tournaments/{tournament.id}/generate-draw/')
        
        # Player withdraws before first match
        self.client.force_authenticate(user=players[2])
        response = self.client.post(
            f'/api/v1/tournaments/{tournament.id}/withdraw/',
            {'reason': 'Injury'}
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify opponent gets walkover
        matches = Match.objects.filter(
            tournament=tournament,
            round__round_number=1
        )
        
        withdrawn_match = matches.filter(
            Q(player1=players[2]) | Q(player2=players[2])
        ).first()
        
        self.assertEqual(withdrawn_match.status, 'WALKOVER')
        self.assertIsNotNone(withdrawn_match.winner)
        self.assertNotEqual(withdrawn_match.winner, players[2])
    
    def test_tournament_cancellation(self):
        """Test tournament cancellation and refunds"""
        
        tournament = self._create_tournament(entry_fee=50.00)
        players = self._register_players(tournament, 16, paid=True)
        
        # Cancel tournament
        self.client.force_authenticate(user=self.admin)
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = {'id': 'refund_123'}
            
            response = self.client.post(
                f'/api/v1/tournaments/{tournament.id}/cancel/',
                {'reason': 'Weather conditions'}
            )
            
            self.assertEqual(response.status_code, 200)
            
            # Verify refunds initiated
            self.assertEqual(mock_refund.call_count, 16)
            
        # Verify tournament status
        tournament.refresh_from_db()
        self.assertEqual(tournament.status, 'CANCELLED')
        
        # Verify all registrations cancelled
        registrations = TournamentRegistration.objects.filter(
            tournament=tournament
        )
        for reg in registrations:
            self.assertEqual(reg.status, 'CANCELLED')
            self.assertTrue(reg.refund_processed)
```

## 🔒 Security Tests

### Tournament Security Tests
```python
# backend/tests/security/tournaments/test_security.py
class TournamentSecurityTest(TestCase):
    """Test tournament security features"""
    
    def test_registration_tampering_prevention(self):
        """Test prevention of registration data tampering"""
        tournament = Tournament.objects.create(
            name="Secure Tournament",
            club=ClubFactory(),
            entry_fee=100.00,
            max_participants=8
        )
        
        player = UserFactory()
        self.client.force_authenticate(user=player)
        
        # Try to register with modified entry fee
        with patch('stripe.PaymentIntent.create') as mock_payment:
            mock_payment.return_value = {
                'id': 'pi_test',
                'amount': 1000,  # Should be 10000 (100.00 EUR)
                'client_secret': 'secret'
            }
            
            response = self.client.post(
                f'/api/v1/tournaments/{tournament.id}/register/',
                {
                    'registration_type': 'SINGLE',
                    'entry_fee': 10.00  # Trying to pay less
                }
            )
            
            # Should detect tampering
            self.assertEqual(response.status_code, 400)
            self.assertIn('Invalid payment amount', str(response.data))
    
    def test_match_result_authorization(self):
        """Test only authorized users can update match results"""
        match = Match.objects.create(
            tournament=Tournament.objects.create(
                name="Test",
                club=ClubFactory()
            ),
            player1=UserFactory(),
            player2=UserFactory()
        )
        
        # Player cannot update their own match
        self.client.force_authenticate(user=match.player1)
        response = self.client.put(
            f'/api/v1/matches/{match.id}/result/',
            {'winner_id': match.player1.id}
        )
        self.assertEqual(response.status_code, 403)
        
        # Other player cannot update
        other_player = UserFactory()
        self.client.force_authenticate(user=other_player)
        response = self.client.put(
            f'/api/v1/matches/{match.id}/result/',
            {'winner_id': match.player1.id}
        )
        self.assertEqual(response.status_code, 403)
```

## 📊 Performance Tests

### Tournament Performance Tests
```python
# backend/tests/performance/tournaments/test_performance.py
class TournamentPerformanceTest(TestCase):
    """Test tournament system performance"""
    
    def test_large_tournament_draw_generation(self):
        """Test draw generation performance for large tournament"""
        tournament = Tournament.objects.create(
            name="Large Tournament",
            club=ClubFactory(),
            format='KNOCKOUT',
            max_participants=128
        )
        
        # Register 128 players
        players = []
        for i in range(128):
            player = UserFactory()
            TournamentRegistration.objects.create(
                tournament=tournament,
                player=player,
                status='CONFIRMED'
            )
            players.append(player)
        
        # Measure draw generation time
        start = time.time()
        
        generator = TournamentDrawGenerator(tournament)
        draw = generator.generate_knockout_draw()
        
        duration = time.time() - start
        
        # Should complete within 1 second
        self.assertLess(duration, 1.0)
        
        # Verify draw correctness
        self.assertEqual(len(draw['rounds']), 7)  # log2(128) = 7
        self.assertEqual(len(draw['rounds'][0]['matches']), 64)
    
    def test_concurrent_registrations(self):
        """Test handling concurrent tournament registrations"""
        tournament = Tournament.objects.create(
            name="Popular Tournament",
            club=ClubFactory(),
            max_participants=32,
            entry_fee=20.00
        )
        
        # Create 40 players (more than capacity)
        players = [UserFactory() for _ in range(40)]
        
        def register_player(player):
            client = APIClient()
            client.force_authenticate(user=player)
            
            with patch('stripe.PaymentIntent.create') as mock:
                mock.return_value = {
                    'id': f'pi_{player.id}',
                    'client_secret': 'secret'
                }
                
                return client.post(
                    f'/api/v1/tournaments/{tournament.id}/register/',
                    {'registration_type': 'SINGLE'}
                )
        
        # Execute concurrent registrations
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(register_player, player) for player in players]
            results = [f.result() for f in futures]
        
        # Count successful registrations
        successful = sum(1 for r in results if r.status_code == 201)
        waitlisted = sum(1 for r in results if 'waitlist' in str(r.data).lower())
        
        # Should have exactly 32 confirmed + some waitlisted
        self.assertEqual(successful, 32)
        self.assertGreater(waitlisted, 0)
```

## 🎯 Test Execution Commands

### Run All Tournament Tests
```bash
# Unit tests only
pytest tests/unit/tournaments/ -v

# Integration tests
pytest tests/integration/tournaments/ -v

# E2E tests
pytest tests/e2e/tournaments/ -v

# All tournament tests
pytest tests/ -k tournament -v

# With coverage
pytest tests/ -k tournament --cov=apps.tournaments --cov-report=html
```

### Run Specific Test Categories
```bash
# Draw generation tests
pytest tests/ -k "draw" -v

# Swiss system tests
pytest tests/ -k "swiss" -v

# Payment related tests
pytest tests/ -k "tournament and payment" -v
```

---

**Siguiente**: [Notifications Tests](13-Notifications-Tests.md) →
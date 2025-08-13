# 🔍 Search and Filters Tests

## 📋 Resumen

Esta guía detalla los tests E2E para funcionalidades de búsqueda y filtrado, cubriendo búsqueda de texto completo, filtros avanzados, autocompletado y optimización de rendimiento.

## 🎯 Objetivos de Testing

### Cobertura Target: 90%
- **Unit Tests**: 65% - Lógica de búsqueda y filtrado
- **Integration Tests**: 20% - Integración con ElasticSearch/PostgreSQL
- **E2E Tests**: 15% - Flujos completos de búsqueda

### Componentes a Cubrir
- ✅ Full-Text Search
- ✅ Advanced Filters
- ✅ Autocomplete/Suggestions
- ✅ Search History
- ✅ Saved Searches
- ✅ Faceted Search
- ✅ Geo-spatial Search
- ✅ Search Analytics

## 🧪 Unit Tests

### 1. Search Engine Tests
```python
# backend/tests/unit/search/test_search_engine.py
from django.test import TestCase
from apps.search.engines import SearchEngine, QueryParser, SearchIndexer
from apps.search.models import SearchIndex
from tests.factories import UserFactory, ClubFactory, CourtFactory

class SearchEngineTest(TestCase):
    """Test search engine functionality"""
    
    def setUp(self):
        self.engine = SearchEngine()
        self.parser = QueryParser()
    
    def test_basic_text_search(self):
        """Test basic text search functionality"""
        # Index test data
        clubs = [
            ClubFactory(name="Madrid Tennis Club", description="Premier tennis and padel club"),
            ClubFactory(name="Barcelona Padel Center", description="Modern padel facilities"),
            ClubFactory(name="Valencia Sports Complex", description="Multi-sport center with padel")
        ]
        
        # Search for "padel"
        results = self.engine.search(query="padel", model_type="club")
        
        self.assertEqual(len(results), 3)
        # Barcelona should rank higher (padel in name)
        self.assertEqual(results[0].name, "Barcelona Padel Center")
    
    def test_fuzzy_search(self):
        """Test fuzzy search for typos"""
        # Create clubs
        ClubFactory(name="Rafa Nadal Academy")
        ClubFactory(name="Real Madrid Club")
        
        # Search with typo
        results = self.engine.search(query="Rafel Nadel", fuzzy=True)
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Rafa Nadal Academy")
    
    def test_phrase_search(self):
        """Test exact phrase matching"""
        clubs = [
            ClubFactory(description="Indoor padel courts available"),
            ClubFactory(description="Padel courts indoor and outdoor"),
            ClubFactory(description="Indoor tennis and outdoor padel courts")
        ]
        
        # Search for exact phrase
        results = self.engine.search(
            query='"indoor padel courts"',
            model_type="club"
        )
        
        self.assertEqual(len(results), 1)
        self.assertIn("Indoor padel courts", results[0].description)
    
    def test_boolean_search_operators(self):
        """Test AND, OR, NOT operators"""
        clubs = [
            ClubFactory(name="Madrid Tennis", amenities=["parking", "restaurant"]),
            ClubFactory(name="Barcelona Tennis", amenities=["parking", "shop"]),
            ClubFactory(name="Valencia Padel", amenities=["restaurant", "shop"])
        ]
        
        # AND operator
        results = self.engine.search("parking AND restaurant")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Madrid Tennis")
        
        # OR operator
        results = self.engine.search("parking OR shop")
        self.assertEqual(len(results), 3)
        
        # NOT operator
        results = self.engine.search("tennis NOT barcelona")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Madrid Tennis")

class QueryParserTest(TestCase):
    """Test search query parsing"""
    
    def setUp(self):
        self.parser = QueryParser()
    
    def test_parse_simple_query(self):
        """Test parsing simple queries"""
        parsed = self.parser.parse("padel madrid")
        
        self.assertEqual(parsed['terms'], ['padel', 'madrid'])
        self.assertEqual(parsed['operator'], 'AND')
        self.assertFalse(parsed['is_phrase'])
    
    def test_parse_complex_query(self):
        """Test parsing complex queries"""
        query = 'name:"Real Madrid" AND (city:madrid OR city:barcelona) -indoor'
        parsed = self.parser.parse(query)
        
        self.assertIn('name', parsed['fields'])
        self.assertEqual(parsed['fields']['name'], 'Real Madrid')
        self.assertIn('madrid', parsed['fields']['city'])
        self.assertIn('indoor', parsed['excluded_terms'])
    
    def test_parse_date_ranges(self):
        """Test parsing date range queries"""
        query = "created:[2023-01-01 TO 2023-12-31]"
        parsed = self.parser.parse(query)
        
        self.assertIn('created', parsed['ranges'])
        self.assertEqual(
            parsed['ranges']['created']['start'],
            '2023-01-01'
        )
        self.assertEqual(
            parsed['ranges']['created']['end'],
            '2023-12-31'
        )
```

### 2. Filter Logic Tests
```python
# backend/tests/unit/search/test_filters.py
from django.test import TestCase
from apps.search.filters import FilterBuilder, FilterValidator
from django.db.models import Q

class FilterBuilderTest(TestCase):
    """Test filter building logic"""
    
    def setUp(self):
        self.builder = FilterBuilder()
    
    def test_build_simple_filters(self):
        """Test building simple filters"""
        filters = {
            'city': 'Madrid',
            'price_min': 20,
            'price_max': 50
        }
        
        q_object = self.builder.build(filters)
        
        # Verify Q object structure
        self.assertIsInstance(q_object, Q)
        self.assertIn(('city', 'Madrid'), q_object.children)
        self.assertIn(('price__gte', 20), q_object.children)
        self.assertIn(('price__lte', 50), q_object.children)
    
    def test_build_nested_filters(self):
        """Test building nested filter logic"""
        filters = {
            'or': [
                {'city': 'Madrid', 'type': 'indoor'},
                {'city': 'Barcelona', 'type': 'outdoor'}
            ]
        }
        
        q_object = self.builder.build(filters)
        
        # Should create OR condition
        self.assertEqual(q_object.connector, 'OR')
        self.assertEqual(len(q_object.children), 2)
    
    def test_build_range_filters(self):
        """Test range filter building"""
        filters = {
            'date_range': {
                'start': '2023-11-01',
                'end': '2023-11-30'
            },
            'time_slots': ['09:00-11:00', '15:00-17:00']
        }
        
        q_object = self.builder.build(filters)
        
        # Verify date range
        date_conditions = [c for c in q_object.children if 'date' in str(c)]
        self.assertEqual(len(date_conditions), 2)  # gte and lte
    
    def test_build_array_filters(self):
        """Test filtering on array fields"""
        filters = {
            'amenities__contains': ['parking', 'restaurant'],
            'surfaces__in': ['grass', 'clay']
        }
        
        q_object = self.builder.build(filters)
        
        # Verify array containment
        self.assertIn(
            ('amenities__contains', ['parking', 'restaurant']),
            q_object.children
        )

class FilterValidatorTest(TestCase):
    """Test filter validation"""
    
    def setUp(self):
        self.validator = FilterValidator()
    
    def test_validate_allowed_filters(self):
        """Test validation of allowed filters"""
        schema = {
            'city': {'type': 'string', 'allowed': ['Madrid', 'Barcelona']},
            'price': {'type': 'number', 'min': 0, 'max': 1000}
        }
        
        # Valid filters
        valid = self.validator.validate(
            {'city': 'Madrid', 'price': 50},
            schema
        )
        self.assertTrue(valid)
        
        # Invalid city
        with self.assertRaises(ValidationError):
            self.validator.validate(
                {'city': 'Paris'},
                schema
            )
        
        # Invalid price
        with self.assertRaises(ValidationError):
            self.validator.validate(
                {'price': -10},
                schema
            )
    
    def test_validate_filter_combinations(self):
        """Test validation of filter combinations"""
        schema = {
            'start_date': {'type': 'date'},
            'end_date': {'type': 'date', 'depends_on': 'start_date'}
        }
        
        # Missing dependency
        with self.assertRaises(ValidationError):
            self.validator.validate(
                {'end_date': '2023-11-30'},
                schema
            )
        
        # Invalid date order
        with self.assertRaises(ValidationError):
            self.validator.validate(
                {
                    'start_date': '2023-11-30',
                    'end_date': '2023-11-01'
                },
                schema
            )
```

### 3. Autocomplete Tests
```python
# backend/tests/unit/search/test_autocomplete.py
from django.test import TestCase
from apps.search.autocomplete import AutocompleteEngine, SuggestionBuilder

class AutocompleteEngineTest(TestCase):
    """Test autocomplete functionality"""
    
    def setUp(self):
        self.engine = AutocompleteEngine()
        # Index test data
        self.engine.index_terms([
            "Madrid Tennis Club",
            "Madrid Padel Center",
            "Real Madrid Sports",
            "Barcelona Padel Club",
            "Valencia Tennis Academy"
        ])
    
    def test_prefix_matching(self):
        """Test prefix-based suggestions"""
        suggestions = self.engine.suggest("mad")
        
        self.assertEqual(len(suggestions), 3)
        # All should start with "mad"
        for suggestion in suggestions:
            self.assertTrue(
                suggestion.lower().startswith("mad") or 
                "madrid" in suggestion.lower()
            )
    
    def test_fuzzy_suggestions(self):
        """Test fuzzy matching for typos"""
        suggestions = self.engine.suggest("tenis", fuzzy=True)
        
        # Should suggest "tennis" despite typo
        self.assertIn("tennis", " ".join(suggestions).lower())
    
    def test_context_aware_suggestions(self):
        """Test context-based suggestions"""
        # Previous search context
        context = {
            'previous_searches': ['padel', 'madrid'],
            'user_location': 'Madrid'
        }
        
        suggestions = self.engine.suggest("club", context=context)
        
        # Should prioritize Madrid clubs
        self.assertTrue(
            "Madrid" in suggestions[0]
        )
    
    def test_popularity_ranking(self):
        """Test suggestions ranked by popularity"""
        # Simulate search popularity
        self.engine.record_selection("Madrid Padel Center", count=100)
        self.engine.record_selection("Madrid Tennis Club", count=50)
        
        suggestions = self.engine.suggest("madrid")
        
        # More popular should rank first
        self.assertEqual(suggestions[0], "Madrid Padel Center")

class SuggestionBuilderTest(TestCase):
    """Test suggestion building logic"""
    
    def setUp(self):
        self.builder = SuggestionBuilder()
    
    def test_build_compound_suggestions(self):
        """Test building compound suggestions"""
        base_term = "padel"
        modifiers = ["indoor", "outdoor", "professional"]
        locations = ["Madrid", "Barcelona"]
        
        suggestions = self.builder.build_compounds(
            base_term,
            modifiers=modifiers,
            locations=locations
        )
        
        # Should create combinations
        self.assertIn("indoor padel Madrid", suggestions)
        self.assertIn("outdoor padel Barcelona", suggestions)
        self.assertEqual(len(suggestions), 6)  # 3 modifiers × 2 locations
    
    def test_build_category_suggestions(self):
        """Test category-based suggestions"""
        query = "tennis"
        categories = {
            'clubs': ['Tennis Club', 'Tennis Academy'],
            'courts': ['Tennis Court', 'Indoor Tennis'],
            'coaches': ['Tennis Coach', 'Tennis Instructor']
        }
        
        suggestions = self.builder.build_by_category(query, categories)
        
        # Should organize by category
        self.assertIn('clubs', suggestions)
        self.assertIn('courts', suggestions)
        self.assertEqual(len(suggestions['clubs']), 2)
```

## 🔌 Integration Tests

### 1. Search API Tests
```python
# backend/tests/integration/search/test_search_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.postgres.search import SearchVector

class SearchAPITest(APITestCase):
    """Test search API endpoints"""
    
    def setUp(self):
        self.create_test_data()
    
    def create_test_data(self):
        """Create diverse test data"""
        # Clubs
        self.club1 = ClubFactory(
            name="Elite Padel Madrid",
            city="Madrid",
            amenities=["parking", "restaurant", "shop"],
            courts_count=10
        )
        self.club2 = ClubFactory(
            name="Barcelona Tennis & Padel",
            city="Barcelona",
            amenities=["parking", "cafe"],
            courts_count=6
        )
        
        # Courts
        for i in range(5):
            CourtFactory(
                club=self.club1,
                name=f"Court {i+1}",
                surface="artificial_grass" if i < 3 else "concrete",
                is_indoor=i % 2 == 0
            )
    
    def test_global_search(self):
        """Test global search across all entities"""
        response = self.client.get('/api/v1/search/', {'q': 'padel'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data['results']
        self.assertGreater(len(results), 0)
        
        # Should have different result types
        result_types = set(r['type'] for r in results)
        self.assertIn('club', result_types)
        
        # Should include relevance score
        for result in results:
            self.assertIn('relevance_score', result)
            self.assertGreater(result['relevance_score'], 0)
    
    def test_filtered_search(self):
        """Test search with filters"""
        response = self.client.get(
            '/api/v1/search/clubs/',
            {
                'q': 'padel',
                'city': 'Madrid',
                'amenities': 'parking,restaurant',
                'min_courts': 8
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Elite Padel Madrid")
    
    def test_faceted_search(self):
        """Test faceted search results"""
        response = self.client.get(
            '/api/v1/search/courts/',
            {
                'q': 'court',
                'include_facets': 'true'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should include facets
        self.assertIn('facets', response.data)
        
        facets = response.data['facets']
        self.assertIn('surface', facets)
        self.assertIn('is_indoor', facets)
        
        # Verify facet counts
        surface_facets = facets['surface']
        self.assertEqual(surface_facets['artificial_grass'], 3)
        self.assertEqual(surface_facets['concrete'], 2)
    
    def test_search_suggestions(self):
        """Test search autocomplete suggestions"""
        response = self.client.get(
            '/api/v1/search/suggestions/',
            {'q': 'pad'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        suggestions = response.data['suggestions']
        self.assertGreater(len(suggestions), 0)
        
        # Should include different types
        for suggestion in suggestions:
            self.assertIn('text', suggestion)
            self.assertIn('type', suggestion)
            self.assertIn('metadata', suggestion)
    
    def test_search_with_location(self):
        """Test location-based search"""
        response = self.client.get(
            '/api/v1/search/clubs/',
            {
                'lat': 40.4168,
                'lng': -3.7038,
                'radius': 10,  # 10km
                'q': 'padel'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data['results']
        # Should include distance
        for result in results:
            self.assertIn('distance', result)
            self.assertLessEqual(result['distance'], 10)
        
        # Should be sorted by distance
        distances = [r['distance'] for r in results]
        self.assertEqual(distances, sorted(distances))
```

### 2. Advanced Filter Tests
```python
# backend/tests/integration/search/test_advanced_filters.py
class AdvancedFilterAPITest(APITestCase):
    """Test advanced filtering capabilities"""
    
    def test_multi_field_filtering(self):
        """Test filtering on multiple fields"""
        # Create courts with specific attributes
        court1 = CourtFactory(
            price_per_hour=30,
            surface="artificial_grass",
            is_indoor=True,
            lighting_type="led",
            club__city="Madrid"
        )
        court2 = CourtFactory(
            price_per_hour=25,
            surface="concrete",
            is_indoor=False,
            lighting_type="halogen",
            club__city="Madrid"
        )
        
        response = self.client.get(
            '/api/v1/courts/',
            {
                'city': 'Madrid',
                'price_min': 20,
                'price_max': 35,
                'surface': 'artificial_grass',
                'is_indoor': 'true'
            }
        )
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], court1.id)
    
    def test_availability_filtering(self):
        """Test complex availability filtering"""
        court = CourtFactory()
        
        # Create some reservations
        ReservationFactory(
            court=court,
            date="2023-12-01",
            start_time="10:00",
            end_time="12:00"
        )
        ReservationFactory(
            court=court,
            date="2023-12-01",
            start_time="15:00",
            end_time="17:00"
        )
        
        # Search for available slots
        response = self.client.get(
            '/api/v1/courts/available/',
            {
                'date': '2023-12-01',
                'duration': 120,  # 2 hours
                'time_from': '09:00',
                'time_to': '18:00'
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        available_slots = response.data['available_slots']
        # Should have slots: 09:00-10:00, 12:00-15:00, 17:00-18:00
        self.assertEqual(len(available_slots), 2)  # 12:00-14:00 and 17:00-18:00 (2hr slots)
    
    def test_dynamic_filter_options(self):
        """Test dynamic filter options based on results"""
        # Create clubs with various attributes
        ClubFactory(city="Madrid", type="private", price_range="high")
        ClubFactory(city="Madrid", type="public", price_range="low")
        ClubFactory(city="Barcelona", type="private", price_range="medium")
        
        response = self.client.get(
            '/api/v1/search/filter-options/',
            {'model': 'club', 'city': 'Madrid'}
        )
        
        self.assertEqual(response.status_code, 200)
        
        options = response.data['filter_options']
        
        # Should only show options available in Madrid
        self.assertEqual(set(options['type']), {'private', 'public'})
        self.assertEqual(set(options['price_range']), {'high', 'low'})
        self.assertNotIn('medium', options['price_range'])
```

## 🔄 E2E Flow Tests

### 1. Complete Search Flow
```python
# backend/tests/e2e/search/test_search_flow.py
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

class SearchCompleteFlowE2ETest(TransactionTestCase):
    """Test complete search user flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
        self.create_comprehensive_test_data()
    
    def test_user_search_journey(self):
        """Test complete user search journey"""
        self.client.force_authenticate(user=self.user)
        
        # Step 1: Initial search
        response = self.client.get(
            '/api/v1/search/',
            {'q': 'padel madrid'}
        )
        
        self.assertEqual(response.status_code, 200)
        initial_results = response.data['results']
        
        # Save search
        save_response = self.client.post(
            '/api/v1/search/saved/',
            {
                'name': 'Madrid Padel Clubs',
                'query': 'padel madrid',
                'filters': {}
            }
        )
        self.assertEqual(save_response.status_code, 201)
        saved_search_id = save_response.data['id']
        
        # Step 2: Refine with filters
        refined_response = self.client.get(
            '/api/v1/search/clubs/',
            {
                'q': 'padel',
                'city': 'Madrid',
                'amenities': 'parking',
                'price_max': 40
            }
        )
        
        refined_results = refined_response.data['results']
        self.assertLess(len(refined_results), len(initial_results))
        
        # Step 3: Get suggestions for further refinement
        suggestions_response = self.client.get(
            '/api/v1/search/suggestions/',
            {
                'q': 'padel madrid par',
                'context': 'clubs'
            }
        )
        
        suggestions = suggestions_response.data['suggestions']
        parking_suggestion = next(
            (s for s in suggestions if 'parking' in s['text'].lower()),
            None
        )
        self.assertIsNotNone(parking_suggestion)
        
        # Step 4: Check availability for selected club
        selected_club = refined_results[0]
        availability_response = self.client.get(
            f'/api/v1/clubs/{selected_club["id"]}/courts/availability/',
            {
                'date': '2023-12-01',
                'duration': 90
            }
        )
        
        self.assertEqual(availability_response.status_code, 200)
        self.assertIn('available_courts', availability_response.data)
        
        # Step 5: Update saved search with refined criteria
        update_response = self.client.patch(
            f'/api/v1/search/saved/{saved_search_id}/',
            {
                'filters': {
                    'city': 'Madrid',
                    'amenities': ['parking'],
                    'price_max': 40
                }
            }
        )
        self.assertEqual(update_response.status_code, 200)
        
        # Step 6: Check search history
        history_response = self.client.get('/api/v1/search/history/')
        
        history = history_response.data['results']
        self.assertGreater(len(history), 0)
        self.assertEqual(history[0]['query'], 'padel madrid')
```

### 2. Search Analytics Flow
```python
# backend/tests/e2e/search/test_search_analytics.py
class SearchAnalyticsE2ETest(TestCase):
    """Test search analytics and optimization"""
    
    def test_search_analytics_tracking(self):
        """Test complete search analytics flow"""
        # Simulate multiple user searches
        users = UserFactory.create_batch(5)
        
        search_patterns = [
            {'query': 'padel madrid', 'filters': {'price_max': 30}},
            {'query': 'tennis barcelona', 'filters': {'is_indoor': True}},
            {'query': 'padel', 'filters': {'city': 'Madrid', 'amenities': ['parking']}},
            {'query': 'courts near me', 'filters': {'distance': 5}},
        ]
        
        # Execute searches
        for user in users:
            client = APIClient()
            client.force_authenticate(user=user)
            
            for pattern in search_patterns:
                # Perform search
                response = client.get(
                    '/api/v1/search/',
                    pattern
                )
                
                # Click on results (simulate)
                if response.data['results']:
                    result = response.data['results'][0]
                    client.post(
                        '/api/v1/search/analytics/click/',
                        {
                            'search_id': response.data['search_id'],
                            'result_id': result['id'],
                            'position': 1
                        }
                    )
        
        # Admin checks analytics
        admin = StaffUserFactory(is_superuser=True)
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin)
        
        # Get search analytics
        analytics_response = admin_client.get(
            '/api/v1/analytics/search/',
            {
                'start_date': '2023-11-01',
                'end_date': '2023-11-30'
            }
        )
        
        self.assertEqual(analytics_response.status_code, 200)
        
        analytics = analytics_response.data
        
        # Verify analytics data
        self.assertIn('popular_queries', analytics)
        self.assertIn('conversion_rate', analytics)
        self.assertIn('average_results_clicked', analytics)
        self.assertIn('search_refinement_rate', analytics)
        
        # Popular queries should include our test queries
        popular = [q['query'] for q in analytics['popular_queries']]
        self.assertIn('padel madrid', popular)
        
        # Get query performance details
        query_details = admin_client.get(
            '/api/v1/analytics/search/queries/padel madrid/'
        )
        
        details = query_details.data
        self.assertIn('total_searches', details)
        self.assertIn('click_through_rate', details)
        self.assertIn('average_position_clicked', details)
        self.assertIn('common_refinements', details)
```

### 3. Search Optimization Flow
```python
# backend/tests/e2e/search/test_search_optimization.py
class SearchOptimizationE2ETest(TestCase):
    """Test search optimization based on user behavior"""
    
    def test_search_learning_and_optimization(self):
        """Test search engine learning from user behavior"""
        # Create initial data
        clubs = [
            ClubFactory(name="Premium Padel Madrid", rating=4.5),
            ClubFactory(name="Madrid Padel Club", rating=4.2),
            ClubFactory(name="Padel Madrid Center", rating=4.8),
        ]
        
        # Simulate user searches and clicks
        for _ in range(100):
            user = UserFactory()
            client = APIClient()
            client.force_authenticate(user=user)
            
            # Search
            response = client.get('/api/v1/search/', {'q': 'padel madrid'})
            results = response.data['results']
            
            # Users tend to click on "Padel Madrid Center" more
            if any(r['name'] == "Padel Madrid Center" for r in results):
                clicked = next(r for r in results if r['name'] == "Padel Madrid Center")
                client.post(
                    '/api/v1/search/analytics/click/',
                    {
                        'search_id': response.data['search_id'],
                        'result_id': clicked['id'],
                        'position': results.index(clicked) + 1
                    }
                )
        
        # Run optimization job
        from apps.search.tasks import optimize_search_rankings
        optimize_search_rankings()
        
        # Test improved rankings
        new_user = UserFactory()
        new_client = APIClient()
        new_client.force_authenticate(user=new_user)
        
        optimized_response = new_client.get(
            '/api/v1/search/',
            {'q': 'padel madrid'}
        )
        
        optimized_results = optimized_response.data['results']
        
        # "Padel Madrid Center" should now rank first
        self.assertEqual(
            optimized_results[0]['name'],
            "Padel Madrid Center"
        )
        
        # Check personalization
        frequent_user = UserFactory()
        
        # Create search history for this user
        for _ in range(5):
            client = APIClient()
            client.force_authenticate(user=frequent_user)
            client.get('/api/v1/search/', {'q': 'premium', 'filters': {'city': 'Madrid'}})
        
        # Personalized search should prioritize "Premium Padel Madrid"
        personalized_response = client.get(
            '/api/v1/search/',
            {'q': 'padel madrid', 'personalized': 'true'}
        )
        
        personalized_results = personalized_response.data['results']
        
        # Should see preference for premium option
        premium_position = next(
            i for i, r in enumerate(personalized_results)
            if "Premium" in r['name']
        )
        self.assertLessEqual(premium_position, 1)  # Should be in top 2
```

## 🔒 Security Tests

### Search Security Tests
```python
# backend/tests/security/search/test_security.py
class SearchSecurityTest(TestCase):
    """Test search security features"""
    
    def test_search_injection_prevention(self):
        """Test prevention of search injection attacks"""
        malicious_queries = [
            "'; DROP TABLE clubs; --",
            "\" OR 1=1 --",
            "<script>alert('XSS')</script>",
            "{{7*7}}",  # Template injection
            "${7*7}",   # Expression injection
        ]
        
        for query in malicious_queries:
            response = self.client.get(
                '/api/v1/search/',
                {'q': query}
            )
            
            # Should handle safely
            self.assertIn(response.status_code, [200, 400])
            
            # Should not execute malicious code
            if response.status_code == 200:
                results_str = str(response.data)
                self.assertNotIn("<script>", results_str)
                self.assertNotIn("49", results_str)  # 7*7
    
    def test_search_rate_limiting(self):
        """Test search API rate limiting"""
        # Make many requests quickly
        for i in range(100):
            response = self.client.get(
                '/api/v1/search/',
                {'q': f'test query {i}'}
            )
            
            if i < 50:
                # First 50 should succeed
                self.assertEqual(response.status_code, 200)
            else:
                # Should start rate limiting
                if response.status_code == 429:
                    self.assertIn('retry-after', response)
                    break
        
        # Verify we hit rate limit
        self.assertEqual(response.status_code, 429)
    
    def test_search_result_access_control(self):
        """Test search respects access permissions"""
        # Create private club
        private_club = ClubFactory(
            name="Private Elite Club",
            is_private=True,
            allowed_users=[UserFactory()]
        )
        
        # Public user searches
        public_user = UserFactory()
        self.client.force_authenticate(user=public_user)
        
        response = self.client.get(
            '/api/v1/search/',
            {'q': 'Private Elite Club'}
        )
        
        # Should not see private club
        results = response.data['results']
        club_names = [r['name'] for r in results]
        self.assertNotIn("Private Elite Club", club_names)
```

## 📊 Performance Tests

### Search Performance Tests
```python
# backend/tests/performance/search/test_performance.py
class SearchPerformanceTest(TestCase):
    """Test search performance"""
    
    def test_search_response_time(self):
        """Test search response time with large dataset"""
        # Create large dataset
        clubs = []
        for i in range(1000):
            clubs.append(
                Club(
                    name=f"Club {i}",
                    description=f"Description for club {i} with padel courts",
                    city=random.choice(['Madrid', 'Barcelona', 'Valencia']),
                    amenities=random.sample(
                        ['parking', 'restaurant', 'shop', 'cafe', 'gym'],
                        k=random.randint(1, 3)
                    )
                )
            )
        Club.objects.bulk_create(clubs)
        
        # Measure search time
        start = time.time()
        
        response = self.client.get(
            '/api/v1/search/',
            {'q': 'padel', 'city': 'Madrid'}
        )
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.5)  # Should respond within 500ms
    
    def test_autocomplete_performance(self):
        """Test autocomplete performance"""
        # Index many terms
        terms = []
        for city in ['Madrid', 'Barcelona', 'Valencia']:
            for type in ['Tennis', 'Padel', 'Squash']:
                for suffix in ['Club', 'Center', 'Academy', 'Complex']:
                    terms.append(f"{city} {type} {suffix}")
        
        engine = AutocompleteEngine()
        engine.index_terms(terms)
        
        # Test autocomplete speed
        queries = ['mad', 'bar', 'val', 'ten', 'pad']
        
        for query in queries:
            start = time.time()
            suggestions = engine.suggest(query)
            duration = time.time() - start
            
            # Should be very fast
            self.assertLess(duration, 0.05)  # 50ms
            self.assertGreater(len(suggestions), 0)
    
    def test_faceted_search_performance(self):
        """Test faceted search with many options"""
        # Create courts with many attribute combinations
        courts = []
        surfaces = ['grass', 'clay', 'hard', 'carpet', 'artificial']
        
        for i in range(500):
            courts.append(
                Court(
                    name=f"Court {i}",
                    surface=random.choice(surfaces),
                    is_indoor=random.choice([True, False]),
                    club_id=random.randint(1, 50),
                    price_per_hour=random.randint(20, 80)
                )
            )
        Court.objects.bulk_create(courts)
        
        # Test faceted search
        start = time.time()
        
        response = self.client.get(
            '/api/v1/search/courts/',
            {
                'include_facets': 'true',
                'facet_fields': 'surface,is_indoor,price_range'
            }
        )
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 1.0)  # Should complete within 1 second
        
        # Verify facets calculated
        facets = response.data['facets']
        self.assertEqual(len(facets['surface']), len(surfaces))
```

## 🎯 Test Execution Commands

### Run All Search Tests
```bash
# Unit tests only
pytest tests/unit/search/ -v

# Integration tests
pytest tests/integration/search/ -v

# E2E tests
pytest tests/e2e/search/ -v

# All search tests
pytest tests/ -k search -v

# With coverage
pytest tests/ -k search --cov=apps.search --cov-report=html
```

### Run Specific Test Categories
```bash
# Autocomplete tests
pytest tests/ -k "autocomplete" -v

# Filter tests
pytest tests/ -k "filter" -v

# Search analytics tests
pytest tests/ -k "search and analytics" -v

# Performance tests
pytest tests/performance/search/ -v
```

---

**Siguiente**: [Admin Panel Tests](16-Admin-Panel-Tests.md) →
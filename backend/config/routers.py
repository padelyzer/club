"""
Database routing for read/write splitting.
Optimizes performance by directing read queries to replica databases.
"""

import random


class ReadWriteRouter:
    """
    Route database queries to appropriate database.
    Writes go to primary, reads can go to replicas.
    """
    
    # Models that should always use primary (for consistency)
    PRIMARY_ONLY_MODELS = {
        'sessions.Session',
        'admin.LogEntry',
        'contenttypes.ContentType',
        'auth.Permission',
    }
    
    # Read-heavy models that benefit from replica
    READ_HEAVY_MODELS = {
        'clubs.Club',
        'clubs.Court',
        'reservations.TimeSlot',
        'tournaments.TournamentCategory',
    }
    
    def db_for_read(self, model, **hints):
        """
        Suggest database for read operations.
        """
        model_name = f"{model._meta.app_label}.{model._meta.object_name}"
        
        # Always use primary for certain models
        if model_name in self.PRIMARY_ONLY_MODELS:
            return 'default'
        
        # Use replica for read-heavy models
        if model_name in self.READ_HEAVY_MODELS:
            return 'replica'
        
        # For other models, use replica 70% of the time
        if 'replica' in hints.get('instance', {})._state.db or random.random() < 0.7:
            return 'replica'
        
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Writes always go to primary database.
        """
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Relations between objects are allowed.
        """
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Migrations only run on primary database.
        """
        return db == 'default'


class CacheRouter:
    """
    Route cache operations to appropriate cache backend.
    """
    
    # Cache key prefixes and their backends
    CACHE_ROUTING = {
        'session': 'sessions',
        'api_': 'api',
        'user_': 'default',
        'court_': 'api',
        'tournament_': 'api',
    }
    
    def get_cache_backend(self, key):
        """
        Determine cache backend based on key prefix.
        """
        for prefix, backend in self.CACHE_ROUTING.items():
            if key.startswith(prefix):
                return backend
        
        return 'default'
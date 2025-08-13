#!/usr/bin/env python
"""
Test Redis and Celery integration
"""

import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import time

from django.core.cache import cache

from celery import current_app as celery_app


def test_redis_cache():
    """Test Redis cache functionality."""
    print("🧪 TESTING REDIS CACHE")
    print("=" * 30)

    try:
        # Test basic cache operations
        cache.set("test_key", "test_value", timeout=60)
        result = cache.get("test_key")

        if result == "test_value":
            print("✅ Cache SET/GET working")
        else:
            print(f"❌ Cache failed: expected 'test_value', got '{result}'")
            return False

        # Test cache with complex data
        test_data = {
            "user_id": 123,
            "reservations": [1, 2, 3, 4],
            "metadata": {"club": "test_club", "date": "2025-07-30"},
        }

        cache.set("complex_data", test_data, timeout=60)
        cached_data = cache.get("complex_data")

        if cached_data == test_data:
            print("✅ Complex data caching working")
        else:
            print(f"❌ Complex data failed: {cached_data}")
            return False

        # Test cache expiration
        cache.set("expire_test", "will_expire", timeout=1)
        time.sleep(2)
        expired_result = cache.get("expire_test")

        if expired_result is None:
            print("✅ Cache expiration working")
        else:
            print(f"❌ Expiration failed: {expired_result}")
            return False

        # Test cache deletion
        cache.set("delete_test", "will_be_deleted")
        cache.delete("delete_test")
        deleted_result = cache.get("delete_test")

        if deleted_result is None:
            print("✅ Cache deletion working")
        else:
            print(f"❌ Deletion failed: {deleted_result}")
            return False

        print("🎉 All cache tests passed!")
        return True

    except Exception as e:
        print(f"❌ Cache test error: {e}")
        return False


def test_celery_connection():
    """Test Celery broker connection."""
    print("\n🧪 TESTING CELERY CONNECTION")
    print("=" * 35)

    try:
        # Test broker connection
        inspect = celery_app.control.inspect()

        # Get broker info
        broker_url = celery_app.conf.broker_url
        result_backend = celery_app.conf.result_backend

        print(f"✅ Broker URL: {broker_url}")
        print(f"✅ Result Backend: {result_backend}")

        # Test if we can connect to broker
        try:
            stats = inspect.stats()
            if stats is None:
                print("⚠️ No active workers found (expected in development)")
                print("   Start worker with: celery -A config worker --loglevel=info")
            else:
                print(f"✅ Active workers: {len(stats)}")

        except Exception as worker_e:
            print(f"⚠️ Worker connection: {worker_e}")
            print("   This is normal if no Celery worker is running")

        return True

    except Exception as e:
        print(f"❌ Celery connection error: {e}")
        return False


def test_redis_direct():
    """Test direct Redis connection."""
    print("\n🧪 TESTING DIRECT REDIS CONNECTION")
    print("=" * 40)

    try:
        import redis

        # Connect to Redis directly
        r = redis.Redis(host="127.0.0.1", port=6379, db=0)

        # Test connection
        pong = r.ping()
        if pong:
            print("✅ Direct Redis connection working")
        else:
            print("❌ Direct Redis connection failed")
            return False

        # Test Redis operations
        r.set("direct_test", "direct_value")
        result = r.get("direct_test")

        if result == b"direct_value":
            print("✅ Direct Redis operations working")
        else:
            print(f"❌ Direct Redis operations failed: {result}")
            return False

        # Clean up
        r.delete("direct_test")

        # Show Redis info
        info = r.info()
        print(f"✅ Redis version: {info.get('redis_version', 'unknown')}")
        print(f"✅ Used memory: {info.get('used_memory_human', 'unknown')}")
        print(f"✅ Connected clients: {info.get('connected_clients', 'unknown')}")

        return True

    except Exception as e:
        print(f"❌ Direct Redis test error: {e}")
        return False


def show_redis_keys():
    """Show current Redis keys."""
    print("\n📋 CURRENT REDIS KEYS")
    print("=" * 25)

    try:
        import redis

        r = redis.Redis(host="127.0.0.1", port=6379, db=1)  # Django cache DB

        keys = r.keys("*")
        if keys:
            print(f"Found {len(keys)} keys in cache database:")
            for key in keys[:10]:  # Show first 10 keys
                key_str = key.decode("utf-8") if isinstance(key, bytes) else key
                value = r.get(key)
                value_str = (
                    value.decode("utf-8") if isinstance(value, bytes) else str(value)
                )
                print(
                    f"  {key_str}: {value_str[:50]}{'...' if len(str(value_str)) > 50 else ''}"
                )

            if len(keys) > 10:
                print(f"  ... and {len(keys) - 10} more keys")
        else:
            print("No keys found in cache database")

        # Check Celery broker DB
        r_celery = redis.Redis(host="127.0.0.1", port=6379, db=0)  # Celery broker DB
        celery_keys = r_celery.keys("*")

        if celery_keys:
            print(f"\nFound {len(celery_keys)} keys in Celery database:")
            for key in celery_keys[:5]:  # Show first 5 keys
                key_str = key.decode("utf-8") if isinstance(key, bytes) else key
                print(f"  {key_str}")
        else:
            print("\nNo keys found in Celery database")

    except Exception as e:
        print(f"❌ Error showing Redis keys: {e}")


def main():
    """Main test function."""
    print("🔧 REDIS & CELERY INTEGRATION TEST")
    print("🇲🇽 Padelyzer Backend Infrastructure")
    print("=" * 50)

    tests = [
        test_redis_direct,
        test_redis_cache,
        test_celery_connection,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    # Show current Redis state
    show_redis_keys()

    print("\n" + "=" * 50)
    print(f"📊 TEST RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Redis and Celery are ready.")
        print("\n📋 NEXT STEPS:")
        print("1. Start Celery worker: celery -A config worker --loglevel=info")
        print("2. Start Celery beat: celery -A config beat --loglevel=info")
        print("3. Monitor with: celery -A config flower")
    else:
        print("❌ Some tests failed. Please check the issues above.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

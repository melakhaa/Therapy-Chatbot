# tests/conftest.py
# Pytest configuration

import sys
import os

# Add backend root to path
backend_root = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, backend_root)

# Set test environment variables
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sajiwa")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-signing-123456789")
os.environ.setdefault("ENCRYPTION_KEY", "R5IpNwOG3-hKTtKR7575SCPEr3Kr7cMKZN3ZEvivYCA=")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-key")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow"
    )
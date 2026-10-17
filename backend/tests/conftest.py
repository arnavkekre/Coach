import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app import app
# ... rest of your file remains identical

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app import app

@pytest.fixture
def mock_llm_response():
    """Mock helper that simulates a Groq ChatGroq response object."""
    mock_resp = MagicMock()
    mock_resp.content = (
        "Score: 8/10\n\n"
        "Strengths:\n"
        "- Clear explanation of JWT claims\n"
        "- Mentioned cryptographic signing\n\n"
        "Weaknesses:\n"
        "- Did not mention token revocation or expiry\n\n"
        "Improvement:\n"
        "- Discuss refresh tokens and short lifetimes"
    )
    return mock_resp

@pytest.fixture
def client():
    """
    Test Level: Integration Fixture
    Provides an in-memory HTTP TestClient for FastAPI.
    """
    return TestClient(app)
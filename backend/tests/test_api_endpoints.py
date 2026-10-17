import pytest
from unittest.mock import patch

class TestApiEndpoints:
    """
    Suite: FastAPI HTTP Endpoints Contract
    Test Level: Integration Testing
    Methodology: Black-Box Testing (tests HTTP request -> response contract without internal inspection)
    """

    def test_start_interview_endpoint_contract(self, client):
        """
        Classification:
          - Level: Integration Test
          - Methodology: Black-Box Testing
        Input: POST /interview/start with {"user_id": "usr-123"}
        Expected Output: 200 OK with {"interview_id": str, "question": str}
        """
        mock_result = {
            "interview_id": "test-uuid-456",
            "question": "Explain how virtual DOM works in React."
        }

        with patch("services.interview_service.interview_service.start_interview", return_value=mock_result):
            response = client.post("/interview/start", json={"user_id": "usr-123"})

            assert response.status_code == 200
            data = response.json()
            assert data["interview_id"] == "test-uuid-456"
            assert data["question"] == "Explain how virtual DOM works in React."

    def test_start_interview_endpoint_validation_error(self, client):
        """
        Classification:
          - Level: Integration Test
          - Methodology: Black-Box Testing
        Input: Missing mandatory user_id payload
        Expected Output: 422 Unprocessable Entity
        """
        response = client.post("/interview/start", json={})
        assert response.status_code == 422

    def test_answer_interview_endpoint_contract(self, client):
        """
        Classification:
          - Level: Integration Test
          - Methodology: Black-Box Testing
        Input: POST /interview/answer with valid session ID and answer
        Expected Output: 200 OK with feedback and next question
        """
        mock_result = {
            "finished": False,
            "question": "How does React Fiber differ from the previous reconciler?",
            "feedback": "Score: 8/10\nGood explanation."
        }

        with patch("services.interview_service.interview_service.submit_answer", return_value=mock_result):
            response = client.post("/interview/answer", json={
                "interview_id": "test-uuid-456",
                "answer": "Virtual DOM is an in-memory representation of real DOM."
            })

            assert response.status_code == 200
            data = response.json()
            assert data["finished"] is False
            assert "Fiber" in data["question"]
            assert "Score: 8/10" in data["feedback"]
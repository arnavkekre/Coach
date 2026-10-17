import pytest
from unittest.mock import patch, MagicMock
from services.feedback_service import FeedbackService

class TestFeedbackService:
    """
    Suite: Answer Feedback & Scoring Evaluation
    Test Level: Unit Testing
    Methodology: White-Box Testing (inspects internal prompt construction & LLM invocation)
    """

    def test_evaluate_answer_successful_scoring(self, mock_llm_response):
        """
        Classification:
          - Level: Unit Test
          - Methodology: White-Box Testing
        """
        service = FeedbackService()
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_llm_response

        #  Patch the whole llm object instead of llm.invoke
        with patch("services.feedback_service.llm", mock_llm):
            result = service.evaluate_answer(
                question="What is a closure in JavaScript?",
                answer="A function bundled with references to its lexical environment."
            )

            mock_llm.invoke.assert_called_once()
            assert "Score: 8/10" in result
            assert "Strengths:" in result

    def test_evaluate_answer_handles_empty_input(self):
        """
        Classification:
          - Level: Unit Test
          - Methodology: White-Box Testing (Edge-case boundary testing)
        """
        service = FeedbackService()
        mock_llm = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = "Score: 0/10\nWeaknesses:\n- No answer provided."
        mock_llm.invoke.return_value = mock_resp

        #  Patch the whole llm object instead of llm.invoke
        with patch("services.feedback_service.llm", mock_llm):
            result = service.evaluate_answer(question="Explain CORS.", answer="")
            assert "Score: 0/10" in result
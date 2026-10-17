import pytest
from unittest.mock import patch, MagicMock
from services.interview_service import InterviewService

class TestInterviewService:
    """
    Suite: Interview Session Lifecycle & State Machine
    Test Level: Unit & System Testing
    Methodology: White-Box Testing (tracks internal session dictionary state & transitions)
    """

    @pytest.fixture
    def interview_service(self):
        service = InterviewService()
        service.sessions = {}
        return service

    def test_start_interview_initializes_session(self, interview_service):
        """
        Classification:
          - Level: Unit Test
          - Methodology: White-Box Testing
        """
        mock_retriever = [{"content": "Software engineer with 3 years Python and FastAPI experience."}]
        mock_llm = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = "What is asyncio?\nExplain dependency injection.\nWhat is Docker?"
        mock_llm.invoke.return_value = mock_resp

        #  Patch the whole llm object instead of llm.invoke
        with patch("services.interview_service.retriever.retrieve", return_value=mock_retriever), \
             patch("services.interview_service.llm", mock_llm), \
             patch("services.interview_service.interview_repository.create_interview") as mock_create_repo:

            result = interview_service.start_interview(user_id="test-user-123")

            assert "interview_id" in result
            assert result["question"] == "What is asyncio?"

            # White-Box: Verify internal session dictionary
            session = interview_service.sessions[result["interview_id"]]
            assert session["user_id"] == "test-user-123"
            assert session["current_index"] == 0
            assert len(session["questions"]) == 3
            mock_create_repo.assert_called_once()

    def test_submit_answer_advances_question(self, interview_service):
        """
        Classification:
          - Level: Unit Test
          - Methodology: White-Box Testing (State Transition Testing)
        """
        session_id = "test-session-abc"
        interview_service.sessions[session_id] = {
            "user_id": "user-1",
            "questions": ["Q1", "Q2"],
            "current_question": "Q1",
            "current_index": 0,
            "answers": [],
            "resume_context": "Resume text"
        }

        with patch("services.interview_service.feedback_service.evaluate_answer", return_value="Score: 9/10"), \
             patch("services.interview_service.interview_repository.save_answer"), \
             patch("services.interview_service.question_generator.generate_next_question", return_value="Adaptive Q2"):

            res = interview_service.submit_answer(session_id, "Answer 1")

            assert res["finished"] is False
            assert res["question"] == "Adaptive Q2"
            assert res["feedback"] == "Score: 9/10"

            assert interview_service.sessions[session_id]["current_index"] == 1
            assert len(interview_service.sessions[session_id]["answers"]) == 1

    def test_submit_answer_triggers_interview_completion(self, interview_service):
        """
        Classification:
          - Level: System / Lifecycle Test
          - Methodology: White-Box Testing (Terminal State Testing)
        """
        session_id = "final-session"
        interview_service.sessions[session_id] = {
            "user_id": "user-1",
            "questions": ["Only Question"],
            "current_question": "Only Question",
            "current_index": 0,
            "answers": [],
            "resume_context": "Context"
        }

        with patch("services.interview_service.feedback_service.evaluate_answer", return_value="Score: 10/10"), \
             patch("services.interview_service.interview_repository.save_answer"), \
             patch("services.interview_service.interview_repository.complete_interview") as mock_complete:

            res = interview_service.submit_answer(session_id, "My final answer")

            assert res["finished"] is True
            assert res["feedback"] == "Score: 10/10"
            mock_complete.assert_called_once_with(session_id)
            assert session_id not in interview_service.sessions

    def test_submit_answer_invalid_session_raises_value_error(self, interview_service):
        """
        Classification:
          - Level: Unit Test
          - Methodology: White-Box Testing (Exception Path)
        """
        with pytest.raises(ValueError, match="Interview not found"):
            interview_service.submit_answer("non-existent-id", "some answer")
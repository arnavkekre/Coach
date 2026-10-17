import pytest
from unittest.mock import patch, MagicMock
import io

class TestRemainingApiEndpoints:
    """
    Suite: Remaining FastAPI Endpoints (/upload-resume, /chat, /transcribe, /history, /feedback)
    Test Level: Integration Testing
    Methodology: Black-Box Testing (HTTP requests -> response status & schemas)
    """

    def test_upload_resume_endpoint(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests POST /upload-resume with multipart PDF file and user_id form data.
        """
        # Create a mock Supabase client with chainable storage methods
        mock_supabase = MagicMock()
        mock_supabase.storage.from_.return_value.list.return_value = [{"name": "old_resume.pdf"}]
        mock_supabase.storage.from_.return_value.remove.return_value = None
        mock_supabase.storage.from_.return_value.upload.return_value = None

        with patch("app.supabase", mock_supabase), \
             patch("app.process_resume", return_value={"message": "ok", "chunks": 5}):

            fake_pdf_content = b"%PDF-1.4 simulated resume document"
            files = {
                "resume": ("resume.pdf", fake_pdf_content, "application/pdf")
            }
            data = {
                "user_id": "user-123"
            }

            response = client.post("/upload-resume", files=files, data=data)

            assert response.status_code == 200
            json_data = response.json()
            assert json_data["message"] == "uploaded"
            assert json_data["chunks"] == 5
            assert "user-123/resume.pdf" in json_data["path"]

    def test_chat_endpoint_contract(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests POST /chat takes user_id & question and returns answer.
        """
        with patch("app.rag_service.answer_question", return_value="Here is advice based on your resume."):
            response = client.post("/chat", json={
                "user_id": "user-123",
                "question": "How do I explain microservices?"
            })

            assert response.status_code == 200
            data = response.json()
            assert "advice" in data["answer"]

    def test_transcribe_audio_endpoint(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests POST /transcribe sends audio file and receives Whisper transcript.
        """
        mock_transcription = MagicMock()
        mock_transcription.text = "I have three years of experience building microservices."

        with patch("app.groq_client.audio.transcriptions.create", return_value=mock_transcription):
            fake_audio = io.BytesIO(b"fake-audio-bytes")
            response = client.post(
                "/transcribe",
                files={"file": ("recording.webm", fake_audio, "audio/webm")}
            )

            assert response.status_code == 200
            assert response.json()["text"] == "I have three years of experience building microservices."

    def test_get_history_endpoint(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests GET /history/{user_id} returns candidate interview records.
        """
        mock_history = [{"id": "inv-101", "score": 9}]
        with patch("app.history_service.get_history", return_value=mock_history):
            response = client.get("/history/user-123")
            assert response.status_code == 200
            assert response.json()[0]["id"] == "inv-101"

    def test_get_interview_details_endpoint(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests GET /history/details/{interview_id} returns session details.
        """
        mock_details = {"id": "inv-101", "questions": ["Q1", "Q2"]}
        with patch("app.history_service.get_interview_details", return_value=mock_details):
            response = client.get("/history/details/inv-101")
            assert response.status_code == 200
            assert response.json()["id"] == "inv-101"

    def test_submit_app_feedback_endpoint(self, client):
        """
        Level: Integration Test | Methodology: Black-Box
        Tests POST /feedback stores candidate platform feedback.
        """
        with patch("app.app_feedback_service.submit_feedback", return_value=True):
            response = client.post("/feedback", json={
                "user_id": "user-123",
                "message": "The mock interview questions were fantastic!"
            })
            assert response.status_code == 200
            assert response.json()["message"] == "Feedback submitted successfully"
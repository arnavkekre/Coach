import pytest
from unittest.mock import patch, MagicMock
import numpy as np

class TestRAGPipeline:
    """
    Suite: Complete RAG System (PDF Ingestion, Vector DB, Embeddings, Question Generator)
    Test Level: Unit & Integration Testing
    Methodology: White-Box Testing
    """

    # 1. RESUME PROCESSOR (Unit Test / White-Box)
    def test_resume_processor_pipeline(self):
        """
        Level: Unit Test | Methodology: White-Box
        Verifies that process_resume extracts PDF chunks and indexes them in vector_store.
        """
        from services.resume_processor import process_resume

        mock_doc = [
            MagicMock(page_content="Software Engineer with Python, React, and FastAPI experience.", metadata={"page": 0})
        ]

        with patch("services.resume_processor.PyMuPDFLoader") as mock_loader, \
             patch("services.resume_processor.get_embedding_manager") as mock_emb_mgr, \
             patch("services.resume_processor.vector_store.add_documents") as mock_add_docs:

            mock_loader.return_value.load.return_value = mock_doc
            mock_emb_mgr.return_value.generate_embeddings.return_value = np.zeros((1, 384))

            result = process_resume(resume_bytes=b"%PDF-1.4 test", user_id="user-123")

            assert result["message"] == "Resume processed successfully"
            assert result["chunks"] >= 1
            mock_add_docs.assert_called_once()

    # 2. EMBEDDING MANAGER (Unit Test / White-Box)
    def test_embedding_manager_generation(self):
        """
        Level: Unit Test | Methodology: White-Box
        Verifies that EmbeddingManager converts text strings into numpy arrays.
        """
        from services.embedding_manager import EmbeddingManager

        with patch("services.embedding_manager.SentenceTransformer") as mock_transformer:
            mock_transformer.return_value.encode.return_value = np.zeros((2, 384))
            mock_transformer.return_value.get_embedding_dimension.return_value = 384

            manager = EmbeddingManager(model_name="all-MiniLM-L6-v2")
            embeddings = manager.generate_embeddings(["Python", "FastAPI"])

            assert isinstance(embeddings, np.ndarray)
            assert embeddings.shape == (2, 384)

    # 3. VECTOR STORE (Unit Test / White-Box)
    def test_vector_store_add_documents(self):
        """
        Level: Unit Test | Methodology: White-Box
        Verifies adding documents into ChromaDB collection.
        """
        from services.vector_store import VectorStore

        with patch("services.vector_store.chromadb.PersistentClient") as mock_client:
            mock_collection = MagicMock()
            mock_client.return_value.get_or_create_collection.return_value = mock_collection

            store = VectorStore(collection_name="test_col", persist_directory="dummy_dir")
            fake_chunks = [MagicMock(page_content="Expert in Docker", metadata={})]
            fake_embeddings = np.zeros((1, 384))

            store.add_documents(fake_chunks, fake_embeddings, user_id="u1")
            mock_collection.add.assert_called_once()

    # 4. RETRIEVER (Integration Test / White-Box)
    def test_retriever_query_and_formatting(self):
        """
        Level: Integration Test | Methodology: White-Box
        Verifies that retriever.retrieve queries ChromaDB with user_id and formats results.
        """
        from services.retriever import RAGRetriever

        with patch("services.retriever.vector_store") as mock_store, \
             patch("services.retriever.get_embedding_manager") as mock_emb_mgr:

            mock_emb_mgr.return_value.generate_embeddings.return_value = np.zeros((1, 384))
            mock_store.collection.query.return_value = {
                "documents": [["Experience with PostgreSQL and Docker"]],
                "metadatas": [[{"user_id": "usr-456"}]]
            }

            retriever = RAGRetriever()
            results = retriever.retrieve(query="Database skills", user_id="usr-456", top_k=1)

            assert len(results) == 1
            assert results[0]["content"] == "Experience with PostgreSQL and Docker"
            assert results[0]["metadata"]["user_id"] == "usr-456"

    # 5. QUESTION GENERATOR (Unit Test / White-Box)
    def test_question_generator_generates_adaptive_question(self):
        """
        Level: Unit Test | Methodology: White-Box
        Verifies that question_generator prompts the LLM and returns the next question.
        """
        from services.question_generator import QuestionGenerator

        mock_llm = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = "Can you explain how connection pooling works in PostgreSQL?"
        mock_llm.invoke.return_value = mock_resp

        with patch("services.question_generator.llm", mock_llm):
            generator = QuestionGenerator()
            next_q = generator.generate_next_question(
                resume_context="PostgreSQL experience",
                previous_question="What is SQL?",
                previous_answer="Structured Query Language",
                feedback="Good answer"
            )

            assert "PostgreSQL" in next_q
            mock_llm.invoke.assert_called_once()

    # 6. RAG SERVICE (Integration Test / White-Box)
    def test_rag_service_answers_question_from_context(self):
        """
        Level: Integration Test | Methodology: White-Box
        Verifies RAGService.answer_question retrieves context and invokes LLM.
        """
        from services.rag_service import RAGService

        mock_llm = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = "Based on your resume, you have 3 years of FastAPI experience."
        mock_llm.invoke.return_value = mock_resp

        with patch("services.rag_service.retriever.retrieve", return_value=[{"content": "3 years FastAPI"}]), \
             patch("services.rag_service.llm", mock_llm):

            service = RAGService()
            answer = service.answer_question(user_id="user-1", question="How much FastAPI experience do I have?")

            assert "FastAPI" in answer
            mock_llm.invoke.assert_called_once()
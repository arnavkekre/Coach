# Coach AI — Distributed Event-Driven Speech & Interview Intelligence Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-Vite_8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Azure Service Bus](https://img.shields.io/badge/Azure_Service_Bus-Enterprise_Queue-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/en-us/products/service-bus/)
[![Azure Container Apps](https://img.shields.io/badge/Azure_Container_Apps-Scale_to_Zero-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/en-us/products/container-apps/)
[![Groq LPU](https://img.shields.io/badge/Groq_Inference-LPU_Accelerated-F05A28?style=for-the-badge)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Vectors-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Pytest-21_Passed_100%25-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Verified-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

An enterprise-ready, asynchronous speech evaluation and technical mock-interview system. Engineered to overcome HTTP gateway timeouts and compute-heavy inference bottlenecks by decoupling client ingestion from LLM processing via **Azure Service Bus**, **Azure Container Apps worker consumers**, **Groq LPU inference**, and **Retrieval-Augmented Generation (RAG)** over candidate resumes.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend Client (React 19 + Vite)"]
        UI["Web Audio API & Voice Toolbar"]
        PDF["PDF Resume Upload"]
    end

    subgraph Ingestion ["Ingestion & Gateway Layer"]
        API["FastAPI REST Engine (Producer)"]
        RAG["PyMuPDF Chunking & Vector Engine"]
    end

    subgraph Messaging ["Message Broker (Azure Service Bus)"]
        Queue[("Queue: transcription-jobs<br/>(FIFO, DLQ, At-Least-Once)")]
    end

    subgraph Processing ["Decoupled Worker (Azure Container Apps)"]
        Worker["Autonomous Consumer Worker<br/>(SIGTERM Graceful Shutdown)"]
    end

    subgraph Inference ["High-Throughput Inference (Groq LPU)"]
        Whisper["whisper-large-v3<br/>(STT Transcription)"]
        PrimaryLLM["openai/gpt-oss-120b<br/>(Primary Speech Evaluation)"]
        FallbackLLM["openai/gpt-oss-20b<br/>(Automatic Fallback)"]
    end

    subgraph Storage ["Persistence & Telemetry"]
        SupaDB[("Supabase PostgreSQL<br/>(Interviews, Feedback, Vector Embeddings)")]
        SupaStorage[("Supabase Storage<br/>(Audio Blobs, Resume PDFs)")]
        AppInsights["Azure Monitor / OpenTelemetry<br/>(Distributed APM Traces)"]
    end

    %% Data Flow
    PDF -->|Upload PDF & User ID| API
    UI -->|WebM Audio Recording| API
    API -->|Extract Chunks & Embed| RAG
    RAG -->|Store Document Vectors| SupaDB

    API -->|Enqueue Evaluation Job| Queue
    API -->|Synchronous STT Call| Whisper

    Queue -->|Pull Batch (max=5)| Worker
    Worker -->|Fetch Audio Blob| SupaStorage
    Worker -->|1. Try Primary Inference| PrimaryLLM
    PrimaryLLM -.->|On Exception / Quota| FallbackLLM
    PrimaryLLM -->|Structured Feedback & Scores| SupaDB
    FallbackLLM -->|Fallback Evaluation Result| SupaDB
    Worker -->|Acknowledge / Delete Message| Queue

    API -.->|Telemetry & Spans| AppInsights
    Worker -.->|Telemetry & Spans| AppInsights

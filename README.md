# Coach – AI Technical Interview & Proctoring Platform

[![Live App](https://img.shields.io/badge/Production-coachinterview.tech-blue?style=flat-square&logo=google-chrome)](https://www.coachinterview.tech)
[![Backend Status](https://img.shields.io/badge/API-Azure%20App%20Service-0089D6?style=flat-square&logo=microsoft-azure)](https://arnav-coach-student-2026.azurewebsites.net)
[![Frontend S3](https://img.shields.io/badge/Frontend-AWS%20S3%20%2B%20CloudFront-orange?style=flat-square&logo=amazon-aws)](https://www.coachinterview.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Coach** is an AI-driven interview platform that conducts adaptive technical interviews grounded in a candidate's resume using RAG (Retrieval-Augmented Generation), with real-time, client-side vision proctoring and voice interaction.

---

## Documentation Index

Detailed design documents and system specifications are organized into dedicated files:

* [**Architecture (`arch.md`)**](./arch.md): Multi-cloud infrastructure (Azure + AWS), database schema, pgvector configuration, and API request/response sequences.
* [**AI Agents & Proctoring (`agents.md`)**](./agents.md): LLM prompts, RAG chunking pipeline, Groq Whisper STT integration, and MediaPipe computer vision heuristics (neck-shadow rejection, lip-movement tracking).
* [**Design System (`design_system.md`)**](./design_system.md): Component library, Tailwind styling, interview HUD layout, and responsive UI patterns.

---

## Core Stack

| Layer | Technology | Hosting / Service |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS | AWS S3 + CloudFront (`coachinterview.tech`) / Azure SWA |
| **Vision AI** | MediaPipe FaceLandmarker | Client-Side WebAssembly & WebGL (Zero server compute) |
| **Backend** | Python 3.12, FastAPI, Uvicorn | Azure App Service (Linux) |
| **STT Engine** | Groq Whisper API | High-speed speech transcription |
| **LLM Engine** | Groq / LangChain | Adaptive Q&A and rubric evaluations |
| **Database** | PostgreSQL + `pgvector` | Supabase (Auth, Sessions, 384-dim Embeddings) |

---

## Environment Variables

### Backend (`backend/.env` or Azure App Settings)
```env
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_KEY="<supabase-service-or-anon-key>"
GROQ_API_KEY="gsk_<your-groq-api-key>"
PORT=8000
```

### Frontend (`frontend/.env` or GitHub Secrets)
```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<supabase-anon-key>"
VITE_API_URL="https://arnav-coach-student-2026.azurewebsites.net"
```

---

## Quickstart (Local Development)

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger docs: `http://localhost:8000/docs`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Client dev server: `http://localhost:5173`

---

## Deployment Workflows

* **AWS S3 & CloudFront:** Pushes to `main` trigger `.github/workflows/deploy-aws-frontend.yml` to build Vite and invalidate the edge CDN cache.
* **Azure App Service:** Pushes to `main` trigger `.github/workflows/main_arnav-coach-student-2026.yml` to build and deploy the Python FastAPI container.
* **Azure Static Web Apps:** Pushes to `main` trigger `.github/workflows/azure-static-web-apps-*.yml` for dual-frontend redundancy.

---

## License
MIT

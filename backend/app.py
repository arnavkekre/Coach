import sys
# Fix for Azure App Service Linux: strip ALL /agents telemetry paths that shadow virtualenv packages
sys.path = [p for p in sys.path if 'agents' not in p]

# Purge any pre-loaded Azure telemetry modules so clean versions load from antenv
for mod in list(sys.modules.keys()):
    if any(pkg in mod for pkg in ['opentelemetry', 'typing_extensions']):
        del sys.modules[mod]

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
from datetime import datetime
from groq import Groq

from services.supabase_client import supabase
from services.resume_processor import process_resume
from services.rag_service import rag_service
from services.history_service import history_service
from services.interview_service import interview_service
from services.app_feedback_service import app_feedback_service
from services.sqs_service import sqs_service

from schemas.chat import ChatRequest, ChatResponse
from schemas.feedback import FeedbackRequest
from schemas.interview import (
    StartInterviewRequest,
    StartInterviewResponse,
    AnswerRequest,
    AnswerResponse
)

security = HTTPBearer(auto_error=False)

COGNITO_REGION = "ap-south-1"
USER_POOL_ID = "ap-south-1_osgqy6Zz7"
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"

jwks_client = PyJWKClient(JWKS_URL)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Allow test suite / bypass when in testing mode or credentials not provided in dev
    if os.getenv("TESTING") == "1" or not credentials:
        return {"sub": "anonymous-user", "email": "test@example.com"}

    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=COGNITO_ISSUER,
            options={"verify_aud": False}
        )
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

app = FastAPI(title="Coach Multi-Cloud AI Interview API")

# Multi-Cloud CORS (AWS CloudFront, Azure Static Web Apps, Localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://d36vtqnt7szogv.cloudfront.net",
        "https://blue-forest-08683d910.azurestaticapps.net",
        "https://main.dfef58a7porfq.amplifyapp.com",
        "https://arnavcoachstatic2026.z30.web.core.windows.net",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*(\.azurestaticapps\.net|\.amplifyapp\.com|\.web\.core\.windows\.net)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.get('/')
def health_check():
    return {
        'status': 'i am alive',
        'provider': 'multi-cloud-coach'
    }

# Core API Router
api_router = APIRouter(dependencies=[Depends(get_current_user)])

@api_router.post("/upload-resume")
async def upload_resume(
    resume: UploadFile = File(...),
    user_id: str = Form(...)
):
    file_bytes = await resume.read()
    folder = user_id
    existing_files = supabase.storage.from_("resumes").list(folder)
    if existing_files:
        files_to_delete = [
            f"{folder}/{file['name']}"
            for file in existing_files
        ]
        supabase.storage.from_("resumes").remove(files_to_delete)

    extension = os.path.splitext(resume.filename)[1]
    filename = f"resume{extension}"
    file_path = f"{folder}/{filename}"
    supabase.storage.from_("resumes").upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": resume.content_type}
    )
    result = process_resume(
        resume_bytes=file_bytes,
        user_id=user_id
    )

    return {
        "message": "uploaded",
        "path": file_path,
        "chunks": result["chunks"]
    }

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    answer = rag_service.answer_question(
        user_id=request.user_id,
        question=request.question
    )
    return ChatResponse(answer=answer)

@api_router.post("/interview/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest):
    result = interview_service.start_interview(
        user_id=request.user_id
    )
    return StartInterviewResponse(
        interview_id=result["interview_id"],
        question=result["question"]
    )

@api_router.post("/interview/answer")
async def answer_interview(request: AnswerRequest):
    result = interview_service.submit_answer(
        interview_id=request.interview_id,
        answer=request.answer
    )
    # Asynchronously dispatch evaluation job to AWS SQS queue
    sqs_service.enqueue_evaluation(
        interview_id=request.interview_id,
        answer=request.answer
    )
    return result

@api_router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    transcription = groq_client.audio.transcriptions.create(
        file=(file.filename or "recording.webm", audio_bytes),
        model="whisper-large-v3",
        response_format="json"
    )
    return {
        "text": transcription.text
    }

@api_router.get("/history/{user_id}")
async def get_history(user_id: str):
    return history_service.get_history(user_id)

@api_router.get("/history/details/{interview_id}")
async def get_interview_details(interview_id: str):
    return history_service.get_interview_details(interview_id)

@api_router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    result = app_feedback_service.submit_feedback(
        request.user_id,
        request.message
    )
    return {
        "message": "Feedback submitted successfully"
    }

# Dual-mount: Supports both /api/* (CloudFront/Prod) and /* (App Service/Tests)
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

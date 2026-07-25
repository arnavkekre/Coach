from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from services.supabase_client import supabase
from services.resume_processor import process_resume
from services.rag_service import rag_service
from schemas.chat import ChatRequest, ChatResponse
from schemas.interview import StartInterviewRequest, StartInterviewResponse
from services.history_service import history_service
from services.interview_service import interview_service
from schemas.feedback import FeedbackRequest
from services.app_feedback_service import app_feedback_service
from schemas.interview import (
    StartInterviewRequest,
    StartInterviewResponse,
    AnswerRequest,
    AnswerResponse
)
import uuid
from datetime import datetime
import os
app= FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get('/')
def run():
    return {
        'status': 'i am alive'
    }
"""@app.post("/upload-resume")
async def upload_resume(resume: UploadFile=File(...), user_id: str= Form(...) ):
    file_bytes= await resume.read()
    unique_filename= f"{uuid.uuid4()}_{resume.filename}"
    response= supabase.storage.from_("resumes").upload(
        path= unique_filename,
        file= file_bytes,
        file_options={
        "content-type": resume.content_type
    }
    )
    return {
        "message": "uploaded",
        "filename" : unique_filename
        
    }"""
@app.post("/upload-resume")
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

        supabase.storage.from_("resumes").remove(
            files_to_delete
        )
    extension = os.path.splitext(resume.filename)[1]
    filename = f"resume{extension}"
    file_path = f"{folder}/{filename}"
    supabase.storage.from_("resumes").upload(
        path=file_path,
        file=file_bytes,
        file_options={
            "content-type": resume.content_type
        }
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

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):

    answer = rag_service.answer_question(
        user_id=request.user_id,
        question=request.question
    )

    return ChatResponse(
        answer=answer
    )

@app.post("/interview/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest):

    result = interview_service.start_interview(
        user_id=request.user_id
    )

    return StartInterviewResponse(
        interview_id=result["interview_id"],
        question=result["question"]
    )

@app.post("/interview/answer")
async def answer_interview(request: AnswerRequest):

    result = interview_service.submit_answer(
        interview_id=request.interview_id,
        answer=request.answer
    )

    return result

@app.get("/history/{user_id}")
async def get_history(user_id: str):

    return history_service.get_history(user_id)



@app.get("/history/details/{interview_id}")
async def get_interview_details(interview_id: str):

    return history_service.get_interview_details(interview_id)

@app.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest
):

    result = app_feedback_service.submit_feedback(
        request.user_id,
        request.message
    )

    return {
        "message": "Feedback submitted successfully"
    }
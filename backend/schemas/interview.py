from pydantic import BaseModel


class StartInterviewRequest(BaseModel):
    user_id: str


class StartInterviewResponse(BaseModel):
    interview_id: str
    question: str


class AnswerRequest(BaseModel):
    interview_id: str
    answer: str


class AnswerResponse(BaseModel):
    question: str
    finished: bool


class EndInterviewRequest(BaseModel):
    interview_id: str
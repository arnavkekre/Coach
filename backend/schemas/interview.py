from pydantic import BaseModel


class StartInterviewRequest(BaseModel):
    user_id: str


class StartInterviewResponse(BaseModel):
    interview_id: str
    question: str
    question_number: int= 1


class AnswerRequest(BaseModel):
    interview_id: str
    answer: str


class AnswerResponse(BaseModel):
    question: str
    finished: bool


class EndInterviewRequest(BaseModel):
    interview_id: str
    violation_count: int = 0
    integrity_score: int = 100

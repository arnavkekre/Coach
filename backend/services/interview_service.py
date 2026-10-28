import uuid

from services.retriever import retriever
from services.llm import llm
from services.feedback_service import feedback_service
from services.question_generator import question_generator
from services.interview_repository import interview_repository
class InterviewService:

    def __init__(self):
        self.sessions = {}

    def start_interview(self, user_id: str, max_safety_cap: int =15):
        results = retriever.retrieve(
    query="Tell me everything about this candidate's resume.",
    user_id=user_id,
    top_k=20
)
        context = "\n\n".join(
            doc["content"]
            for doc in results
        )
        prompt = f"""
You are a senior technical interviewer. Based on the candidate's resume below, generate ONE strong, open-ended opening question regarding their primary technical domain.
Return ONLY the question text.
Resume Context:
{context}
"""

        response = llm.invoke(prompt)
        first_question= response.content.strip()
        
        interview_id = str(uuid.uuid4())
        interview_repository.create_interview(
    interview_id,
    user_id,
    0
)

        self.sessions[interview_id] = {
    "user_id": user_id,
"current_question": first_question,
"question_count": 1,
"max_safety_cap": max_safety_cap,
    "answers": [],
    "resume_context": context
}
        return {
            "interview_id": interview_id,
            "question": first_question,
            "question_number": 1
        }

    def submit_answer(self, interview_id: str, answer: str):

        session = self.sessions.get(interview_id)

        if not session:
            raise ValueError("Interview session not found or already concluded")



        current_question = session["current_question"]


    # Evaluate answer
        feedback = feedback_service.evaluate_answer(
            question=current_question,
            answer=answer
        )
        interview_repository.save_answer(
    interview_id,
    current_question,
    answer,
    feedback
)


    # Store answer + feedback
        session["answers"].append(
        {
            "question": current_question,
            "answer": answer,
            "feedback": feedback
        }
    )


    # Move to next question


    # Check interview finished
        if session["question_count"] >= session["max_safety_cap"]:
            res= self.end_interview(interview_id)
            res["answered_question"]= current_question
            return res

            


        next_question = question_generator.generate_next_question(
    resume_context=session["resume_context"],
    previous_question=current_question,
    previous_answer=answer,
    feedback=feedback
)
        session["question_count"]+=1
        session["current_question"] = next_question
        return {
        "finished": False,
        "question": next_question,
        "question_number": session["question_count"],
        "answered_question": current_question,
        "feedback": feedback
    }

    def end_interview(self, interview_id: str):
        session = self.sessions.get(interview_id)
        if not session:
            return {"finished": True, "message": "Interview already completed."}
        total_answered = len(session["answers"])
        interview_repository.complete_interview(interview_id, total_answered)
        # Free backend memory
        del self.sessions[interview_id]
        return {
            "finished": True,
            "total_questions_answered": total_answered,
            "feedback": "Interview completed successfully."
        }


interview_service = InterviewService()

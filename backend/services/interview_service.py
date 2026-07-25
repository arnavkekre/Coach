import uuid

from services.retriever import retriever
from services.llm import llm
from services.feedback_service import feedback_service
from services.question_generator import question_generator
from services.interview_repository import interview_repository
class InterviewService:

    def __init__(self):
        self.sessions = {}

    def start_interview(self, user_id: str):
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
You are a senior software engineer conducting a technical interview.

Using ONLY the resume below, generate exactly 8 interview questions.

Rules:
- Return ONLY the questions.
- One question per line.
- Do not number them.
- Start easy and gradually increase difficulty.

Resume Context:

{context}
"""

        response = llm.invoke(prompt)
        questions = [
            q.strip()
            for q in response.content.split("\n")
            if q.strip()
        ]
        interview_id = str(uuid.uuid4())
        interview_repository.create_interview(
    interview_id,
    user_id,
    len(questions)
)

        self.sessions[interview_id] = {
    "user_id": user_id,
    "questions": questions,
"current_question": questions[0],
"current_index": 0,
    "answers": [],
    "resume_context": context
}
        return {
            "interview_id": interview_id,
            "question": questions[0]
        }

    def submit_answer(self, interview_id: str, answer: str):

        session = self.sessions.get(interview_id)

        if not session:
            raise ValueError("Interview not found")


        current_index = session["current_index"]

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
        session["current_index"] += 1


    # Check interview finished
        if session["current_index"] >= len(session["questions"]):
            interview_repository.complete_interview(interview_id)

            del self.sessions[interview_id]
            return {
                "finished": True,
                "feedback": feedback
            }


        next_question = question_generator.generate_next_question(
    resume_context=session["resume_context"],
    previous_question=current_question,
    previous_answer=answer,
    feedback=feedback
)
        session["current_question"] = next_question
        return {
        "finished": False,
        "question": next_question,
        "feedback": feedback
    }

    def end_interview(self, interview_id: str):
        pass


interview_service = InterviewService()
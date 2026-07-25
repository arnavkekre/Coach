from services.supabase_client import supabase
from datetime import datetime, timezone

class InterviewRepository:

    def create_interview(
        self,
        interview_id,
        user_id,
        total_questions
    ):

        supabase.table("interviews").insert({

            "id": interview_id,

            "user_id": user_id,

            "total_questions": total_questions

        }).execute()


    def save_answer(
        self,
        interview_id,
        question,
        answer,
        feedback
    ):

        supabase.table(
            "interview_answers"
        ).insert({

            "interview_id": interview_id,

            "question": question,

            "answer": answer,

            "feedback": feedback

        }).execute()


    def complete_interview(
        self,
        interview_id
    ):

        supabase.table("interviews").update({
            "status": "completed",
            "ended_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", interview_id).execute()


    def get_user_interviews(self, user_id: str):

        response = (
            supabase.table("interviews")
            .select("*")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .execute()
        )

        return response.data


    def get_interview(self, interview_id: str):

        response = (
            supabase.table("interviews")
            .select("*")
            .eq("id", interview_id)
            .single()
            .execute()
        )

        return response.data


    def get_answers(self, interview_id: str):

        response = (
            supabase.table("interview_answers")
            .select("*")
            .eq("interview_id", interview_id)
            .order("created_at")
            .execute()
        )

        return response.data


interview_repository = InterviewRepository()
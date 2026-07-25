from services.supabase_client import supabase


class FeedbackRepository:


    def save_feedback(
        self,
        user_id,
        message
    ):

        response = (
            supabase
            .table("app_feedback")
            .insert({
                "user_id": user_id,
                "message": message
            })
            .execute()
        )

        return response.data


feedback_repository = FeedbackRepository()
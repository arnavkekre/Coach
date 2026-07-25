from services.feedback_repository import feedback_repository


class AppFeedbackService:


    def submit_feedback(
        self,
        user_id,
        message
    ):

        return feedback_repository.save_feedback(
            user_id,
            message
        )


app_feedback_service = AppFeedbackService()
from services.interview_repository import interview_repository


class HistoryService:

    def get_history(self, user_id: str):

        interviews = interview_repository.get_user_interviews(
            user_id
        )

        return interviews


    def get_interview_details(self, interview_id: str):

        interview = interview_repository.get_interview(
            interview_id
        )

        answers = interview_repository.get_answers(
            interview_id
        )

        return {
            "interview": interview,
            "answers": answers
        }


history_service = HistoryService()
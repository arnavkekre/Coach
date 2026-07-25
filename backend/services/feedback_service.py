from services.llm import llm


class FeedbackService:

    def evaluate_answer(
        self,
        question: str,
        answer: str
    ):

        prompt = f"""
You are an expert technical interviewer.

Evaluate the candidate's answer.

Question:
{question}

Candidate Answer:
{answer}

Return your evaluation in this format:

Score: X/10

Strengths:
- point 1
- point 2

Weaknesses:
- point 1
- point 2

Improvement:
- suggestion
"""

        response = llm.invoke(prompt)

        return response.content


feedback_service = FeedbackService()
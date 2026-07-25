from services.llm import llm


class QuestionGenerator:

    def generate_next_question(
        self,
        resume_context: str,
        previous_question: str,
        previous_answer: str,
        feedback: str
    ):

        prompt = f"""
You are an expert technical interviewer.

Generate the next interview question based on:

Resume:
{resume_context}


Previous Question:
{previous_question}


Candidate Answer:
{previous_answer}


Feedback:
{feedback}


Rules:
- Ask only ONE question.
- Focus on areas where the candidate can be evaluated better.
- If the answer was weak, ask a follow-up question about the SAME topic.
- If the answer was strong, move to a related advanced topic.
- Do not change topics unless the answer was strong.
- Return ONLY the question.
"""

        response = llm.invoke(prompt)

        return response.content.strip()


question_generator = QuestionGenerator()
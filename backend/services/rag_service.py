from services.retriever import retriever
from services.llm import llm
class RAGService:

    def __init__(self):
        self.retriever = retriever
        self.llm = llm
    def answer_question(
    self,
    user_id: str,
    question: str
):
        results = self.retriever.retrieve(
    question,
    user_id
)
        context = "\n\n".join(
        doc["content"]
        for doc in results
    )
        prompt = f"""
You are an AI Interview Coach.

You are Coach, an AI Interview Assistant.

Use ONLY the provided resume context.

If the answer cannot be found in the context,
say:
"I couldn't find that information in your resume."

Do not invent experience, projects,
skills, companies or education.

Keep answers concise and professional.

Resume Context:

{context}

Question:

{question}

Answer:
"""
        response = self.llm.invoke(prompt)

        return response.content


rag_service = RAGService()
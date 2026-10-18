import json
import os
import urllib.request

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def evaluate_with_groq(question, answer):
    """Calls Groq AI to score and evaluate the candidate's answer."""
    prompt = f"""You are a principal software engineer conducting a technical interview.
Evaluate this candidate's answer thoroughly.

Question: {question}
Candidate Answer: {answer}

Provide feedback in this exact format:
Score: X/10
Strengths:
- point 1
Weaknesses:
- point 1
Improvement:
- suggestion
"""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "CoachApp/1.0"
    }
    body = {
        "model": "openai/gpt-oss-20b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"]

def save_feedback_to_supabase(interview_id, question, answer, feedback):
    """Saves the evaluation directly into Supabase interview_answers table via REST."""
    url = f"{SUPABASE_URL}/rest/v1/interview_answers"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
        "Content-Profile": "public",
        "Accept-Profile": "public"
    }
    payload = {
        "interview_id": interview_id,
        "question": question,
        "answer": answer,
        "feedback": feedback
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status

def lambda_handler(event, context):
    """Triggered automatically by Amazon SQS whenever an answer is submitted."""
    print(f"Received SQS event with {len(event.get('Records', []))} record(s)")
    
    for record in event.get("Records", []):
        body = json.loads(record["body"])
        interview_id = body.get("interview_id")
        question = body.get("question", "General Technical Question")
        answer = body.get("answer")
        
        print(f"Processing evaluation for Interview ID: {interview_id}")
        
        # 1. Evaluate with Groq AI
        feedback = evaluate_with_groq(question, answer)
        print("Groq evaluation completed successfully.")
        
        # 2. Save directly to Supabase DB
        status = save_feedback_to_supabase(interview_id, question, answer, feedback)
        print(f"Feedback saved to Supabase (status {status}).")
        
    return {"statusCode": 200, "status": "completed"}

import boto3
import json
import os
import logging

logger = logging.getLogger(__name__)

# Your live AWS SQS Queue URL:
QUEUE_URL = os.getenv(
    "SQS_EVAL_QUEUE_URL",
    "https://sqs.ap-south-1.amazonaws.com/308657715435/coach-eval-queue"
)

class SQSService:
    def __init__(self):
        # Automatically uses your AWS credentials or ECS Task IAM Role
        self.sqs = boto3.client("sqs", region_name="ap-south-1")
        self.queue_url = QUEUE_URL

    def enqueue_evaluation(self, interview_id: str, answer: str, user_id: str = "anonymous"):
        """Pushes an interview evaluation task into SQS asynchronously."""
        payload = {
            "interview_id": interview_id,
            "user_id": user_id,
            "answer": answer,
            "action": "evaluate_with_groq"
        }
        try:
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(payload)
            )
            message_id = response.get("MessageId")
            logger.info(f"Successfully enqueued job to SQS: {message_id}")
            return message_id
        except Exception as e:
            logger.error(f"SQS Enqueue error: {e}")
            return None

sqs_service = SQSService()
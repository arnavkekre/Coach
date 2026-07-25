from services.feedback_service import feedback_service


result = feedback_service.evaluate_answer(
    "Explain JWT authentication.",
    "JWT is used for authentication by sending tokens between client and server."
)


print(result)
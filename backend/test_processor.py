from services.resume_processor import process_resume
from services.supabase_client import supabase


user_id = "51396b9a-279e-4ccd-981e-a0453c1a5688"


resume_bytes = supabase.storage.from_("resumes").download(
    f"{user_id}/resume.pdf"
)


result = process_resume(
    resume_bytes,
    user_id
)


print(result)
import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Initialize client only if keys are present (safe fallback for dev)
supabase = None
if url and key and url != "your_supabase_url":
    try:
        supabase: Client = create_client(url, key)
    except Exception as e:
        print(f"Failed to initialize Supabase: {e}")
        supabase = None
else:
    print("Supabase credentials missing or invalid. Skipping initialization.")
    supabase = None

def save_generated_content(title, content, image_url):
    if not supabase:
        print("Supabase credentials missing. Skipping save.")
        return {"status": "skipped", "reason": "missing_credentials"}

    try:
        data = {
            "title": title,
            "content": content, # Content is a dict, Supabase JSONB handles it
            "image_url": image_url
        }
        
        response = supabase.table("generated_content").insert(data).execute()
        return response
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        return None


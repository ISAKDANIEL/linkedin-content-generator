"""
Run this once to create the admin account in the local SQLite database.
Usage: python create_admin.py
"""
import os
import sys

# Make sure we can import from the backend package
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend.env'))

from services.local_db import init_local_db, local_get_user_by_email, local_create_user
from services.auth_service import hash_password

ADMIN_EMAIL    = "isakdaniel1526@gmail.com"
ADMIN_PASSWORD = "Isak12345"
ADMIN_NAME     = "Admin"

def main():
    init_local_db()

    existing = local_get_user_by_email(ADMIN_EMAIL)
    if existing:
        print(f"Admin account already exists: {ADMIN_EMAIL}")
        print("You can log in directly at /login")
        return

    password_hash = hash_password(ADMIN_PASSWORD)
    user = local_create_user(
        email=ADMIN_EMAIL,
        name=ADMIN_NAME,
        password_hash=password_hash,
        provider="email"
    )

    if user:
        print("Admin account created successfully!")
        print(f"  Email   : {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print()
        print("Now go to /login, enter the credentials above, and sign in.")
        print("After login, click 'Admin Panel' in the sidebar or go to /admin")
    else:
        print("Failed to create admin account. Check local_data.db permissions.")

if __name__ == "__main__":
    main()

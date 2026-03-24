"""
Run this once to set GitHub Actions secrets for the deploy workflow.
Usage: python set_github_secrets.py <GITHUB_TOKEN>

Get a token at: https://github.com/settings/tokens
Required scope: repo (full control)
"""
import sys, base64, json, urllib.request
from nacl import encoding, public

REPO = "ISAKDANIEL/linkedin-content-generator"

SECRETS = {
    "VPS_HOST": "191.101.2.4",
    "VPS_USER": "root",
    "VPS_SSH_KEY": open("C:/Users/Rukshana/.ssh/id_rsa").read().strip(),
}

def encrypt_secret(public_key_b64: str, secret: str) -> str:
    pk = public.PublicKey(public_key_b64.encode(), encoding.Base64Encoder())
    box = public.SealedBox(pk)
    encrypted = box.encrypt(secret.encode())
    return base64.b64encode(encrypted).decode()

def api(token, path, method="GET", data=None):
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return json.loads(body) if body else {}

def set_secret(token, name, value, key_id, pub_key):
    encrypted = encrypt_secret(pub_key, value)
    api(token, f"/repos/{REPO}/actions/secrets/{name}", method="PUT",
        data={"encrypted_value": encrypted, "key_id": key_id})
    print(f"  OK: Set {name}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_github_secrets.py <GITHUB_TOKEN>")
        sys.exit(1)

    token = sys.argv[1]
    print(f"Fetching repo public key for {REPO}...")
    key_data = api(token, f"/repos/{REPO}/actions/secrets/public-key")
    key_id = key_data["key_id"]
    pub_key = key_data["key"]

    print("Setting secrets...")
    for name, value in SECRETS.items():
        set_secret(token, name, value, key_id, pub_key)

    print("\nAll secrets set! The next push to main will trigger a deploy. Done.")

import os
import requests
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("NO API KEY!")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
r = requests.get(url)
data = r.json()

if 'error' in data:
    print("API ERROR:", data['error'])
else:
    models = [m['name'] for m in data.get('models', []) if 'generateContent' in m.get('supportedGenerationMethods', [])]
    print("\n\nSUPPORTED MODELS:\n" + "\n".join(models))

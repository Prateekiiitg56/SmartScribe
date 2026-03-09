import os
import json
import re
import random
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def get_ai_evaluation(title, content):
    if not OPENROUTER_API_KEY:
        # Mock evaluation for dev
        g = round(random.uniform(70, 95), 1)
        c = round(random.uniform(70, 95), 1)
        a = round(random.uniform(70, 95), 1)
        o = round((g + c + a) / 3, 1)
        return {
            "grammar": g,
            "coherence": c,
            "argumentation": a,
            "overall": o,
            "feedback": "Deep analysis requires an OpenRouter API key. This is a simulation showing structural potential."
        }

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        
        prompt = f"""You are an expert essay grader. Evaluate the following essay.
Title: {title}
Content: {content}

Provide three scores (0-100) for:
1. Grammar
2. Coherence
3. Argumentation

Provide detailed feedback. Output EXACTLY as valid JSON.
{{
  "grammar": 85,
  "coherence": 78,
  "argumentation": 92,
  "feedback": "..."
}}
"""
        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=[{"role": "user", "content": prompt}],
        )
            
        text = response.choices[0].message.content
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            res = json.loads(match.group(0))
            g = float(res.get("grammar", 80))
            c = float(res.get("coherence", 80))
            a = float(res.get("argumentation", 80))
            fb = res.get("feedback", "Excellent draft.")
            o = round((g + c + a) / 3, 1)
            return {"grammar": g, "coherence": c, "argumentation": a, "overall": o, "feedback": fb}
        
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "grammar": 70, "coherence": 70, "argumentation": 70, "overall": 70,
            "feedback": f"Analysis engine encountered an error. Showing baseline trajectory."
        }

def get_ai_chat(question, context):
    if not OPENROUTER_API_KEY:
        return f"AI simulation: I received your question about the content. (OpenRouter key missing)"

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        
        prompt = f"""You are a helpful writing assistant. Answer the user's question about their essay.
Current Essay Content: {context}

User Question: {question}
"""
        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"AI error: {str(e)}"

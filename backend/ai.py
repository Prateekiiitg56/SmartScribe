from transformers import pipeline
# Load sentiment pipeline once (global)
_sentiment_pipe = None
def _load_sentiment_pipe():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        _sentiment_pipe = pipeline("sentiment-analysis")

def transformer_sentiment_score(text):
    _load_sentiment_pipe()
    try:
        result = _sentiment_pipe(text[:512])[0]
        # Map 'POSITIVE' to 100, 'NEGATIVE' to 0, weighted by score
        if result['label'] == 'POSITIVE':
            return min(100, int(result['score'] * 100))
        else:
            return max(0, 100 - int(result['score'] * 100))
    except Exception:
        return 50

# Coherence: use sentence embedding variance as proxy
def transformer_coherence_score(text):
    _load_hf_model()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sentences) < 2:
        return 40
    embs = []
    for s in sentences:
        inputs = _hf_tokenizer(s, return_tensors="pt", truncation=True, max_length=64)
        with torch.no_grad():
            outputs = _hf_model(**inputs)
            embs.append(outputs.last_hidden_state[:, 0, :].squeeze().numpy())
    # Coherence: lower variance between sentence embeddings = higher coherence
    import numpy as np
    emb_matrix = np.stack(embs)
    variance = np.mean(np.std(emb_matrix, axis=0))
    score = max(0, 100 - variance * 10)
    return min(score, 100)
from transformers import AutoTokenizer, AutoModel
import torch

# Load model and tokenizer once (global)
_HF_MODEL_NAME = "distilbert-base-uncased"
_hf_tokenizer = None
_hf_model = None

def _load_hf_model():
    global _hf_tokenizer, _hf_model
    if _hf_tokenizer is None or _hf_model is None:
        _hf_tokenizer = AutoTokenizer.from_pretrained(_HF_MODEL_NAME)
        _hf_model = AutoModel.from_pretrained(_HF_MODEL_NAME)

def transformer_semantic_score(text):
    _load_hf_model()
    inputs = _hf_tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        outputs = _hf_model(**inputs)
        # Use [CLS] token embedding (first token)
        cls_emb = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
    # Simple scoring: length, mean, std of embedding
    score = float(abs(cls_emb).mean()) + float(abs(cls_emb).std())
    # Normalize to 0-100
    return min(max(score * 10, 0), 100)
import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, value))


def _heuristic_evaluation(title, content):
    text = (content or "").strip()
    title_text = (title or "").strip()

    if not text:
        return {
            "grammar": 35.0,
            "coherence": 30.0,
            "argumentation": 25.0,
            "overall": 30.0,
            "feedback": "Your submission is empty. Add structured paragraphs, clear claims, and supporting evidence to receive a meaningful score."
        }

    words = re.findall(r"\b[\w']+\b", text)
    word_count = len(words)

    sentence_parts = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentence_parts if s.strip()]
    sentence_count = max(len(sentences), 1)

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    paragraph_count = max(len(paragraphs), 1)

    avg_sentence_length = word_count / sentence_count

    # --- Grammar Heuristic ---
    grammar = 72.0

    grammar += min(max((word_count - 80) / 12, 0), 8)

    if 10 <= avg_sentence_length <= 24:
        grammar += 6
    elif avg_sentence_length < 6 or avg_sentence_length > 35:
        grammar -= 8

    punctuation_issues = len(re.findall(r"[!?.,;:]{2,}", text))
    grammar -= min(punctuation_issues * 2.5, 14)

    lowercase_sentence_starts = sum(1 for s in sentences if s and s[0].islower())
    grammar -= min(lowercase_sentence_starts * 1.8, 10)

    # --- Coherence Heuristic ---
    coherence = 68.0

    transition_words = {
        "however", "therefore", "moreover", "furthermore", "consequently", "thus",
        "in addition", "for example", "for instance", "on the other hand", "because",
        "although", "while", "in conclusion", "overall", "first", "second", "finally"
    }
    lower_text = text.lower()
    transition_hits = sum(1 for t in transition_words if t in lower_text)

    coherence += min(transition_hits * 2.2, 14)
    coherence += min(max(paragraph_count - 1, 0) * 2.0, 8)

    if sentence_count >= 4:
        coherence += 4
    if sentence_count <= 2:
        coherence -= 10

    # --- Argumentation Heuristic ---
    argumentation = 64.0

    claim_markers = {
        "should", "must", "need to", "i believe", "i argue", "this shows", "this proves"
    }
    evidence_markers = {
        "because", "for example", "for instance", "according to", "data", "evidence",
        "research", "study", "statistics"
    }
    rebuttal_markers = {
        "however", "although", "on the other hand", "yet", "despite"
    }

    claim_hits = sum(1 for m in claim_markers if m in lower_text)
    evidence_hits = sum(1 for m in evidence_markers if m in lower_text)
    rebuttal_hits = sum(1 for m in rebuttal_markers if m in lower_text)

    argumentation += min(claim_hits * 2.5, 10)
    argumentation += min(evidence_hits * 2.2, 12)
    argumentation += min(rebuttal_hits * 2.0, 6)

    if word_count < 80:
        argumentation -= 10
    elif word_count > 180:
        argumentation += 5

    # Title bonus for relevance/presence
    if title_text and len(title_text.split()) >= 2:
        coherence += 2
        argumentation += 2

    grammar = round(_clamp(grammar), 1)
    coherence = round(_clamp(coherence), 1)
    argumentation = round(_clamp(argumentation), 1)
    overall = round(_clamp(grammar * 0.34 + coherence * 0.33 + argumentation * 0.33), 1)

    strengths = []
    improvements = []

    if grammar >= 80:
        strengths.append("sentence mechanics are mostly clean")
    else:
        improvements.append("clean up punctuation and sentence openings")

    if coherence >= 78:
        strengths.append("ideas flow logically across the essay")
    else:
        improvements.append("add transitions and clearer paragraph progression")

    if argumentation >= 78:
        strengths.append("claims are supported with reasoning/evidence")
    else:
        improvements.append("strengthen claims with concrete evidence and examples")

    strengths_text = ", ".join(strengths) if strengths else "you present a solid starting draft"
    improvements_text = ", ".join(improvements) if improvements else "keep refining clarity and precision"

    feedback = (
        f"Heuristic analysis: {word_count} words, {sentence_count} sentences, {paragraph_count} paragraphs. "
        f"Strengths: {strengths_text}. "
        f"Next steps: {improvements_text}."
    )

    return {
        "grammar": grammar,
        "coherence": coherence,
        "argumentation": argumentation,
        "overall": overall,
        "feedback": feedback
    }

def get_ai_evaluation(title, content):
    heuristic = _heuristic_evaluation(title, content)
    # Add transformer score
    try:
        tf_score = transformer_semantic_score(content or "")
        sentiment_score = transformer_sentiment_score(content or "")
        coherence_score = transformer_coherence_score(content or "")
    except Exception as e:
        tf_score = 50.0
        sentiment_score = 50.0
        coherence_score = 50.0
    # Blend transformer score into overall
    heuristic["overall"] = round((heuristic["overall"] * 0.5 + tf_score * 0.2 + sentiment_score * 0.15 + coherence_score * 0.15), 1)
    heuristic["sentiment"] = sentiment_score
    heuristic["coherence_transformer"] = coherence_score

    if not OPENROUTER_API_KEY:
        return heuristic

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
            g_ai = float(res.get("grammar", 80))
            c_ai = float(res.get("coherence", 80))
            a_ai = float(res.get("argumentation", 80))

            g = round(_clamp(g_ai * 0.7 + heuristic["grammar"] * 0.3), 1)
            c = round(_clamp(c_ai * 0.7 + heuristic["coherence"] * 0.3), 1)
            a = round(_clamp(a_ai * 0.7 + heuristic["argumentation"] * 0.3), 1)
            fb = res.get("feedback", "Excellent draft.")
            o = round((g + c + a) / 3, 1)
            return {"grammar": g, "coherence": c, "argumentation": a, "overall": o, "feedback": fb}

        return heuristic
        
    except Exception as e:
        print(f"AI Error: {e}")
        return heuristic

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

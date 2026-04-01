import os
import json
import re
import numpy as np
import torch
from transformers import pipeline, AutoTokenizer, AutoModel
from openai import OpenAI
from dotenv import load_dotenv

# Stronger embedding model for semantic similarity and coherence
_HF_MODEL_NAME = os.getenv("HF_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
_SENTIMENT_MODEL_NAME = os.getenv("HF_SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest")
_MAX_SENTENCES_FOR_EMBED = int(os.getenv("HF_MAX_SENTENCES", "32"))

_hf_tokenizer = None
_hf_model = None
_sentiment_pipe = None


def _load_hf_model():
    global _hf_tokenizer, _hf_model
    if _hf_tokenizer is None or _hf_model is None:
        _hf_tokenizer = AutoTokenizer.from_pretrained(_HF_MODEL_NAME)
        _hf_model = AutoModel.from_pretrained(_HF_MODEL_NAME)
        _hf_model.eval()


def _load_sentiment_pipe():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        _sentiment_pipe = pipeline("sentiment-analysis", model=_SENTIMENT_MODEL_NAME)


def _split_sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if s.strip()]


def _mean_pool(last_hidden_state, attention_mask):
    token_embeddings = last_hidden_state
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, dim=1)
    sum_mask = torch.clamp(input_mask_expanded.sum(dim=1), min=1e-9)
    return sum_embeddings / sum_mask


def _embed_texts(texts, max_length=224):
    if not texts:
        return np.empty((0, 1), dtype=np.float32)
    _load_hf_model()
    encoded = _hf_tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )
    with torch.no_grad():
        outputs = _hf_model(**encoded)
    pooled = _mean_pool(outputs.last_hidden_state, encoded["attention_mask"])
    vectors = pooled.detach().cpu().numpy()
    norms = np.linalg.norm(vectors, axis=1, keepdims=True) + 1e-9
    return vectors / norms


def _cosine_similarity(a, b):
    return float(np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9))


def transformer_sentiment_score(text):
    _load_sentiment_pipe()
    try:
        sentences = _split_sentences(text)
        if not sentences:
            return 50.0

        chunks = []
        current = []
        current_len = 0
        for sentence in sentences[:18]:
            if current_len + len(sentence) > 400 and current:
                chunks.append(" ".join(current))
                current = [sentence]
                current_len = len(sentence)
            else:
                current.append(sentence)
                current_len += len(sentence)
        if current:
            chunks.append(" ".join(current))

        preds = _sentiment_pipe(chunks)
        sentiment_values = []
        confidences = []
        for pred in preds:
            label = str(pred.get("label", "")).lower()
            confidence = float(pred.get("score", 0.5))
            if "positive" in label or "pos" in label:
                sentiment_values.append(1.0)
            elif "negative" in label or "neg" in label:
                sentiment_values.append(0.0)
            else:
                sentiment_values.append(0.5)
            confidences.append(confidence)

        avg_sentiment = float(np.mean(sentiment_values))
        avg_confidence = float(np.mean(confidences))
        sentiment_variance = float(np.std(sentiment_values))

        balance_component = max(0.0, 1.0 - abs(avg_sentiment - 0.5) * 1.8)
        consistency_bonus = max(0.0, 1.0 - sentiment_variance * 1.5) * 8.0
        score = 58.0 + 28.0 * balance_component + 18.0 * avg_confidence + consistency_bonus
        return round(max(0.0, min(100.0, score)), 1)
    except Exception:
        return 50.0


def transformer_coherence_score(text):
    sentences = _split_sentences(text)
    if len(sentences) < 3:
        return 42.0

    sampled = sentences[:_MAX_SENTENCES_FOR_EMBED]
    embeddings = _embed_texts(sampled, max_length=192)
    if len(embeddings) < 3:
        return 45.0

    adjacent_sims = [_cosine_similarity(embeddings[i], embeddings[i + 1]) for i in range(len(embeddings) - 1)]
    avg_adj = float(np.mean(adjacent_sims))
    std_adj = float(np.std(adjacent_sims))
    
    # Count very low similarities (abrupt topic changes)
    abrupt_jumps = sum(1 for s in adjacent_sims if s < 0.12)
    # Count strong transitions (very high similarity might indicate redundancy)
    redundant_transitions = sum(1 for s in adjacent_sims if s > 0.92)
    
    # Improved base score calculation with better scaling
    base = 45.0 + 65.0 * max(0.0, min(1.0, (avg_adj - 0.15) / 0.7))
    
    # Penalties for instability and issues
    stability_penalty = min(std_adj * 30.0, 18.0)
    jump_penalty = min(abrupt_jumps * 5.5, 20.0)
    redundancy_penalty = min(redundant_transitions * 3.0, 12.0)

    score = base - stability_penalty - jump_penalty - redundancy_penalty
    return round(max(0.0, min(100.0, score)), 1)


def transformer_semantic_score(text):
    sentences = _split_sentences(text)
    if len(sentences) < 2:
        return 45.0

    sampled = sentences[:_MAX_SENTENCES_FOR_EMBED]
    embeddings = _embed_texts(sampled, max_length=224)
    if len(embeddings) < 2:
        return 48.0

    centroid = embeddings.mean(axis=0)
    centroid = centroid / (np.linalg.norm(centroid) + 1e-9)

    focus_scores = [_cosine_similarity(vec, centroid) for vec in embeddings]
    focus_mean = float(np.mean(focus_scores))
    focus_std = float(np.std(focus_scores))

    # Pairwise similarities for diversity assessment
    pairwise_sims = []
    for i in range(len(embeddings) - 2):
        pairwise_sims.append(_cosine_similarity(embeddings[i], embeddings[i + 2]))
    
    # Calculate topic diversity (not too similar, not too different)
    diversity = 1.0 - (float(np.mean(pairwise_sims)) if pairwise_sims else focus_mean)
    
    # Improved focus component with better thresholds
    focus_component = 50.0 + 60.0 * max(0.0, min(1.0, (focus_mean - 0.18) / 0.72))
    
    # Diversity should be moderate (around 0.3-0.4 is ideal)
    diversity_component = 100.0 - min(abs(diversity - 0.32) * 150.0, 42.0)
    
    # Consistency bonus: lower standard deviation in focus scores means better topic consistency
    consistency_bonus = max(0.0, (0.25 - focus_std) * 20.0)

    score = 0.68 * focus_component + 0.28 * diversity_component + 0.04 * consistency_bonus
    return round(max(0.0, min(100.0, score)), 1)

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

def _academic_heuristics(text):
    """Heuristic Academic-mode extras: plagiarism risk, citation score, originality."""
    words = text.lower().split()
    word_count = max(len(words), 1)

    # --- Plagiarism Risk (0-100, lower is better) ---
    # Proxy: repeated consecutive bigrams suggest copied/boilerplate text
    bigrams = {}
    for i in range(len(words) - 1):
        bg = words[i] + ' ' + words[i + 1]
        bigrams[bg] = bigrams.get(bg, 0) + 1
    repeated = sum(1 for v in bigrams.values() if v > 1)
    plagiarism_score = round(_clamp(repeated / max(len(bigrams), 1) * 120, 0, 100), 1)

    # --- Citation Score (0-100) ---
    citation_matches = re.findall(r'\([A-Z][a-zA-Z]+,?\s*\d{4}\)', text)
    citation_score = round(_clamp(len(citation_matches) * 18, 0, 100), 1)

    # --- Originality Index (0-100) ---
    unique_ratio = len(set(words)) / word_count
    originality_score = round(_clamp(unique_ratio * 140, 0, 100), 1)

    return {
        "plagiarism_score":  plagiarism_score,
        "citation_score":    citation_score,
        "originality_score": originality_score,
    }

def get_ai_evaluation(title, content, mode="Standard"):
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
    # Blend transformer scores into overall with improved weighting
    heuristic["overall"] = round((heuristic["overall"] * 0.48 + tf_score * 0.26 + coherence_score * 0.21 + sentiment_score * 0.05), 1)
    heuristic["sentiment"] = sentiment_score
    heuristic["coherence_transformer"] = coherence_score

    if not OPENROUTER_API_KEY:
        if mode == "Academic":
            heuristic.update(_academic_heuristics(content or ""))
        return heuristic

    # Academic server-side heuristics (always computed for Academic mode)
    academic_extras = {}
    if mode == "Academic":
        academic_extras = _academic_heuristics(content or "")
        heuristic.update(academic_extras)

    # Define mode-specific instructions
    mode_instructions = {
        "Standard": "Evaluate with a balanced mix of grammar, coherence, and argumentation.",
        "Professional": "Evaluate with a strict focus on formal tone, professional vocabulary, and structural integrity. Be rigorous with grammar.",
        "Creative": "Focus on narrative flow, richness of language, and creativity. Be more lenient with traditional structure if the flow is compelling.",
        "Academic": (
            "Evaluate based on logical consistency, depth of reasoning, and evidentiary support. "
            "Focus on how well the arguments are constructed, whether claims are supported by evidence, "
            "and the presence of proper academic citations like (Author, Year). "
            "Also assess originality and flag any suspiciously generic or repeated passages."
        )
    }

    instruction = mode_instructions.get(mode, mode_instructions["Standard"])

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        
        academic_json_extra = ""
        if mode == "Academic":
            academic_json_extra = """
  "plagiarism_risk": 8,
  "citation_quality": 65,
  "originality": 82,"""

        prompt = f"""You are an expert essay grader evaluating under the '{mode}' mode.
{instruction}

Title: {title}
Content: {content}

Provide three core scores (0-100) for:
1. Grammar
2. Coherence
3. Argumentation
{'Also estimate (0-100) plagiarism_risk (higher = more plagiarised), citation_quality, and originality.' if mode == 'Academic' else ''}

Provide detailed feedback specifically targeting the {mode} criteria.
Output EXACTLY as valid JSON:
{{
  "grammar": 85,
  "coherence": 78,
  "argumentation": 92,{academic_json_extra}
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

            g = round(_clamp(g_ai * 0.70 + heuristic["grammar"] * 0.30), 1)
            c = round(_clamp(c_ai * 0.70 + heuristic["coherence"] * 0.30), 1)
            a = round(_clamp(a_ai * 0.70 + heuristic["argumentation"] * 0.30), 1)
            
            # Weighted overall based on mode
            if mode == "Creative":
                o = round(g * 0.2 + c * 0.4 + a * 0.4, 1)
            elif mode == "Professional":
                o = round(g * 0.4 + c * 0.4 + a * 0.2, 1)
            elif mode == "Academic":
                o = round(g * 0.2 + c * 0.3 + a * 0.5, 1)
            else:
                o = round((g + c + a) / 3, 1)

            fb = res.get("feedback", "Excellent draft.")
            final = {"grammar": g, "coherence": c, "argumentation": a, "overall": o, "feedback": fb}

            # Merge Academic extras from LLM (fallback to heuristic)
            if mode == "Academic":
                final["plagiarism_score"]  = round(_clamp(float(res.get("plagiarism_risk",  academic_extras.get("plagiarism_score", 10))), 0, 100), 1)
                final["citation_score"]    = round(_clamp(float(res.get("citation_quality", academic_extras.get("citation_score", 30))), 0, 100), 1)
                final["originality_score"] = round(_clamp(float(res.get("originality",      academic_extras.get("originality_score", 70))), 0, 100), 1)

            return final

        return heuristic
        
    except Exception as e:
        print(f"AI Error: {e}")
        return heuristic

def get_ai_chat(question, context, mode="Standard"):
    # Mode-specific AI chat personas
    chat_personas = {
        "Standard": (
            "You are a balanced writing coach. Help the user improve their essay with clear, "
            "practical advice covering grammar, structure, and argument quality."
        ),
        "Creative": (
            "You are a creative writing mentor with a passion for narrative and expression. "
            "When reviewing the user's essay, focus on the richness of language, the flow of ideas, "
            "the emotional resonance, and opportunities to be more vivid or original. "
            "Be encouraging and inspiring."
        ),
        "Professional": (
            "You are a strict professional writing editor. Focus on formal tone, precision of language, "
            "correct business/academic vocabulary, structural integrity, and the elimination of informal "
            "or colloquial expressions. Be direct and concise in your feedback."
        ),
        "Academic": (
            "You are a senior academic reviewer. When answering the user's question, focus on the strength "
            "of their argument, the quality of evidence and citations, logical consistency, and scholarly "
            "depth. Point out unsupported claims, suggest where citations could be added (e.g., Author, Year), "
            "and highlight any logical fallacies or weaknesses in reasoning."
        ),
    }

    persona = chat_personas.get(mode, chat_personas["Standard"])

    if not OPENROUTER_API_KEY:
        return (
            f"[{mode} mode] AI simulation: Your question has been received. "
            f"(OpenRouter key missing — add OPENROUTER_API_KEY to .env to enable real AI responses.)"
        )

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )

        system_prompt = f"{persona}\n\nThe user's current essay:\n\"\"\"\n{context}\n\"\"\""

        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"AI error: {str(e)}"

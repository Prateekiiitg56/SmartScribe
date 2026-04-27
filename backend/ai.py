import os
import json
import re
import numpy as np
import torch
from transformers import pipeline, AutoTokenizer, AutoModel, AutoModelForSequenceClassification
from openai import OpenAI
from dotenv import load_dotenv

# ──────────────────── Model Configuration ────────────────────
# Grammar: CoLA (Corpus of Linguistic Acceptability) — purpose-built for grammaticality
_COLA_MODEL = os.getenv("HF_COLA_MODEL", "textattack/roberta-base-CoLA")
# Coherence: Stronger embedding model for semantic similarity
_EMBED_MODEL = os.getenv("HF_EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
# Argument: NLI (Natural Language Inference) — measures logical entailment
_NLI_MODEL = os.getenv("HF_NLI_MODEL", "cross-encoder/nli-deberta-v3-base")
_MAX_SENTENCES = int(os.getenv("HF_MAX_SENTENCES", "32"))

# ──────────────────── Lazy-loaded Model Singletons ────────────────────
_cola_pipe = None
_embed_tokenizer = None
_embed_model = None
_nli_pipe = None


def _load_cola():
    global _cola_pipe
    if _cola_pipe is None:
        print("[SmartScribe] Loading CoLA grammar model…")
        _cola_pipe = pipeline("text-classification", model=_COLA_MODEL, device=-1)


def _load_embed():
    global _embed_tokenizer, _embed_model
    if _embed_tokenizer is None:
        print("[SmartScribe] Loading embedding model…")
        _embed_tokenizer = AutoTokenizer.from_pretrained(_EMBED_MODEL)
        _embed_model = AutoModel.from_pretrained(_EMBED_MODEL)
        _embed_model.eval()


def _load_nli():
    global _nli_pipe
    if _nli_pipe is None:
        print("[SmartScribe] Loading NLI argument model…")
        _nli_pipe = pipeline("text-classification", model=_NLI_MODEL, device=-1)


# ──────────────────── Text Utilities ────────────────────
def _split_sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if s.strip()]


def _mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    return torch.sum(last_hidden_state * mask, dim=1) / torch.clamp(mask.sum(dim=1), min=1e-9)


def _embed_texts(texts, max_length=256):
    if not texts:
        return np.empty((0, 1), dtype=np.float32)
    _load_embed()
    encoded = _embed_tokenizer(texts, padding=True, truncation=True, max_length=max_length, return_tensors="pt")
    with torch.no_grad():
        outputs = _embed_model(**encoded)
    pooled = _mean_pool(outputs.last_hidden_state, encoded["attention_mask"])
    vectors = pooled.detach().cpu().numpy()
    norms = np.linalg.norm(vectors, axis=1, keepdims=True) + 1e-9
    return vectors / norms


def _cosine_similarity(a, b):
    return float(np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9))


# ──────────────────── Grammar Scoring (CoLA) ────────────────────
def transformer_grammar_score(text):
    """Score grammar using CoLA acceptability classifier (0-100)."""
    _load_cola()
    sentences = _split_sentences(text)
    if not sentences:
        return 40.0

    # Process in chunks to avoid token limit
    batch_size = 16
    acceptable_count = 0
    total_confidence = 0.0

    for i in range(0, min(len(sentences), 48), batch_size):
        batch = sentences[i:i + batch_size]
        try:
            preds = _cola_pipe(batch, truncation=True, max_length=128)
            for pred in preds:
                label = str(pred.get("label", "")).lower()
                conf = float(pred.get("score", 0.5))
                if "acceptable" in label or label == "label_1" or label == "1":
                    acceptable_count += 1
                    total_confidence += conf
                else:
                    total_confidence += (1.0 - conf)  # partially credit low-confidence rejections
        except Exception:
            pass

    if not sentences:
        return 50.0

    n = min(len(sentences), 48)
    accept_ratio = acceptable_count / n
    avg_conf = total_confidence / n
    
    # Scale: 100% acceptable with high confidence = 95+, 0% = ~30
    base = 30.0 + 65.0 * accept_ratio
    conf_bonus = (avg_conf - 0.5) * 12.0  # up to ±6
    
    # Penalize very short texts
    if n < 3:
        base -= 8.0

    return round(max(0.0, min(100.0, base + conf_bonus)), 1)


# ──────────────────── Coherence Scoring (Embeddings) ────────────────────
def transformer_coherence_score(text):
    """Score coherence via sentence embedding similarity flow (0-100)."""
    sentences = _split_sentences(text)
    if len(sentences) < 3:
        return 38.0

    sampled = sentences[:_MAX_SENTENCES]
    embeddings = _embed_texts(sampled, max_length=256)
    if len(embeddings) < 3:
        return 40.0

    # Adjacent sentence similarities (flow)
    adj_sims = [_cosine_similarity(embeddings[i], embeddings[i + 1]) for i in range(len(embeddings) - 1)]
    avg_adj = float(np.mean(adj_sims))
    std_adj = float(np.std(adj_sims))

    # Global coherence: how well each sentence relates to the document centroid
    centroid = embeddings.mean(axis=0)
    centroid = centroid / (np.linalg.norm(centroid) + 1e-9)
    global_sims = [_cosine_similarity(vec, centroid) for vec in embeddings]
    avg_global = float(np.mean(global_sims))

    # Detect problems
    abrupt_jumps = sum(1 for s in adj_sims if s < 0.15)
    redundant = sum(1 for s in adj_sims if s > 0.95)

    # Combined score
    flow_score = 40.0 + 70.0 * max(0.0, min(1.0, (avg_adj - 0.1) / 0.7))
    global_score = 35.0 + 70.0 * max(0.0, min(1.0, (avg_global - 0.2) / 0.6))

    base = 0.55 * flow_score + 0.45 * global_score
    base -= min(std_adj * 25.0, 15.0)      # instability penalty
    base -= min(abrupt_jumps * 6.0, 20.0)   # jump penalty
    base -= min(redundant * 4.0, 12.0)      # redundancy penalty

    return round(max(0.0, min(100.0, base)), 1)


# ──────────────────── Argument Scoring (NLI) ────────────────────
def transformer_argument_score(text):
    """Score argument strength using NLI: do claims follow from evidence? (0-100)"""
    _load_nli()
    sentences = _split_sentences(text)
    if len(sentences) < 2:
        return 35.0

    # Build premise-hypothesis pairs from consecutive sentences
    pairs = []
    for i in range(min(len(sentences) - 1, 20)):
        pairs.append(f"{sentences[i]}</s></s>{sentences[i + 1]}")

    entail_count = 0
    contradict_count = 0
    total_entail_conf = 0.0
    
    batch_size = 8
    for i in range(0, len(pairs), batch_size):
        batch = pairs[i:i + batch_size]
        try:
            preds = _nli_pipe(batch, truncation=True, max_length=256)
            for pred in preds:
                label = str(pred.get("label", "")).lower()
                conf = float(pred.get("score", 0.5))
                if "entail" in label:
                    entail_count += 1
                    total_entail_conf += conf
                elif "contradict" in label:
                    contradict_count += 1
        except Exception:
            pass

    n = len(pairs)
    if n == 0:
        return 40.0

    entail_ratio = entail_count / n
    contradict_ratio = contradict_count / n
    avg_entail_conf = total_entail_conf / max(entail_count, 1)

    # Scale: high entailment = strong logical flow
    base = 35.0 + 55.0 * entail_ratio
    conf_bonus = (avg_entail_conf - 0.5) * 10.0
    contradict_penalty = contradict_ratio * 25.0

    # Bonus for longer, developed arguments
    if len(sentences) >= 8:
        base += 5.0
    if len(sentences) >= 15:
        base += 3.0

    return round(max(0.0, min(100.0, base + conf_bonus - contradict_penalty)), 1)


# ──────────────────── Formality Detection ────────────────────
_INFORMAL_PATTERNS = [
    r"\bcan't\b", r"\bwon't\b", r"\bdon't\b", r"\bdoesn't\b", r"\bisn't\b",
    r"\baren't\b", r"\bwasn't\b", r"\bweren't\b", r"\bdidn't\b", r"\bcouldn't\b",
    r"\bshouldn't\b", r"\bwouldn't\b", r"\bi'm\b", r"\byou're\b", r"\bthey're\b",
    r"\bwe're\b", r"\bit's\b", r"\bthat's\b", r"\bwhat's\b", r"\bthere's\b",
    r"\bkinda\b", r"\bgonna\b", r"\bwanna\b", r"\bgotta\b", r"\bsorta\b",
    r"\blol\b", r"\bomg\b", r"\bbtw\b", r"\bidk\b", r"\bimo\b", r"\bimho\b",
    r"\byeah\b", r"\bnope\b", r"\bcool\b", r"\bstuff\b", r"\bthing\b",
    r"\blike\b(?:\s*,)", r"\byou know\b", r"\bi mean\b", r"\bbasically\b",
]

def _formality_score(text):
    """Return formality score 0-100 (100 = very formal)."""
    lower = text.lower()
    word_count = max(len(lower.split()), 1)
    
    informal_hits = 0
    for pat in _INFORMAL_PATTERNS:
        informal_hits += len(re.findall(pat, lower))
    
    informal_density = informal_hits / word_count
    # 0 density = 95 formality, high density = low formality
    score = 95.0 - min(informal_density * 800.0, 70.0)
    return round(max(0.0, min(100.0, score)), 1)


# ──────────────────── Unified Evaluation ────────────────────
def get_transformer_scores(text, min_words=0, style="any"):
    """
    Unified HuggingFace evaluation returning grammar, coherence, argument scores.
    
    Args:
        text: Essay content
        min_words: Minimum word count required (0 = no requirement)
        style: "formal" | "informal" | "any"
    """
    words = re.findall(r"\b[\w']+\b", text or "")
    word_count = len(words)

    # Run all three specialized models
    try:
        grammar = transformer_grammar_score(text)
    except Exception:
        grammar = 55.0
    try:
        coherence = transformer_coherence_score(text)
    except Exception:
        coherence = 55.0
    try:
        argument = transformer_argument_score(text)
    except Exception:
        argument = 55.0

    overall = round((grammar * 0.30 + coherence * 0.35 + argument * 0.35), 1)

    # --- Word count adjustment ---
    word_feedback = ""
    if min_words > 0 and word_count < min_words:
        shortage = (min_words - word_count) / min_words
        penalty = min(shortage * 25.0, 20.0)
        overall = max(0, overall - penalty)
        grammar = max(0, grammar - penalty * 0.3)
        word_feedback = f"⚠️ Below minimum word count ({word_count}/{min_words} words). "
    elif min_words > 0:
        word_feedback = f"✓ Word count met ({word_count}/{min_words} words). "

    # --- Formality adjustment ---
    style_feedback = ""
    if style in ("formal", "informal"):
        formality = _formality_score(text)
        if style == "formal" and formality < 60:
            penalty = (60 - formality) * 0.25
            grammar = max(0, grammar - penalty)
            overall = max(0, overall - penalty * 0.5)
            style_feedback = f"⚠️ Writing style is too informal (formality: {formality}/100). Avoid contractions and slang. "
        elif style == "formal" and formality >= 80:
            style_feedback = f"✓ Formal writing style detected (formality: {formality}/100). "
        elif style == "informal" and formality > 85:
            style_feedback = f"ℹ️ Writing is very formal (formality: {formality}/100). Consider a more relaxed tone. "
        elif style == "informal":
            style_feedback = f"✓ Informal style acceptable (formality: {formality}/100). "

    feedback = (
        f"HuggingFace Evaluation (CoLA + BGE + NLI):\n"
        f"{word_feedback}{style_feedback}\n"
        f"- Grammar (CoLA): {round(grammar, 1)}/100\n"
        f"- Coherence (Embedding Flow): {round(coherence, 1)}/100\n"
        f"- Argumentation (NLI): {round(argument, 1)}/100\n"
        f"- Overall: {round(overall, 1)}/100"
    )

    return {
        "grammar": round(grammar, 1),
        "coherence": round(coherence, 1),
        "argument": round(argument, 1),
        "overall": round(overall, 1),
        "feedback": feedback,
        "word_count": word_count,
    }

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
        strengths.append("Strong sentence mechanics — punctuation and capitalization are mostly clean.")
    else:
        improvements.append("Clean up punctuation issues and ensure every sentence starts with a capital letter.")

    if coherence >= 78:
        strengths.append("Good logical flow — ideas connect well across paragraphs with effective transitions.")
    else:
        improvements.append("Add transition words (e.g., however, therefore, moreover) and structure paragraphs more clearly.")

    if argumentation >= 78:
        strengths.append("Claims are well-supported with reasoning and evidence.")
    else:
        improvements.append("Strengthen your claims with concrete evidence, examples, or data to make arguments more persuasive.")

    if word_count > 200:
        strengths.append("Thorough exploration of the topic with adequate depth.")
    elif word_count < 80:
        improvements.append("Expand your essay — at least 80-100 words are needed for a meaningful evaluation.")

    if transition_hits >= 4:
        strengths.append("Effective use of transition words creates a smooth reading experience.")

    # Ensure at least one item in each
    if not strengths:
        strengths.append("You present a solid starting draft with potential for improvement.")
    if not improvements:
        improvements.append("Keep refining clarity and precision in your writing.")

    tips = [
        "Try reading your essay aloud — awkward phrases become obvious when spoken.",
        "Strong essays follow the 'claim → evidence → analysis' pattern in every paragraph.",
        "Vary your sentence length: mix short punchy sentences with longer descriptive ones.",
        "A compelling conclusion doesn't just summarise — it leaves the reader with a new insight.",
    ]
    tip = tips[word_count % len(tips)]

    feedback_summary = f"Analysis of {word_count} words across {sentence_count} sentences and {paragraph_count} paragraphs."
    feedback_flat = (
        f"{feedback_summary} "
        f"Strengths: {'; '.join(strengths)}. "
        f"Improvements: {'; '.join(improvements)}. "
        f"Tip: {tip}"
    )

    return {
        "grammar": grammar,
        "coherence": coherence,
        "argumentation": argumentation,
        "overall": overall,
        "feedback": feedback_flat,
        "feedback_summary": feedback_summary,
        "strengths": strengths,
        "improvements": improvements,
        "tip": tip,
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

def get_ai_evaluation(title, content, mode="Standard", min_words=0, style="any"):
    heuristic = _heuristic_evaluation(title, content)
    # Blend in upgraded transformer scores
    try:
        transformer_result = get_transformer_scores(content or "", min_words=min_words, style=style)
        tf_grammar = transformer_result["grammar"]
        tf_coherence = transformer_result["coherence"]
        tf_argument = transformer_result["argument"]
        
        # Override heuristic feedback with the transformer word logic and style logic if requested
        if min_words > 0 or style != "any":
            heuristic["feedback_summary"] = transformer_result["feedback"] + "\n\n" + heuristic["feedback_summary"]
            
    except Exception:
        tf_grammar = 55.0
        tf_coherence = 55.0
        tf_argument = 55.0
    # Blend: 55% heuristic + 45% transformer
    heuristic["grammar"] = round(heuristic["grammar"] * 0.55 + tf_grammar * 0.45, 1)
    heuristic["coherence"] = round(heuristic["coherence"] * 0.55 + tf_coherence * 0.45, 1)
    heuristic["argumentation"] = round(heuristic["argumentation"] * 0.55 + tf_argument * 0.45, 1)
    heuristic["overall"] = round((heuristic["grammar"] * 0.30 + heuristic["coherence"] * 0.35 + heuristic["argumentation"] * 0.35), 1)

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

Provide detailed, structured feedback specifically targeting the {mode} criteria.
Include:
- "feedback_summary": 1-2 sentence overall verdict
- "strengths": array of 2-3 specific things done well (each a full sentence)
- "improvements": array of 2-3 actionable improvements (each a full sentence with concrete suggestions)
- "tip": one motivational pro-tip for the writer
- "feedback": a single paragraph combining the above

Output EXACTLY as valid JSON:
{{
  "grammar": 85,
  "coherence": 78,
  "argumentation": 92,{academic_json_extra}
  "feedback_summary": "A well-structured essay with strong arguments but room for grammatical polish.",
  "strengths": ["Clear thesis statement that anchors the entire essay.", "Effective use of evidence to support claims."],
  "improvements": ["Vary sentence structure to improve readability.", "Add a counter-argument paragraph for balance."],
  "tip": "Try reading your essay aloud to catch awkward phrasing.",
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
            fb_summary = res.get("feedback_summary", fb[:120])
            strengths = res.get("strengths", heuristic.get("strengths", ["Good starting draft."]))
            improvements_list = res.get("improvements", heuristic.get("improvements", ["Keep refining."]))
            tip = res.get("tip", heuristic.get("tip", "Read your essay aloud to catch mistakes."))

            final = {
                "grammar": g, "coherence": c, "argumentation": a, "overall": o,
                "feedback": fb,
                "feedback_summary": fb_summary,
                "strengths": strengths if isinstance(strengths, list) else [strengths],
                "improvements": improvements_list if isinstance(improvements_list, list) else [improvements_list],
                "tip": tip,
            }

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

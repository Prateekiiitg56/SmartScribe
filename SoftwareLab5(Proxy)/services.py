from repository import save_essay

def submit_essay(essay_text):
    score = evaluate_essay(essay_text)
    save_essay(essay_text, score)
    return score

def evaluate_essay(essay_text):
    word_count = len(essay_text.split())
    score = min(word_count // 10, 10)   # An example of scoring
    return score
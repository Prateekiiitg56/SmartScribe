import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add the project directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock transformers and torch before importing ai.py to avoid heavy downloads
mock_transformers = MagicMock()
mock_torch = MagicMock()
sys.modules['transformers'] = mock_transformers
sys.modules['torch'] = mock_torch
sys.modules['openai'] = MagicMock()

import ai

class TestSmartScribe(unittest.TestCase):

    def test_tc01_empty_content(self):
        print("\nExecuting TC01: Empty Content Submission")
        result = ai.get_ai_evaluation("Test", "")
        print(f"Result: {result['feedback']}")
        self.assertIn("Your submission is empty", result['feedback'])
        self.assertLess(result['overall'], 50)

    def test_tc02_short_essay(self):
        print("\nExecuting TC02: Short Essay Penalty")
        content = "This is a short essay. It has very few words."
        result = ai.get_ai_evaluation("Short", content)
        print(f"Result Feedback: {result['feedback']}")
        print(f"Argumentation Score: {result['argumentation']}")
        self.assertIn("Expand your essay", result['feedback'])

    def test_tc03_high_grammar(self):
        print("\nExecuting TC03: High Grammar Quality")
        content = "The implementation of artificial intelligence in modern education is a revolutionary step. It significantly enhances personalized learning experiences for students globally. Furthermore, teachers can focus on complex tasks while AI handles routine grading."
        result = ai.get_ai_evaluation("AI in Education", content)
        print(f"Grammar Score: {result['grammar']}")
        self.assertGreaterEqual(result['grammar'], 75)

    def test_tc04_coherence_bonus(self):
        print("\nExecuting TC04: Coherence Bonus")
        content = "Firstly, AI is good. However, it has risks. In conclusion, we need care."
        result = ai.get_ai_evaluation("Transitions", content)
        print(f"Coherence Score: {result['coherence']}")
        self.assertGreater(result['coherence'], 70)

    def test_tc05_double_punctuation_penalty(self):
        print("\nExecuting TC05: Double Punctuation Penalty")
        content = "Wait for it!! Extremely important.. Is it working??"
        result = ai.get_ai_evaluation("Punctuation", content)
        print(f"Grammar Score: {result['grammar']}")
        self.assertLess(result['grammar'], 72)

    def test_tc06_lowercase_sentence_start(self):
        print("\nExecuting TC06: Lowercase Sentence Start")
        content = "the sun is bright. it is hot. we are happy."
        result = ai.get_ai_evaluation("Lowercase", content)
        print(f"Grammar Score: {result['grammar']}")
        self.assertLess(result['grammar'], 70)

    def test_tc07_academic_mode_extras(self):
        print("\nExecuting TC07: Academic Mode Extras")
        content = "Research (Smith, 2020) shows that data suggests progress."
        result = ai.get_ai_evaluation("Study", content, mode="Academic")
        print(f"Plagiarism Score: {result.get('plagiarism_score')}")
        print(f"Citation Score: {result.get('citation_score')}")
        self.assertIn('plagiarism_score', result)
        self.assertIn('citation_score', result)

    def test_tc08_multi_paragraph_structure(self):
        print("\nExecuting TC08: Multi-Paragraph Structure")
        content = "This is the first paragraph with some content.\n\nThis is the second paragraph with more content."
        result = ai.get_ai_evaluation("Paragraphs", content)
        print(f"Coherence Score: {result['coherence']}")
        self.assertGreater(result['coherence'], 68)

if __name__ == "__main__":
    # Ensure env var is set to avoid real calls
    os.environ["OPENROUTER_API_KEY"] = ""
    unittest.main()

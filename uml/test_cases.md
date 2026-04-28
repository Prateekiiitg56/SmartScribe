# Test Cases: Evaluation Module

| Test Case ID | Test Scenario | Input Data | Expected Output | Actual Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC01** | Empty Content Submission | Title: "Test", Content: "" | "Your submission is empty..." feedback; low scores (~30). | | Pending |
| **TC02** | Short Essay Penalty | Content: "This is a short essay. It has very few words." | Argumentation score penalty; "Expand your essay" feedback. | | Pending |
| **TC03** | High Grammar Quality | Content: "The implementation of AI in education is a revolutionary step. It enhances personalized learning." | Grammar score > 80. | | Pending |
| **TC04** | Coherence Bonus | Content: "Firstly, AI is good. However, it has risks. In conclusion, we need care." | Coherence bonus due to transition words. | | Pending |
| **TC05** | Double Punctuation Penalty | Content: "Wait for it!! Extremely important.." | Grammar penalty due to punctuation issues. | | Pending |
| **TC06** | Lowercase Sentence Start | Content: "the sun is bright. it is hot." | Grammar penalty for lowercase starts. | | Pending |
| **TC07** | Academic Mode Extras | Mode: "Academic", Content: "Standard text..." | Results include plagiarism, citation, and originality scores. | | Pending |
| **TC08** | Multi-Paragraph Structure | Content: "Para 1 text...\n\nPara 2 text..." | Coherence bonus for multiple paragraphs. | | Pending |

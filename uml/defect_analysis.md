# Defect Analysis Report

The following defects were identified during the testing phase of the SmartScribe project.

## 1. Bug ID: BUG-001
**Description**: Strict depth penalty in Coherence scoring logic for short essays.
**Steps to Reproduce**:
1. Submit an essay with only 2 sentences but split into 2 paragraphs (e.g., "Para 1 content.\n\nPara 2 content.").
2. Observe the Coherence score.
**Expected vs Actual Result**:
*   **Expected**: Coherence score should be high due to correct paragraph structure (~70+).
*   **Actual**: Score is ~64.4 because a penalty of -10 is applied for having 2 or fewer sentences, overriding the paragraph bonus.
**Severity**: Medium
**Suggested Fix**: Adjust the sentence count penalty to be proportional to paragraph count or apply it only if the essay has a single paragraph.

---

## 2. Bug ID: BUG-002
**Description**: Incorrect sentence splitting for common abbreviations (e.g., Mr., Dr.).
**Steps to Reproduce**:
1. Submit text: "Mr. Smith went to Washington. Dr. Watson was there."
2. Backend split logic processes the text.
**Expected vs Actual Result**:
*   **Expected**: 2 sentences identified.
*   **Actual**: 4 sentences identified ("Mr.", "Smith went to Washington.", "Dr.", "Watson was there.").
**Severity**: Low
**Suggested Fix**: Update the regex in [_split_sentences](file:///p:/SmartScribe-main/backend/ai.py#34-36) to exclude common abbreviations or use a more robust NLP library like `nltk` or `spaCy` for sentence tokenization.

---

## 3. Bug ID: BUG-003
**Description**: Potential race condition and missing error handling in [create_user](file:///p:/SmartScribe-main/backend/database.py#97-108) database operation.
**Steps to Reproduce**:
1. Two simultaneous requests to `/api/auth/register` with the same username.
2. First request passes the pre-check; second request also passes the pre-check before the first one commits.
**Expected vs Actual Result**:
*   **Expected**: Second request should be handled gracefully with a 400 error.
*   **Actual**: `sqlite3.IntegrityError` is raised in [create_user](file:///p:/SmartScribe-main/backend/database.py#97-108), causing a 500 Internal Server Error.
**Severity**: Medium
**Suggested Fix**: Wrap the `INSERT` operation in [create_user](file:///p:/SmartScribe-main/backend/database.py#97-108) within a try-except block to catch `sqlite3.IntegrityError` and return a clear error status to the caller.

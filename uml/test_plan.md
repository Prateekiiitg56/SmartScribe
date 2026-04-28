# Test Plan: SmartScribe AI Essay Evaluator

## 1. Objective of Testing
The primary objective of testing SmartScribe is to ensure that the AI-assisted essay evaluation is accurate, stable, and provides meaningful feedback. Additionally, testing aims to verify the security of the authentication flow and the reliability of the data management features in the user dashboard.

## 2. Scope
The following modules and features will be subject to testing:
*   **Evaluation Module**: Accuracy of heuristic scoring, transformer-based signals, and AI integration (OpenRouter).
*   **Authentication**: Google OAuth 2.0 flow and session management.
*   **Dashboard**: Essay history retrieval, deletion of records.
*   **Export Module**: Accuracy and formatting of the PDF download feature.
*   **User Interface**: Responsiveness across different screen sizes and accessibility of the React frontend.

## 3. Types of Testing to be Performed
*   **Unit Testing**: Validating individual functions in [ai.py](file:///p:/SmartScribe-main/backend/ai.py) and [auth.py](file:///p:/SmartScribe-main/backend/auth.py) to ensure logic correctness.
*   **Integration Testing**: Testing the interaction between the FastAPI handlers, the evaluation logic, and the SQLite database.
*   **System Testing**: End-to-end testing of the complete user flow: Sign-in -> Submit Essay -> View Results -> Download PDF.
*   **Regressions Testing**: Ensuring new changes to the evaluation weights do not negatively impact existing scoring accuracy.

## 4. Tools
*   **pytest**: For backend unit and integration tests.
*   **Playwright/Browser Subagent**: For end-to-end UI testing and screenshot capture.
*   **Postman/vREST**: For API endpoint validation.
*   **SQLite Browser**: For database state verification.

## 5. Entry and Exit Criteria
### Entry Criteria
*   Backend and Frontend code is deployed in a stable environment.
*   Test data (sample essays) is prepared.
*   Environment variables (.env) are correctly configured.

### Exit Criteria
*   All high-priority test cases (8 designed) are executed.
*   Zero critical or high-severity bugs remain open.
*   Test execution report is generated and reviewed.

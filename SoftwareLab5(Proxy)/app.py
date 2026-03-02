import streamlit as st
from services import submit_essay

st.title("Automated Essay Evaluation System")

essay = st.text_area("Enter your Essay")

if st.button("Submit and Evaluate"):
    if essay.strip() == "":
        st.error("Essay cannot be empty.")
    else:
        score = submit_essay(essay)
        st.success(f"Your Essay Score: {score}/10")


'''
What's happening is, that in the app.py file, we are displaying the user interface for sublitting essay (a generic interface(not final implementation)) and then, the submit essay calls the evaluate essay logic, where a generic scoring mechanism is implemented currently. The score is then saved to the essay database and displayed to the user. This shows the interaction between the user submitting an essay, the evaluation logic and the essay database.
'''
import streamlit as st
import json
import re
import os
import random
from database.db import save_essay

def get_ai_evaluation(title, content):
    from openai import OpenAI
    
    api_key = st.secrets.get("OPENROUTER_API_KEY", "") if hasattr(st, "secrets") and "OPENROUTER_API_KEY" in st.secrets else os.environ.get("OPENROUTER_API_KEY", "")
    
    if not api_key:
        g = round(random.uniform(5, 9), 1)
        c = round(random.uniform(5, 9), 1)
        a = round(random.uniform(4, 9), 1)
        o = round((g + c + a) / 3, 1)
        return {
            "grammar": g,
            "coherence": c,
            "argumentation": a,
            "overall": o,
            "feedback": "API Key not found. This is placeholder feedback. To enable the AI engine, please set OPENROUTER_API_KEY as an environment variable or in `secrets.toml`."
        }
    
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        
        prompt = f"""You are an expert essay grader. Evaluate the following essay.
Title: {title}
Content: {content}

Provide three distinct scores strictly between 0 and 10 for:
1. Grammar
2. Coherence
3. Argumentation

Also provide detailed qualitative feedback highlighting strengths and areas for improvement.

Output your response EXACTLY as a valid JSON object without any markup or markdown block formatting. Example:
{{
  "grammar": 8.5,
  "coherence": 7.0,
  "argumentation": 9.0,
  "feedback": "Your essay has a strong thesis but lacks supporting evidence in the second paragraph."
}}
"""
        # Try multiple models to bypass rate limits
        models_to_try = [
            "deepseek/deepseek-r1",
            "meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/auto"
        ]
        
        response = None
        for model_id in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_id,
                    messages=[{"role": "user", "content": prompt}],
                )
                break # Success!
            except Exception as model_err:
                if "429" in str(model_err) or "rate-limited" in str(model_err).lower():
                    continue # Try next model
                else:
                    raise model_err # Reraise if it's a different error
                    
        if response is None:
            raise Exception("All free models are currently rate-limited. Please try again in a few minutes.")
            
        if hasattr(response, "error") and response.error is not None:
            raise Exception(f"API returned an error: {response.error}")
            
        if not hasattr(response, 'choices') or response.choices is None or len(response.choices) == 0:
            if isinstance(response, dict) and "error" in response:
                raise Exception(f"API returned an error dict: {response['error']}")
            raise Exception(f"Invalid response format from API (missing choices). Raw: {response}")
            
        text = response.choices[0].message.content
        
        # Try to parse JSON from the response
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            res = json.loads(match.group(0))
            g = float(res.get("grammar", 8.0))
            c = float(res.get("coherence", 8.0))
            a = float(res.get("argumentation", 8.0))
            fb = res.get("feedback", "Good effort!")
            o = round((g + c + a) / 3, 1)
            return {"grammar": g, "coherence": c, "argumentation": a, "overall": o, "feedback": fb}
        else:
            raise ValueError("Could not parse JSON from the AI response.")
            
    except Exception as e:
        g, c, a = 7.0, 7.0, 7.0
        return {
            "grammar": g,
            "coherence": c,
            "argumentation": a,
            "overall": 7.0,
            "feedback": f"There was an error generating the AI evaluation. Error details: {str(e)}"
        }

def ask_ai(question, essay_title, essay_content, feedback):
    from openai import OpenAI
    
    api_key = st.secrets.get("OPENROUTER_API_KEY", "") if hasattr(st, "secrets") and "OPENROUTER_API_KEY" in st.secrets else os.environ.get("OPENROUTER_API_KEY", "")
    
    if not api_key:
        return "⚠️ I am unable to connect to the AI brain because the API Key is missing. Please ask your administrator to set up `OPENROUTER_API_KEY`."

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        
        prompt = f"""You are a supportive and analytical AI writing tutor. The user wrote an essay titled '{essay_title}'.
Essay Content:
{essay_content}

The AI previously gave this feedback:
{feedback}

The user is asking the following question about their essay or the feedback:
"{question}"

Please provide a helpful, encouraging, and highly specific answer based on the essay content."""
        
        models_to_try = [
            "deepseek/deepseek-r1",
            "meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/auto"
        ]
        
        response = None
        for model_id in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_id,
                    messages=[{"role": "user", "content": prompt}],
                )
                break
            except Exception as model_err:
                if "429" in str(model_err) or "rate-limited" in str(model_err).lower():
                    continue
                else:
                    raise model_err
                    
        if response is None:
            return "All free AI models are currently overwhelmed with traffic (rate-limited). Please wait a few minutes and try asking again!"
            
        if hasattr(response, "error") and response.error is not None:
            return f"The AI provider returned an error: {response.error}"

        if not hasattr(response, 'choices') or response.choices is None or len(response.choices) == 0:
            return "The AI returned an empty response or an invalid format. Please try again."
            
        return response.choices[0].message.content
    except Exception as e:
        return f"Oops! I encountered an error while trying to answer your question: {e}"

def render_evaluate_page():
    st.markdown("## 📝 Essay Evaluation & Ask AI")
    
    # Check login requirement
    if "user_id" not in st.session_state or not st.session_state.get("authenticated", False):
        st.warning("Please sign in to submit an essay or use the AI tools.")
        if st.button("🔑 Go to Login", key="eval_goto_login"):
            st.session_state["current_page"] = "login"
            st.rerun()
        return

    # Initialize state variables
    if "evaluate_state" not in st.session_state:
        st.session_state.evaluate_state = "input"  # Can be 'input' or 'result'
    if "current_evaluation" not in st.session_state:
        st.session_state.current_evaluation = None
    if "eval_chat_history" not in st.session_state:
        st.session_state.eval_chat_history = []
        
    if st.session_state.evaluate_state == "input":
        st.info("Submit your essay to our AI engine. You will receive an instant evaluation and have the opportunity to chat with the AI about your mistakes.")
        with st.form("essay_input_form"):
            title = st.text_input("Essay Title", placeholder="e.g. The Impact of Artificial Intelligence on Education")
            content = st.text_area("Essay Content", height=300, placeholder="Paste or type your essay here…")
            submitted = st.form_submit_button("🔍  Evaluate Essay", use_container_width=True)
            
            if submitted:
                if not title.strip() or not content.strip():
                    st.error("Please provide both a title and essay content.")
                else:
                    with st.spinner("🧠 AI is carefully evaluating your essay... (This may take a few seconds)"):
                        eval_res = get_ai_evaluation(title, content)
                        save_essay(st.session_state["user_id"], title.strip(), content.strip(), 
                                   eval_res["grammar"], eval_res["coherence"], eval_res["argumentation"], 
                                   eval_res["overall"], eval_res["feedback"])
                        
                        st.session_state.current_evaluation = {
                            "title": title.strip(),
                            "content": content.strip(),
                            "results": eval_res
                        }
                        st.session_state.evaluate_state = "result"
                        st.session_state.eval_chat_history = []
                        st.rerun()

    elif st.session_state.evaluate_state == "result":
        eval_data = st.session_state.current_evaluation
        res = eval_data["results"]
        
        st.button("⬅️ Evaluate Another Essay", on_click=lambda: st.session_state.update({"evaluate_state": "input"}))
            
        st.markdown(f"### 🎉 Results for: {eval_data['title']}")
        
        # Display scores using metrics
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Overall Score", f"{res['overall']}/10")
        col2.metric("Grammar", f"{res['grammar']}/10")
        col3.metric("Coherence", f"{res['coherence']}/10")
        col4.metric("Argumentation", f"{res['argumentation']}/10")
        
        st.markdown("#### 💡 Detailed Feedback")
        st.info(res['feedback'])
        st.markdown("---")
        
        # Ask AI Component
        st.markdown("### 🤖 Ask AI")
        st.markdown("Do you want to know how to fix a specific mistake, or aren't sure why you received a certain score? **Ask the AI Tutor below!**")
        
        # Display chat history
        for msg in st.session_state.eval_chat_history:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])
                
        # Chat Input
        if prompt := st.chat_input("Ask a question about your essay or feedback..."):
            # Append user message
            st.session_state.eval_chat_history.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)
                
            # Get AI answer
            with st.chat_message("assistant"):
                with st.spinner("AI is thinking..."):
                    answer = ask_ai(prompt, eval_data["title"], eval_data["content"], res["feedback"])
                    st.markdown(answer)
            # Append AI message
            st.session_state.eval_chat_history.append({"role": "assistant", "content": answer})

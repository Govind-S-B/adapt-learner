"""
Data singleton to store application state.

History objects have the following structure:
{
    "request": str,      # The request/question from the user
    "material": str,     # The learning material or content in image url format
    "output": str,        # The output/answer given to the user
    "feedback": str,     # Feedback provided for the interaction
    "score": {          # Added during learning process
        "value": float, # Score between 0-100
        "reason": str   # Explanation for the score
    }
}
"""

data = {
    "initial_data":{
        "teacher":"",
        "parent":"",
        "student":""
    },
    "student_persona":"",
    "history":[],  # Array of interaction objects as described above
}
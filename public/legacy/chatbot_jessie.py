def chatbot_response(user_input):
    user_input = user_input.lower()

    if "hello" in user_input or "hi" in user_input:
        return "Hey Jessie! How can I help you today?"
    elif "how are you" in user_input:
        return "I'm doing great, Jessie. Thanks for asking!"
    elif "your name" in user_input:
        return "I'm your chatbot, built just for you, Jessie."
    elif "help" in user_input:
        return "I'm here for you, Jessie! Ask me anything."
    elif "bye" in user_input:
        return "Take care, Jessie! Talk to you later."
    else:
        return "Hmm... I’m not sure how to respond to that, Jessie."

print("Chatbot: Hi Jessie! Type 'bye' to end the chat.")

while True:
    user_input = input("You: ")
    response = chatbot_response(user_input)

    print("Chatbot:", response)

    if "bye" in user_input.lower():
        break

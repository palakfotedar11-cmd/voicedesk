
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re

app = FastAPI(title="VoiceDesk Customer Support API")

# Allow the deployed frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://voicedesk-five.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


def get_response(message: str):
    text = message.lower().strip()
    words = set(re.findall(r"[a-z]+", text))

    if not text:
        return {
            "reply": "Please type a message so I can help you.",
            "intent": "empty"
        }

    # Greetings
    if words.intersection({"hi", "hello", "hey", "greetings"}):
        return {
            "reply": "Hello! Welcome to VoiceDesk. I'm your virtual customer support assistant. How can I help you today?",
            "intent": "greeting"
        }

    # Thanks
    if words.intersection({"thanks", "thank", "appreciate"}):
        return {
            "reply": "You're very welcome! I'm happy to help. Is there anything else you'd like to know?",
            "intent": "thanks"
        }

    # Goodbye
    if words.intersection({"bye", "goodbye", "farewell"}):
        return {
            "reply": "Thank you for contacting VoiceDesk! Have a wonderful day.",
            "intent": "goodbye"
        }

    # Appointment booking
    if words.intersection({"appointment", "book", "booking", "schedule", "reservation"}):
        return {
            "reply": "I'd be happy to help with an appointment. Please share your preferred date and time, along with the service you need. I can collect these details, but this demo does not create an actual booking.",
            "intent": "appointment"
        }

    # Cancellation or rescheduling
    if words.intersection({"cancel", "cancellation", "reschedule", "postpone"}):
        return {
            "reply": "I can help you with a cancellation or rescheduling request. Please share your appointment reference and your preferred next step. This demo cannot directly modify bookings.",
            "intent": "cancellation"
        }

    # Opening hours
    if words.intersection({"hours", "timing", "timings", "open", "closed", "working"}):
        return {
            "reply": "Our support team is available Monday to Friday, from 9 AM to 6 PM. Weekend availability may vary. Please confirm with the business before visiting.",
            "intent": "business_hours"
        }

    # Pricing
    if words.intersection({"price", "pricing", "cost", "fee", "fees", "charge", "charges"}):
        return {
            "reply": "I'd be happy to help with pricing! Which product or service are you interested in? Exact prices depend on the service, so our team can confirm the latest quote.",
            "intent": "pricing"
        }

    # Refunds
    if words.intersection({"refund", "money", "reimbursement", "return"}):
        return {
            "reply": "I understand you'd like information about a refund. Please share your order or transaction reference and a brief description of the issue. Our support team can review your request.",
            "intent": "refund"
        }

    # Technical support
    if words.intersection({"error", "bug", "issue", "problem", "broken", "crash", "technical"}):
        return {
            "reply": "I'm sorry you're experiencing a technical issue. Could you describe what happened and mention any error message you received? I'll help you identify the next step.",
            "intent": "technical_support"
        }

    # Products and services
    if words.intersection({"service", "services", "product", "products", "offer", "provide"}):
        return {
            "reply": "We can help you explore our available products and services. Is there a particular service or product you'd like to know more about?",
            "intent": "services"
        }

    # Contact information
    if words.intersection({"contact", "email", "phone", "number", "address", "location"}):
        return {
            "reply": "You can reach our customer support team through the business's official contact channels. Which contact detail are you looking for: phone, email, or address?",
            "intent": "contact"
        }

    # Human support
    if words.intersection({"human", "agent", "representative", "person", "staff"}):
        return {
            "reply": "Of course! If you'd prefer to speak with a human representative, I can collect your name and a short description of your query so the support team can follow up.",
            "intent": "human_support"
        }

    # Default response
    return {
        "reply": "Thanks for reaching out! I want to make sure I understand your question correctly. Could you provide a little more detail or tell me whether your query is about appointments, pricing, services, refunds, or technical support?",
        "intent": "general_query"
    }


@app.get("/")
def home():
    return {
        "message": "AI Voice Customer Support API is running",
        "mode": "smart-demo"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": "smart-demo"
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    result = get_response(request.message)
    return result

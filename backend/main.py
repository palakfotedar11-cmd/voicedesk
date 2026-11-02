
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re
import uuid

app = FastAPI(title="VoiceDesk Customer Support API")

# Frontend connection
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


# Request format
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


# Temporary conversation memory
conversations = {}


def get_response(message: str, conversation_id: str):
    text = message.lower().strip()
    words = set(re.findall(r"[a-z]+", text))

    history = conversations.setdefault(
        conversation_id,
        {"awaiting": None}
    )

    def answer(reply, intent, awaiting=None):
        history["awaiting"] = awaiting
        return {
            "reply": reply,
            "intent": intent,
            "conversation_id": conversation_id
        }

    if not text:
        return answer(
            "Please type a message so I can help you.",
            "empty"
        )

    # Follow-up: user is selecting a contact detail
    if history["awaiting"] == "contact_choice":
        if words.intersection({"all", "three", "both", "everything"}):
            return answer(
                "I can provide the contact categories. "
                "Phone: no verified number is configured. "
                "Email: no verified support email is configured. "
                "Address: no verified office address is configured. "
                "Please add the business's real contact details to the backend.",
                "all_contacts"
            )

        if "email" in words:
            return answer(
                "We don't have a verified support email configured yet. "
                "Please add the business's official email address.",
                "email"
            )

        if words.intersection({"phone", "number", "call"}):
            return answer(
                "We don't have a verified support phone number configured yet. "
                "Please add the business's official phone number.",
                "phone"
            )

        if words.intersection({"address", "location", "office"}):
            return answer(
                "We don't have a verified office address configured yet. "
                "Please add the business's official address.",
                "address"
            )

    # Human support detection - before general contact detection
    if (
        any(phrase in text for phrase in [
            "human",
            "real person",
            "live agent",
            "speak to someone",
            "talk to someone",
            "connect me",
            "customer representative",
            "human contact"
        ])
        or words.intersection({"agent", "representative", "staff"})
    ):
        return answer(
            "Certainly! I can help you find the right support contact. "
            "Would you like the phone number, email address, or office address?",
            "human_support",
            "contact_choice"
        )

    # Direct contact requests
    if "email" in words:
        return answer(
            "We don't have a verified support email configured yet. "
            "Please add the business's official email address.",
            "email"
        )

    if words.intersection({"phone", "number", "call"}):
        return answer(
            "We don't have a verified support phone number configured yet. "
            "Please add the business's official phone number.",
            "phone"
        )

    if words.intersection({"address", "location", "office"}):
        return answer(
            "We don't have a verified office address configured yet. "
            "Please add the business's official address.",
            "address"
        )

    if words.intersection({"contact", "contacts"}):
        return answer(
            "Which contact detail would you like: phone, email, or office address?",
            "contact",
            "contact_choice"
        )

    # Greetings
    if words.intersection({"hi", "hello", "hey", "greetings"}):
        return answer(
            "Hello! Welcome to VoiceDesk. I'm your virtual customer support assistant. How can I help you today?",
            "greeting"
        )

    # Thanks
    if words.intersection({"thanks", "thank", "appreciate"}):
        return answer(
            "You're very welcome! Is there anything else I can help you with?",
            "thanks"
        )

    # Goodbye
    if words.intersection({"bye", "goodbye", "farewell"}):
        return answer(
            "Thank you for contacting VoiceDesk. Have a wonderful day!",
            "goodbye"
        )

    # Appointments
    if words.intersection({
        "appointment", "book", "booking", "schedule", "reservation"
    }):
        return answer(
            "I'd be happy to help with an appointment. "
            "Please share your preferred date, time, and the service you need. "
            "This demo collects your request but does not create a real booking.",
            "appointment"
        )

    # Cancellation and rescheduling
    if words.intersection({
        "cancel", "cancellation", "reschedule", "postpone"
    }):
        return answer(
            "I can help collect your cancellation or rescheduling request. "
            "Please share your appointment reference and preferred next step.",
            "cancellation"
        )

    # Business hours
    if words.intersection({
        "hours", "timing", "timings", "open", "closed", "working"
    }):
        return answer(
            "Our sample support hours are Monday to Friday, 9 AM to 6 PM. "
            "Please confirm the actual business hours before visiting.",
            "business_hours"
        )

    # Pricing
    if words.intersection({
        "price", "pricing", "cost", "fee", "fees", "charge", "charges"
    }):
        return answer(
            "I'd be happy to help with pricing. Which product or service are you interested in? "
            "Our team can confirm the exact price.",
            "pricing"
        )

    # Refunds
    if words.intersection({
        "refund", "reimbursement", "return"
    }):
        return answer(
            "I can help collect your refund query. "
            "Please share your order reference and a brief description of the issue.",
            "refund"
        )

    # Technical support
    if words.intersection({
        "error", "bug", "issue", "problem", "broken", "crash", "technical"
    }):
        return answer(
            "I'm sorry you're experiencing a technical issue. "
            "Could you describe what happened and mention any error message?",
            "technical_support"
        )

    # Services and products
    if words.intersection({
        "service", "services", "product", "products", "offer", "provide"
    }):
        return answer(
            "We can help you explore our available services and products. "
            "Is there a particular one you'd like to know more about?",
            "services"
        )

    # Default response
    return answer(
        "Thanks for reaching out! Could you provide a little more detail? "
        "I can help with appointments, contact details, pricing, services, refunds, and technical support.",
        "general_query"
    )


@app.get("/")
def home():
    return {
        "message": "VoiceDesk Customer Support API is running",
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
    conversation_id = request.conversation_id or str(uuid.uuid4())

    return get_response(
        request.message,
        conversation_id
    )

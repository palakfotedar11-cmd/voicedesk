from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
import re

app = FastAPI(title="AI Voice Customer Support API", version="0.1.0")

# Development-only CORS settings for the local Vite frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ORDERS = {
    "1001": {"status": "shipped", "item": "Laptop", "estimated_delivery": "November 3, 2026"},
    "1002": {"status": "processing", "item": "Wireless headphones", "estimated_delivery": "November 5, 2026"},
    "1003": {"status": "delivered", "item": "Keyboard", "estimated_delivery": "October 29, 2026"},
}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    intent: str
    timestamp: str

def respond(message: str) -> tuple[str, str]:
    text = message.lower().strip()

    # Demo intent: order tracking
    order_match = re.search(r"\b(?:order\s*)?(1001|1002|1003)\b", text)
    if any(word in text for word in ["order", "track", "delivery", "shipped"]) and order_match:
        order_id = order_match.group(1)
        order = ORDERS[order_id]
        return (
            f"Order {order_id} for {order['item']} is {order['status']}. "
            f"Estimated delivery: {order['estimated_delivery']}.",
            "order_tracking",
        )

    if any(word in text for word in ["hello", "hi", "hey"]):
        return ("Hello! I'm your AI customer support assistant. How can I help you today?", "greeting")
    if any(word in text for word in ["refund", "return", "cancel"]):
        return (
            "I can help you with a refund, return, or cancellation. "
            "Please share your order number so I can check the demo order details.",
            "returns_and_refunds",
        )
    if "order" in text or "delivery" in text or "track" in text:
        return (
            "I can check demo orders 1001, 1002, and 1003. "
            "Which order number would you like me to look up?",
            "order_tracking",
        )
    if any(word in text for word in ["human", "representative", "agent", "person"]):
        return (
            "I can flag this for a human support representative. "
            "This demo does not send a real handoff yet.",
            "human_handoff",
        )
    return (
        "Thanks for contacting support. I'm running in demo mode right now. "
        "You can ask me to track order 1001, 1002, or 1003, or ask about a return.",
        "general_support",
    )

@app.get("/")
def root():
    return {"message": "AI Voice Customer Support API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    reply, intent = respond(request.message)
    return ChatResponse(
        reply=reply,
        intent=intent,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

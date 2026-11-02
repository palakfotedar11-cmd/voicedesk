
import re
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="AI Voice Customer Support API",
    version="0.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://voicedesk.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ORDERS = {
    "1001": {
        "status": "shipped",
        "item": "Laptop",
        "estimated_delivery": "November 3, 2026"
    },
    "1002": {
        "status": "processing",
        "item": "Wireless headphones",
        "estimated_delivery": "November 5, 2026"
    },
    "1003": {
        "status": "delivered",
        "item": "Keyboard",
        "estimated_delivery": "October 29, 2026"
    }
}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    reply: str
    intent: str
    timestamp: str


def respond(message: str) -> tuple[str, str]:

    text = message.lower().strip()

    # Greeting
    if re.search(r"\b(hello|hi|hey)\b", text):
        return (
            "Hello! Welcome to VoiceDesk customer support. "
            "How can I help you today?",
            "greeting"
        )

    # Order tracking
    order_match = re.search(
        r"\b(?:order\s*)?(1001|1002|1003)\b",
        text
    )

    if order_match and any(word in text for word in [
        "order", "track", "delivery", "shipped"
    ]):
        order_id = order_match.group(1)
        order = ORDERS[order_id]

        return (
            f"Your order {order_id} for {order['item']} "
            f"is currently {order['status']}. "
            f"Estimated delivery is {order['estimated_delivery']}.",
            "order_tracking"
        )

    if any(word in text for word in [
        "order", "tracking", "delivery"
    ]):
        return (
            "I can check demo orders 1001, 1002 and 1003. "
            "Please share your order number.",
            "order_tracking"
        )

    # Damaged product
    if any(word in text for word in [
        "damaged", "broken", "defective", "not working"
    ]):
        return (
            "I'm sorry your product arrived damaged. "
            "I can help you with this. Please share your order "
            "number and briefly describe the damage. "
            "A support representative can then review your "
            "replacement or refund options.",
            "damaged_product"
        )

    # Refund and returns
    if any(word in text for word in [
        "refund", "return", "money back"
    ]):
        return (
            "I can help you with a refund or return request. "
            "Please share your order number and the reason "
            "for your request. The support team will need to "
            "review the applicable return policy.",
            "returns_and_refunds"
        )

    # Cancellation
    if any(word in text for word in [
        "cancel", "cancellation"
    ]):
        return (
            "I can help you with a cancellation request. "
            "Please share your order number. "
            "This demo cannot cancel an actual order.",
            "cancellation"
        )

    # Human handoff
    if any(word in text for word in [
        "human", "representative", "agent", "person"
    ]):
        return (
            "Certainly! I can flag your request for human support. "
            "This demo does not send a real handoff, but a "
            "representative would be the next point of contact.",
            "human_handoff"
        )

    # General support
    return (
        "Thanks for contacting VoiceDesk! I can help with "
        "order tracking, damaged products, refunds, returns "
        "and cancellations. What would you like help with?",
        "general_support"
    )


@app.get("/")
def root():
    return {
        "message": "AI Voice Customer Support API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": "demo"
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    reply, intent = respond(request.message)

    return ChatResponse(
        reply=reply,
        intent=intent,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

"""
KelanaAI - Conversation and Message Models
Session 10: Teaching KelanaAI to Remember Conversations

Amazon Bedrock is stateless - every call only knows what is in that call's
message list. "Memory" is these two tables: every turn is stored here, and the
backend reassembles them into the model's context before each new call. See
services/kb_service.answer_conversation().
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # NULL until the first message exists, so the UI can show a "New
    # conversation" placeholder instead of an empty string. Set once, from
    # that first message - see main._make_title().
    title = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.id",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id"), nullable=False, index=True
    )

    # "user" or "assistant" - matches the role name Bedrock's Converse API
    # expects, so a stored row can be replayed straight into a message list.
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    conversation = relationship("Conversation", back_populates="messages")

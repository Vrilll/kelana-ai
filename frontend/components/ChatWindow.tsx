"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import {
  ApiError,
  deleteConversation,
  getConversation,
  sendMessage,
  type ChatMessage,
  type ConversationDetail,
} from "@/lib/api";

const SUGGESTED_PROMPTS = [
  "What happens if a supplier cancels my flight?",
  "How many nights do I need for two Bali zones?",
  "Should I buy a Japan rail pass?",
];

// Negative ids never collide with a real database id, so the optimistic
// bubble can be told apart from confirmed messages without an extra flag.
function tempId() {
  return -Date.now();
}

export default function ChatWindow({ conversationId }: { conversationId: number }) {
  const router = useRouter();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<number | null>(null);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnce = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!Number.isFinite(conversationId)) {
      setLoadError("That conversation id is not valid.");
      setLoadStatus(404);
      return;
    }

    let cancelled = false;

    getConversation(conversationId)
      .then((result) => {
        if (cancelled) return;
        setConversation(result);
        setMessages(result.messages);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoadStatus(caught instanceof ApiError ? caught.status : null);
        setLoadError(
          caught instanceof Error ? caught.message : "Something went wrong.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Auto-scroll: instant on the first paint of an existing conversation, then
  // smooth for every message that follows and whenever the typing indicator
  // toggles - it changes the list's height just like a message would.
  useEffect(() => {
    if (!conversation) return;

    bottomRef.current?.scrollIntoView({
      behavior: hasScrolledOnce.current ? "smooth" : "auto",
      block: "end",
    });
    hasScrolledOnce.current = true;
  }, [conversation, messages.length, isSending]);

  async function handleSend(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setSendError(null);
    setDraft("");

    const optimistic: ChatMessage = {
      id: tempId(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setIsSending(true);

    try {
      const result = await sendMessage(conversationId, trimmed);
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimistic.id),
        result.user_message,
        result.assistant_message,
      ]);
      setConversation((current) =>
        current ? { ...current, ...result.conversation } : current,
      );
    } catch (caught) {
      // Drop the optimistic bubble and give the text back - the composer is
      // exactly where the traveller left it, ready to try again.
      setMessages((current) =>
        current.filter((message) => message.id !== optimistic.id),
      );
      setDraft(trimmed);
      setSendError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setIsSending(false);
      composerRef.current?.focus();
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(draft);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await deleteConversation(conversationId);
      router.push("/chat");
    } catch (caught) {
      setIsDeleting(false);
      setSendError(
        caught instanceof Error ? caught.message : "Could not delete this chat.",
      );
    }
  }

  if (loadError && !conversation) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-ink-100 bg-white px-6 py-14 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            {loadStatus === 403
              ? "This conversation is not yours"
              : loadStatus === 404
                ? "Conversation not found"
                : "Could not load this conversation"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">{loadError}</p>
          <Link
            href="/chat"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Back to your chats
          </Link>
        </div>
      </section>
    );
  }

  if (!conversation) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
        <div className="mt-6 h-[70vh] max-h-[720px] animate-pulse rounded-3xl border border-ink-100 bg-white" />
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition-colors hover:text-brand-600"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H6M11 18l-6-6 6-6" />
          </svg>
          All chats
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-ink-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Deleting..." : "Delete chat"}
        </button>
      </div>

      {/* Feature: conversation title, shown at the top of the interface */}
      <h1 className="mt-4 truncate text-2xl font-extrabold tracking-tight text-ink-900">
        {conversation.title || "New conversation"}
      </h1>

      <div className="mt-5 flex h-[70vh] max-h-[720px] min-h-[26rem] flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <p className="text-sm text-ink-400">
                Ask KelanaAI anything about your trip.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-ink-100 bg-ink-50 px-4 py-2 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                pending={message.id < 0}
              />
            ))
          )}

          {/* Feature: typing indicator while a reply is pending */}
          {isSending && (
            <div className="animate-rise flex flex-col items-start">
              <TypingIndicator />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {sendError && (
          <p
            role="alert"
            className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mx-6"
          >
            {sendError}
          </p>
        )}

        <form
          className="flex items-end gap-2 border-t border-ink-100 p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend(draft);
          }}
        >
          <label htmlFor="composer" className="sr-only">
            Message KelanaAI
          </label>
          <textarea
            id="composer"
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask about budgets, destinations, policies..."
            className="max-h-32 flex-1 resize-none rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createConversation,
  listConversations,
  type ConversationSummary,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/chat-display";

export default function ConversationList() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listConversations()
      .then((result) => {
        if (!cancelled) setConversations(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Something went wrong.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNewChat() {
    setError(null);
    setIsCreating(true);
    try {
      const conversation = await createConversation();
      router.push(`/chat/${conversation.id}`);
    } catch (caught) {
      setIsCreating(false);
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-ink-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Chat
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Ask KelanaAI
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-600">
            A conversation remembers everything you have told it so far - ask a
            follow-up and it will still know what you meant.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          disabled={isCreating}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? "Starting..." : "New chat"}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {!conversations && !error && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl border border-ink-100 bg-white"
            />
          ))}
        </div>
      )}

      {conversations && conversations.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-ink-100 bg-white px-6 py-16 text-center">
          <p className="text-4xl" aria-hidden="true">
            💬
          </p>
          <h2 className="mt-4 text-lg font-bold text-ink-900">
            No conversations yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            Start a chat and ask about budgets, destinations or KelanaAI's
            policies.
          </p>
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isCreating}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Starting..." : "Start your first chat"}
          </button>
        </div>
      )}

      {conversations && conversations.length > 0 && (
        <ul className="mt-8 space-y-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => router.push(`/chat/${conversation.id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white px-5 py-4 text-left transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="min-w-0 truncate font-semibold text-ink-900">
                  {conversation.title || "New conversation"}
                </span>
                <span className="shrink-0 text-xs text-ink-400">
                  {formatRelativeTime(conversation.updated_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

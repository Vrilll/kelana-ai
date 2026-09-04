import type { ChatMessage } from "@/lib/api";
import { formatMessageTime } from "@/lib/chat-display";

type MessageBubbleProps = {
  message: ChatMessage;
  /** True while the server copy of this message hasn't confirmed yet - the
   *  optimistic bubble shown the instant the traveller hits send. */
  pending?: boolean;
};

export default function MessageBubble({ message, pending }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`animate-rise flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? "rounded-br-md bg-ink-900 text-white"
            : "rounded-bl-md bg-ink-50 text-ink-800"
        } ${pending ? "opacity-70" : ""}`}
      >
        {message.content}
      </div>
      <time
        dateTime={message.created_at}
        className="mt-1 px-1 text-xs text-ink-400"
      >
        {pending ? "Sending..." : formatMessageTime(message.created_at)}
      </time>
    </div>
  );
}

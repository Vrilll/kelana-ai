/** Three bouncing dots, shown as an assistant-side bubble while a reply is pending. */
export default function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-ink-50 px-4 py-3"
      role="status"
      aria-label="KelanaAI is typing"
    >
      <span className="typing-dot h-2 w-2 rounded-full bg-ink-400" />
      <span className="typing-dot h-2 w-2 rounded-full bg-ink-400" />
      <span className="typing-dot h-2 w-2 rounded-full bg-ink-400" />
    </div>
  );
}

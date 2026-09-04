import type { Metadata } from "next";

import ConversationList from "@/components/ConversationList";
import RequireAuth from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Chat | KelanaAI",
  description: "Ask KelanaAI about your trip and pick up past conversations.",
};

export default function ChatHomePage() {
  return (
    <RequireAuth>
      <ConversationList />
    </RequireAuth>
  );
}

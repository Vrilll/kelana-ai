import type { Metadata } from "next";

import ChatWindow from "@/components/ChatWindow";
import RequireAuth from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Chat | KelanaAI",
  description: "Ask KelanaAI a follow-up - it remembers the rest of this conversation.",
};

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <ChatWindow conversationId={Number(id)} />
    </RequireAuth>
  );
}

import type { Metadata } from "next";

import ProfilePanel from "@/components/ProfilePanel";
import RequireAuth from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Your profile | KelanaAI",
  description: "Your KelanaAI account and travel totals.",
};

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfilePanel />
    </RequireAuth>
  );
}

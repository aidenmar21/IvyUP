import type { Metadata } from "next";
import { InboxView } from "@/components/admin/inbox";
import { getMessages } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  return <InboxView messages={await getMessages()} />;
}

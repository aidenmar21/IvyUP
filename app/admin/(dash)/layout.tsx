import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOwner } from "@/lib/auth";
import { getSearchIndex, getSidebarCounts } from "@/lib/admin-data";

export const metadata: Metadata = { title: { default: "Owner", template: "%s · IvyUp Owner" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireOwner();
  const [counts, index] = await Promise.all([getSidebarCounts(), getSearchIndex()]);
  return (
    <AdminShell counts={counts} index={index} ownerName={viewer.displayName ?? "Owner"}>
      {children}
    </AdminShell>
  );
}

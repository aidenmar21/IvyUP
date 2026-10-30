"use client";

import { useState, useTransition } from "react";
import { Inbox as InboxIcon, Mail, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailLine, EmptyState, PageHeader, PhoneLine } from "@/components/admin/ui";
import { setMessageRead } from "@/app/admin/actions";
import { fmt } from "@/lib/time";
import type { ContactMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InboxView({ messages }: { messages: ContactMessage[] }) {
  const [openId, setOpenId] = useState<string | null>(messages.find((m) => !m.read_at)?.id ?? messages[0]?.id ?? null);
  const [, start] = useTransition();
  const unread = messages.filter((m) => !m.read_at).length;

  function open(m: ContactMessage) {
    setOpenId(m.id);
    if (!m.read_at) start(async () => void (await setMessageRead(m.id, true)));
  }

  return (
    <>
      <PageHeader title="Inbox" description={unread ? `${unread} unread message${unread === 1 ? "" : "s"} from the contact form.` : "Messages from the contact form."} />
      <div className="px-4 pb-8 sm:px-8">
        {messages.length === 0 ? (
          <EmptyState icon={InboxIcon} title="No messages yet" body="When someone writes through the contact form, it lands here and in hello@ivyup.org." />
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const isOpen = openId === m.id;
              return (
                <li key={m.id} className={cn("rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200", isOpen ? "border-ink-400/50 shadow-lift" : "border-line")}>
                  <button type="button" onClick={() => (isOpen ? setOpenId(null) : open(m))} aria-expanded={isOpen} className="flex min-h-16 w-full items-center gap-4 px-4 py-2 text-left sm:px-6">
                    <span className={cn("size-2 shrink-0 rounded-full", m.read_at ? "bg-transparent" : "bg-ivy-700")} aria-label={m.read_at ? undefined : "Unread"} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate text-ink-900", !m.read_at && "font-semibold")}>
                        {m.name} <span className="font-normal text-ink-600">· {m.topic}</span>
                      </span>
                      <span className="truncate text-sm text-ink-600">{m.message}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-600 tabular">{fmt(m.created_at, "MMM d")}</span>
                  </button>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-soft", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-4 border-t border-line px-4 py-4 sm:px-6">
                        <p className="measure whitespace-pre-wrap text-ink-900">{m.message}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
                          <EmailLine email={m.email} />
                          {m.phone && <PhoneLine phone={m.phone} />}
                          <span className="tabular">{fmt(m.created_at, "EEE, MMM d 'at' h:mm a")}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild>
                            <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to IvyUp`)}`}>
                              <Reply /> Reply by email
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              start(async () => {
                                const r = await setMessageRead(m.id, !m.read_at);
                                if (!r.ok) toast.error(r.error);
                                else setOpenId(null);
                              })
                            }
                          >
                            <Mail /> Mark as {m.read_at ? "unread" : "read"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

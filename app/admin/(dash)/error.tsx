"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 px-4 pt-16 sm:px-8">
      <p className="eyebrow text-danger">Something went wrong</p>
      <h1 className="font-display text-4xl text-ink-900">This page couldn&apos;t load.</h1>
      <p className="measure text-ink-600">
        {error.message.startsWith("Couldn't load") ? error.message : "Check your connection and try again. If it keeps happening, the database may be unreachable."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

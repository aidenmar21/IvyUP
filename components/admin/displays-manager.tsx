"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Plus, Trash2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field } from "@/components/shared/form-bits";
import { Chip, EmptyState, PageHeader } from "@/components/admin/ui";
import { SortableList } from "@/components/admin/sortable-list";
import { TutorPortrait } from "@/components/site/tutor-portrait";
import { deleteDisplay, reorder, saveDisplay, setDisplayStatus } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { preparePortrait } from "@/lib/image";
import { initials, photoUrl } from "@/lib/format";
import type { Tutor, TutorDisplay } from "@/lib/types";

type Draft = {
  id?: string;
  tutorId: string;
  name: string;
  title: string;
  school: string;
  description: string;
  funFact: string;
  photoPath: string;
  photoBlurhash: string;
};

const EMPTY: Draft = { tutorId: "", name: "", title: "Tutor", school: "", description: "", funFact: "", photoPath: "", photoBlurhash: "" };

/** "Jordan Lee" from preferred name + last name, ignoring notes in brackets. */
function displayName(t: Tutor) {
  const parts = t.full_name.replace(/\([^)]*\)/g, "").trim().split(/\s+/);
  const first = t.preferred_name?.trim() || parts[0];
  return parts.length > 1 ? `${first} ${parts[parts.length - 1]}` : first;
}

function toDraft(d: TutorDisplay): Draft {
  return {
    id: d.id,
    tutorId: d.tutor_id ?? "",
    name: d.name,
    title: d.title,
    school: d.school ?? "",
    description: d.description,
    funFact: d.fun_fact ?? "",
    photoPath: d.photo_path ?? "",
    photoBlurhash: d.photo_blurhash ?? "",
  };
}

export function DisplaysManager({ displays, tutors }: { displays: TutorDisplay[]; tutors: Tutor[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const posted = displays.filter((d) => d.status === "posted").length;

  return (
    <>
      <PageHeader
        title="Tutor displays"
        description={`The tutor cards families see on ivyup.org. ${posted} posted, ${displays.length - posted} in draft.`}
        action={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus /> New display
          </Button>
        }
      />
      <div className="px-4 pb-8 sm:px-8">
        {displays.length === 0 ? (
          <EmptyState
            icon={UserRoundPlus}
            title="No tutor displays yet"
            body="Add a photo, title, short description, and fun fact. Save as a draft or post it straight to the Meet the Tutors section."
          />
        ) : (
          <>
            <p className="pb-4 text-sm text-ink-600">Drag, or use the arrows, to set the order families see.</p>
            <SortableList
              items={displays}
              onReorder={async (ids) => {
                const r = await reorder("tutor_displays", ids);
                if (!r.ok) toast.error(r.error);
              }}
              render={(d) => <DisplayRow d={d} onEdit={() => setEditing(toDraft(d))} />}
            />
          </>
        )}
      </div>
      <DisplayEditor draft={editing} tutors={tutors} onClose={() => setEditing(null)} />
    </>
  );
}

function DisplayRow({ d, onEdit }: { d: TutorDisplay; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const src = photoUrl(d.photo_path);
  return (
    <div className="flex items-center gap-4 p-4">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-14 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-ivy-100 font-display text-xl text-ivy-700">{initials(d.name)}</span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink-900">{d.name}</span>
          <span className="truncate text-sm text-ink-600">
            {d.title}
            {d.school ? ` · ${d.school}` : ""}
          </span>
        </span>
      </button>
      <Chip tone={d.status === "posted" ? "ivy" : "neutral"}>{d.status === "posted" ? "Posted" : "Draft"}</Chip>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="hidden sm:inline-flex"
        onClick={() =>
          start(async () => {
            const next = d.status === "posted" ? "draft" : "posted";
            const r = await setDisplayStatus(d.id, next);
            if (!r.ok) return void toast.error(r.error);
            toast.success(next === "posted" ? `${d.name} is live on the site` : `${d.name} hidden from the site`, {
              action: { label: "Undo", onClick: () => setDisplayStatus(d.id, d.status) },
            });
          })
        }
      >
        {d.status === "posted" ? "Unpost" : "Post"}
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

function DisplayEditor({ draft, tutors, onClose }: { draft: Draft | null; tutors: Tutor[]; onClose: () => void }) {
  return (
    <Sheet open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto data-[side=right]:sm:max-w-5xl" data-lenis-prevent>
        {draft && <EditorBody key={draft.id ?? "new"} initial={draft} tutors={tutors} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({ initial, tutors, onClose }: { initial: Draft; tutors: Tutor[]; onClose: () => void }) {
  const [v, setV] = useState<Draft>(initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, x: Draft[K]) => setV((p) => ({ ...p, [k]: x }));

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    setUploading(true);
    try {
      const { blob, blurhash, previewUrl } = await preparePortrait(file);
      setPreview(previewUrl);
      const path = `displays/${crypto.randomUUID()}.webp`;
      const { error } = await createClient().storage.from("tutor-photos").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      setV((p) => ({ ...p, photoPath: path, photoBlurhash: blurhash }));
      toast.success("Photo ready");
    } catch (e) {
      console.error(e);
      toast.error("The photo didn't upload. Try a JPG or PNG under 5 MB.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function save(status: "draft" | "posted") {
    start(async () => {
      const r = await saveDisplay({ ...v, status });
      if (!r.ok) return void toast.error(r.error);
      toast.success(status === "posted" ? `${v.name} is live on Meet the Tutors` : "Draft saved");
      onClose();
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{initial.id ? `Edit ${initial.name}` : "New tutor display"}</SheetTitle>
        <SheetDescription>What families see on the Meet the Tutors section. The preview updates as you type.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-8 px-6 pb-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {tutors.length > 0 && (
            <Field label="Fill from a tutor" htmlFor="dsp-tutor" optional>
              <Select
                value={v.tutorId}
                onValueChange={(id) => {
                  const t = tutors.find((x) => x.id === id);
                  setV((p) => ({
                    ...p,
                    tutorId: id,
                    name: p.name || (t ? displayName(t) : ""),
                    school: p.school || t?.school || "",
                    description: p.description || t?.bio || "",
                  }));
                }}
              >
                <SelectTrigger id="dsp-tutor" className="w-full">
                  <SelectValue placeholder="Choose a tutor to prefill" />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="min-h-11">
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Photo" hint="Portrait works best. We crop it to 4:5.">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus /> {uploading ? "Processing…" : v.photoPath ? "Replace photo" : "Upload photo"}
              </Button>
              {v.photoPath && (
                <Button type="button" variant="ghost" onClick={() => (setV((p) => ({ ...p, photoPath: "", photoBlurhash: "" })), setPreview(null))}>
                  Remove
                </Button>
              )}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="dsp-name">
              <Input id="dsp-name" value={v.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Title" htmlFor="dsp-title" hint="e.g. Tutor, Tutor & Co-founder, Tutor & Research Developer">
              <Input id="dsp-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
          </div>
          <Field label="School" htmlFor="dsp-school" optional>
            <Input id="dsp-school" value={v.school} onChange={(e) => set("school", e.target.value)} placeholder="e.g. Princeton '27" />
          </Field>
          <Field label="Description" htmlFor="dsp-desc" hint="2 to 4 sentences about their background and teaching.">
            <Textarea id="dsp-desc" rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Fun fact" htmlFor="dsp-fun" optional>
            <Input id="dsp-fun" value={v.funFact} onChange={(e) => set("funFact", e.target.value)} />
          </Field>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <p className="eyebrow text-ink-600">Preview</p>
          <div className="rounded-xl border border-line bg-paper p-6">
            <TutorPortrait
              name={v.name}
              title={v.title}
              school={v.school || null}
              description={v.description}
              fun_fact={v.funFact || null}
              photo_path={v.photoPath || null}
              photo_blurhash={v.photoBlurhash || null}
              previewSrc={preview}
            />
          </div>
        </aside>
      </div>
      <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line bg-popover px-6 py-4 safe-bottom">
        {initial.id ? (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!window.confirm(`Delete ${initial.name}'s display? This removes it from the site.`)) return;
                const r = await deleteDisplay(initial.id!);
                if (!r.ok) return void toast.error(r.error);
                toast("Display deleted");
                onClose();
              })
            }
          >
            <Trash2 /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending || uploading} onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button disabled={pending || uploading || !v.name || !v.description} onClick={() => save("posted")}>
            {pending ? "Saving…" : "Save and post"}
          </Button>
        </div>
      </div>
    </>
  );
}

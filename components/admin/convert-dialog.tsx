"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckRow, Field } from "@/components/shared/form-bits";
import { SlotFields, TutorSelect } from "@/components/admin/dialogs";
import { makeIvyUpStudent, undoMakeStudent, type SlotInput } from "@/app/admin/actions";
import { shiftDate, todayEt } from "@/lib/time";
import type { StudentStage, StudentWithFamily, Tutor } from "@/lib/types";

export function ConvertDialog({
  open,
  onOpenChange,
  s,
  tutors,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  s: StudentWithFamily;
  tutors: Tutor[];
  onMoved: (st: StudentStage) => void;
}) {
  const [tutorId, setTutorId] = useState("");
  const [withSession, setWithSession] = useState(true);
  const [slot, setSlot] = useState<SlotInput>({ date: shiftDate(todayEt(), 3), time: "17:00", durationMin: 60, weekly: true, zoomLink: "", notes: "", until: "" });
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Make {s.first_name} an IvyUp student</DialogTitle>
          <DialogDescription>Choose their tutor. {s.first_name} moves to Current students and appears in that tutor&apos;s portal.</DialogDescription>
        </DialogHeader>
        <Field label="Tutor" htmlFor="convert-tutor" hint={s.preferred_tutor ? `Family's preference: ${s.preferred_tutor}` : undefined}>
          <TutorSelect id="convert-tutor" tutors={tutors} value={tutorId} onChange={setTutorId} />
        </Field>
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <CheckRow checked={withSession} onCheckedChange={setWithSession}>
            Schedule their weekly session now
          </CheckRow>
          {withSession && (
            <div className="animate-in fade-in duration-200">
              <SlotFields value={slot} onChange={setSlot} allowWeekly />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!tutorId || pending}
            onClick={() =>
              start(async () => {
                const r = await makeIvyUpStudent(s.id, tutorId, withSession ? slot : undefined);
                if (!r.ok) return void toast.error(r.error);
                onMoved("active");
                onOpenChange(false);
                const { prevStage, eventId } = r.data;
                toast.success(`${s.first_name} is an IvyUp student`, {
                  description: "Moved to Current students.",
                  action: { label: "Undo", onClick: () => undoMakeStudent(s.id, prevStage, eventId) },
                });
              })
            }
          >
            {pending ? "Saving…" : "Make IvyUp student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Vertical list reorderable by drag (pointer) or by the up/down buttons
 * (keyboard and touch). Calls onReorder with the new id order.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  render: (item: T) => React.ReactNode;
}) {
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<string | null>(null);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
    onReorder(next.map((i) => i.id));
  }

  return (
    <ul className="flex flex-col gap-2">
      {order.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => {
            setDragging(item.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => setDragging(null)}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging || dragging === item.id) return;
            const from = order.findIndex((o) => o.id === dragging);
            const next = [...order];
            const [x] = next.splice(from, 1);
            next.splice(i, 0, x);
            setOrder(next);
          }}
          onDrop={() => {
            setDragging(null);
            onReorder(order.map((o) => o.id));
          }}
          className={cn(
            "flex items-stretch rounded-xl border border-line bg-surface transition-[box-shadow,opacity,transform] duration-200 ease-soft",
            dragging === item.id && "scale-[0.99] opacity-60 shadow-float",
          )}
        >
          <div className="flex shrink-0 flex-col items-center justify-center border-r border-line text-ink-400">
            <span className="hidden cursor-grab px-2 py-2 active:cursor-grabbing sm:block" aria-hidden>
              <GripVertical className="size-4" />
            </span>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="flex size-9 items-center justify-center hover:text-ink-900 disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="flex size-9 items-center justify-center hover:text-ink-900 disabled:opacity-30">
              <ArrowDown className="size-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">{render(item)}</div>
        </li>
      ))}
    </ul>
  );
}

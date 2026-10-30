import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8 sm:px-8 lg:pt-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-5 w-80" />
      <div className="mt-4 flex gap-8 border-b border-line pb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-36" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>
      ))}
    </div>
  );
}

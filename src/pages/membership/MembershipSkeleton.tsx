import { Skeleton } from "@/components/ui/skeleton";

export function MembershipSkeleton() {
  return (
    <div className="w-full space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-zinc-800" />
            <Skeleton className="h-3 w-48 bg-zinc-800" />
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Skeleton className="h-6 w-16 bg-zinc-800" />
            <Skeleton className="h-2 w-10 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

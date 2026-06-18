import { Skeleton } from "@/components/ui/skeleton";

type ProductGridSkeletonProps = {
  count?: number;
};

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-10"
    >
      {Array.from({ length: count }, (_, index) => `skeleton-${index}`).map((key) => (
        <div key={key} className="flex flex-col">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="mt-3 space-y-2 md:mt-3.5">
            <Skeleton className="h-6 w-1/2 rounded-none" />
            <Skeleton className="h-4 w-4/5 rounded-none" />
            <Skeleton className="h-3 w-1/3 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

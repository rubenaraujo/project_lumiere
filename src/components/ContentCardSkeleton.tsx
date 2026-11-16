import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

// Mirrors ContentCard's layout so nothing jumps when the real card arrives.
const ContentCardSkeleton = () => (
  <Card className="w-full max-w-5xl overflow-hidden bg-card/85 shadow-card" aria-hidden="true" data-testid="content-skeleton">
    <CardContent className="p-5 md:p-8">
      <div className="grid gap-8 md:grid-cols-[minmax(220px,300px)_1fr]">
        <Skeleton className="mx-auto w-full max-w-[300px] aspect-[2/3] rounded-xl md:mx-0" />
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4 md:h-14" />
            <Skeleton className="h-10 w-48 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ContentCardSkeleton;

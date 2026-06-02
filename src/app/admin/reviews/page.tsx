import Link from "next/link";
import { Eye, EyeOff, Star } from "lucide-react";

import { setReviewPublic } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import { getReviews } from "@/lib/supabase/queries";
import type { Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const reviews = await getReviews();

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Reviews"
      description="Approve public reviews or hide customer feedback from public display."
    >
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Customer reviews</CardTitle>
              <Badge variant="secondary">{reviews.length} reviews</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {reviews.length ? (
              reviews.map((review) => <ReviewCard key={review.id} review={review} />)
            ) : (
              <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center">
                <div>
                  <p className="font-medium">No reviews yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted customer reviews will appear here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPage>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="grid gap-4 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">
            {review.customer?.full_name ?? "Customer"} -{" "}
            {review.booking?.service_name ?? "Booking"}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {review.booking?.booking_reference ?? review.booking_id}
          </p>
        </div>
        <Badge variant={review.public ? "default" : "secondary"}>
          {review.public ? "Public" : "Hidden"}
        </Badge>
      </div>
      <div className="flex gap-1 text-primary">
        {Array.from({ length: review.rating }).map((_, index) => (
          <Star key={index} className="size-4 fill-current" />
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{review.review_text}</p>
      <div className="flex flex-wrap gap-2">
        <ReviewVisibilityForm reviewId={review.id} isPublic />
        <ReviewVisibilityForm reviewId={review.id} isPublic={false} />
      </div>
    </div>
  );
}

function ReviewVisibilityForm({
  reviewId,
  isPublic,
}: {
  reviewId: string;
  isPublic: boolean;
}) {
  return (
    <form action={setReviewPublic}>
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="public" value={String(isPublic)} />
      <Button type="submit" size="sm" variant={isPublic ? "outline" : "destructive"}>
        {isPublic ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        {isPublic ? "Approve public" : "Hide"}
      </Button>
    </form>
  );
}

function SetupNotice({ message }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>Supabase V1.5 migration is required</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{message}</p>
          <Link href="/admin/bookings" className={buttonVariants({ className: "w-fit" })}>
            Back to bookings
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

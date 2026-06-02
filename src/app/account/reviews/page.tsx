import { MessageSquare, Star } from "lucide-react";

import { submitCustomerReview } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireCustomer } from "@/lib/auth";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import {
  getCustomerBookings,
  getCustomerReviews,
} from "@/lib/supabase/queries";
import type { BookingWithService, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountReviewsPage() {
  const { customer } = await requireCustomer("/account/reviews");
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const [bookings, reviews] = await Promise.all([
    getCustomerBookings(customer.id),
    getCustomerReviews(customer.id),
  ]);
  const reviewByBookingId = new Map(reviews.map((review) => [review.booking_id, review]));
  const completedBookings = bookings.filter((booking) => booking.status === "Completed");

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Reviews</h2>
        <p className="mt-2 text-muted-foreground">
          Share feedback after a completed Shalean cleaning.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Your review cards</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {completedBookings.length ? (
            completedBookings.map((booking) => (
              <ReviewCard
                key={booking.id}
                booking={booking}
                review={reviewByBookingId.get(booking.id)}
              />
            ))
          ) : (
            <div className="grid min-h-36 place-items-center rounded-lg border border-dashed p-5 text-center">
              <div>
                <MessageSquare className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 font-medium">No completed bookings yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review forms appear after completed bookings.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewCard({
  booking,
  review,
}: {
  booking: BookingWithService;
  review?: Review;
}) {
  return (
    <div className="grid gap-4 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {booking.booking_reference}
          </p>
          <p className="mt-1 font-medium">{booking.service_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.booking_date} at {booking.booking_time.slice(0, 5)}
          </p>
        </div>
        {review ? (
          <Badge variant={review.public ? "default" : "secondary"}>
            {review.public ? "Public" : "Private"}
          </Badge>
        ) : null}
      </div>

      {review ? (
        <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
          <div className="flex gap-1 text-primary">
            {Array.from({ length: review.rating }).map((_, index) => (
              <Star key={index} className="size-4 fill-current" />
            ))}
          </div>
          <p className="leading-6 text-muted-foreground">{review.review_text}</p>
        </div>
      ) : (
        <form action={submitCustomerReview} className="grid gap-3">
          <input type="hidden" name="booking_id" value={booking.id} />
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Rating</span>
            <select
              name="rating"
              defaultValue="5"
              className="h-10 rounded-lg border border-input bg-background px-3"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Review text</span>
            <Textarea
              name="review_text"
              className="min-h-28"
              placeholder="Tell us how your cleaning went."
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="public" className="size-4 accent-primary" />
            Allow Shalean to display this publicly
          </label>
          <Button type="submit" className="w-fit">
            Submit review
          </Button>
        </form>
      )}
    </div>
  );
}

function SetupNotice({ message }: { message?: string }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Supabase V1.5 migration is required</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

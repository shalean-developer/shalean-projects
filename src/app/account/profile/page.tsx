import { ProfileForm } from "@/components/account/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCustomer } from "@/lib/auth";

export default async function AccountProfilePage() {
  const { customer } = await requireCustomer("/account/profile");

  return (
    <div className="grid max-w-2xl gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Profile</h2>
        <p className="mt-2 text-muted-foreground">
          Keep your contact details ready for future bookings.
        </p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm customer={customer} />
        </CardContent>
      </Card>
    </div>
  );
}

import { MapPin, Star } from "lucide-react";

import {
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from "@/app/actions";
import { AddressForm } from "@/components/account/address-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses } from "@/lib/supabase/queries";

export default async function AccountAddressesPage() {
  const { customer } = await requireCustomer("/account/addresses");
  const addresses = await getCustomerAddresses(customer.id);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Saved addresses</h2>
        <p className="mt-2 text-muted-foreground">
          Reuse addresses and access notes when booking a cleaning.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          {addresses.length ? (
            addresses.map((address) => (
              <Card key={address.id} className="rounded-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <CardTitle>{address.label}</CardTitle>
                    </div>
                    {address.is_default ? <Badge>Default</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <p>{address.address}</p>
                    <p>
                      {address.suburb}, {address.city}
                    </p>
                  </div>
                  {(address.access_instructions ||
                    address.gate_code ||
                    address.parking_instructions) ? (
                    <>
                      <Separator />
                      <div className="grid gap-2 text-sm">
                        {address.access_instructions ? (
                          <DetailRow label="Access" value={address.access_instructions} />
                        ) : null}
                        {address.gate_code ? (
                          <DetailRow label="Gate code" value={address.gate_code} />
                        ) : null}
                        {address.parking_instructions ? (
                          <DetailRow label="Parking" value={address.parking_instructions} />
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <AddressForm address={address} />
                    <div className="flex gap-2 lg:flex-col">
                      {!address.is_default ? (
                        <form action={setDefaultCustomerAddress}>
                          <input type="hidden" name="address_id" value={address.id} />
                          <Button type="submit" variant="outline">
                            <Star className="size-4" />
                            Default
                          </Button>
                        </form>
                      ) : null}
                      <form action={deleteCustomerAddress}>
                        <input type="hidden" name="address_id" value={address.id} />
                        <Button type="submit" variant="destructive">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-lg border-dashed">
              <CardContent className="grid min-h-48 place-items-center text-center">
                <div className="grid gap-2">
                  <p className="font-medium">No saved addresses yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first address to speed up future bookings.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit rounded-lg">
          <CardHeader>
            <CardTitle>Add address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  );
}

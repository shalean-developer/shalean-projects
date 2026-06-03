import {
  createPriceManagedService,
  deletePriceManagedService,
  deleteServiceAddon,
  deleteServicePricingRule,
  updatePriceManagedService,
  upsertServiceAddon,
  upsertServicePricingRule,
} from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceConfig } from "@/config/services";
import { formatRand } from "@/lib/pricing";
import { getPricingHistory, getServiceConfigs } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [services, history] = await Promise.all([
    getServiceConfigs({ includeInactive: true }),
    getPricingHistory(),
  ]);
  const activeServices = services.filter((service) => service.active);
  const activeAddons = services.flatMap((service) =>
    service.addons.filter((addon) => addon.active !== false)
  );

  return (
    <AdminPage
      title="Price Management"
      description="Manage services, base prices, room and bathroom pricing, add-ons, service fees, special rules, and pricing history."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Active services" value={String(activeServices.length)} />
        <MetricCard title="Active add-ons" value={String(activeAddons.length)} />
        <MetricCard
          title="Lowest base"
          value={
            activeServices.length
              ? formatRand(Math.min(...activeServices.map((service) => service.basePrice)))
              : formatRand(0)
          }
        />
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Create service</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm action={createPriceManagedService} />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        {services.map((service) => (
          <ServiceManagementCard key={service.id} service={service} />
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Pricing history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {history.length ? (
            history.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-lg border bg-background p-3 md:grid-cols-[180px_1fr_auto] md:items-center"
              >
                <span className="font-medium">{item.change_type}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {JSON.stringify(item.snapshot)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatTimestamp(item.created_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Pricing changes will appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function ServiceManagementCard({ service }: { service: ServiceConfig }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{service.name}</CardTitle>
          <StatusBadge status={service.active ? "Active" : "Inactive"} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ServiceForm action={updatePriceManagedService} service={service} />

        <div className="grid gap-3">
          <h3 className="font-semibold">Extras and add-ons</h3>
          <div className="grid gap-3">
            {service.addons.map((addon) => (
              <form
                key={addon.dbId ?? addon.id}
                action={upsertServiceAddon}
                className="grid gap-2 rounded-lg border bg-background p-3 md:grid-cols-[1fr_1.5fr_120px_auto_auto] md:items-end"
              >
                <input type="hidden" name="service_id" value={service.id} />
                <input type="hidden" name="addon_id" value={addon.dbId ?? ""} />
                <Field label="Key">
                  <Input name="addon_key" defaultValue={addon.id} />
                </Field>
                <Field label="Label">
                  <Input name="label" defaultValue={addon.label} />
                </Field>
                <Field label="Price">
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={addon.price} />
                </Field>
                <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={addon.active !== false}
                    className="size-4 accent-primary"
                  />
                  Active
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    formAction={deleteServiceAddon}
                    type="submit"
                    size="sm"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </div>
              </form>
            ))}
          </div>
          <form
            action={upsertServiceAddon}
            className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1.5fr_120px_auto] md:items-end"
          >
            <input type="hidden" name="service_id" value={service.id} />
            <Field label="Key">
              <Input name="addon_key" placeholder="inside_fridge" />
            </Field>
            <Field label="Label">
              <Input name="label" placeholder="Inside fridge" />
            </Field>
            <Field label="Price">
              <Input name="price" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
              <input name="active" type="checkbox" defaultChecked className="size-4 accent-primary" />
              Active
            </label>
            <Button type="submit" className="md:col-span-4">
              Add extra
            </Button>
          </form>
        </div>

        <div className="grid gap-3">
          <h3 className="font-semibold">Special pricing rules</h3>
          <div className="grid gap-3">
            {service.pricingRules.map((rule) => (
              <form
                key={rule.id}
                action={upsertServicePricingRule}
                className="grid gap-2 rounded-lg border bg-background p-3 lg:grid-cols-[1fr_130px_130px_120px_130px_130px_auto] lg:items-end"
              >
                <input type="hidden" name="service_id" value={service.id} />
                <input type="hidden" name="rule_id" value={rule.id} />
                <Field label="Name">
                  <Input name="name" defaultValue={rule.name} />
                </Field>
                <Field label="Rule type">
                  <Input name="rule_type" defaultValue={rule.ruleType} />
                </Field>
                <Field label="Adjustment">
                  <select
                    name="adjustment_type"
                    defaultValue={rule.adjustmentType}
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="flat">Flat</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </Field>
                <Field label="Value">
                  <Input
                    name="adjustment_value"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={rule.adjustmentValue}
                  />
                </Field>
                <Field label="Starts">
                  <Input name="starts_at" type="datetime-local" defaultValue={formatLocalDateTime(rule.startsAt)} />
                </Field>
                <Field label="Ends">
                  <Input name="ends_at" type="datetime-local" defaultValue={formatLocalDateTime(rule.endsAt)} />
                </Field>
                <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
                  <input name="active" type="checkbox" defaultChecked={rule.active} className="size-4 accent-primary" />
                  Active
                </label>
                <Textarea name="notes" defaultValue={rule.notes} placeholder="Notes" className="lg:col-span-6" />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    formAction={deleteServicePricingRule}
                    type="submit"
                    size="sm"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </div>
              </form>
            ))}
          </div>
          <form
            action={upsertServicePricingRule}
            className="grid gap-2 rounded-lg border border-dashed p-3 lg:grid-cols-[1fr_130px_130px_120px_auto] lg:items-end"
          >
            <input type="hidden" name="service_id" value={service.id} />
            <Field label="Name">
              <Input name="name" placeholder="Weekend surcharge" />
            </Field>
            <Field label="Rule type">
              <Input name="rule_type" defaultValue="manual" />
            </Field>
            <Field label="Adjustment">
              <select name="adjustment_type" defaultValue="flat" className="h-9 rounded-lg border bg-background px-3 text-sm">
                <option value="flat">Flat</option>
                <option value="percentage">Percentage</option>
              </select>
            </Field>
            <Field label="Value">
              <Input name="adjustment_value" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
              <input name="active" type="checkbox" defaultChecked className="size-4 accent-primary" />
              Active
            </label>
            <Textarea name="notes" placeholder="Rule notes" className="lg:col-span-5" />
            <Button type="submit" className="lg:col-span-5">
              Add rule
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceForm({
  action,
  service,
}: {
  action: (formData: FormData) => Promise<void>;
  service?: ServiceConfig;
}) {
  return (
    <form action={action} className="grid gap-3">
      {service ? <input type="hidden" name="service_id" value={service.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input name="name" required defaultValue={service?.name ?? ""} />
        </Field>
        <Field label="Slug">
          <Input name="slug" defaultValue={service?.slug ?? ""} placeholder="regular-cleaning" />
        </Field>
        <Field label="Short description">
          <Input name="short_description" defaultValue={service?.shortDescription ?? ""} />
        </Field>
        <Field label="Duration minutes">
          <Input
            name="duration_minutes"
            type="number"
            min="0"
            step="1"
            defaultValue={service?.durationMinutes ?? 180}
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea name="description" defaultValue={service?.description ?? ""} rows={3} />
      </Field>
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Base price">
          <Input name="base_price" type="number" min="0" step="0.01" defaultValue={service?.basePrice ?? 0} />
        </Field>
        <Field label="Room price">
          <Input name="room_price" type="number" min="0" step="0.01" defaultValue={service?.roomPrice ?? 0} />
        </Field>
        <Field label="Bathroom price">
          <Input name="bathroom_price" type="number" min="0" step="0.01" defaultValue={service?.bathroomPrice ?? 0} />
        </Field>
        <Field label="Service fee type">
          <select
            name="service_fee_type"
            defaultValue={service?.serviceFeeType ?? "flat"}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="flat">Flat</option>
            <option value="percentage">Percentage</option>
          </select>
        </Field>
        <Field label="Service fee">
          <Input name="service_fee_amount" type="number" min="0" step="0.01" defaultValue={service?.serviceFeeAmount ?? 0} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Question schema JSON">
          <Textarea
            name="question_schema"
            rows={7}
            defaultValue={JSON.stringify(service?.questions ?? [], null, 2)}
          />
        </Field>
        <div className="grid gap-3">
          <Field label="Benefits">
            <Textarea name="benefits" rows={3} defaultValue={(service?.benefits ?? []).join("\n")} />
          </Field>
          <Field label="Included">
            <Textarea name="included" rows={3} defaultValue={(service?.included ?? []).join("\n")} />
          </Field>
        </div>
      </div>
      <Field label="Pricing rule notes">
        <Textarea name="pricing_rule_notes" defaultValue={service?.pricingRuleNotes ?? ""} rows={2} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={service?.active ?? true}
            className="size-4 accent-primary"
          />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit">{service ? "Save service" : "Create service"}</Button>
          {service ? (
            <Button
              formAction={deletePriceManagedService}
              type="submit"
              variant="destructive"
            >
              Delete service
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

import type { ServiceAddon, ServiceConfig } from "@/config/services";

export function formatRand(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateEstimatedTotal(
  service: ServiceConfig,
  selectedAddonIds: string[]
) {
  const addonTotal = getSelectedAddons(service, selectedAddonIds).reduce(
    (total, addon) => total + addon.price,
    0
  );

  return service.basePrice + addonTotal;
}

export function getSelectedAddons(
  service: ServiceConfig,
  selectedAddonIds: string[]
): ServiceAddon[] {
  const selectedIds = new Set(selectedAddonIds);
  return service.addons.filter((addon) => selectedIds.has(addon.id));
}

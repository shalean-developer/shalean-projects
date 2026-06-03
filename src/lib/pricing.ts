import type { ServiceAddon, ServiceConfig } from "@/config/services";

export type ServiceDataValues = Record<string, string | number | undefined>;

export type PricingBreakdown = {
  basePrice: number;
  roomCount: number;
  roomTotal: number;
  bathroomCount: number;
  bathroomTotal: number;
  addonTotal: number;
  specialPricingTotal: number;
  subtotal: number;
  serviceFee: number;
  total: number;
};

export function formatRand(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateEstimatedTotal(
  service: ServiceConfig,
  selectedAddonIds: string[],
  serviceData: ServiceDataValues = {}
) {
  return calculateBookingPricing(
    service,
    selectedAddonIds,
    serviceData
  ).total;
}

export function calculateBookingPricing(
  service: ServiceConfig,
  selectedAddonIds: string[],
  serviceData: ServiceDataValues = {}
): PricingBreakdown {
  const selectedAddons = getSelectedAddons(service, selectedAddonIds);
  const addonTotal = selectedAddons.reduce(
    (total, addon) => total + addon.price,
    0
  );
  const roomCount = getCountFromServiceData(serviceData, [
    "bedrooms",
    "number_of_rooms",
    "rooms",
  ]);
  const bathroomCount = getCountFromServiceData(serviceData, [
    "bathrooms",
    "number_of_bathrooms",
  ]);
  const roomTotal = roomCount * service.roomPrice;
  const bathroomTotal = bathroomCount * service.bathroomPrice;
  const baseSubtotal =
    service.basePrice + roomTotal + bathroomTotal + addonTotal;
  const specialPricingTotal = getSpecialPricingAdjustment(service, baseSubtotal);
  const subtotal = roundMoney(baseSubtotal + specialPricingTotal);
  const serviceFee =
    service.serviceFeeType === "percentage"
      ? roundMoney(subtotal * (service.serviceFeeAmount / 100))
      : roundMoney(service.serviceFeeAmount);

  return {
    basePrice: roundMoney(service.basePrice),
    roomCount,
    roomTotal: roundMoney(roomTotal),
    bathroomCount,
    bathroomTotal: roundMoney(bathroomTotal),
    addonTotal: roundMoney(addonTotal),
    specialPricingTotal: roundMoney(specialPricingTotal),
    subtotal,
    serviceFee,
    total: roundMoney(subtotal + serviceFee),
  };
}

export function getSelectedAddons(
  service: ServiceConfig,
  selectedAddonIds: string[]
): ServiceAddon[] {
  const selectedIds = new Set(selectedAddonIds);
  return service.addons.filter(
    (addon) => addon.active !== false && selectedIds.has(addon.id)
  );
}

function getCountFromServiceData(
  serviceData: ServiceDataValues,
  keys: string[]
) {
  for (const key of keys) {
    const value = Number(serviceData[key] ?? 0);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function getSpecialPricingAdjustment(service: ServiceConfig, subtotal: number) {
  const now = Date.now();

  return service.pricingRules
    .filter((rule) => {
      if (!rule.active) {
        return false;
      }

      const startsAt = rule.startsAt ? new Date(rule.startsAt).getTime() : null;
      const endsAt = rule.endsAt ? new Date(rule.endsAt).getTime() : null;

      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    })
    .reduce((total, rule) => {
      const adjustment =
        rule.adjustmentType === "percentage"
          ? subtotal * (rule.adjustmentValue / 100)
          : rule.adjustmentValue;

      return total + adjustment;
    }, 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

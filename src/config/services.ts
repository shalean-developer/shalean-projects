export type ServiceQuestionType = "number" | "text" | "time" | "select" | "textarea";

export type ServiceQuestion = {
  id: string;
  label: string;
  type: ServiceQuestionType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type ServiceAddon = {
  id: string;
  label: string;
  price: number;
};

export type ServiceConfig = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  questions: ServiceQuestion[];
  addons: ServiceAddon[];
  benefits: string[];
  included: string[];
};

const frequencyOptions = ["Once-Off", "Weekly", "Bi-Weekly", "Monthly"];

export const services = [
  {
    slug: "regular-cleaning",
    name: "Regular Cleaning",
    shortDescription: "Reliable upkeep for homes that need a fresh, consistent clean.",
    description:
      "A practical home cleaning service for once-off refreshes or recurring weekly, bi-weekly, and monthly upkeep.",
    basePrice: 650,
    durationMinutes: 180,
    questions: [
      { id: "bedrooms", label: "Bedrooms", type: "number", required: true },
      { id: "bathrooms", label: "Bathrooms", type: "number", required: true },
      {
        id: "cleaning_frequency",
        label: "Cleaning Frequency",
        type: "select",
        required: true,
        options: frequencyOptions,
      },
    ],
    addons: [
      { id: "inside_fridge_cleaning", label: "Inside Fridge Cleaning", price: 120 },
      { id: "inside_oven_cleaning", label: "Inside Oven Cleaning", price: 150 },
      { id: "interior_window_cleaning", label: "Interior Window Cleaning", price: 180 },
      { id: "laundry_folding", label: "Laundry Folding", price: 100 },
      { id: "dishwashing", label: "Dishwashing", price: 90 },
      { id: "extra_bathroom_cleaning", label: "Extra Bathroom Cleaning", price: 140 },
    ],
    benefits: [
      "Keeps the home consistently presentable",
      "Flexible frequency for changing household needs",
      "Simple add-ons for common household extras",
    ],
    included: [
      "Kitchen and bathroom surface cleaning",
      "Bedroom and living area dusting",
      "Floor sweeping and mopping",
      "General tidying and rubbish removal",
    ],
  },
  {
    slug: "airbnb-cleaning",
    name: "Airbnb Cleaning",
    shortDescription: "Fast, guest-ready turnovers for short-stay properties.",
    description:
      "A turnover-focused clean for Airbnb hosts who need reliable reset timing between check-out and check-in.",
    basePrice: 850,
    durationMinutes: 210,
    questions: [
      { id: "bedrooms", label: "Bedrooms", type: "number", required: true },
      { id: "bathrooms", label: "Bathrooms", type: "number", required: true },
      { id: "check_out_time", label: "Check-Out Time", type: "time", required: true },
      { id: "check_in_time", label: "Check-In Time", type: "time", required: true },
    ],
    addons: [
      { id: "linen_change", label: "Linen Change", price: 160 },
      { id: "towel_replacement", label: "Towel Replacement", price: 90 },
      { id: "restock_guest_supplies", label: "Restock Guest Supplies", price: 130 },
      { id: "key_handover_support", label: "Key Handover Support", price: 180 },
      { id: "same_day_turnover_priority", label: "Same-Day Turnover Priority", price: 250 },
      { id: "property_inspection_report", label: "Property Inspection Report", price: 120 },
    ],
    benefits: [
      "Designed around guest turnover timing",
      "Helps protect ratings and arrival experience",
      "Optional supply and inspection support",
    ],
    included: [
      "Kitchen and bathroom cleaning",
      "Bedroom reset and presentation",
      "Floor cleaning and rubbish removal",
      "Guest-ready final check",
    ],
  },
  {
    slug: "office-cleaning",
    name: "Office Cleaning",
    shortDescription: "Professional workspace cleaning for small teams and offices.",
    description:
      "A workplace cleaning service that keeps desks, shared spaces, kitchens, and bathrooms ready for productive days.",
    basePrice: 900,
    durationMinutes: 240,
    questions: [
      { id: "office_size_sqm", label: "Office Size (sqm)", type: "number", required: true },
      { id: "number_of_employees", label: "Number of Employees", type: "number", required: true },
      { id: "number_of_bathrooms", label: "Number of Bathrooms", type: "number", required: true },
      {
        id: "cleaning_frequency",
        label: "Cleaning Frequency",
        type: "select",
        required: true,
        options: frequencyOptions,
      },
    ],
    addons: [
      { id: "desk_sanitising", label: "Desk Sanitising", price: 160 },
      { id: "kitchen_cleaning", label: "Kitchen Cleaning", price: 180 },
      { id: "boardroom_cleaning", label: "Boardroom Cleaning", price: 120 },
      { id: "bin_liner_replacement", label: "Bin Liner Replacement", price: 80 },
      { id: "after_hours_cleaning", label: "After-Hours Cleaning", price: 260 },
      { id: "consumables_restocking", label: "Consumables Restocking", price: 140 },
    ],
    benefits: [
      "Supports a cleaner daily work environment",
      "Scales to office size and team count",
      "After-hours options reduce workplace disruption",
    ],
    included: [
      "Desk and surface wipe-downs",
      "Shared kitchen cleaning",
      "Bathroom cleaning",
      "Floor and bin service",
    ],
  },
  {
    slug: "carpet-cleaning",
    name: "Carpet Cleaning",
    shortDescription: "Focused carpet care for rooms, rugs, stains, and odours.",
    description:
      "A carpet-specific cleaning service with optional treatments for stains, pets, high-traffic zones, and faster drying.",
    basePrice: 750,
    durationMinutes: 180,
    questions: [
      { id: "number_of_rooms", label: "Number of Rooms", type: "number", required: true },
      {
        id: "carpet_area",
        label: "Carpet Area",
        type: "text",
        required: true,
        placeholder: "e.g. 45 sqm or lounge and hallway",
      },
      {
        id: "stain_treatment_required",
        label: "Stain Treatment Required",
        type: "select",
        required: true,
        options: ["No", "Yes"],
      },
    ],
    addons: [
      { id: "stain_removal_treatment", label: "Stain Removal Treatment", price: 180 },
      { id: "pet_odour_treatment", label: "Pet Odour Treatment", price: 220 },
      { id: "rug_cleaning", label: "Rug Cleaning", price: 160 },
      { id: "fabric_protection", label: "Fabric Protection", price: 240 },
      { id: "quick_dry_treatment", label: "Quick Dry Treatment", price: 180 },
      { id: "high_traffic_area_treatment", label: "High-Traffic Area Treatment", price: 190 },
    ],
    benefits: [
      "Targets carpet condition rather than generic room cleaning",
      "Useful for stains, odours, and worn walkways",
      "Optional protection helps carpets stay cleaner longer",
    ],
    included: [
      "Carpet assessment",
      "Standard carpet cleaning",
      "Room-by-room treatment plan",
      "Post-clean care guidance",
    ],
  },
  {
    slug: "moving-cleaning",
    name: "Moving Cleaning",
    shortDescription: "Detailed move-in and move-out cleaning for empty or furnished homes.",
    description:
      "A thorough property clean for tenants, owners, and agents preparing a home before or after a move.",
    basePrice: 1500,
    durationMinutes: 360,
    questions: [
      {
        id: "property_type",
        label: "Property Type",
        type: "select",
        required: true,
        options: ["Apartment", "Townhouse", "House", "Commercial Unit"],
      },
      { id: "bedrooms", label: "Bedrooms", type: "number", required: true },
      { id: "bathrooms", label: "Bathrooms", type: "number", required: true },
      {
        id: "property_condition",
        label: "Property Condition",
        type: "select",
        required: true,
        options: ["Lightly Used", "Average", "Needs Heavy Cleaning"],
      },
      {
        id: "furnished_or_empty",
        label: "Furnished or Empty",
        type: "select",
        required: true,
        options: ["Furnished", "Empty"],
      },
    ],
    addons: [
      { id: "garage_cleaning", label: "Garage Cleaning", price: 220 },
      { id: "balcony_cleaning", label: "Balcony Cleaning", price: 160 },
      { id: "cupboard_interior_cleaning", label: "Cupboard Interior Cleaning", price: 200 },
      { id: "wall_spot_cleaning", label: "Wall Spot Cleaning", price: 180 },
      { id: "appliance_cleaning", label: "Appliance Cleaning", price: 260 },
      { id: "post_renovation_dust_removal", label: "Post-Renovation Dust Removal", price: 320 },
    ],
    benefits: [
      "Helps prepare properties for handover",
      "Captures condition and furnishing details upfront",
      "Add-ons cover move-specific problem areas",
    ],
    included: [
      "Kitchen and bathroom deep clean",
      "Interior surface cleaning",
      "Floor cleaning",
      "Move-ready final pass",
    ],
  },
  {
    slug: "deep-cleaning",
    name: "Deep Cleaning",
    shortDescription: "Detailed cleaning for neglected, high-use, or hard-to-reach areas.",
    description:
      "A more intensive clean for kitchens, bathrooms, cupboards, appliance zones, and other areas needing extra attention.",
    basePrice: 1200,
    durationMinutes: 300,
    questions: [
      { id: "bedrooms", label: "Bedrooms", type: "number", required: true },
      { id: "bathrooms", label: "Bathrooms", type: "number", required: true },
      {
        id: "areas_requiring_extra_attention",
        label: "Areas Requiring Extra Attention",
        type: "textarea",
        required: true,
        placeholder: "e.g. kitchen tiles, main bathroom, cupboards",
      },
    ],
    addons: [
      { id: "grout_scrubbing", label: "Grout Scrubbing", price: 190 },
      { id: "cabinet_interior_cleaning", label: "Cabinet Interior Cleaning", price: 210 },
      { id: "behind_appliance_cleaning", label: "Behind Appliance Cleaning", price: 240 },
      { id: "mould_treatment", label: "Mould Treatment", price: 260 },
      { id: "heavy_degreasing", label: "Heavy Degreasing", price: 230 },
      { id: "skirting_baseboard_cleaning", label: "Skirting/Baseboard Cleaning", price: 170 },
    ],
    benefits: [
      "Best for detailed resets beyond routine cleaning",
      "Captures extra-attention areas before booking",
      "Optional treatments support tougher jobs",
    ],
    included: [
      "Kitchen and bathroom detail cleaning",
      "High-touch surface cleaning",
      "Focused dust and grime removal",
      "Detailed floor finish",
    ],
  },
] satisfies ServiceConfig[];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getServiceByName(name: string) {
  return services.find((service) => service.name === name);
}

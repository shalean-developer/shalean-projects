export type PublicService = {
  slug: string;
  bookingSlug: string;
  name: string;
  shortName: string;
  title: string;
  description: string;
  shortDescription: string;
  bestFor: string;
  fromPrice: string;
  included: string[];
  audience: string[];
  benefits: string[];
  addons: string[];
  faqs: { question: string; answer: string }[];
};

export const publicServices: PublicService[] = [
  {
    slug: "standard-cleaning-cape-town",
    bookingSlug: "regular-cleaning",
    name: "Standard Cleaning",
    shortName: "Standard",
    title: "Standard Cleaning in Cape Town",
    shortDescription:
      "Reliable regular cleaning for Cape Town homes, apartments, and everyday living spaces.",
    description:
      "Shalean standard cleaning keeps your home fresh, orderly, and easy to enjoy. It is ideal for weekly, bi-weekly, monthly, and once-off upkeep across Cape Town suburbs.",
    bestFor: "Busy households, regular upkeep, and lighter once-off home cleans.",
    fromPrice: "from R350",
    included: [
      "Kitchen counters, sinks, appliance exteriors, and general wipe-downs",
      "Bathroom surface cleaning, mirrors, toilets, basins, and showers",
      "Bedroom, lounge, and passage dusting with floors swept and mopped",
      "General tidying, rubbish removal, and a final freshness check",
    ],
    audience: [
      "Homes that need consistent maintenance rather than a heavy reset",
      "Families, professionals, and tenants who want dependable cleaner visits",
      "Customers booking a once-off refresh before guests arrive",
    ],
    benefits: [
      "Simple online booking with a service-specific cleaning brief",
      "Flexible recurring options for changing household routines",
      "A practical scope that keeps high-use rooms looking presentable",
    ],
    addons: [
      "Interior window cleaning",
      "Extra bathroom detail",
      "Fridge or oven interior",
      "Laundry folding support",
    ],
    faqs: [
      {
        question: "Is standard cleaning suitable for a first booking?",
        answer:
          "Yes. If the home is generally maintained, standard cleaning is a good first booking. If there is heavy grime or long-neglected detail work, choose deep cleaning.",
      },
      {
        question: "Can I book standard cleaning every week?",
        answer:
          "Yes. You can request once-off or recurring cleaning and choose the frequency that fits your Cape Town home.",
      },
    ],
  },
  {
    slug: "deep-cleaning-cape-town",
    bookingSlug: "deep-cleaning",
    name: "Deep Cleaning",
    shortName: "Deep",
    title: "Deep Cleaning in Cape Town",
    shortDescription:
      "Detailed cleaning for kitchens, bathrooms, built-up dust, and hard-to-reach areas.",
    description:
      "Deep cleaning is a more intensive clean for Cape Town homes that need a proper reset. The team focuses on high-use rooms, stubborn build-up, edges, fixtures, and the areas that ordinary upkeep often misses.",
    bestFor: "Seasonal resets, neglected spaces, post-renovation dust, and detailed home care.",
    fromPrice: "from R750",
    included: [
      "Kitchen and bathroom detail cleaning with extra attention to build-up",
      "High-touch surfaces, skirting, fixtures, switches, and visible marks",
      "Focused dust, grime, and floor finishing throughout selected rooms",
      "Cleaner notes for areas that need special attention before arrival",
    ],
    audience: [
      "Homes that have not had a detailed clean recently",
      "Customers preparing for a regular cleaning routine",
      "Properties needing extra bathroom, kitchen, or cupboard attention",
    ],
    benefits: [
      "More detailed scope than routine cleaning",
      "Ideal before recurring standard cleaning starts",
      "Targeted add-ons for tougher Cape Town household cleaning jobs",
    ],
    addons: [
      "Grout scrubbing",
      "Cabinet interior cleaning",
      "Behind-appliance cleaning",
      "Mould treatment",
    ],
    faqs: [
      {
        question: "How is deep cleaning different from standard cleaning?",
        answer:
          "Deep cleaning is more detailed and time-intensive, with added focus on build-up, fixtures, corners, and high-use spaces.",
      },
      {
        question: "Should I book deep cleaning before recurring service?",
        answer:
          "It is often the best starting point if the home needs a reset before regular maintenance visits.",
      },
    ],
  },
  {
    slug: "move-out-cleaning-cape-town",
    bookingSlug: "moving-cleaning",
    name: "Move-out Cleaning",
    shortName: "Move-out",
    title: "Move-out Cleaning in Cape Town",
    shortDescription:
      "Move-in and move-out cleaning for tenants, owners, landlords, and agents.",
    description:
      "Shalean move-out cleaning helps prepare Cape Town properties for handover, sale, rental, or new occupants. The scope is designed for empty or furnished homes that need a thorough final pass.",
    bestFor: "Lease handovers, pre-sale preparation, move-in resets, and vacant homes.",
    fromPrice: "from R900",
    included: [
      "Kitchen and bathroom deep cleaning for handover readiness",
      "Interior surfaces, cupboards on request, floors, and visible marks",
      "Room-by-room cleaning for furnished or empty properties",
      "Move-ready final pass for owners, agents, or tenants",
    ],
    audience: [
      "Tenants preparing to leave a property",
      "Landlords and agents between occupancies",
      "Homeowners who want a clean start before moving in",
    ],
    benefits: [
      "Built around property condition and furnishing details",
      "Useful for deposits, inspections, and listing preparation",
      "Add-ons cover common handover pressure points",
    ],
    addons: [
      "Oven interior",
      "Fridge interior",
      "Cabinet interiors",
      "Balcony or patio sweep",
    ],
    faqs: [
      {
        question: "Can you clean furnished and empty properties?",
        answer:
          "Yes. The booking flow captures whether the property is furnished or empty so the clean can be planned correctly.",
      },
      {
        question: "Is move-out cleaning guaranteed for deposit return?",
        answer:
          "No cleaning company can guarantee an inspection result, but the service is designed to support a strong handover clean.",
      },
    ],
  },
  {
    slug: "airbnb-cleaning-cape-town",
    bookingSlug: "airbnb-cleaning",
    name: "Airbnb Cleaning",
    shortName: "Airbnb",
    title: "Airbnb Cleaning in Cape Town",
    shortDescription:
      "Guest-ready turnover cleaning for short-stay properties and holiday rentals.",
    description:
      "Airbnb cleaning is designed for Cape Town hosts who need reliable turnovers between check-out and check-in. Shalean focuses on presentation, timing, and the guest-facing details that protect reviews.",
    bestFor: "Short-stay apartments, holiday homes, guest suites, and rapid turnovers.",
    fromPrice: "from R450",
    included: [
      "Kitchen, bathroom, bedroom, and lounge reset after guest stays",
      "Guest-ready presentation and visible surface cleaning",
      "Floor cleaning, rubbish removal, and final walkthrough",
      "Timing details captured for check-out and check-in windows",
    ],
    audience: [
      "Cape Town Airbnb and short-stay hosts",
      "Property managers handling multiple turnovers",
      "Owners who want consistent guest arrival standards",
    ],
    benefits: [
      "Built around turnover timing",
      "Supports better guest experience and cleaner reviews",
      "Optional restocking and inspection add-ons available",
    ],
    addons: [
      "Linen change",
      "Towel replacement",
      "Restock guest supplies",
      "Property inspection report",
    ],
    faqs: [
      {
        question: "Can I request same-day Airbnb cleaning?",
        answer:
          "Yes, same-day turnover requests can be made through the booking flow, subject to availability in your area.",
      },
      {
        question: "Do you replace linen and towels?",
        answer:
          "Linen and towel handling can be requested as add-ons when supplies are available at the property.",
      },
    ],
  },
  {
    slug: "office-cleaning-cape-town",
    bookingSlug: "office-cleaning",
    name: "Office Cleaning",
    shortName: "Office",
    title: "Office Cleaning in Cape Town",
    shortDescription:
      "Professional cleaning for small offices, teams, studios, and shared workspaces.",
    description:
      "Office cleaning keeps workspaces healthier, more organised, and more welcoming. Shalean supports Cape Town offices with practical cleaning for desks, shared kitchens, bathrooms, floors, and team areas.",
    bestFor: "Small businesses, studios, professional offices, and shared workspaces.",
    fromPrice: "from R450",
    included: [
      "Desk, surface, and shared-area wipe-downs",
      "Kitchen, bathroom, bin, and floor service",
      "Cleaning scaled to office size and employee count",
      "Frequency options for once-off, weekly, bi-weekly, or monthly visits",
    ],
    audience: [
      "Cape Town teams needing recurring workplace cleaning",
      "Small offices that need after-hours or low-disruption cleaning",
      "Studios, agencies, practices, and light commercial spaces",
    ],
    benefits: [
      "Professional appearance for teams and visitors",
      "Cleaner shared surfaces and better day-to-day comfort",
      "Service questions capture size, staff count, and frequency",
    ],
    addons: [
      "Desk sanitising",
      "Boardroom cleaning",
      "Consumables restocking",
      "After-hours cleaning",
    ],
    faqs: [
      {
        question: "Can office cleaning happen after hours?",
        answer:
          "Yes. After-hours cleaning can be requested so the service causes less disruption to your workday.",
      },
      {
        question: "Do you clean small offices?",
        answer:
          "Yes. Shalean is well suited to small Cape Town offices, studios, and professional workspaces.",
      },
    ],
  },
  {
    slug: "carpet-cleaning-cape-town",
    bookingSlug: "carpet-cleaning",
    name: "Carpet Cleaning",
    shortName: "Carpet",
    title: "Carpet Cleaning in Cape Town",
    shortDescription:
      "Focused carpet care for rooms, rugs, stains, odours, and high-traffic areas.",
    description:
      "Carpet cleaning targets fabric condition rather than general room tidying. Shalean captures the room count, carpet area, and stain needs so your Cape Town carpet clean is planned accurately.",
    bestFor: "Stains, odours, rugs, rental refreshes, and high-traffic carpeted rooms.",
    fromPrice: "from R800",
    included: [
      "Carpet assessment based on rooms, area, and visible condition",
      "Standard carpet cleaning for selected rooms or zones",
      "Treatment planning for stains, odours, and high-use walkways",
      "Post-clean care guidance for drying and maintenance",
    ],
    audience: [
      "Homes with carpeted bedrooms, lounges, or passages",
      "Tenants and landlords refreshing carpets between occupancies",
      "Customers dealing with spills, pet odours, or worn walkways",
    ],
    benefits: [
      "Designed specifically for carpets and rugs",
      "Optional treatments for stain and odour concerns",
      "Useful before inspections, move-outs, or guest arrivals",
    ],
    addons: [
      "Stain removal treatment",
      "Pet odour treatment",
      "Rug cleaning",
      "Fabric protection",
    ],
    faqs: [
      {
        question: "Do I need to measure the carpet area?",
        answer:
          "An estimate is helpful. You can describe the rooms or provide square metres in the booking form.",
      },
      {
        question: "Can stains always be removed?",
        answer:
          "Some stains are permanent, but treatment improves many common spills and marks. Results depend on age, fibre, and previous cleaning attempts.",
      },
    ],
  },
  {
    slug: "window-cleaning-cape-town",
    bookingSlug: "window-cleaning",
    name: "Window Cleaning",
    shortName: "Windows",
    title: "Window Cleaning in Cape Town",
    shortDescription:
      "Interior and accessible window cleaning for brighter Cape Town homes and workspaces.",
    description:
      "Window cleaning helps homes, offices, and short-stay properties feel brighter and better presented. Shalean focuses on accessible panes, frames, sills, and interior glass where safely reachable.",
    bestFor: "Homes, offices, Airbnb properties, and pre-listing presentation cleans.",
    fromPrice: "request an instant quote",
    included: [
      "Accessible interior window and glass cleaning",
      "Frame, sill, and track wipe-downs where reachable",
      "Mirror and glass door cleaning on request",
      "Service notes for height, access, and pane count",
    ],
    audience: [
      "Cape Town homes needing brighter living spaces",
      "Hosts preparing guest-facing windows and glass doors",
      "Offices that want clearer internal glass and entrance areas",
    ],
    benefits: [
      "Improves light, presentation, and street-facing appearance",
      "Pairs well with standard, deep, and Airbnb cleaning",
      "Scope can be adjusted for access and safety",
    ],
    addons: [
      "Balcony glass",
      "Glass doors",
      "Mirror cleaning",
      "Track detail",
    ],
    faqs: [
      {
        question: "Do you clean exterior windows?",
        answer:
          "Accessible exterior windows may be considered when safe. High, specialist, or rope-access work should be quoted separately.",
      },
      {
        question: "Can I add windows to another cleaning service?",
        answer:
          "Yes. Window cleaning pairs well with home, Airbnb, office, and move-out cleaning requests.",
      },
    ],
  },
];

export function getPublicService(slug: string) {
  return publicServices.find((service) => service.slug === slug);
}

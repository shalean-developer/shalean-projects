export type PublicLocation = {
  slug: string;
  name: string;
  area: string;
  description: string;
  nearby: string[];
};

export const publicLocations: PublicLocation[] = [
  {
    slug: "bantry-bay",
    name: "Bantry Bay",
    area: "Atlantic Seaboard",
    description:
      "Apartment, villa, and short-stay cleaning for sea-facing homes and lock-up-and-go properties.",
    nearby: ["fresnaye", "sea-point", "camps-bay"],
  },
  {
    slug: "bellville",
    name: "Bellville",
    area: "Northern Suburbs",
    description:
      "Home and office cleaning for busy households, professional spaces, and rental properties.",
    nearby: ["durbanville", "table-view", "wynberg"],
  },
  {
    slug: "bergvliet",
    name: "Bergvliet",
    area: "Southern Suburbs",
    description:
      "Reliable residential cleaning for family homes, townhouses, and move-related cleaning needs.",
    nearby: ["constantia", "plumstead", "wynberg"],
  },
  {
    slug: "camps-bay",
    name: "Camps Bay",
    area: "Atlantic Seaboard",
    description:
      "Premium home, villa, Airbnb, and turnover cleaning for high-presentation coastal properties.",
    nearby: ["bantry-bay", "fresnaye", "sea-point"],
  },
  {
    slug: "claremont",
    name: "Claremont",
    area: "Southern Suburbs",
    description:
      "Standard, deep, office, and apartment cleaning for homes close to schools, shops, and offices.",
    nearby: ["newlands", "kenilworth", "rondebosch"],
  },
  {
    slug: "constantia",
    name: "Constantia",
    area: "Southern Suburbs",
    description:
      "Detailed home cleaning, move-out support, and recurring maintenance for larger properties.",
    nearby: ["bergvliet", "plumstead", "wynberg"],
  },
  {
    slug: "durbanville",
    name: "Durbanville",
    area: "Northern Suburbs",
    description:
      "Flexible household and office cleaning across family homes, estates, and business spaces.",
    nearby: ["bellville", "table-view", "woodstock"],
  },
  {
    slug: "fresnaye",
    name: "Fresnaye",
    area: "Atlantic Seaboard",
    description:
      "Apartment, villa, and Airbnb cleaning for premium homes that need careful presentation.",
    nearby: ["bantry-bay", "sea-point", "camps-bay"],
  },
  {
    slug: "gardens",
    name: "Gardens",
    area: "City Bowl",
    description:
      "Apartment, office, and short-stay cleaning near the City Bowl, Kloof Street, and surrounds.",
    nearby: ["tamboerskloof", "vredehoek", "zonnebloem"],
  },
  {
    slug: "green-point",
    name: "Green Point",
    area: "Atlantic Seaboard",
    description:
      "Airbnb, apartment, office, and regular cleaning for central coastal living and workspaces.",
    nearby: ["sea-point", "zonnebloem", "gardens"],
  },
  {
    slug: "kenilworth",
    name: "Kenilworth",
    area: "Southern Suburbs",
    description:
      "Home cleaning, deep cleaning, and move-out cleaning for apartments and family homes.",
    nearby: ["claremont", "newlands", "rondebosch"],
  },
  {
    slug: "newlands",
    name: "Newlands",
    area: "Southern Suburbs",
    description:
      "Recurring home cleaning, deep cleans, and office cleaning for leafy Southern Suburbs spaces.",
    nearby: ["claremont", "rondebosch", "kenilworth"],
  },
  {
    slug: "observatory",
    name: "Observatory",
    area: "Southern Suburbs",
    description:
      "Cleaning for apartments, shared homes, offices, and rentals close to the city and UCT routes.",
    nearby: ["woodstock", "rosebank", "rondebosch"],
  },
  {
    slug: "plumstead",
    name: "Plumstead",
    area: "Southern Suburbs",
    description:
      "Practical standard, deep, and move-related cleaning for homes and townhouses.",
    nearby: ["wynberg", "bergvliet", "constantia"],
  },
  {
    slug: "rondebosch",
    name: "Rondebosch",
    area: "Southern Suburbs",
    description:
      "Apartment, student-adjacent rental, family home, and office cleaning in a busy suburb.",
    nearby: ["rosebank", "newlands", "claremont"],
  },
  {
    slug: "rosebank",
    name: "Rosebank",
    area: "Southern Suburbs",
    description:
      "Reliable cleaning for compact apartments, rentals, offices, and homes near Rondebosch.",
    nearby: ["rondebosch", "observatory", "newlands"],
  },
  {
    slug: "sea-point",
    name: "Sea Point",
    area: "Atlantic Seaboard",
    description:
      "Apartment, Airbnb, and regular cleaning for busy coastal homes and short-stay properties.",
    nearby: ["green-point", "fresnaye", "bantry-bay"],
  },
  {
    slug: "table-view",
    name: "Table View",
    area: "West Coast",
    description:
      "Home, rental, and office cleaning for coastal households and growing business areas.",
    nearby: ["durbanville", "bellville", "green-point"],
  },
  {
    slug: "tamboerskloof",
    name: "Tamboerskloof",
    area: "City Bowl",
    description:
      "Apartment, house, and Airbnb cleaning for City Bowl homes with quick booking needs.",
    nearby: ["gardens", "vredehoek", "zonnebloem"],
  },
  {
    slug: "vredehoek",
    name: "Vredehoek",
    area: "City Bowl",
    description:
      "Residential and apartment cleaning for mountain-side homes, rentals, and recurring upkeep.",
    nearby: ["gardens", "tamboerskloof", "zonnebloem"],
  },
  {
    slug: "woodstock",
    name: "Woodstock",
    area: "City Bowl",
    description:
      "Office, apartment, studio, and move-out cleaning for one of Cape Town's busiest areas.",
    nearby: ["observatory", "zonnebloem", "gardens"],
  },
  {
    slug: "wynberg",
    name: "Wynberg",
    area: "Southern Suburbs",
    description:
      "Residential cleaning, deep cleans, and rental handover support for established homes.",
    nearby: ["plumstead", "kenilworth", "constantia"],
  },
  {
    slug: "zonnebloem",
    name: "Zonnebloem",
    area: "City Bowl",
    description:
      "Central apartment, office, Airbnb, and move-related cleaning close to the CBD.",
    nearby: ["gardens", "woodstock", "green-point"],
  },
];

export function getPublicLocation(slug: string) {
  return publicLocations.find((location) => location.slug === slug);
}


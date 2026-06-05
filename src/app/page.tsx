import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  HomeIcon,
  KeyRound,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { homepageFaqs } from "@/config/public-faqs";
import { publicServices, type PublicService } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Cleaning Services in Cape Town",
  description:
    "Book trusted Cape Town cleaners for standard, deep, Airbnb, office, move-out, carpet, and window cleaning with Shalean.",
  path: "/",
});

const serviceImages: Record<string, string> = {
  "standard-cleaning-cape-town":
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
  "deep-cleaning-cape-town":
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac",
  "move-out-cleaning-cape-town":
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
  "airbnb-cleaning-cape-town":
    "https://images.unsplash.com/photo-1560448204-603b3fc33ddc",
  "office-cleaning-cape-town":
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
  "carpet-cleaning-cape-town":
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
  "window-cleaning-cape-town":
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
};

const serviceIcons: Record<string, LucideIcon> = {
  "standard-cleaning-cape-town": HomeIcon,
  "deep-cleaning-cape-town": Sparkles,
  "move-out-cleaning-cape-town": KeyRound,
  "airbnb-cleaning-cape-town": CalendarCheck,
  "office-cleaning-cape-town": ClipboardCheck,
  "carpet-cleaning-cape-town": ShieldCheck,
  "window-cleaning-cape-town": Sparkles,
};

const heroTrust = [
  "Trusted and vetted Cape Town cleaners",
  "Clear scopes before every visit",
  "Same-day requests where available",
];

const aboutBullets = [
  "Service-specific booking questions",
  "Helpful support before and after each clean",
  "Secure payments and clear starting prices",
];

const valueCards = [
  {
    title: "Trusted local cleaners",
    description:
      "Shalean supports homes, rentals, offices, and move-related jobs across Cape Town.",
    icon: ShieldCheck,
  },
  {
    title: "Easy booking",
    description:
      "Choose the service, add your property details, select extras, and submit online.",
    icon: CalendarCheck,
  },
  {
    title: "Service guarantee",
    description:
      "Clear briefs and practical support help every clean start with the right expectations.",
    icon: BadgeCheck,
  },
  {
    title: "Flexible scheduling",
    description:
      "Request once-off, recurring, same-day, and guest-ready turnover cleaning.",
    icon: Clock,
  },
];

const processSteps = [
  {
    title: "Book your service",
    description:
      "Choose standard, deep, Airbnb, office, move-out, carpet, or window cleaning and share your timing.",
    icon: CalendarCheck,
  },
  {
    title: "Confirm the details",
    description:
      "The booking flow captures rooms, add-ons, access notes, and service-specific requirements.",
    icon: ClipboardCheck,
  },
  {
    title: "Enjoy a fresher space",
    description:
      "Your request lands with the information Shalean needs to prepare the right cleaning scope.",
    icon: Sparkles,
  },
];

const offerCards = [
  {
    service: publicServices[1],
    label: "Reset special",
    price: "from R750",
    image: serviceImages["deep-cleaning-cape-town"],
  },
  {
    service: publicServices[3],
    label: "Host-ready turnover",
    price: "from R450",
    image: serviceImages["airbnb-cleaning-cape-town"],
  },
];

const coverageAreas = [
  "Sea Point",
  "Claremont",
  "Camps Bay",
  "Durbanville",
  "Bellville",
  "Blouberg",
  "Constantia",
  "Century City",
  "Hout Bay",
  "Milnerton",
];

const reviews = [
  {
    quote:
      "The booking flow was quick, and the cleaner arrived with a clear brief. Our Sea Point apartment felt guest-ready again.",
    name: "Lerato M.",
    suburb: "Sea Point",
  },
  {
    quote:
      "We booked a deep clean before starting weekly service. The kitchen and bathrooms looked properly reset.",
    name: "Nadia P.",
    suburb: "Claremont",
  },
  {
    quote:
      "Same-day Airbnb turnover support saved us between bookings. Clear communication and a polished finish.",
    name: "Thomas K.",
    suburb: "Camps Bay",
  },
];

const tips = [
  {
    title: "5 signs your home is ready for a deep clean",
    category: "Deep Cleaning",
    date: "10 Jun",
    image: serviceImages["deep-cleaning-cape-town"],
  },
  {
    title: "How to prepare for a smoother Airbnb turnover",
    category: "Airbnb Cleaning",
    date: "16 Jun",
    image: serviceImages["airbnb-cleaning-cape-town"],
  },
  {
    title: "Move-out cleaning details tenants often miss",
    category: "Move-out Cleaning",
    date: "24 Jun",
    image: serviceImages["move-out-cleaning-cape-town"],
  },
];

export default function Home() {
  const featuredServices = publicServices.slice(0, 6);

  return (
    <PublicPage>
      <Hero />
      <AboutCompany />
      <ServicesGrid services={featuredServices} />
      <WorkProcess />
      <ValueSection />
      <OffersSection />
      <CoverageSection />
      <ReviewsSection />
      <TipsSection />
      <FAQSection
        title="Cleaning FAQs"
        description="A quick guide to booking Shalean cleaning services in Cape Town."
        faqs={homepageFaqs}
      />
      <FinalCTA />
    </PublicPage>
  );
}

function Hero() {
  return (
    <section className="relative isolate bg-[oklch(0.17_0.026_158)] text-white">
      <Image
        src="https://images.unsplash.com/photo-1581578731548-c64695cc6952"
        alt="Professional cleaner preparing a bright Cape Town home"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,oklch(0.12_0.03_155/0.88),oklch(0.13_0.03_155/0.62),oklch(0.12_0.03_155/0.36))]" />
      <div className="mx-auto flex min-h-[38rem] w-full max-w-7xl flex-col justify-center px-5 pb-10 pt-16 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-white/85">
            Fast, reliable Cape Town cleaning
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            Cleaning Services <span className="text-primary">Done Right.</span>
          </h1>
          <div className="mt-6 grid gap-3 text-sm font-medium text-white/90">
            {heroTrust.map((item) => (
              <span key={item} className="flex items-center gap-3">
                <CheckCircle2
                  className="size-5 shrink-0 text-[oklch(0.76_0.16_86)]"
                  aria-hidden="true"
                />
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/services"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-12 gap-2 bg-primary px-5 text-base text-primary-foreground shadow-[0_18px_38px_rgba(8,105,62,0.28)] hover:bg-primary/90",
              })}
            >
              View Services
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <GoogleRating compact />
          </div>
        </div>
      </div>
      <QuickEstimate />
    </section>
  );
}

function QuickEstimate() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8 lg:px-10">
      <form
        action="/book"
        method="get"
        className="mx-auto grid w-full max-w-7xl gap-4 rounded-lg border border-border/80 bg-white p-5 text-foreground shadow-[0_24px_70px_rgba(10,66,42,0.18)] lg:grid-cols-[1fr_1fr_1fr_1.25fr_auto] lg:items-end"
      >
        <input type="hidden" name="step" value="service-details" />
        <div className="grid gap-2">
          <label htmlFor="estimate-name" className="text-xs font-semibold uppercase">
            Name
          </label>
          <input
            id="estimate-name"
            name="name"
            placeholder="Enter your name"
            className="h-11 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary/70 focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="estimate-phone" className="text-xs font-semibold uppercase">
            Phone
          </label>
          <input
            id="estimate-phone"
            name="phone"
            placeholder="Enter your phone number"
            className="h-11 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary/70 focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="estimate-email" className="text-xs font-semibold uppercase">
            Email
          </label>
          <input
            id="estimate-email"
            name="email"
            type="email"
            placeholder="Enter email address"
            className="h-11 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary/70 focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="estimate-service" className="text-xs font-semibold uppercase">
            Select service
          </label>
          <select
            id="estimate-service"
            name="service"
            defaultValue={publicServices[0]?.bookingSlug}
            className="h-11 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-primary/70 focus-visible:ring-3 focus-visible:ring-primary/20"
          >
            {publicServices.map((service) => (
              <option key={service.slug} value={service.bookingSlug}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={buttonVariants({
            className:
              "h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90",
          })}
        >
          Book Now
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function AboutCompany() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageTile
            src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac"
            alt="Cleaner preparing supplies for a home cleaning visit"
            className="min-h-72"
          />
          <ImageTile
            src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a"
            alt="Cleaner wiping a bright bathroom surface"
            className="min-h-72"
          />
          <ImageTile
            src="https://images.unsplash.com/photo-1563453392212-326f5e854473"
            alt="Professional cleaner working through a detailed home reset"
            className="min-h-72 sm:col-span-2"
          />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            About Shalean
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
            We make Cape Town cleaning feel simpler, clearer, and more reliable.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Shalean helps households, hosts, tenants, and teams book the right
            cleaning scope without guesswork. From a quick standard clean to a
            detailed move-out reset, each request starts with the details your
            cleaner needs.
          </p>
          <div className="mt-6 grid gap-3">
            {aboutBullets.map((item) => (
              <span key={item} className="flex items-center gap-3 font-medium">
                <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 border-y border-border py-6 sm:flex-row sm:items-center">
            <Link
              href="/book"
              className={buttonVariants({
                className:
                  "h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90",
              })}
            >
              Book a Cleaning
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="tel:0871535250"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-1 text-lg font-semibold text-foreground hover:text-primary"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                <MessageCircle className="size-5" aria-hidden="true" />
              </span>
              087 153 5250
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesGrid({ services }: { services: PublicService[] }) {
  return (
    <section className="bg-secondary/45 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Our services"
          title="Comprehensive cleaning services for every need"
          centered
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <HomepageServiceCard
              key={service.slug}
              service={service}
              featured={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageServiceCard({
  service,
  featured = false,
}: {
  service: PublicService;
  featured?: boolean;
}) {
  const Icon = serviceIcons[service.slug] ?? Sparkles;
  const image = serviceImages[service.slug] ?? serviceImages["standard-cleaning-cape-town"];

  return (
    <article className="group overflow-hidden rounded-lg border border-border/80 bg-white shadow-[0_16px_42px_rgba(10,66,42,0.08)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_56px_rgba(10,66,42,0.14)]">
      <div
        className={
          featured
            ? "grid gap-2 bg-primary p-5 text-center text-primary-foreground"
            : "grid gap-2 bg-white p-5 text-center text-foreground"
        }
      >
        <p
          className={
            featured
              ? "text-xs font-semibold uppercase tracking-normal text-primary-foreground/80"
              : "text-xs font-semibold uppercase tracking-normal text-primary"
          }
        >
          {service.fromPrice}
        </p>
        <h3 className="text-xl font-semibold tracking-normal">{service.name}</h3>
      </div>
      <div className="relative h-56 overflow-hidden bg-secondary">
        <Image
          src={image}
          alt={`${service.name} in Cape Town`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
        <div className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      </div>
      <div className="grid min-h-44 gap-3 p-5 text-center">
        <p
          className={
            featured
              ? "text-sm leading-6 text-muted-foreground"
              : "text-sm leading-6 text-muted-foreground"
          }
        >
          {service.shortDescription}
        </p>
        <Link
          href={`/book?service=${service.bookingSlug}&step=service-details`}
          className={buttonVariants({
            className: featured
              ? "mx-auto h-10 gap-2 bg-white px-4 !text-foreground hover:bg-white/90"
              : "mx-auto h-10 gap-2 bg-primary px-4 text-primary-foreground hover:bg-primary/90",
          })}
        >
          Book Service
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function WorkProcess() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Work process"
          title="Stress free cleaning from request to reset"
          description="Book online, share the details, and let Shalean prepare the right scope for your home, rental, office, or move."
          centered
        />
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative">
            <div className="relative min-h-[30rem] overflow-hidden rounded-lg bg-secondary shadow-[0_24px_70px_rgba(10,66,42,0.15)]">
              <Image
                src="https://images.unsplash.com/photo-1584622781564-1d987f7333c1"
                alt="Cleaner refreshing a bright Cape Town living space"
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-5 left-5 rounded-lg bg-[oklch(0.18_0.035_155)] p-5 text-primary-foreground shadow-lg">
              <p className="text-xs font-semibold uppercase">WhatsApp quote</p>
              <a
                href="https://wa.me/27825915525"
                className="mt-2 flex items-center gap-3 text-xl font-semibold"
              >
                <MessageCircle className="size-6" aria-hidden="true" />
                082 591 5525
              </a>
            </div>
          </div>
          <div className="grid gap-8">
            {processSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_1fr] gap-5">
                <div className="flex flex-col items-center">
                  <div className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
                    <step.icon className="size-5" aria-hidden="true" />
                  </div>
                  {index < processSteps.length - 1 ? (
                    <span className="mt-3 h-full min-h-14 border-l border-dashed border-primary/35" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold uppercase text-primary">
                    Step - 0{index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueSection() {
  return (
    <section className="bg-[oklch(0.18_0.035_155)] py-12 text-primary-foreground sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Why choose us"
          title="Professional cleaning, calm booking, clear value"
          description="Shalean combines practical cleaning scopes with friendly online booking and local Cape Town support."
          centered
          inverted
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {valueCards.map((item) => (
            <article
              key={item.title}
              className="grid min-h-56 gap-4 rounded-lg bg-white p-6 text-center text-foreground shadow-[0_16px_42px_rgba(0,0,0,0.18)]"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[oklch(0.94_0.05_80)] text-primary">
                <item.icon className="size-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold leading-tight">{item.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
        <Link
          href="/book"
          className={buttonVariants({
            className:
              "mx-auto h-11 gap-2 bg-primary-foreground px-5 !text-foreground hover:bg-primary-foreground/90",
          })}
        >
          Book an Appointment
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function OffersSection() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Popular bookings"
          title="Grab a cleaner start with practical starting prices"
          description="Use these shortcuts to start with two of Shalean's most requested cleaning services."
          centered
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {offerCards.map((offer) =>
            offer.service ? (
              <article
                key={offer.service.slug}
                className="relative isolate min-h-64 overflow-hidden rounded-lg p-6 text-white shadow-[0_20px_54px_rgba(10,66,42,0.14)]"
              >
                <Image
                  src={offer.image}
                  alt={`${offer.service.name} offer in Cape Town`}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="absolute inset-0 -z-20 object-cover"
                />
                <div className="absolute inset-0 -z-10 bg-foreground/65" />
                <div className="max-w-sm">
                  <h3 className="text-2xl font-semibold">{offer.service.name}</h3>
                  <p className="mt-2 text-sm font-medium text-white/85">
                    {offer.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{offer.price}</p>
                  <p className="mt-4 text-sm leading-6 text-white/82">
                    Start your booking online and add the property details
                    needed to shape the final scope.
                  </p>
                  <Link
                    href={`/book?service=${offer.service.bookingSlug}&step=service-details`}
                    className={buttonVariants({
                      className:
                        "mt-6 h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90",
                    })}
                  >
                    Book Service
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ) : null
          )}
        </div>
        <SliderDots />
      </div>
    </section>
  );
}

function CoverageSection() {
  return (
    <section className="bg-secondary/45 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            Areas we serve
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
            Our service area communities
          </h2>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Shalean supports cleaning requests across Cape Town suburbs, with
            practical routes for homes, rentals, offices, and short-stay
            properties.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {coverageAreas.map((area) => (
              <span key={area} className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {area}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/book"
              className={buttonVariants({
                className:
                  "h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90",
              })}
            >
              Book Now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="tel:0871535250"
              className="text-lg font-semibold text-foreground hover:text-primary"
            >
              087 153 5250
            </a>
          </div>
        </div>
        <div className="relative min-h-[26rem] overflow-hidden rounded-lg border border-white bg-[linear-gradient(135deg,oklch(0.9_0.05_145),oklch(0.82_0.04_210))] shadow-[0_24px_70px_rgba(10,66,42,0.13)]">
          <div className="absolute inset-8 rounded-full border border-primary/20 bg-primary/10" />
          <div className="absolute inset-16 rounded-full border border-[oklch(0.72_0.12_55/0.45)] bg-[oklch(0.78_0.12_55/0.22)]" />
          {coverageAreas.slice(0, 9).map((area, index) => (
            <span
              key={area}
              className="absolute grid size-10 place-items-center rounded-full border border-white bg-white text-primary shadow-lg"
              style={{
                left: `${18 + (index % 3) * 28}%`,
                top: `${18 + Math.floor(index / 3) * 24}%`,
              }}
              aria-label={area}
            >
              <MapPin className="size-5" aria-hidden="true" />
            </span>
          ))}
          <div className="absolute inset-x-5 bottom-5 rounded-lg bg-white/94 p-5 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold uppercase text-primary">
              Cape Town coverage
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              Local routines, cleaner handovers.
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Testimonials"
          title="Satisfied customers sing our praises"
          centered
        />
        <div className="mx-auto flex w-fit items-center gap-6 border-b border-border text-sm font-semibold">
          <span className="border-b-2 border-primary px-2 pb-3">All Reviews</span>
          <span className="px-2 pb-3 text-muted-foreground">Google</span>
          <span className="px-2 pb-3 text-muted-foreground">Local Hosts</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <figure
              key={review.name}
              className="grid min-h-72 gap-4 rounded-lg bg-secondary/45 p-6 shadow-[0_14px_38px_rgba(10,66,42,0.06)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-white text-sm font-bold text-primary">
                  {review.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <figcaption className="text-sm font-semibold">
                  {review.name}
                  <span className="block font-medium text-muted-foreground">
                    {review.suburb}
                  </span>
                </figcaption>
              </div>
              <div className="flex text-[oklch(0.76_0.16_86)]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="size-4 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="text-sm italic leading-7 text-foreground">
                {review.quote}
              </blockquote>
              <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Quote className="size-5 text-primary" aria-hidden="true" />
                Posted by a Shalean customer
              </div>
            </figure>
          ))}
        </div>
        <SliderDots />
      </div>
    </section>
  );
}

function TipsSection() {
  return (
    <section className="bg-white pb-12 sm:pb-16 lg:pb-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Cleaning tips"
          title="Pro tips for your space"
          description="A few helpful shortcuts for choosing the right cleaning service and preparing for a better result."
          centered
        />
        <div className="grid gap-6 md:grid-cols-3">
          {tips.map((tip) => (
            <article key={tip.title} className="grid gap-4">
              <div className="relative min-h-56 overflow-hidden rounded-lg bg-secondary">
                <Image
                  src={tip.image}
                  alt={tip.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
                <span className="absolute left-0 top-0 bg-primary px-4 py-3 text-center text-sm font-semibold leading-tight text-primary-foreground">
                  {tip.date}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  {tip.category}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-tight">
                  {tip.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Learn what to note before your booking so the scope, timing,
                  and handover are easier to get right.
                </p>
              </div>
              <Link
                href="/help"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold hover:text-primary"
              >
                Learn More
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  inverted = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p
        className={
          inverted
            ? "text-sm font-semibold uppercase tracking-normal text-primary-foreground/80"
            : "text-sm font-semibold uppercase tracking-normal text-primary"
        }
      >
        {eyebrow}
      </p>
      <h2
        className={
          inverted
            ? "mt-3 text-3xl font-semibold leading-tight tracking-normal text-primary-foreground sm:text-4xl"
            : "mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl"
        }
      >
        {title}
      </h2>
      {description ? (
        <p
          className={
            inverted
              ? "mt-4 leading-7 text-primary-foreground/75"
              : "mt-4 leading-7 text-muted-foreground"
          }
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ImageTile({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-secondary ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />
    </div>
  );
}

function GoogleRating({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex w-fit items-center gap-3 rounded-lg bg-white/12 px-4 py-3 backdrop-blur"
          : "flex w-fit items-center gap-3"
      }
    >
      <span className="grid size-10 place-items-center rounded-full bg-white text-lg font-bold text-primary">
        G
      </span>
      <div>
        <p className="text-xs font-semibold text-white/75">Google rating</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold">4.9</span>
          <span className="flex text-[oklch(0.76_0.16_86)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className="size-4 fill-current"
                aria-hidden="true"
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

function SliderDots() {
  return (
    <div className="flex items-center justify-center gap-4" aria-hidden="true">
      <ArrowLeft className="size-4 text-muted-foreground" />
      <span className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-primary" />
        <span className="size-2 rounded-full bg-primary/25" />
        <span className="size-2 rounded-full bg-primary/25" />
      </span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </div>
  );
}

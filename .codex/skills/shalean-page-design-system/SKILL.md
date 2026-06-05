---
name: shalean-page-design-system
description: Shalean public-page design system and audit guide. Use when creating, redesigning, or reviewing Shalean website pages, public service/location pages, pricing pages, booking-adjacent customer pages, FAQs, CTAs, cards, headers, footers, or SEO page structure so they match the premium Cape Town cleaning homepage style.
---

# Shalean Page Design System

## Purpose

Use the homepage as the source of truth for Shalean public pages. Preserve routes, metadata, booking logic, payment logic, Supabase logic, forms, and auth behavior while aligning visual presentation.

## Layout

- Use `PublicPage` for public marketing and customer auth pages whenever possible so the header/footer remain consistent.
- Use full-width section bands, not nested page cards. Alternate white and very light green bands.
- Constrain content with `max-w-7xl` for broad pages, `max-w-5xl` for narrow support/about pages, and `px-5 sm:px-8 lg:px-10`.
- Use vertical rhythm `py-12 sm:py-16 lg:py-20` for major public sections.
- Use two-column desktop layouts for hero, pricing, coverage, and CTA content; stack cleanly on mobile.

## Typography

- Use one `h1` per page with `text-4xl sm:text-5xl` for compact pages and `lg:text-6xl` for the homepage hero.
- Use `h2` at `text-3xl sm:text-4xl` for major sections.
- Use `h3` at `text-xl` or `text-2xl` inside cards and panels.
- Keep body copy `leading-7` or `leading-8` and use `text-muted-foreground`.
- Do not use negative letter spacing or viewport-scaled font sizes.

## Color

- Primary accent is dark green via `text-primary`, `bg-primary`, and dark green CTA/footer blocks.
- Use white for cards and header surfaces.
- Use very light green via `bg-secondary/35`, `bg-secondary/45`, or `bg-secondary/65` for page bands.
- Avoid one-note green overload: mix white, dark green, muted text, and small warm star accents only where needed.

## Buttons

- Primary CTAs use dark green: `buttonVariants({ className: "h-11 bg-primary px-4 hover:bg-primary/90" })`.
- Homepage hero CTAs use `h-12`, icon plus label, and a subtle green shadow.
- Secondary CTAs use white or transparent outline with `border-primary/20`, not grey utility buttons.
- Use exact labels consistently: `Book Now`, `Book Online`, `Book a Cleaning`, `WhatsApp Quote`, `WhatsApp Us`.

## Cards

- Cards use `rounded-lg`, `border-border/80`, white background, and subtle green-tinted shadow.
- Do not put cards inside cards. Use cards for repeated items, pricing, FAQs, testimonials, and focused support panels.
- Icons sit in light-green square wells (`bg-secondary text-primary`) or white wells over images.
- Card hover states may lift slightly and shift border to `border-primary/35`.

## Header And Footer

- Header is sticky, white, lightly shadowed, with Shalean logo left, centered nav, and right phone/Book Now cluster.
- Desktop nav must include Services dropdown plus Pricing, About, Help.
- Mobile nav may be horizontal scroll but must preserve the same links.
- Footer is dark green with columns: brand/contact, services, locations, company, social/payment badges.
- Always show phone `087 153 5250` and WhatsApp `082 591 5525`.

## Section Patterns

- Hero: badge, `h1`, clear paragraph, primary booking CTA, WhatsApp/secondary CTA, trust cards, optional rating row, and optional image/floating card.
- Feature section: four cards explaining trust, booking, service-specific questions, and support.
- Services: image-led grid cards with icon, title, description, from-price, and `Learn more`.
- How it works: three horizontal cards on desktop with arrow separators.
- Coverage: local pills plus a Cape Town/Table Mountain image card with a white overlay.
- Reviews: three testimonial cards with five stars, quote, name, and suburb; include slider dots where it implies a carousel.
- Final CTA: dark-green full-width block with heading, subtext, two buttons, and right-side trust bullets.

## FAQ

- Use a light-green band and `details` accordion cards.
- FAQ layout should include an intro column and a two-column question grid on wider screens.
- Summary rows use bold text and a chevron that rotates on open.
- Include a `View all FAQs` link to `/help` unless the page itself is the help page.

## Pricing

- Use the shared pricing card pattern with title, from-price, 2-3 short bullets, and `Book Now`.
- Mark Deep Cleaning as `Most Popular` when shown with core services.
- Keep public from-pricing separate from booking/payment logic. Do not alter Supabase pricing rules unless the user explicitly asks.
- Include trust points near pricing: no hidden fees, secure payments, satisfaction guaranteed.

## Service And Location Pages

- Service pages must keep SEO headings specific to Cape Town and the service name.
- Location pages must keep suburb names in the `h1`, metadata, and local body copy.
- Use `ServiceCard` for service grids and rounded location pills for suburb links.
- Keep `generateStaticParams`, `dynamicParams`, `notFound`, and metadata behavior intact.

## Mobile

- Stack columns into a single column.
- Keep buttons full-width only where the layout is form-like or narrow; otherwise allow natural width.
- Ensure image cards have stable `min-h` or aspect constraints.
- Avoid text overlap in pills, buttons, overlays, and cards by allowing wrapping.

## SEO Structure

- Preserve `publicMetadata` usage and existing route paths.
- Keep one descriptive `h1`, logical `h2` section order, and service/location keywords in natural copy.
- Keep FAQ content crawlable in HTML with `details`.
- Use meaningful image `alt` text tied to service, location, or Cape Town context.

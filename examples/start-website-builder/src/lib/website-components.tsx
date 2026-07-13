import type { BaseComponentProps } from "@json-render/react";
import type { WebsiteProps } from "./website-catalog";

// =============================================================================
// Header
// =============================================================================

function HeaderComponent({
  props,
}: BaseComponentProps<WebsiteProps<"Header">>) {
  const variant = props.variant ?? "simple";
  const links = props.links ?? [];

  if (variant === "centered") {
    return (
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col items-center gap-4">
          <span className="text-xl font-bold tracking-tight">
            {props.brand}
          </span>
          <nav className="flex items-center gap-6">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">{props.brand}</span>
        <nav className="flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

// =============================================================================
// Hero
// =============================================================================

function HeroComponent({ props }: BaseComponentProps<WebsiteProps<"Hero">>) {
  const variant = props.variant ?? "centered";
  const isLeft = variant === "left-aligned";

  return (
    <section className="bg-background">
      <div
        className={`mx-auto max-w-4xl px-6 py-24 md:py-32 ${isLeft ? "text-left" : "text-center"}`}
      >
        <div
          className={`flex flex-col gap-6 ${isLeft ? "items-start" : "items-center"}`}
        >
          {props.badge && (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {props.badge}
            </span>
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            {props.headline}
          </h1>
          <p
            className={`text-lg text-muted-foreground ${isLeft ? "max-w-xl" : "max-w-2xl"}`}
          >
            {props.description}
          </p>
          {(props.primaryCta || props.secondaryCta) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {props.primaryCta && (
                <a
                  href={props.primaryCta.href}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {props.primaryCta.label}
                </a>
              )}
              {props.secondaryCta && (
                <a
                  href={props.secondaryCta.href}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {props.secondaryCta.label}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Features
// =============================================================================

function FeaturesComponent({
  props,
}: BaseComponentProps<WebsiteProps<"Features">>) {
  const variant = props.variant ?? "cards";
  const columns = props.columns ?? 3;
  const items = props.items ?? [];

  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {(props.headline || props.description) && (
          <div className="mb-12 text-center">
            {props.headline && (
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {props.headline}
              </h2>
            )}
            {props.description && (
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                {props.description}
              </p>
            )}
          </div>
        )}
        <div className={`grid grid-cols-1 gap-6 ${colClass}`}>
          {items.map((item, i) =>
            variant === "cards" ? (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-card-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ) : (
              <div key={i} className="py-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Team
// =============================================================================

function TeamComponent({ props }: BaseComponentProps<WebsiteProps<"Team">>) {
  const variant = props.variant ?? "grid";
  const members = props.members ?? [];

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {(props.headline || props.description) && (
          <div className="mb-12 text-center">
            {props.headline && (
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {props.headline}
              </h2>
            )}
            {props.description && (
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                {props.description}
              </p>
            )}
          </div>
        )}
        {variant === "list" ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {members.map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {m.name}
                </h3>
                <p className="text-sm text-muted-foreground">{m.role}</p>
                {m.bio && (
                  <p className="mt-1 text-sm text-muted-foreground">{m.bio}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <h3 className="text-base font-semibold text-card-foreground">
                  {m.name}
                </h3>
                <p className="text-sm text-muted-foreground">{m.role}</p>
                {m.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">{m.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================================
// Testimonials
// =============================================================================

function TestimonialsComponent({
  props,
}: BaseComponentProps<WebsiteProps<"Testimonials">>) {
  const items = props.items ?? [];

  return (
    <section className="bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {props.headline && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-foreground">
            {props.headline}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <blockquote
              key={i}
              className="rounded-lg border border-border bg-background p-6"
            >
              <p className="text-sm text-foreground leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-4 flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {item.author}
                </span>
                {item.role && (
                  <span className="text-xs text-muted-foreground">
                    {item.role}
                  </span>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// ContactForm
// =============================================================================

function ContactFormComponent({
  props,
}: BaseComponentProps<WebsiteProps<"ContactForm">>) {
  const fields = props.fields ?? [];

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-xl px-6 py-20">
        {(props.headline || props.description) && (
          <div className="mb-8 text-center">
            {props.headline && (
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {props.headline}
              </h2>
            )}
            {props.description && (
              <p className="mt-3 text-muted-foreground">{props.description}</p>
            )}
          </div>
        )}
        <form
          className="rounded-lg border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-4">
            {fields.map((field, i) =>
              field.type === "textarea" ? (
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                  </label>
                  <textarea
                    placeholder={field.placeholder ?? ""}
                    rows={4}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder ?? ""}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ),
            )}
            <button
              type="submit"
              className="mt-2 h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              {props.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

// =============================================================================
// Footer
// =============================================================================

function FooterComponent({
  props,
}: BaseComponentProps<WebsiteProps<"Footer">>) {
  const variant = props.variant ?? "simple";
  const links = props.links ?? [];

  if (variant === "columns") {
    return (
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div>
              {props.brand && (
                <span className="text-lg font-bold text-foreground">
                  {props.brand}
                </span>
              )}
            </div>
            {links.length > 0 && (
              <nav className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
          {props.copyright && (
            <p className="mt-8 text-xs text-muted-foreground">
              {props.copyright}
            </p>
          )}
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col items-center gap-4">
        {props.brand && (
          <span className="text-sm font-semibold text-foreground">
            {props.brand}
          </span>
        )}
        {links.length > 0 && (
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
        {props.copyright && (
          <p className="text-xs text-muted-foreground">{props.copyright}</p>
        )}
      </div>
    </footer>
  );
}

// =============================================================================
// CTA
// =============================================================================

function CTAComponent({ props }: BaseComponentProps<WebsiteProps<"CTA">>) {
  const variant = props.variant ?? "centered";

  if (variant === "banner") {
    return (
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{props.headline}</h2>
            {props.description && (
              <p className="mt-1 text-sm opacity-90">{props.description}</p>
            )}
          </div>
          <a
            href={props.buttonHref}
            className="inline-flex h-11 items-center justify-center rounded-md bg-background px-6 text-sm font-medium text-foreground shadow-sm hover:bg-background/90 transition-colors shrink-0"
          >
            {props.buttonLabel}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted/30">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {props.headline}
        </h2>
        {props.description && (
          <p className="mt-3 text-lg text-muted-foreground">
            {props.description}
          </p>
        )}
        <div className="mt-8">
          <a
            href={props.buttonHref}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            {props.buttonLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Export map
// =============================================================================

export const websiteComponents = {
  Header: HeaderComponent,
  Hero: HeroComponent,
  Features: FeaturesComponent,
  Team: TeamComponent,
  Testimonials: TestimonialsComponent,
  ContactForm: ContactFormComponent,
  Footer: FooterComponent,
  CTA: CTAComponent,
};

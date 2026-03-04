import React from "react";
import {
  Html as EmailHtml,
  Head as EmailHead,
  Body as EmailBody,
  Container as EmailContainer,
  Section as EmailSection,
  Row as EmailRow,
  Column as EmailColumn,
  Heading as EmailHeading,
  Text as EmailText,
  Link as EmailLink,
  Button as EmailButton,
  Img as EmailImg,
  Hr as EmailHr,
  Preview as EmailPreview,
  Markdown as EmailMarkdown,
} from "@react-email/components";
import type { ComponentRenderProps } from "../renderer";
import type { ComponentRegistry } from "../renderer";
import type { StandardComponentProps } from "../catalog";
import type { ReactNode } from "react";

// =============================================================================
// Document Structure
// =============================================================================

function HtmlComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Html">>) {
  const p = element.props;

  return (
    <EmailHtml lang={p.lang ?? undefined} dir={p.dir ?? undefined}>
      {children}
    </EmailHtml>
  );
}

function HeadComponent({
  children,
}: ComponentRenderProps<StandardComponentProps<"Head">>) {
  return <EmailHead>{children}</EmailHead>;
}

function BodyComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Body">>) {
  const p = element.props;

  return <EmailBody style={p.style ?? undefined}>{children}</EmailBody>;
}

function ContainerComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Container">>) {
  const p = element.props;

  return (
    <EmailContainer style={p.style ?? undefined}>{children}</EmailContainer>
  );
}

function ContainerCardComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"ContainerCard">>) {
  const p = element.props;
  const defaultStyle = {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
  };

  return (
    <EmailContainer style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {children}
    </EmailContainer>
  );
}

function SectionComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Section">>) {
  const p = element.props;

  return <EmailSection style={p.style ?? undefined}>{children}</EmailSection>;
}

function SectionHeroComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"SectionHero">>) {
  const p = element.props;
  const defaultStyle = {
    padding: "32px 24px",
    backgroundColor: "#f8fafc",
  };
  return (
    <EmailSection style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {children}
    </EmailSection>
  );
}

function SectionMutedComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"SectionMuted">>) {
  const p = element.props;
  const defaultStyle = {
    padding: "20px 24px",
    backgroundColor: "#f3f4f6",
  };
  return (
    <EmailSection style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {children}
    </EmailSection>
  );
}

function RowComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Row">>) {
  const p = element.props;

  return <EmailRow style={p.style ?? undefined}>{children}</EmailRow>;
}

function Grid2Component({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Grid2">>) {
  const p = element.props;
  return <EmailRow style={p.style ?? undefined}>{children}</EmailRow>;
}

function Grid3Component({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Grid3">>) {
  const p = element.props;
  return <EmailRow style={p.style ?? undefined}>{children}</EmailRow>;
}

function ColumnComponent({
  element,
  children,
}: ComponentRenderProps<StandardComponentProps<"Column">>) {
  const p = element.props;

  return <EmailColumn style={p.style ?? undefined}>{children}</EmailColumn>;
}

// =============================================================================
// Content Components
// =============================================================================

function HeadingComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Heading">>) {
  const p = element.props;

  return (
    <EmailHeading as={p.as ?? "h2"} style={p.style ?? undefined}>
      {p.text}
    </EmailHeading>
  );
}

function Header1Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Header1">>) {
  const p = element.props;

  return (
    <EmailHeading as="h1" style={p.style ?? undefined}>
      {p.text}
    </EmailHeading>
  );
}

function Header2Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Header2">>) {
  const p = element.props;

  return (
    <EmailHeading as="h2" style={p.style ?? undefined}>
      {p.text}
    </EmailHeading>
  );
}

function Header3Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Header3">>) {
  const p = element.props;

  return (
    <EmailHeading as="h3" style={p.style ?? undefined}>
      {p.text}
    </EmailHeading>
  );
}

function HeadingHeroComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"HeadingHero">>) {
  const p = element.props;
  const defaultStyle = {
    fontSize: "32px",
    lineHeight: "1.2",
    margin: "0 0 12px",
  };
  return (
    <EmailHeading as="h1" style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {p.text}
    </EmailHeading>
  );
}

function HeadingSectionComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"HeadingSection">>) {
  const p = element.props;
  const defaultStyle = {
    fontSize: "22px",
    lineHeight: "1.3",
    margin: "0 0 10px",
  };
  return (
    <EmailHeading as="h2" style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {p.text}
    </EmailHeading>
  );
}

function TextComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Text">>) {
  const p = element.props;

  return <EmailText style={p.style ?? undefined}>{p.text}</EmailText>;
}

function LinkComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Link">>) {
  const p = element.props;

  return (
    <EmailLink href={p.href} style={p.style ?? undefined}>
      {p.text}
    </EmailLink>
  );
}

function ButtonComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Button">>) {
  const p = element.props;

  return (
    <EmailButton href={p.href} style={p.style ?? undefined}>
      {p.text}
    </EmailButton>
  );
}

function ImageComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Image">>) {
  const p = element.props;

  return (
    <EmailImg
      src={p.src}
      alt={p.alt ?? undefined}
      width={p.width ?? undefined}
      height={p.height ?? undefined}
      style={p.style ?? undefined}
    />
  );
}

function ImageHeroComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ImageHero">>) {
  const p = element.props;
  const defaultStyle = {
    borderRadius: "12px",
    width: "100%",
    height: "auto",
  };
  return (
    <EmailImg
      src={p.src}
      alt={p.alt ?? undefined}
      width={p.width ?? undefined}
      height={p.height ?? undefined}
      style={{ ...defaultStyle, ...(p.style ?? {}) }}
    />
  );
}

function ImageAvatarComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ImageAvatar">>) {
  const p = element.props;
  const defaultStyle = {
    borderRadius: "9999px",
    display: "block",
  };
  return (
    <EmailImg
      src={p.src}
      alt={p.alt ?? undefined}
      width={p.width ?? 80}
      height={p.height ?? 80}
      style={{ ...defaultStyle, ...(p.style ?? {}) }}
    />
  );
}

function ImageThumbnailComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ImageThumbnail">>) {
  const p = element.props;
  const defaultStyle = {
    borderRadius: "8px",
    display: "block",
  };
  return (
    <EmailImg
      src={p.src}
      alt={p.alt ?? undefined}
      width={p.width ?? undefined}
      height={p.height ?? undefined}
      style={{ ...defaultStyle, ...(p.style ?? {}) }}
    />
  );
}

function renderGalleryItems(
  items: StandardComponentProps<"GalleryMosaic">["items"],
  imageStyle: StandardComponentProps<"GalleryMosaic">["imageStyle"],
): ReactNode {
  return items.map((item, idx) => {
    const img = (
      <EmailImg
        src={item.src}
        alt={item.alt ?? undefined}
        width={item.width ?? undefined}
        height={item.height ?? undefined}
        style={imageStyle ?? undefined}
      />
    );
    return (
      <EmailColumn key={`gallery-${idx}`}>
        {item.href ? <EmailLink href={item.href}>{img}</EmailLink> : img}
      </EmailColumn>
    );
  });
}

function Gallery2Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Gallery2">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailRow>{renderGalleryItems(p.items, p.imageStyle)}</EmailRow>
    </EmailSection>
  );
}

function Gallery3Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Gallery3">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailRow>{renderGalleryItems(p.items, p.imageStyle)}</EmailRow>
    </EmailSection>
  );
}

function Gallery4Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"Gallery4">>) {
  const p = element.props;
  const row1 = p.items.slice(0, 2);
  const row2 = p.items.slice(2, 4);
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailRow>{renderGalleryItems(row1, p.imageStyle)}</EmailRow>
      <EmailRow>{renderGalleryItems(row2, p.imageStyle)}</EmailRow>
    </EmailSection>
  );
}

function GalleryMosaicComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"GalleryMosaic">>) {
  const p = element.props;
  const midpoint = Math.ceil(p.items.length / 2);
  const row1 = p.items.slice(0, midpoint);
  const row2 = p.items.slice(midpoint);
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailRow>{renderGalleryItems(row1, p.imageStyle)}</EmailRow>
      {row2.length > 0 && (
        <EmailRow>{renderGalleryItems(row2, p.imageStyle)}</EmailRow>
      )}
    </EmailSection>
  );
}

function HrComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Hr">>) {
  const p = element.props;

  return <EmailHr style={p.style ?? undefined} />;
}

function DividerSoftComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"DividerSoft">>) {
  const p = element.props;
  const defaultStyle = { borderColor: "#eef2f7", margin: "16px 0" };
  return <EmailHr style={{ ...defaultStyle, ...(p.style ?? {}) }} />;
}

function DividerDashedComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"DividerDashed">>) {
  const p = element.props;
  const defaultStyle = { borderTop: "1px dashed #d1d5db", margin: "20px 0" };
  return <EmailHr style={{ ...defaultStyle, ...(p.style ?? {}) }} />;
}

function FooterSimpleComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FooterSimple">>) {
  const p = element.props;
  const defaultStyle = {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center" as const,
    margin: "16px 0 0",
  };
  return (
    <EmailText style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {p.text}
    </EmailText>
  );
}

function FooterLinksComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FooterLinks">>) {
  const p = element.props;
  const defaultStyle = {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center" as const,
    margin: "8px 0 0",
  };
  const defaultLinkStyle = { color: "#4f46e5", textDecoration: "underline" };
  return (
    <EmailText style={{ ...defaultStyle, ...(p.style ?? {}) }}>
      {p.text ? `${p.text} ` : ""}
      {p.links.map((link, idx) => (
        <React.Fragment key={`${link.href}-${idx}`}>
          {idx > 0 ? " • " : ""}
          <EmailLink
            href={link.href}
            style={{ ...defaultLinkStyle, ...(p.linkStyle ?? {}) }}
          >
            {link.text}
          </EmailLink>
        </React.Fragment>
      ))}
    </EmailText>
  );
}

function ListBulletedComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ListBulleted">>) {
  const p = element.props;
  return (
    <ul style={p.style ?? undefined}>
      {p.items.map((item, idx) => (
        <li key={`li-${idx}`} style={p.itemStyle ?? undefined}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ListNumberedComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ListNumbered">>) {
  const p = element.props;
  return (
    <ol style={p.style ?? undefined}>
      {p.items.map((item, idx) => (
        <li key={`li-${idx}`} style={p.itemStyle ?? undefined}>
          {item}
        </li>
      ))}
    </ol>
  );
}

function InlineCodeComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"InlineCode">>) {
  const p = element.props;
  const defaultStyle = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    backgroundColor: "#f3f4f6",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
  };
  return <code style={{ ...defaultStyle, ...(p.style ?? {}) }}>{p.text}</code>;
}

function InlineCodeMutedComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"InlineCodeMuted">>) {
  const p = element.props;
  const defaultStyle = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    backgroundColor: "#f9fafb",
    color: "#6b7280",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
  };
  return <code style={{ ...defaultStyle, ...(p.style ?? {}) }}>{p.text}</code>;
}

function ArticleCardComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleCard">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.imageSrc && (
        <EmailImg src={p.imageSrc} alt={p.imageAlt ?? undefined} width={560} />
      )}
      {p.meta && (
        <EmailText style={{ color: "#6b7280", margin: "8px 0 0" }}>
          {p.meta}
        </EmailText>
      )}
      <EmailHeading as="h3" style={{ margin: "8px 0" }}>
        {p.title}
      </EmailHeading>
      <EmailText>{p.excerpt}</EmailText>
      <EmailLink href={p.href}>Read more</EmailLink>
    </EmailSection>
  );
}

function ArticleCompactComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleCompact">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailLink href={p.href}>{p.title}</EmailLink>
      {p.meta && (
        <EmailText style={{ color: "#6b7280", margin: "4px 0 0" }}>
          {p.meta}
        </EmailText>
      )}
    </EmailSection>
  );
}

function ArticleFeatureComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleFeature">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.imageSrc && (
        <EmailImg src={p.imageSrc} alt={p.imageAlt ?? undefined} width={560} />
      )}
      <EmailHeading as="h2">{p.title}</EmailHeading>
      <EmailText>{p.excerpt}</EmailText>
      <EmailButton href={p.href}>{p.ctaText ?? "Read article"}</EmailButton>
    </EmailSection>
  );
}

function ArticleListItemComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleListItem">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailLink href={p.href}>{p.title}</EmailLink>
      {p.excerpt && <EmailText>{p.excerpt}</EmailText>}
    </EmailSection>
  );
}

function ArticleHeroComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleHero">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.eyebrow && (
        <EmailText style={{ color: "#4f46e5" }}>{p.eyebrow}</EmailText>
      )}
      <EmailHeading as="h1">{p.title}</EmailHeading>
      <EmailText>{p.excerpt}</EmailText>
      {p.imageSrc && (
        <EmailImg src={p.imageSrc} alt={p.imageAlt ?? undefined} width={560} />
      )}
      <EmailButton href={p.href}>{p.ctaText}</EmailButton>
    </EmailSection>
  );
}

function ArticleDigestComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ArticleDigest">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h3">{p.title}</EmailHeading>}
      {p.items.map((item, idx) => (
        <EmailSection key={`digest-${idx}`}>
          <EmailLink href={item.href}>{item.title}</EmailLink>
          {item.meta && (
            <EmailText style={{ color: "#6b7280" }}>{item.meta}</EmailText>
          )}
          {item.excerpt && <EmailText>{item.excerpt}</EmailText>}
        </EmailSection>
      ))}
    </EmailSection>
  );
}

function FeatureRowComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeatureRow">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h3">{p.title}</EmailHeading>
      <EmailText>{p.description}</EmailText>
      {p.href && <EmailLink href={p.href}>Learn more</EmailLink>}
    </EmailSection>
  );
}

function FeatureCardComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeatureCard">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.icon && <EmailText>{p.icon}</EmailText>}
      <EmailHeading as="h3">{p.title}</EmailHeading>
      <EmailText>{p.description}</EmailText>
      {p.href && <EmailLink href={p.href}>Explore</EmailLink>}
    </EmailSection>
  );
}

function FeatureIconTextComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeatureIconText">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailText>
        {p.icon} <strong>{p.title}</strong>
      </EmailText>
      <EmailText>{p.text}</EmailText>
    </EmailSection>
  );
}

function FeatureBulletListComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeatureBulletList">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h3">{p.title}</EmailHeading>}
      <ul>
        {p.items.map((item, idx) => (
          <li key={`feat-${idx}`}>{item}</li>
        ))}
      </ul>
    </EmailSection>
  );
}

function FeatureHighlightComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeatureHighlight">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h2">{p.title}</EmailHeading>
      <EmailText>{p.text}</EmailText>
      {p.ctaText && p.ctaHref && (
        <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
      )}
    </EmailSection>
  );
}

function StatsRowComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"StatsRow">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h3">{p.title}</EmailHeading>}
      <EmailRow>
        {p.stats.map((stat, idx) => (
          <EmailColumn key={`stat-${idx}`}>
            <EmailHeading as="h2" style={{ margin: 0 }}>
              {stat.value}
            </EmailHeading>
            <EmailText style={{ margin: "4px 0 0" }}>{stat.label}</EmailText>
            {stat.helper && (
              <EmailText style={{ color: "#6b7280", margin: 0 }}>
                {stat.helper}
              </EmailText>
            )}
          </EmailColumn>
        ))}
      </EmailRow>
    </EmailSection>
  );
}

function StatsHighlightComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"StatsHighlight">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h1">{p.value}</EmailHeading>
      <EmailText>{p.label}</EmailText>
      {p.description && (
        <EmailText style={{ color: "#6b7280" }}>{p.description}</EmailText>
      )}
    </EmailSection>
  );
}

function TestimonialQuoteComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"TestimonialQuote">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailText style={{ fontStyle: "italic" }}>"{p.quote}"</EmailText>
      {p.avatarSrc && (
        <EmailImg
          src={p.avatarSrc}
          alt={p.author}
          width={48}
          height={48}
          style={{ borderRadius: "9999px" }}
        />
      )}
      <EmailText>
        <strong>{p.author}</strong>
        {p.role ? `, ${p.role}` : ""}
      </EmailText>
    </EmailSection>
  );
}

function TestimonialCardComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"TestimonialCard">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailText style={{ fontStyle: "italic" }}>"{p.quote}"</EmailText>
      <EmailText>
        <strong>{p.author}</strong>
        {p.company ? `, ${p.company}` : ""}
      </EmailText>
      {p.href && <EmailLink href={p.href}>Read case study</EmailLink>}
    </EmailSection>
  );
}

function FeedbackRequestComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeedbackRequest">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailText>{p.question}</EmailText>
      <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
    </EmailSection>
  );
}

function FeedbackScaleComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeedbackScale">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailText>{p.question}</EmailText>
      <EmailText>
        {p.lowLabel ?? "Low"}{" "}
        {[1, 2, 3, 4, 5].map((score) => (
          <React.Fragment key={`score-${score}`}>
            <EmailLink href={`${p.baseHref}?score=${score}`}>
              {score}
            </EmailLink>{" "}
          </React.Fragment>
        ))}
        {p.highLabel ?? "High"}
      </EmailText>
    </EmailSection>
  );
}

function FeedbackCTAComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"FeedbackCTA">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h3">{p.title}</EmailHeading>
      <EmailText>{p.text}</EmailText>
      <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
      {p.secondaryText && (
        <EmailText style={{ color: "#6b7280" }}>{p.secondaryText}</EmailText>
      )}
    </EmailSection>
  );
}

function PricingTierComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"PricingTier">>) {
  const p = element.props;
  return (
    <EmailSection
      style={{
        border: p.highlighted ? "2px solid #4f46e5" : "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "16px",
        ...(p.style ?? {}),
      }}
    >
      <EmailHeading as="h3">{p.name}</EmailHeading>
      <EmailText style={{ fontSize: "28px" }}>
        {p.price}
        {p.period ?? ""}
      </EmailText>
      <ul>
        {p.features.map((feature, idx) => (
          <li key={`tier-${idx}`}>{feature}</li>
        ))}
      </ul>
      {p.ctaText && p.ctaHref && (
        <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
      )}
    </EmailSection>
  );
}

function PricingComparisonComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"PricingComparison">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h2">{p.title}</EmailHeading>}
      <EmailRow>
        {p.tiers.map((tier, idx) => (
          <EmailColumn key={`cmp-${idx}`}>
            <EmailHeading as="h3">{tier.name}</EmailHeading>
            <EmailText>
              {tier.price}
              {tier.period ?? ""}
            </EmailText>
            <ul>
              {tier.features.map((feature, fIdx) => (
                <li key={`cmpf-${idx}-${fIdx}`}>{feature}</li>
              ))}
            </ul>
            {tier.ctaText && tier.ctaHref && (
              <EmailButton href={tier.ctaHref}>{tier.ctaText}</EmailButton>
            )}
          </EmailColumn>
        ))}
      </EmailRow>
    </EmailSection>
  );
}

function ProductCardComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"ProductCard">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailImg src={p.imageSrc} alt={p.imageAlt ?? p.name} width={280} />
      <EmailHeading as="h3">{p.name}</EmailHeading>
      {p.description && <EmailText>{p.description}</EmailText>}
      <EmailText>
        <strong>{p.price}</strong>
      </EmailText>
      <EmailButton href={p.href}>{p.ctaText ?? "Shop now"}</EmailButton>
    </EmailSection>
  );
}

function ProductGrid2Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"ProductGrid2">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h3">{p.title}</EmailHeading>}
      <EmailRow>
        {p.items.map((item, idx) => (
          <EmailColumn key={`pg2-${idx}`}>
            <EmailImg
              src={item.imageSrc}
              alt={item.imageAlt ?? item.name}
              width={260}
            />
            <EmailLink href={item.href}>{item.name}</EmailLink>
            <EmailText>{item.price}</EmailText>
          </EmailColumn>
        ))}
      </EmailRow>
    </EmailSection>
  );
}

function ProductGrid3Component({
  element,
}: ComponentRenderProps<StandardComponentProps<"ProductGrid3">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.title && <EmailHeading as="h3">{p.title}</EmailHeading>}
      <EmailRow>
        {p.items.map((item, idx) => (
          <EmailColumn key={`pg3-${idx}`}>
            <EmailImg
              src={item.imageSrc}
              alt={item.imageAlt ?? item.name}
              width={180}
            />
            <EmailLink href={item.href}>{item.name}</EmailLink>
            <EmailText>{item.price}</EmailText>
          </EmailColumn>
        ))}
      </EmailRow>
    </EmailSection>
  );
}

function OrderSummaryComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"OrderSummary">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h3">Order {p.orderNumber}</EmailHeading>
      {p.items.map((item, idx) => (
        <EmailText key={`ord-${idx}`}>
          {item.qty}x {item.name} - {item.price}
        </EmailText>
      ))}
      <EmailHr />
      <EmailText>
        <strong>Total: {p.total}</strong>
      </EmailText>
      {p.ctaText && p.ctaHref && (
        <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
      )}
    </EmailSection>
  );
}

function AbandonedCartComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"AbandonedCart">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      <EmailHeading as="h3">
        {p.customerName
          ? `${p.customerName}, your cart is waiting`
          : "Your cart is waiting"}
      </EmailHeading>
      <EmailRow>
        {p.items.map((item, idx) => (
          <EmailColumn key={`cart-${idx}`}>
            <EmailImg
              src={item.imageSrc}
              alt={item.imageAlt ?? item.name}
              width={180}
            />
            <EmailLink href={item.href}>{item.name}</EmailLink>
            <EmailText>{item.price}</EmailText>
          </EmailColumn>
        ))}
      </EmailRow>
      <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
    </EmailSection>
  );
}

function MarketingHeroComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"MarketingHero">>) {
  const p = element.props;
  return (
    <EmailSection style={p.style ?? undefined}>
      {p.eyebrow && (
        <EmailText style={{ color: "#4f46e5" }}>{p.eyebrow}</EmailText>
      )}
      <EmailHeading as="h1">{p.title}</EmailHeading>
      <EmailText>{p.text}</EmailText>
      {p.imageSrc && (
        <EmailImg src={p.imageSrc} alt={p.imageAlt ?? undefined} width={560} />
      )}
      <EmailButton href={p.ctaHref}>{p.ctaText}</EmailButton>
      {p.secondaryText && (
        <EmailText style={{ color: "#6b7280" }}>{p.secondaryText}</EmailText>
      )}
    </EmailSection>
  );
}

// =============================================================================
// Utility Components
// =============================================================================

function PreviewComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Preview">>) {
  const p = element.props;

  return <EmailPreview>{p.text}</EmailPreview>;
}

function MarkdownComponent({
  element,
}: ComponentRenderProps<StandardComponentProps<"Markdown">>) {
  const p = element.props;

  return (
    <EmailMarkdown
      markdownContainerStyles={p.markdownContainerStyles ?? undefined}
      markdownCustomStyles={p.markdownCustomStyles ?? undefined}
    >
      {p.content}
    </EmailMarkdown>
  );
}

// =============================================================================
// Registry
// =============================================================================

export const standardComponents: ComponentRegistry = {
  Html: HtmlComponent,
  Head: HeadComponent,
  Body: BodyComponent,
  Container: ContainerComponent,
  ContainerCard: ContainerCardComponent,
  Section: SectionComponent,
  SectionHero: SectionHeroComponent,
  SectionMuted: SectionMutedComponent,
  Row: RowComponent,
  Grid2: Grid2Component,
  Grid3: Grid3Component,
  Column: ColumnComponent,
  Heading: HeadingComponent,
  Header1: Header1Component,
  Header2: Header2Component,
  Header3: Header3Component,
  HeadingHero: HeadingHeroComponent,
  HeadingSection: HeadingSectionComponent,
  Text: TextComponent,
  Link: LinkComponent,
  Button: ButtonComponent,
  Image: ImageComponent,
  ImageHero: ImageHeroComponent,
  ImageAvatar: ImageAvatarComponent,
  ImageThumbnail: ImageThumbnailComponent,
  Gallery2: Gallery2Component,
  Gallery3: Gallery3Component,
  Gallery4: Gallery4Component,
  GalleryMosaic: GalleryMosaicComponent,
  Hr: HrComponent,
  DividerSoft: DividerSoftComponent,
  DividerDashed: DividerDashedComponent,
  FooterSimple: FooterSimpleComponent,
  FooterLinks: FooterLinksComponent,
  ListBulleted: ListBulletedComponent,
  ListNumbered: ListNumberedComponent,
  InlineCode: InlineCodeComponent,
  InlineCodeMuted: InlineCodeMutedComponent,
  ArticleCard: ArticleCardComponent,
  ArticleCompact: ArticleCompactComponent,
  ArticleFeature: ArticleFeatureComponent,
  ArticleListItem: ArticleListItemComponent,
  ArticleHero: ArticleHeroComponent,
  ArticleDigest: ArticleDigestComponent,
  FeatureRow: FeatureRowComponent,
  FeatureCard: FeatureCardComponent,
  FeatureIconText: FeatureIconTextComponent,
  FeatureBulletList: FeatureBulletListComponent,
  FeatureHighlight: FeatureHighlightComponent,
  StatsRow: StatsRowComponent,
  StatsHighlight: StatsHighlightComponent,
  TestimonialQuote: TestimonialQuoteComponent,
  TestimonialCard: TestimonialCardComponent,
  FeedbackRequest: FeedbackRequestComponent,
  FeedbackScale: FeedbackScaleComponent,
  FeedbackCTA: FeedbackCTAComponent,
  PricingTier: PricingTierComponent,
  PricingComparison: PricingComparisonComponent,
  ProductCard: ProductCardComponent,
  ProductGrid2: ProductGrid2Component,
  ProductGrid3: ProductGrid3Component,
  OrderSummary: OrderSummaryComponent,
  AbandonedCart: AbandonedCartComponent,
  MarketingHero: MarketingHeroComponent,
  Preview: PreviewComponent,
  Markdown: MarkdownComponent,
};

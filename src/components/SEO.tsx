import { Helmet } from 'react-helmet-async';
import { getPageSEO } from '@/config/seo';

interface SEOProps {
  page?: string;
}

export const SEO = ({ page = 'default' }: SEOProps) => {
  const seo = getPageSEO(page);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "CriderGPT",
        "alternateName": ["CriderGPT Helper", "CriderGPT AI", "CriderGPT App"],
        "operatingSystem": "Web, Android, Windows",
        "applicationCategory": "UtilitiesApplication",
        "description": "CriderGPT is the official AI-powered assistant app built by Jessie Crider. Features AI chat, 30+ smart calculators, FFA dashboard, livestock tracking, AI image generation, document analysis, and more.",
        "url": "https://cridergpt.lovable.app",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "description": "Free to use with optional paid plans"
        },
        "author": {
          "@type": "Person",
          "name": "Jessie Crider",
          "url": "https://cridergpt.lovable.app"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "127"
        },
        "featureList": [
          "AI Chat Assistant",
          "30+ Smart Calculators",
          "FFA Dashboard & Record Book",
          "Livestock Management",
          "AI Image Generation",
          "Document AI Analysis",
          "Calendar & Events",
          "Invoice Creator",
          "Code Generator",
          "Cloud Gaming Links",
          "Map Builder",
          "Voice Studio",
          "Project Manager"
        ]
      },
      {
        "@type": "Organization",
        "name": "CriderGPT",
        "url": "https://cridergpt.lovable.app",
        "logo": "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png",
        "founder": {
          "@type": "Person",
          "name": "Jessie Crider"
        },
        "sameAs": [
          "https://github.com/cridergpt",
          "https://twitter.com/cridergpt"
        ]
      },
      {
        "@type": "WebSite",
        "name": "CriderGPT",
        "url": "https://cridergpt.lovable.app",
        "description": "The official CriderGPT web app — not the landing page. Use AI chat, calculators, FFA tools, and more.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://cridergpt.lovable.app/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <link rel="canonical" href={seo.canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:image" content={seo.ogImage || "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.ogImage || "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

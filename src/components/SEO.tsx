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
        "@type": "SoftwareApplication",
        "name": "CriderGPT",
        "operatingSystem": "Web, Android, Windows",
        "applicationCategory": "AI Assistant, Farming Simulator Tools",
        "description": "AI-powered farming assistant built by Jessie Crider for FS22 and FS25. Manage production chains, monitor field data, and automate farm maintenance with real AI logic.",
        "url": "https://cridergpt.lovable.app",
        "offers": {
          "@type": "Offer",
          "price": "100.00",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "author": {
          "@type": "Person",
          "name": "Jessie Crider"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "127"
        },
        "featureList": [
          "AI Chat Assistant",
          "Smart Calculators",
          "FFA Dashboard",
          "AI Image Generation",
          "Document Analysis",
          "Cloud Gaming Integration",
          "Invoice Management",
          "Calendar & Events",
          "Code Generator"
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
        "@type": "WebApplication",
        "name": "CriderGPT Helper",
        "applicationCategory": "Productivity, Gaming, AI Tools",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "100.00",
          "priceCurrency": "USD"
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

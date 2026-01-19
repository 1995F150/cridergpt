/**
 * Link Parser Utility
 * Detects URLs in text and provides utilities for rendering them as clickable links
 */

export interface ParsedLink {
  url: string;
  displayText: string;
  startIndex: number;
  endIndex: number;
}

export interface TextPart {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

// Comprehensive URL regex that matches most common URL patterns
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Extract all URLs from a text string
 */
export function extractLinks(text: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let match;

  // Reset regex
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    links.push({
      url: match[0],
      displayText: formatDisplayUrl(match[0]),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * Format URL for display (truncate long URLs)
 */
export function formatDisplayUrl(url: string, maxLength: number = 50): string {
  try {
    const urlObj = new URL(url);
    let display = urlObj.hostname.replace('www.', '');
    
    if (urlObj.pathname && urlObj.pathname !== '/') {
      const path = urlObj.pathname;
      if (display.length + path.length > maxLength) {
        display += path.substring(0, maxLength - display.length - 3) + '...';
      } else {
        display += path;
      }
    }
    
    return display;
  } catch {
    // If URL parsing fails, just truncate
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
}

/**
 * Parse text into parts (text and links)
 */
export function parseTextWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const links = extractLinks(text);
  
  if (links.length === 0) {
    return [{ type: 'text', content: text }];
  }

  let lastIndex = 0;

  for (const link of links) {
    // Add text before the link
    if (link.startIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, link.startIndex),
      });
    }

    // Add the link
    parts.push({
      type: 'link',
      content: link.displayText,
      url: link.url,
    });

    lastIndex = link.endIndex;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * Check if a string contains any URLs
 */
export function containsLinks(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Detect if URL is for a known service and return icon name
 */
export function getUrlServiceType(url: string): string | null {
  const domain = extractDomain(url).toLowerCase();
  
  const serviceMap: Record<string, string> = {
    'github.com': 'github',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'linkedin.com': 'linkedin',
    'facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'docs.google.com': 'google-docs',
    'drive.google.com': 'google-drive',
    'wikipedia.org': 'wikipedia',
    'stackoverflow.com': 'stackoverflow',
    'reddit.com': 'reddit',
    'medium.com': 'medium',
  };

  for (const [key, value] of Object.entries(serviceMap)) {
    if (domain.includes(key)) {
      return value;
    }
  }

  return null;
}

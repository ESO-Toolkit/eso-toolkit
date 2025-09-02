import { useEffect } from 'react';

interface DynamicMetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

/**
 * Component to dynamically update meta tags for better social media sharing
 * Useful for specific reports, fights, or analysis pages
 */
export const DynamicMetaTags: React.FC<DynamicMetaTagsProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
}) => {
  useEffect(() => {
    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    const updateMetaName = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Update document title
    if (title) {
      document.title = `${title} | ESO Log Insights by NotaGuild`;
    }

    // Update meta description
    if (description) {
      updateMetaName('description', description);
    }

    // Update Open Graph tags
    if (title) {
      updateMetaTag('og:title', title);
    }
    if (description) {
      updateMetaTag('og:description', description);
    }
    if (image) {
      updateMetaTag('og:image', image);
    }
    if (url) {
      updateMetaTag('og:url', url);
    }
    if (type) {
      updateMetaTag('og:type', type);
    }

    // Update Twitter Card tags
    if (title) {
      updateMetaName('twitter:title', title);
    }
    if (description) {
      updateMetaName('twitter:description', description);
    }
    if (image) {
      updateMetaName('twitter:image', image);
    }
    if (url) {
      updateMetaName('twitter:url', url);
    }

  }, [title, description, image, url, type]);

  return null; // This component doesn't render anything
};

// Helper function to generate dynamic meta tags for specific content
export const generateReportMetaTags = (
  reportCode: string,
  fightName?: string,
  playerName?: string,
  dps?: number,
  duration?: number
) => {
  const baseTitle = `${reportCode} Analysis`;
  const title = fightName 
    ? `${fightName} - ${baseTitle}`
    : baseTitle;

  let description = `Detailed combat log analysis for ESO report ${reportCode}.`;
  
  if (fightName && playerName && dps) {
    description += ` ${playerName} achieved ${Math.round(dps).toLocaleString()} DPS on ${fightName}.`;
  } else if (fightName) {
    description += ` Analysis of ${fightName} encounter.`;
  }
  
  if (duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    description += ` Fight duration: ${minutes}:${seconds.toString().padStart(2, '0')}.`;
  }
  
  description += ' View detailed damage breakdowns, buff uptimes, and performance insights.';

  return {
    title,
    description,
    url: `${window.location.origin}${window.location.pathname}#${window.location.hash}`,
    type: 'article' as const,
  };
};

// Helper function for player-specific analysis
export const generatePlayerMetaTags = (
  reportCode: string,
  playerName: string,
  className?: string,
  dps?: number,
  fightName?: string
) => {
  const title = `${playerName}'s Performance - ${reportCode}`;
  
  let description = `Combat analysis for ${playerName}`;
  if (className) {
    description += ` (${className})`;
  }
  description += ` in ESO report ${reportCode}.`;
  
  if (dps && fightName) {
    description += ` Achieved ${Math.round(dps).toLocaleString()} DPS on ${fightName}.`;
  }
  
  description += ' Detailed damage breakdowns, rotation analysis, and optimization tips.';

  return {
    title,
    description,
    url: `${window.location.origin}${window.location.pathname}#${window.location.hash}`,
    type: 'article' as const,
  };
};

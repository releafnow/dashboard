import { useEffect } from 'react';

const TawkTo = () => {
  useEffect(() => {
    // Check if tawk.to script is already loaded
    if (window.Tawk_API) {
      return;
    }

    // Get your Property ID and Widget ID from tawk.to dashboard
    // Replace these with your actual IDs from https://dashboard.tawk.to/
    const TAWK_PROPERTY_ID = process.env.REACT_APP_TAWK_PROPERTY_ID || 'YOUR_PROPERTY_ID';
    const TAWK_WIDGET_ID = process.env.REACT_APP_TAWK_WIDGET_ID || 'YOUR_WIDGET_ID';

    // Skip if placeholder values are still there
    if (TAWK_PROPERTY_ID === 'YOUR_PROPERTY_ID' || TAWK_WIDGET_ID === 'YOUR_WIDGET_ID') {
      console.warn('Tawk.to: Please configure REACT_APP_TAWK_PROPERTY_ID and REACT_APP_TAWK_WIDGET_ID in your .env file');
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Append script to head
    document.head.appendChild(script);

    // Optional: Configure tawk.to settings
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Customize widget appearance to match your brand
    window.Tawk_API.customStyle = {
      visibility: {
        desktop: {
          position: 'br', // bottom-right
          xOffset: 20,
          yOffset: 20
        },
        mobile: {
          position: 'br',
          xOffset: 10,
          yOffset: 10
        }
      }
    };

    // Cleanup function
    return () => {
      const existingScript = document.querySelector(`script[src*="tawk.to/${TAWK_PROPERTY_ID}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default TawkTo;

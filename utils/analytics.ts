// Google Ads Conversion Tracking
interface ConversionEvent {
  send_to?: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
  event_callback?: () => void;
}

export const trackConversion = (
  action: 'get_started' | 'sign_in' | 'feature_click' | 'pricing_view',
  url?: string
) => {
  try {
    const callback = () => {
      if (typeof(url) != 'undefined') {
        window.location.href = url;
      }
    };

    const conversionData: { [key: string]: ConversionEvent } = {
      get_started: {
        send_to: 'AW-16510475658/syhbCJabiqsaEIq758A9',
        value: 1.0,
        currency: 'USD',
        event_callback: callback
      },
    //   sign_in: {
    //     send_to: 'AW-16510475658/v-X_CPH7iasaEIq758A9',
    //     event_callback: callback
    //   },
      feature_click: {
        send_to: 'AW-16510475658/v-X_CPH7iasaEIq758A9',
        value: 1.0,
        currency: 'USD',
        event_callback: callback
      },
      pricing_view: {
        send_to: 'AW-16510475658/4hhiCM_H9qoaEIq758A9',
        event_callback: callback
      }
    };

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', conversionData[action]);
    }
    return false;
  } catch (error) {
    console.error('Error tracking conversion:', error);
    if (url) {
      window.location.href = url;
    }
    return false;
  }
};

// Type declaration for gtag
declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params: ConversionEvent
    ) => void;
  }
} 
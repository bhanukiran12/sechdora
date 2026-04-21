import axios from 'axios';

const BACKEND_URL = `/api`;

/**
 * Global analytics tracker
 * @param {string} event - Event name (e.g., 'post_created')
 * @param {object} properties - Additional data
 */
export const trackEvent = async (event, properties = {}) => {
  // 1. Push to Datalayer (GTM/GA4)
  if (window.dataLayer) {
    window.dataLayer.push({
      event,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // 2. Send to internal backend
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      await axios.post(`${BACKEND_URL}/api/analytics/track`, {
        event,
        properties
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to log internal event:', err);
    }
  }
};

// Expose to window for easy access
window.trackEvent = trackEvent;

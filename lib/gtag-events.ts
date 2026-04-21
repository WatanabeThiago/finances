export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

export function trackTrackingEvent(event: string, data: Record<string, any>) {
  trackEvent('tracking_event', {
    event_type: event,
    ...data,
  });
}

export function trackContactRequest(phone: string) {
  trackEvent('contact_request', {
    phone,
  });
}

export function trackCallEvent(visitorId?: string) {
  trackEvent('call_request', {
    visitor_id: visitorId,
  });
}

export function trackSubmitCallbackRequest(phone: string) {
  trackEvent('submit_callback_request', {
    phone,
  });
}

export function trackCallbackRequest(id: string, phone: string) {
  trackEvent('callback_request', {
    contact_request_id: id,
    phone,
  });
}

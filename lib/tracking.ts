// Bot detection patterns
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /java(?!script)/i,
  /adsbot/i,
  /adwords/i,
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegram/i,
];

export function isBot(userAgent: string): boolean {
  if (!userAgent) return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function extractUTMParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url, 'https://example.com');
    const params: Record<string, string> = {};
    
    const utmParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'gclid',
      'fbclid',
      'msclkid',
    ];
    
    utmParams.forEach((param) => {
      const value = urlObj.searchParams.get(param);
      if (value) {
        params[param] = value;
      }
    });
    
    return params;
  } catch {
    return {};
  }
}

export type TrackingEvent = {
  phone: string;
  utm_source: any;
  utm_medium: any;
  venda: boolean;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  gclid: any;
  fbclid: any;
  msclkid: any;
  gad_source: string;
  gad_campaignid: string;
  gbraid: any;
  keyword: any;
  device: any;
  matchtype: string;
  network: any;
  group: any;
  id: string;
  created_at: string;
  event: string;
  visitor_id: string;
  user_agent: string;
  is_bot: boolean;
  session_created_at?: string;
  session_updated_at?: string;
};

export type TrackingSession = {
  id: string;
  visitor_id: string;
  phone?: string;
  venda?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  gad_source?: string;
  gad_campaignid?: string;
  gbraid?: string;
  keyword?: string;
  device?: string;
  matchtype?: string;
  network?: string;
  group?: string;
  created_at?: string;
  updated_at?: string;
};

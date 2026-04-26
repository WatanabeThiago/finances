import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params);
  return result.rows;
}

export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        k,
        v instanceof Date ? v.toISOString() : sanitizeData(v),
      ])
    );
  }
  return data;
}

export async function initializeDatabase() {
  try {
    // Create tables
    await query(
      `CREATE TABLE IF NOT EXISTS public."Partner" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nome TEXT NOT NULL,
        endereco TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        automotivo BOOLEAN DEFAULT false,
        residencial BOOLEAN DEFAULT false,
        "fotoDataUrl" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Add missing columns if they don't exist
    await query(
      `ALTER TABLE public."Partner" 
       ADD COLUMN IF NOT EXISTS endereco TEXT,
       ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
       ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
       ADD COLUMN IF NOT EXISTS automotivo BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS residencial BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS "fotoDataUrl" TEXT,
       ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."Produto" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nome TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        automotivo BOOLEAN DEFAULT false,
        residencial BOOLEAN DEFAULT false,
        "fotoDataUrl" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Add missing columns to Produto if they don't exist
    await query(
      `ALTER TABLE public."Produto" 
       ADD COLUMN IF NOT EXISTS "fotoDataUrl" TEXT,
       ADD COLUMN IF NOT EXISTS automotivo BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS residencial BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."Service" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "fotoDataUrl" TEXT,
        nome TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        "valorNoturno" DECIMAL(10, 2) NOT NULL,
        "gastosEstimados" DECIMAL(10, 2) NOT NULL,
        observacoes TEXT DEFAULT '',
        automotivo BOOLEAN DEFAULT false,
        residencial BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Add missing columns to Service if they don't exist
    await query(
      `ALTER TABLE public."Service" 
       ADD COLUMN IF NOT EXISTS "fotoDataUrl" TEXT,
       ADD COLUMN IF NOT EXISTS "valorNoturno" DECIMAL(10, 2),
       ADD COLUMN IF NOT EXISTS "gastosEstimados" DECIMAL(10, 2),
       ADD COLUMN IF NOT EXISTS observacoes TEXT DEFAULT '',
       ADD COLUMN IF NOT EXISTS automotivo BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS residencial BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    );

    // Join tables for relationships
    await query(
      `CREATE TABLE IF NOT EXISTS public."_PartnerToService" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        PRIMARY KEY ("A", "B"),
        FOREIGN KEY ("A") REFERENCES public."Partner"(id) ON DELETE CASCADE,
        FOREIGN KEY ("B") REFERENCES public."Service"(id) ON DELETE CASCADE
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."_ProdutoToService" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        PRIMARY KEY ("A", "B"),
        FOREIGN KEY ("A") REFERENCES public."Produto"(id) ON DELETE CASCADE,
        FOREIGN KEY ("B") REFERENCES public."Service"(id) ON DELETE CASCADE
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."VendaLg" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "clienteNome" TEXT NOT NULL,
        "clienteTelefone" TEXT DEFAULT '',
        "clienteDoc" TEXT,
        "prestadorId" TEXT,
        comissao DECIMAL(10, 2),
        "comissaoPaga" BOOLEAN DEFAULT false,
        "dataVenda" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Add missing columns to VendaLg if they don't exist
    await query(
      `ALTER TABLE public."VendaLg"
       ADD COLUMN IF NOT EXISTS "dataVenda" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS endereco TEXT,
       ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
       ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."VendaLgLine" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "vendaLgId" TEXT NOT NULL,
        "servicoId" TEXT NOT NULL,
        "precoOriginal" DECIMAL(10, 2) NOT NULL,
        preco DECIMAL(10, 2) NOT NULL,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY ("vendaLgId") REFERENCES public."VendaLg"(id) ON DELETE CASCADE,
        FOREIGN KEY ("servicoId") REFERENCES public."Service"(id) ON DELETE SET NULL
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."DailyAds" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        data DATE NOT NULL UNIQUE,
        "entradaReal" DECIMAL(10, 2) NOT NULL,
        "gastosGoogleAds" DECIMAL(10, 2) NOT NULL,
        clientes INTEGER NOT NULL,
        cac DECIMAL(10, 2) NOT NULL,
        "ticketMedio" DECIMAL(10, 2) NOT NULL,
        cpc DECIMAL(10, 2) NOT NULL,
        resultado DECIMAL(10, 2) NOT NULL,
        comissao DECIMAL(10, 2) DEFAULT 0,
        "resultadoComissao" DECIMAL(10, 2) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Add missing columns if they don't exist
    await query(
      `ALTER TABLE public."DailyAds"
       ADD COLUMN IF NOT EXISTS comissao DECIMAL(10, 2) DEFAULT 0,
       ADD COLUMN IF NOT EXISTS "resultadoComissao" DECIMAL(10, 2) DEFAULT 0`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS google_ads_cache (
        date DATE PRIMARY KEY,
        gastos_google_ads DECIMAL(10,2) NOT NULL,
        cpc DECIMAL(10,2) NOT NULL,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS search_terms (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        term TEXT NOT NULL,
        campaign_id TEXT,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        cost DECIMAL(10,2) DEFAULT 0,
        conversions DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pending',
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        UNIQUE(term, campaign_id)
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."TrackingSession" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "visitorId" TEXT NOT NULL UNIQUE,
        phone TEXT,
        venda BOOLEAN DEFAULT false,
        "utmSource" TEXT,
        "utmMedium" TEXT,
        "utmCampaign" TEXT,
        "utmContent" TEXT,
        "utmTerm" TEXT,
        gclid TEXT,
        fbclid TEXT,
        msclkid TEXT,
        gad_source TEXT,
        gad_campaignid TEXT,
        gbraid TEXT,
        keyword TEXT,
        device TEXT,
        matchtype TEXT,
        network TEXT,
        "group" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public."Tracking" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        event TEXT NOT NULL,
        "visitorId" TEXT NOT NULL,
        "userAgent" TEXT NOT NULL,
        "isBot" BOOLEAN DEFAULT false
      )`
    );

    await query(
      `ALTER TABLE public."TrackingSession" 
       ADD COLUMN IF NOT EXISTS phone TEXT,
       ADD COLUMN IF NOT EXISTS venda BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
       ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
       ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
       ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
       ADD COLUMN IF NOT EXISTS "utmTerm" TEXT,
       ADD COLUMN IF NOT EXISTS gclid TEXT,
       ADD COLUMN IF NOT EXISTS fbclid TEXT,
       ADD COLUMN IF NOT EXISTS msclkid TEXT,
       ADD COLUMN IF NOT EXISTS gad_source TEXT,
       ADD COLUMN IF NOT EXISTS gad_campaignid TEXT,
       ADD COLUMN IF NOT EXISTS gbraid TEXT,
       ADD COLUMN IF NOT EXISTS keyword TEXT,
       ADD COLUMN IF NOT EXISTS device TEXT,
       ADD COLUMN IF NOT EXISTS matchtype TEXT,
       ADD COLUMN IF NOT EXISTS network TEXT,
       ADD COLUMN IF NOT EXISTS "group" TEXT`
    );

    await query(
      `CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        text TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Seeds iniciais
    await query(
      `INSERT INTO public.whatsapp_templates (text) VALUES
        ('Oi, estou precisando de um chaveiro 24h. Você está disponivel?'),
        ('Olá, preciso de um chaveiro 24H. Vocês estão disponiveis?'),
        ('Preciso de um chaveiro 24h. Voce está disponivel?'),
        ('Preciso de chaveiro 24h. Voce está disponivel agora?')
       ON CONFLICT (text) DO NOTHING`
    );

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

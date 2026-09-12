-- Migration 008: Criar tabela de Saídas (Despesas)
CREATE TABLE IF NOT EXISTS public."Saida" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  categoria TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  "formaPagamento" TEXT DEFAULT 'Pix',
  "dataSaida" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saida_data ON public."Saida" ("dataSaida" DESC);
CREATE INDEX IF NOT EXISTS idx_saida_categoria ON public."Saida" (categoria);

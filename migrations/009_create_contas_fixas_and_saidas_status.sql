-- Migration 009: Contas Fixas e Status de Contas a Pagar em Saidas

-- 1. Campos para Contas a Pagar na tabela Saida
ALTER TABLE public."Saida"
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS "dataVencimento" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "dataPagamento" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS fornecedor TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "isFixa" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_saida_status ON public."Saida" (status);
CREATE INDEX IF NOT EXISTS idx_saida_vencimento ON public."Saida" ("dataVencimento");

-- 2. Tabela de Contas Fixas (Despesas Recorrentes)
CREATE TABLE IF NOT EXISTS public."ContaFixa" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  categoria TEXT NOT NULL DEFAULT 'Outros',
  "diaVencimento" INTEGER NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed da conta fixa padrão existente (Apartamento R$ 2.000) se ainda não existir
INSERT INTO public."ContaFixa" (nome, valor, categoria, "diaVencimento", ativo)
SELECT 'Apartamento', 2000.00, 'Outros', 10, true
WHERE NOT EXISTS (
  SELECT 1 FROM public."ContaFixa" WHERE LOWER(nome) = 'apartamento'
);

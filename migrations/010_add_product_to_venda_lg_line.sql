-- Migração para suportar produtos além de serviços nas linhas de vendas (VendaLgLine)
ALTER TABLE public."VendaLgLine" ALTER COLUMN "servicoId" DROP NOT NULL;
ALTER TABLE public."VendaLgLine" ADD COLUMN IF NOT EXISTS "produtoId" TEXT REFERENCES public."Produto"(id) ON DELETE SET NULL;
ALTER TABLE public."VendaLgLine" ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'servico';
ALTER TABLE public."VendaLgLine" ADD COLUMN IF NOT EXISTS nome TEXT;

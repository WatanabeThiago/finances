"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Loader2, 
  User, 
  Phone, 
  FileText, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  X, 
  ChevronRight, 
  MessageCircle,
  ExternalLink,
  Tag,
  CreditCard,
  CheckCircle2,
  Clock
} from "lucide-react";
import { formatBRL } from "@/lib/money";

type Cliente = {
  telefone: string;
  nome: string;
  documento?: string;
  createdAt: string;
  updatedAt: string;
  totalVendas?: number;
  faturamento?: number;
};

type VendaLineItem = {
  id: string;
  servicoId: string;
  servicoNome: string;
  precoOriginal: number;
  preco: number;
  quantidade: number;
};

type VendaCliente = {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteDoc?: string;
  vehiclePlate?: string;
  endereco?: string;
  formaPagamento?: string;
  clientePagou: boolean;
  dataVenda?: string;
  createdAt: string;
  linhas: VendaLineItem[];
};

export function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Drawer state
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clientSales, setClientSales] = useState<VendaCliente[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const fetchClientes = async (query = "") => {
    setLoading(true);
    try {
      const url = query
        ? `/api/clientes?q=${encodeURIComponent(query)}`
        : "/api/clientes";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setClientes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setLoadingSales(true);
    try {
      const res = await fetch(`/api/clientes/${encodeURIComponent(cliente.telefone)}/vendas`);
      if (!res.ok) throw new Error("Falha ao carregar vendas do cliente");
      const salesData = await res.json();
      setClientSales(salesData);
    } catch (err) {
      console.error(err);
      setClientSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

  const totalGeralFaturamento = clientes.reduce((acc, c) => acc + (c.faturamento || 0), 0);
  const totalGeralVendas = clientes.reduce((acc, c) => acc + (c.totalVendas || 0), 0);

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <User className="h-7 w-7 text-sky-500" />
            Clientes
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie sua carteira de clientes fixos, seguradoras e parceiros comercial.
          </p>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Total Clientes</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{clientes.length}</span>
          </div>
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-2 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Faturamento Total</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatBRL(totalGeralFaturamento)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6 flex items-center max-w-md relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                <th className="px-6 py-4 text-center">Nº Vendas</th>
                <th className="px-6 py-4 text-right">Faturamento</th>
                <th className="px-6 py-4">Cadastrado em</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                    <p className="mt-2 text-zinc-500">Buscando clientes...</p>
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr
                    key={cliente.telefone}
                    onClick={() => handleSelectCliente(cliente)}
                    className="group cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold dark:bg-sky-900/50 dark:text-sky-300">
                          {cliente.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{cliente.nome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                      {cliente.telefone}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                      {cliente.documento || "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {cliente.totalVendas || 0} {cliente.totalVendas === 1 ? "venda" : "vendas"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatBRL(cliente.faturamento || 0)}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs">
                      {new Date(cliente.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ChevronRight className="h-5 w-5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Drawer / Modal */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedCliente(null)} 
          />
          
          <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white font-bold text-lg shadow-sm">
                  {selectedCliente.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedCliente.nome}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedCliente.telefone}
                    </span>
                    {selectedCliente.documento && (
                      <span className="flex items-center gap-1 font-mono">
                        <FileText className="h-3.5 w-3.5" />
                        {selectedCliente.documento}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* WhatsApp button */}
                <a
                  href={`https://wa.me/55${cleanPhone(selectedCliente.telefone)}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir WhatsApp"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => setSelectedCliente(null)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Total de Vendas</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                  <ShoppingBag className="h-5 w-5 text-sky-500" />
                  {selectedCliente.totalVendas || clientSales.length}
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Faturamento Acumulado</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 mt-0.5">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  {formatBRL(selectedCliente.faturamento || 0)}
                </span>
              </div>
            </div>

            {/* Sales List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                Histórico de Vendas
              </h3>

              {loadingSales ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-3" />
                  <p>Carregando histórico de vendas...</p>
                </div>
              ) : clientSales.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
                  <ShoppingBag className="mx-auto h-10 w-10 text-zinc-400 mb-2" />
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma venda registrada</p>
                  <p className="text-xs text-zinc-500 mt-1">Este cliente ainda não possui vendas vinculadas no sistema.</p>
                </div>
              ) : (
                clientSales.map((venda) => {
                  const saleTotal = venda.linhas?.reduce(
                    (acc, l) => acc + (l.preco || 0) * (l.quantidade || 1),
                    0
                  ) || 0;

                  return (
                    <div
                      key={venda.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      {/* Sale Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(venda.dataVenda || venda.createdAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>

                            {venda.vehiclePlate && (
                              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                🚘 {venda.vehiclePlate}
                              </span>
                            )}
                          </div>
                          
                          {venda.endereco && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate max-w-sm">
                              📍 {venda.endereco}
                            </p>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              venda.clientePagou
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                            }`}
                          >
                            {venda.clientePagou ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Pago
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" /> Pendente
                              </>
                            )}
                          </span>
                          {venda.formaPagamento && (
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                              <CreditCard className="h-3 w-3" />
                              {venda.formaPagamento}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="py-3 space-y-1.5">
                        {venda.linhas && venda.linhas.length > 0 ? (
                          venda.linhas.map((ln) => (
                            <div
                              key={ln.id}
                              className="flex items-center justify-between text-xs py-0.5 text-zinc-700 dark:text-zinc-300"
                            >
                              <span className="flex items-center gap-1.5">
                                <Tag className="h-3 w-3 text-sky-500 shrink-0" />
                                <span className="font-medium">{ln.servicoNome}</span>
                                {ln.quantidade > 1 && (
                                  <span className="text-zinc-400">({ln.quantidade}x)</span>
                                )}
                              </span>
                              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                                {formatBRL(ln.preco * ln.quantidade)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-400 italic">Nenhum item listado</p>
                        )}
                      </div>

                      {/* Sale Footer Total */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total da Venda</span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatBRL(saleTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

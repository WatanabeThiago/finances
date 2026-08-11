import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

type Cliente = {
  telefone: string;
  nome: string;
  documento?: string;
};

type Props = {
  nome: string;
  telefone: string;
  documento: string;
  onChange: (fields: { nome?: string; telefone?: string; documento?: string }) => void;
};

export function ClienteAutocomplete({ nome, telefone, documento, onChange }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchClientes = async (query: string) => {
    if (!query) {
      setClientes([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.slice(0, 5)); // show top 5
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && nome.length >= 2) {
      const timer = setTimeout(() => {
        searchClientes(nome);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setClientes([]);
    }
  }, [nome, open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={nome}
        onChange={(e) => {
          onChange({ nome: e.target.value });
          setOpen(true);
        }}
        onFocus={() => {
          if (nome.length >= 2) setOpen(true);
        }}
        autoComplete="off"
        className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        placeholder="Nome completo ou fantasia"
      />
      
      {open && (clientes.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1 text-sm">
              {clientes.map((cliente) => (
                <li
                  key={cliente.telefone}
                  onClick={() => {
                    onChange({
                      nome: cliente.nome,
                      telefone: cliente.telefone,
                      documento: cliente.documento || "",
                    });
                    setOpen(false);
                  }}
                  className="flex cursor-pointer flex-col px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {cliente.nome}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {cliente.telefone} {cliente.documento ? `- ${cliente.documento}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

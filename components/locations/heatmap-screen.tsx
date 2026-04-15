"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, TileLayer, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VendaLg } from "@/lib/venda-lg";
import { formatBRL } from "@/lib/money";

declare global {
  interface Window {
    L: any;
  }
}

// Initialize Leaflet icon
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Heat layer component
function HeatLayer({ data }: { data: [number, number, number][] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (data.length === 0) return;

    // Remove old layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Check if L.heat is available
    if (window.L && window.L.heatLayer) {
      layerRef.current = window.L.heatLayer(data, {
        max: 100,
        radius: 25,
        blur: 15,
        minOpacity: 0.3,
        gradient: {
          0.0: "#0000ff",
          0.25: "#00ffff",
          0.5: "#00ff00",
          0.75: "#ffff00",
          1.0: "#ff0000",
        },
      }).addTo(map);
      console.log('Heat layer criado com', data.length, 'pontos');
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, data]);

  return null;
}

export function HeatmapScreen() {
  const [vendas, setVendas] = useState<VendaLg[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("7d");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [heatmapReady, setHeatmapReady] = useState(false);

  // Load leaflet.heat library
  useEffect(() => {
    // Check if already loaded
    if (window.L && window.L.heatLayer) {
      setHeatmapReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js";
    script.async = true;
    script.onload = () => {
      setHeatmapReady(true);
    };
    script.onerror = () => {
      console.error("Failed to load leaflet.heat");
      setHeatmapReady(true); // Still mark as ready to avoid infinite loading
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    const fetchVendas = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/vendas-lg");
        if (!response.ok) throw new Error("Falha ao carregar vendas");
        const data = await response.json();
        
        const normalizedVendas = data.map((v: any) => ({
          ...v,
          latitude: typeof v.latitude === "string" ? parseFloat(v.latitude) : v.latitude,
          longitude: typeof v.longitude === "string" ? parseFloat(v.longitude) : v.longitude,
          comissao: typeof v.comissao === "string" ? parseFloat(v.comissao) : v.comissao,
          linhas: Array.isArray(v.linhas) ? v.linhas.map((l: any) => ({
            ...l,
            preco: typeof l.preco === "string" ? parseFloat(l.preco) : l.preco,
            quantidade: typeof l.quantidade === "string" ? parseInt(l.quantidade, 10) : l.quantidade,
          })) : [],
        }));
        setVendas(normalizedVendas);
      } catch (err) {
        console.error("Error fetching vendas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendas();
  }, []);

  const filteredVendas = useMemo(() => {
    let filtered = vendas.filter((v) => v.latitude && v.longitude);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let cutoffDate: Date | null = null;

    if (dateFilter === "today") {
      cutoffDate = startOfToday;
    } else if (dateFilter === "yesterday") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      const endOfYesterday = new Date(cutoffDate);
      endOfYesterday.setDate(endOfYesterday.getDate() + 1);
      filtered = filtered.filter((v) => {
        const vendaDate = new Date(v.dataVenda || "");
        return vendaDate >= cutoffDate! && vendaDate < endOfYesterday;
      });
    } else if (dateFilter === "7d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (dateFilter === "30d") {
      cutoffDate = new Date(startOfToday);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    if (cutoffDate && dateFilter !== "yesterday") {
      filtered = filtered.filter((v) => {
        const vendaDate = new Date(v.dataVenda || "");
        return vendaDate >= cutoffDate!;
      });
    }

    return filtered;
  }, [vendas, dateFilter]);

  const heatmapData = useMemo(() => {
    // Calculate max value for normalization
    const maxComissao = Math.max(
      ...filteredVendas.map((v) => v.comissao || 0),
      1
    );
    
    return filteredVendas.map((v) => {
      // Use comissão as intensity, with minimum of 5 for visibility
      const intensity = Math.max((v.comissao || 0) / maxComissao * 100, 5);
      return [
        v.latitude!,
        v.longitude!,
        intensity,
      ];
    }) as [number, number, number][];
  }, [filteredVendas]);

  const bounds = useMemo(() => {
    if (filteredVendas.length === 0) {
      return [[-23.5505, -46.6333], [-23.5, -46.6]];
    }
    const lats = filteredVendas.map((v) => v.latitude!);
    const lons = filteredVendas.map((v) => v.longitude!);
    return [
      [Math.min(...lats) - 0.05, Math.min(...lons) - 0.05],
      [Math.max(...lats) + 0.05, Math.max(...lons) + 0.05],
    ];
  }, [filteredVendas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-zinc-50 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
            🗺️ Mapa de Calor de Vendas
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Visualize exatamente onde você tem mais concentração de vendas
          </p>
        </div>

        {/* Date Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setDateFilter("today")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "today"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter("yesterday")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "yesterday"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Ontem
          </button>
          <button
            onClick={() => setDateFilter("7d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "7d"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setDateFilter("30d")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "30d"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setDateFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              dateFilter === "all"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            Todas
          </button>
        </div>

        {/* Toggle Buttons */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showHeatmap
                ? "bg-red-600 text-white dark:bg-red-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            {showHeatmap ? "🔥" : "🔥"} Mapa de Calor {heatmapReady ? "✓" : "⏳"}
          </button>
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showMarkers
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            }`}
          >
            📍 Marcadores
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Vendas com Localização
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
              {filteredVendas.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total em Vendas
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {formatBRL(
                filteredVendas.reduce((acc, v) => {
                  const subtotal = v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
                  return acc + subtotal;
                }, 0)
              )}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Comissão Total
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-600 dark:text-violet-400">
              {formatBRL(
                filteredVendas.reduce((acc, v) => acc + (v.comissao || 0), 0)
              )}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
          {filteredVendas.length > 0 ? (
            <MapContainer
              id="heatmap"
              center={[
                (bounds[0][0] + bounds[1][0]) / 2,
                (bounds[0][1] + bounds[1][1]) / 2,
              ]}
              zoom={12}
              style={{ height: "600px", width: "100%" }}
              bounds={bounds as any}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Heatmap Layer */}
              {showHeatmap && heatmapReady && <HeatLayer data={heatmapData} />}
              
              {/* Markers */}
              {showMarkers && filteredVendas.map((v) => {
                const subtotal = v.linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
                return (
                  <Marker key={v.id} position={[v.latitude!, v.longitude!]}>
                    <Popup>
                      <div className="text-sm max-w-xs">
                        <p className="font-bold text-zinc-900">{v.clienteNome}</p>
                        <p className="text-xs text-zinc-600 mb-2">{v.clienteTelefone}</p>
                        
                        <div className="border-t border-zinc-200 pt-2 my-2">
                          <p className="text-sm">
                            <span className="font-semibold">Venda:</span> <span className="text-green-600 font-bold">{formatBRL(subtotal)}</span>
                          </p>
                          {v.comissao && (
                            <p className="text-sm mt-1">
                              <span className="font-semibold">Comissão:</span> <span className="text-violet-600 font-bold">{formatBRL(v.comissao)}</span>
                            </p>
                          )}
                          {v.prestadorId && (
                            <p className="text-sm mt-1">
                              <span className="font-semibold">Parceiro:</span> {v.prestadorId}
                            </p>
                          )}
                        </div>

                        {v.dataVenda && (
                          <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-200">
                            {new Date(v.dataVenda).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex h-96 items-center justify-center bg-zinc-50 dark:bg-zinc-900">
              <p className="text-zinc-500">
                Nenhuma venda com localização neste período
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-4">
            Como Usar
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">
                🔥 Mapa de Calor
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>🔴 <strong>Vermelho</strong> = Maior concentração de vendas</li>
                <li>🟡 <strong>Amarelo</strong> = Concentração média</li>
                <li>🟢 <strong>Verde</strong> = Concentração baixa</li>
                <li>🔵 <strong>Azul</strong> = Menor concentração</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">
                📍 Marcadores
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Cada marcador = Uma venda</li>
                <li>• Clique para ver detalhes completos</li>
                <li>• Informações de cliente, valor e comissão</li>
                <li>• Use os filtros de data para diferentes períodos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

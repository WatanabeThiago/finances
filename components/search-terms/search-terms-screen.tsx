"use client";

import { useCallback, useEffect, useState } from "react";

type SearchTerm = {
  id: string;
  term: string;
  campaign_id: string;
  impressions: number;
  clicks: number;
  cost: string;
  conversions: string;
  status: "pending" | "approved" | "rejected";
  synced_at: string;
};

type Tab = "pending" | "approved" | "rejected";

const SCRIPT = `function main() {
  var secret = 'watanabewatanabewatanabewatanabe';
  var campaignId = 'ID_DA_CAMPANHA';
  var url = 'https://finances-beige.vercel.app/api/search-terms/sync';

  var report = AdsApp.report(
    'SELECT Query, Impressions, Clicks, Cost, Conversions, CampaignId ' +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
    'WHERE CampaignId = ' + campaignId + ' ' +
    'DURING LAST_30_DAYS'
  );

  var terms = [];
  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    terms.push({
      term: row['Query'],
      campaignId: row['CampaignId'],
      impressions: parseInt(row['Impressions']),
      clicks: parseInt(row['Clicks']),
      cost: parseFloat(row['Cost'].replace(',','.')),
      conversions: parseFloat(row['Conversions'].replace(',','.'))
    });
  }

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ secret: secret, terms: terms }),
    muteHttpExceptions: true
  });

  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Termos: ' + terms.length + ' | Resposta: ' + response.getContentText());
}`;

export default function SearchTermsScreen() {
  const [tab, setTab] = useState<Tab>("pending");
  const [terms, setTerms] = useState<SearchTerm[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const fetchTerms = useCallback(async (status: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search-terms?status=${status}`);
      const data = await res.json();
      setTerms(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    const [p, a, r] = await Promise.all([
      fetch("/api/search-terms?status=pending").then((r) => r.json()),
      fetch("/api/search-terms?status=approved").then((r) => r.json()),
      fetch("/api/search-terms?status=rejected").then((r) => r.json()),
    ]);
    setCounts({
      pending: Array.isArray(p) ? p.length : 0,
      approved: Array.isArray(a) ? a.length : 0,
      rejected: Array.isArray(r) ? r.length : 0,
    });
  }, []);

  useEffect(() => {
    fetchTerms(tab);
  }, [tab, fetchTerms]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const updateStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    await fetch(`/api/search-terms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTerms((prev) => prev.filter((t) => t.id !== id));
    fetchCounts();
  };

  const copyApproved = async () => {
    const res = await fetch("/api/search-terms?status=approved");
    const data: SearchTerm[] = await res.json();
    const text = data.map((t) => t.term).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const TAB_LABELS: Record<Tab, string> = {
    pending: "Pendentes",
    approved: "Aprovados",
    rejected: "Reprovados",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Termos de Pesquisa</h1>
          <p className="text-sm text-gray-500">
            {counts.pending} {counts.pending === 1 ? "termo pendente" : "termos pendentes"}
          </p>
        </div>
        <button
          onClick={() => setScriptOpen(true)}
          className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
        >
          Ver script Google Ads
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[t]}
            <span className="ml-1.5 text-xs bg-gray-100 rounded-full px-1.5 py-0.5">
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Copy list button (approved tab) */}
      {tab === "approved" && counts.approved > 0 && (
        <button
          onClick={copyApproved}
          className="text-sm px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
        >
          {copied ? "Copiado!" : `Copiar ${counts.approved} termo${counts.approved !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">Carregando...</div>
      ) : terms.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          Nenhum termo {TAB_LABELS[tab].toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-2">
          {terms.map((t) => (
            <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold text-gray-900 break-all">{t.term}</p>
                <div className="flex gap-2 shrink-0">
                  {tab !== "approved" && (
                    <button
                      onClick={() => updateStatus(t.id, "approved")}
                      className="text-xs px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      ✓ Aprovar
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button
                      onClick={() => updateStatus(t.id, "rejected")}
                      className="text-xs px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      ✗ Reprovar
                    </button>
                  )}
                  {tab !== "pending" && (
                    <button
                      onClick={() => updateStatus(t.id, "pending")}
                      className="text-xs px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Desfazer
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>{t.impressions.toLocaleString("pt-BR")} impressões</span>
                <span>{t.clicks.toLocaleString("pt-BR")} cliques</span>
                <span>R$ {parseFloat(t.cost).toFixed(2).replace(".", ",")} custo</span>
                <span>{parseFloat(t.conversions).toFixed(1).replace(".", ",")} conv.</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Script dialog */}
      {scriptOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setScriptOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Script Google Ads</h2>
              <button onClick={() => setScriptOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Cole este script em <strong>Google Ads → Ferramentas → Scripts</strong>. Substitua
                <code className="bg-gray-100 px-1 rounded">ID_DA_CAMPANHA</code> pelo ID real.
              </p>
              <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded overflow-auto max-h-80 whitespace-pre-wrap">
                {SCRIPT}
              </pre>
              <button
                onClick={copyScript}
                className="w-full py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                {copiedScript ? "Copiado!" : "Copiar script"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

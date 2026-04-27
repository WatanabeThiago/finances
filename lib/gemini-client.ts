import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface ConversationAnalysis {
  resumo: string;
  servico: string;
  converteu: boolean | null;
  confianca: number;
  dicas: string[];
  resposta_sugerida: string;
}

const SYSTEM_PROMPT = `Você é um assistente de análise de vendas para um chaveiro 24h em Florianópolis/SC.

Analise a conversa do WhatsApp entre o atendente (Você) e o cliente.

Responda APENAS com JSON válido, sem markdown, sem explicações extras. Formato:
{
  "resumo": "1-2 linhas resumindo o que o cliente precisava e o desfecho",
  "servico": "tipo de serviço (ex: abertura de porta, cópia de chave, troca de segredo, instalação de fechadura, conserto de fechadura, outro)",
  "converteu": true | false | null,
  "confianca": 0-100,
  "dicas": ["dica 1", "dica 2"],
  "resposta_sugerida": "próxima mensagem a enviar se ainda há oportunidade, ou vazio se conversa encerrada"
}

Regras:
- "converteu": true se cliente contratou o serviço, false se desistiu/foi embora, null se ainda indefinido
- "confianca": sua certeza na análise (0 = chute, 100 = certeza)
- "dicas": 2-3 ações práticas para o atendente
- "resposta_sugerida": em português, direto, como um chaveiro profissional escreveria no WhatsApp`;

export async function analyzeConversation(
  messages: { fromMe: boolean; body: string; timestamp: number }[]
): Promise<ConversationAnalysis> {
  if (messages.length === 0) {
    return {
      resumo: "Nenhuma mensagem na conversa.",
      servico: "desconhecido",
      converteu: null,
      confianca: 0,
      dicas: ["Aguardar resposta do cliente"],
      resposta_sugerida: "Oi! Pode falar, tô aqui pra te ajudar 😊",
    };
  }

  const formatted = messages
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => `[${m.fromMe ? "Você" : "Cliente"}]: ${m.body}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}\n\nConversa:\n${formatted}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned) as ConversationAnalysis;
}

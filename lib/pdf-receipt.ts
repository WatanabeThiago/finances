import type { VendaLg } from "./venda-lg";
import type { Service } from "./service";
import type { Partner } from "./partner";
import { formatBRL } from "./money";

export function generateReceiptHTML(
  venda: VendaLg,
  servicoById: Map<string, Service>,
  prestadorById: Map<string, Partner>
): string {
  const prestador = venda.prestadorId
    ? prestadorById.get(venda.prestadorId)
    : null;
  const dataVenda = venda.dataVenda
    ? new Date(venda.dataVenda).toLocaleString("pt-BR")
    : new Date(venda.createdAt).toLocaleString("pt-BR");

  const total = venda.linhas.reduce((acc, l) => acc + l.preco * l.quantidade, 0);

  const linhasHTML = venda.linhas
    .map((linha) => {
      const servico = servicoById.get(linha.servicoId);
      const servicoNome = servico?.nome ?? "Serviço removido";
      const subtotal = linha.preco * linha.quantidade;
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${servicoNome}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${linha.quantidade}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatBRL(linha.preco)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatBRL(subtotal)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo - ${venda.clienteNome}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          background: white;
          padding: 20px;
        }
        .receipt {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1f2937;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 5px;
          color: #1f2937;
        }
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-section h2 {
          font-size: 14px;
          font-weight: bold;
          color: #374151;
          text-transform: uppercase;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
          min-width: 120px;
        }
        .info-value {
          color: #4b5563;
          flex: 1;
          text-align: right;
        }
        table {
          width: 100%;
          margin-bottom: 30px;
          border-collapse: collapse;
        }
        table thead {
          background-color: #f3f4f6;
        }
        table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
          font-size: 13px;
          color: #374151;
          border-bottom: 2px solid #d1d5db;
        }
        table td {
          padding: 8px;
          font-size: 13px;
          color: #4b5563;
        }
        .total-row {
          background-color: #f9fafb;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 0;
          }
          .receipt {
            border: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>RECIBO DE SERVIÇO</h1>
          <p>Chaveiro</p>
        </div>

        <div class="info-section">
          <h2>Informações do Cliente</h2>
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value">${venda.clienteNome}</span>
          </div>
          ${venda.clienteTelefone ? `
          <div class="info-row">
            <span class="info-label">Telefone:</span>
            <span class="info-value">${venda.clienteTelefone}</span>
          </div>
          ` : ""}
          ${venda.clienteDoc ? `
          <div class="info-row">
            <span class="info-label">CPF/CNPJ:</span>
            <span class="info-value">${venda.clienteDoc}</span>
          </div>
          ` : ""}
          ${venda.endereco ? `
          <div class="info-row">
            <span class="info-label">Endereço:</span>
            <span class="info-value">${venda.endereco}</span>
          </div>
          ` : ""}
        </div>

        <div class="info-section">
          <h2>Informações da Venda</h2>
          <div class="info-row">
            <span class="info-label">Data:</span>
            <span class="info-value">${dataVenda}</span>
          </div>
          ${prestador ? `
          <div class="info-row">
            <span class="info-label">Prestador:</span>
            <span class="info-value">${prestador.nome}</span>
          </div>
          ` : ""}
        </div>

        <h2 style="font-size: 14px; font-weight: bold; color: #374151; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Serviços Prestados</h2>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align: center;">Qtd</th>
              <th style="text-align: right;">Valor Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHTML}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding: 15px 8px;">TOTAL:</td>
              <td style="text-align: right; padding: 15px 8px; border-bottom: 2px solid #d1d5db;">${formatBRL(total)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Este é um recibo digital gerado automaticamente.</p>
          <p>ID da Venda: ${venda.id}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

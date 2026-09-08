/**
 * Integração com ApiAlerts para notificações push em tempo real no celular
 */

const APIALERTS_KEY =
  process.env.APIALERTS_KEY ||
  "ALGdX8oFs7H9D0iOcoXYYiO0YpXNErp4z_ARw1vGw5AwY";

const DEFAULT_CHANNEL = process.env.APIALERTS_CHANNEL || "chaveiro";

export interface ApiAlertPayload {
  message: string;
  channel?: string;
  title?: string;
  event?: string;
  tags?: string[];
  link?: string;
  data?: Record<string, any>;
}

export interface ApiAlertResponse {
  success: boolean;
  data?: any;
  error?: any;
}

/**
 * Envia notificação push para o celular via ApiAlerts
 */
export async function sendApiAlert(
  payload: ApiAlertPayload
): Promise<ApiAlertResponse> {
  try {
    const body = {
      message: payload.message,
      channel: payload.channel || DEFAULT_CHANNEL,
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.event ? { event: payload.event } : {}),
      ...(payload.tags && payload.tags.length > 0 ? { tags: payload.tags } : {}),
      ...(payload.link ? { link: payload.link } : {}),
      ...(payload.data ? { data: payload.data } : {}),
    };

    const response = await fetch("https://api.apialerts.com/event", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIALERTS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `[ApiAlerts] Erro ao enviar notificação (${response.status}):`,
        errText
      );
      return { success: false, error: errText };
    }

    const resData = await response.json().catch(() => ({}));
    return { success: true, data: resData };
  } catch (err) {
    console.error("[ApiAlerts] Exceção ao enviar notificação:", err);
    return { success: false, error: err };
  }
}

/**
 * SDK compatível com a biblioteca 'apialerts'
 */
export const ApiAlerts = {
  configure: (_key?: string) => {
    // Mantido para compatibilidade com o padrão ApiAlerts.configure('KEY')
  },
  send: (payload: ApiAlertPayload) => {
    // Fire and forget
    sendApiAlert(payload).catch((err) => {
      console.error("[ApiAlerts.send] Erro:", err);
    });
  },
  sendAsync: async (payload: ApiAlertPayload): Promise<ApiAlertResponse> => {
    return sendApiAlert(payload);
  },
};

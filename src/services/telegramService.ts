/**
 * Servicio para gestión e integración directa con Telegram Bot API
 */

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
}

/**
 * Consulta la información del bot para validar que el token sea correcto
 */
export async function getTelegramBotInfo(token: string): Promise<TelegramBotInfo> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('El token de Telegram no puede estar vacío.');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/getMe`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Token de Telegram inválido o no reconocido.');
  }

  return data.result as TelegramBotInfo;
}

/**
 * Consulta el estado actual del webhook del bot
 */
export async function getTelegramWebhookInfo(token: string): Promise<TelegramWebhookInfo> {
  const cleanToken = token.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/getWebhookInfo`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Error al consultar información del webhook.');
  }

  return data.result as TelegramWebhookInfo;
}

/**
 * Vincula el Webhook del bot con la URL del Web App de Apps Script o endpoint backend
 */
export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<string> {
  const cleanToken = token.trim();
  const cleanUrl = webhookUrl.trim();

  if (!cleanToken) {
    throw new Error('Ingresa el token del bot de Telegram.');
  }
  if (!cleanUrl) {
    throw new Error('Ingresa la URL de la aplicación web para recibir las alertas y tickets.');
  }

  const targetUrl = `https://api.telegram.org/bot${cleanToken}/setWebhook?url=${encodeURIComponent(cleanUrl)}&drop_pending_updates=true`;
  const res = await fetch(targetUrl);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Error al configurar el Webhook en Telegram.');
  }

  return data.description || 'Webhook configurado correctamente.';
}

/**
 * Elimina el webhook para pausar la recepción de mensajes
 */
export async function deleteTelegramWebhook(token: string): Promise<string> {
  const cleanToken = token.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/deleteWebhook`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Error al desvincular Webhook.');
  }

  return data.description || 'Webhook desvinculado con éxito.';
}

/**
 * Envía un mensaje de prueba al chat ID especificado
 */
export async function sendTelegramTestMessage(
  token: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();

  if (!cleanToken || !cleanChatId) {
    throw new Error('Token y Chat ID son requeridos para enviar el mensaje.');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text: text.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Error al enviar mensaje por Telegram.');
  }

  return true;
}

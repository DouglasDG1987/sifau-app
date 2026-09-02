// ============================================================
// SIFAU — Sistema de Notificações
// ============================================================
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { notifications, deviceTokens, profiles } from "@/db/schema";
import type { NotificationType, Notification, DevicePlatform } from "@/lib/types";

/**
 * Cria uma notificação no banco de dados
 */
export async function createNotification(params: {
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  occurrence_id?: string;
}): Promise<Notification> {
  const [created] = await db
    .insert(notifications)
    .values({
      profile_id: params.profile_id,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      occurrence_id: params.occurrence_id ?? null,
    })
    .returning();

  return {
    id: created.id,
    profile_id: created.profile_id,
    type: created.type as NotificationType,
    title: created.title,
    body: created.body,
    data: created.data as Record<string, unknown>,
    read: created.read,
    created_at: created.created_at.toISOString(),
    occurrence_id: created.occurrence_id,
  };
}

/**
 * Lista notificações não lidas de um perfil
 */
export async function getUnreadNotifications(profileId: string): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.profile_id, profileId), eq(notifications.read, false)))
    .orderBy(desc(notifications.created_at))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    type: r.type as NotificationType,
    title: r.title,
    body: r.body,
    data: r.data as Record<string, unknown>,
    read: r.read,
    created_at: r.created_at.toISOString(),
    occurrence_id: r.occurrence_id,
  }));
}

/**
 * Lista todas as notificações de um perfil
 */
export async function getAllNotifications(profileId: string, limit = 100): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.profile_id, profileId))
    .orderBy(desc(notifications.created_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    type: r.type as NotificationType,
    title: r.title,
    body: r.body,
    data: r.data as Record<string, unknown>,
    read: r.read,
    created_at: r.created_at.toISOString(),
    occurrence_id: r.occurrence_id,
  }));
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(profileId: string, notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.profile_id, profileId)));
}

/**
 * Marca todas as notificações de um perfil como lidas
 */
export async function markAllNotificationsAsRead(profileId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.profile_id, profileId), eq(notifications.read, false)));
}

/**
 * Registra um token de dispositivo para notificações push
 */
export async function registerDeviceToken(params: {
  profile_id: string;
  token: string;
  platform: DevicePlatform;
  device_info?: Record<string, unknown>;
}): Promise<void> {
  // Verifica se o token já existe
  const existing = await db
    .select()
    .from(deviceTokens)
    .where(and(eq(deviceTokens.token, params.token), eq(deviceTokens.profile_id, params.profile_id)))
    .limit(1);

  if (existing[0]) {
    // Atualiza o token existente
    await db
      .update(deviceTokens)
      .set({
        active: true,
        last_used: new Date(),
        device_info: params.device_info ?? {},
      })
      .where(eq(deviceTokens.id, existing[0].id));
  } else {
    // Cria novo token
    await db.insert(deviceTokens).values({
      profile_id: params.profile_id,
      token: params.token,
      platform: params.platform,
      device_info: params.device_info ?? {},
      active: true,
      last_used: new Date(),
    });
  }
}

/**
 * Remove um token de dispositivo
 */
export async function unregisterDeviceToken(profileId: string, token: string): Promise<void> {
  await db
    .update(deviceTokens)
    .set({ active: false })
    .where(and(eq(deviceTokens.token, token), eq(deviceTokens.profile_id, profileId)));
}

/**
 * Obtém tokens ativos de um perfil para envio de push
 */
export async function getActiveDeviceTokens(profileId: string): Promise<string[]> {
  const profile = await db
    .select({ push_enabled: profiles.push_enabled })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile[0] || !profile[0].push_enabled) return [];

  const tokens = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(and(eq(deviceTokens.profile_id, profileId), eq(deviceTokens.active, true)));

  return tokens.map((t) => t.token);
}

/**
 * Envia notificação push (integrará com Firebase FCM)
 * Por enquanto, apenas cria a notificação no banco
 */
export async function sendPushNotification(params: {
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  occurrence_id?: string;
}): Promise<Notification> {
  // Cria a notificação no banco
  const notification = await createNotification(params);

  // TODO: Integrar com Firebase Cloud Messaging
  // const tokens = await getActiveDeviceTokens(params.profile_id);
  // if (tokens.length > 0) {
  //   await sendFCMNotification(tokens, params.title, params.body, params.data);
  // }

  return notification;
}

/**
 * Notifica gestores sobre nova ocorrência
 */
export async function notifyGestorsAboutOccurrence(occurrenceId: string, category: string, urgency: number): Promise<void> {
  const gestores = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.role, "gestor"), eq(profiles.ativo, true)));

  const urgencyText = urgency >= 4 ? "CRÍTICA" : urgency >= 3 ? "ALTA" : "NORMAL";

  for (const gestor of gestores) {
    await sendPushNotification({
      profile_id: gestor.id,
      type: "occurrence_status",
      title: `Nova ocorrência ${urgencyText}`,
      body: `Nova denúncia de ${category} registrada. Precisa de triagem.`,
      data: { occurrence_id: occurrenceId, category, urgency },
      occurrence_id: occurrenceId,
    });
  }
}

/**
 * Notifica fiscal sobre designação
 */
export async function notifyFiscalAboutAssignment(occurrenceId: string, fiscalId: string, category: string): Promise<void> {
  await sendPushNotification({
    profile_id: fiscalId,
    type: "assignment",
    title: "Nova designação",
    body: `Você foi designado para uma ocorrência de ${category}.`,
    data: { occurrence_id: occurrenceId, category },
    occurrence_id: occurrenceId,
  });
}

/**
 * Notifica cidadão sobre mudança de status
 */
export async function notifyCitizenAboutStatus(occurrenceId: string, citizenId: string, status: string, category: string): Promise<void> {
  const statusMessages: Record<string, string> = {
    aberta: "Sua denúncia foi registrada com sucesso.",
    triada: "Sua denúncia está sendo analisada pela gestão.",
    atribuida: "Um fiscal foi designado para sua denúncia.",
    em_vistoria: "O fiscal está realizando a vistoria no local.",
    resolvida: "Sua denúncia foi resolvida!",
    arquivada: "Sua denúncia foi arquivada.",
    escalonada: "Sua denúncia está sendo redistribuída.",
  };

  await sendPushNotification({
    profile_id: citizenId,
    type: "occurrence_status",
    title: `Atualização: ${status.toUpperCase()}`,
    body: statusMessages[status] || `Status da sua denúncia de ${category} foi atualizado.`,
    data: { occurrence_id: occurrenceId, status, category },
    occurrence_id: occurrenceId,
  });
}

/**
 * Envia alerta de SLA
 */
export async function sendSLAAlert(profileId: string, occurrenceId: string, category: string, hoursRemaining: number): Promise<void> {
  await sendPushNotification({
    profile_id: profileId,
    type: "sla_alert",
    title: "Alerta de SLA",
    body: `Ocorrência de ${category} vence em ${hoursRemaining}h. Priorize resolução.`,
    data: { occurrence_id: occurrenceId, category, hours_remaining: hoursRemaining },
    occurrence_id: occurrenceId,
  });
}
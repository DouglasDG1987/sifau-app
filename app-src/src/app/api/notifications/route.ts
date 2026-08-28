import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, deviceTokens } from "@/db/schema";
import { getSessionProfile } from "@/lib/auth";
import {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/lib/notifications";
import type { DevicePlatform } from "@/lib/types";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const sp = req.nextUrl.searchParams;
  const unreadOnly = sp.get("unread") === "1";

  const notifs = unreadOnly 
    ? await getUnreadNotifications(profile.id)
    : await getAllNotifications(profile.id);

  return NextResponse.json({ notifications: notifs });
}

export async function POST(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    notification_id?: string;
    token?: string;
    platform?: DevicePlatform;
    device_info?: Record<string, unknown>;
  };

  if (body.action === "mark_read" && body.notification_id) {
    await markNotificationAsRead(body.notification_id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_all_read") {
    await markAllNotificationsAsRead(profile.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "register_token" && body.token && body.platform) {
    await registerDeviceToken({
      profile_id: profile.id,
      token: body.token,
      platform: body.platform,
      device_info: body.device_info,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unregister_token" && body.token) {
    await unregisterDeviceToken(body.token);
    return NextResponse.json({ ok: true });
  }

  return err("Ação inválida.", 400);
}

export async function PATCH(req: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return err("Não autenticado.", 401);

  const body = (await req.json().catch(() => ({}))) as {
    notification_id?: string;
    read?: boolean;
  };

  if (body.notification_id && body.read !== undefined) {
    if (body.read) {
      await markNotificationAsRead(body.notification_id);
    } else {
      // Marcar como não lida (raro, mas possível)
      await db
        .update(notifications)
        .set({ read: false })
        .where(eq(notifications.id, body.notification_id));
    }
    return NextResponse.json({ ok: true });
  }

  return err("Parâmetros inválidos.", 400);
}
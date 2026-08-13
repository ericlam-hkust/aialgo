/** Server-only notification delivery: writes the in-app inbox row and, when a
 *  transactional email provider is configured, sends the matching email. */

export type NotificationKind =
  | "model_purchase"
  | "new_version"
  | "payout_sent"
  | "model_paused"
  | "review_status";

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["NOTIFICATIONS_FROM_EMAIL"];
  if (!apiKey || !from) return; // in-app only until a sending domain is connected
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
  } catch {
    // email delivery is best-effort; the in-app notification is the source of truth
  }
}

export async function notify(inputs: NotificationInput | NotificationInput[]) {
  const rows = Array.isArray(inputs) ? inputs : [inputs];
  if (rows.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await supabaseAdmin.from("notifications").insert(
    rows.map((r) => ({
      user_id: r.userId,
      kind: r.kind,
      title: r.title,
      body: r.body ?? "",
      link: r.link ?? null,
      metadata: (r.metadata ?? {}) as never,
    })),
  );

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id,email").in("id", userIds);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  await Promise.all(
    rows.map((r) => {
      const email = emailById.get(r.userId);
      return email ? sendEmail(email, r.title, `${r.body ?? ""}\n\n${r.link ?? ""}`.trim()) : Promise.resolve();
    }),
  );
}

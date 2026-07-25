import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const helpSchema = z.object({
  email: z.string().email().max(320),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(10000),
});

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    const body = await req.json();
    const parsed = helpSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parsed.error.issues.map((i) => i.message).join(", "),
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    const { email, subject, message } = parsed.data;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: responseHeaders }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>New Help Center Message</h2>
        <p><strong>From:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wroob Help <onboarding@resend.dev>",
        to: ["yourwroob@gmail.com"],
        reply_to: email,
        subject: `[Help Center] ${subject}`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error (support):", resendData);
      return new Response(JSON.stringify({ error: "Email delivery failed", details: resendData }), {
        status: 502,
        headers: responseHeaders,
      });
    }

    // Send acknowledgement email to user (non-blocking on failure).
    try {
      const userName = escapeHtml(email.split("@")[0] || "there");
      const ackHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #111; line-height: 1.6;">
          <div style="padding: 20px 0; border-bottom: 3px solid #10b981;">
            <h1 style="margin: 0; font-size: 24px; color: #111;">Wroob Support</h1>
          </div>
          <div style="padding: 24px 0;">
            <p style="margin: 0 0 16px;">Hi ${userName},</p>
            <p style="margin: 0 0 16px;">Thank you for contacting Wroob Support.</p>
            <p style="margin: 0 0 16px;">
              We have received your message and our team will look into the matter.
              We will get back to you as soon as possible.
            </p>
            <div style="background: #f6f8fa; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px;"><strong>Your request:</strong></p>
              <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
              <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <p style="margin: 0 0 16px;">If you have any additional information, feel free to reply to this email.</p>
            <p style="margin: 24px 0 0;">Regards,<br/><strong>The Wroob Team</strong></p>
          </div>
          <div style="padding: 16px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            This is an automated confirmation for your Help Center submission on Wroob.
          </div>
        </div>
      `;

      const ackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Wroob Support <onboarding@resend.dev>",
          to: [email],
          reply_to: "yourwroob@gmail.com",
          subject: "We received your request — Wroob Support",
          html: ackHtml,
        }),
      });

      if (!ackRes.ok) {
        const ackErr = await ackRes.json().catch(() => ({}));
        console.error("Resend API error (user ack):", ackErr);
      }
    } catch (ackErr) {
      console.error("User acknowledgement email failed:", ackErr);
    }

    return new Response(JSON.stringify({ success: true, id: resendData?.id }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("send-help-message error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: responseHeaders }
    );
  }
});

// Supabase Edge Function: send-approval-email
// Sends transactional emails via SendGrid Web API v3 when an admin
// approves or rejects a seller's profile (Stage 1) or company (Stage 2).
//
// Body shape:
// {
//   type: 'profile_approved' | 'profile_rejected' | 'company_approved' | 'company_rejected',
//   to: string,                     // recipient email
//   name?: string,                  // seller's name
//   company_name?: string,          // company name (Stage 2)
//   reason?: string                 // rejection reason (rejected types only)
// }
//
// Required env vars (set via `supabase secrets set`):
//   SENDGRID_API_KEY
//   FROM_EMAIL  (defaults to "no-reply@example.com" if unset)
//   APP_NAME    (defaults to "ServiceHub")

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'no-reply@example.com';
const APP_NAME = Deno.env.get('APP_NAME') ?? 'ServiceHub';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EmailType =
  | 'profile_approved'
  | 'profile_rejected'
  | 'company_approved'
  | 'company_rejected'
  | 'booking_accepted'
  | 'booking_rejected';

interface Payload {
  type: EmailType;
  to: string;
  name?: string;
  company_name?: string;
  reason?: string;
  // Booking-specific fields (used for booking_accepted / booking_rejected)
  service_name?: string;
  booking_date?: string;
  booking_time?: string;
  total_amount?: number;
  booking_id?: string;
}

function buildEmail(p: Payload): { subject: string; html: string; text: string } {
  const name = p.name || 'there';
  const company = p.company_name || 'your company';

  switch (p.type) {
    case 'profile_approved':
      return {
        subject: `${APP_NAME}: Your seller account has been approved`,
        text:
          `Hi ${name},

Great news! Your seller account on ${APP_NAME} has been approved.
` +
          `You can now log in and submit your company details to start selling.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#10b981">Account approved 🎉</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Great news! Your seller account on <strong>${APP_NAME}</strong> has been approved.</p>
            <p>You can now log in and submit your <strong>company details</strong> to start selling.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };

    case 'profile_rejected':
      return {
        subject: `${APP_NAME}: Update on your seller application`,
        text:
          `Hi ${name},

Unfortunately, your seller account on ${APP_NAME} was not approved at this time.
` +
          (p.reason ? `Reason: ${p.reason}
` : '') +
          `Please contact support if you have any questions.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#ef4444">Account application update</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Unfortunately, your seller account on <strong>${APP_NAME}</strong> was not approved at this time.</p>
            ${p.reason ? `<p><strong>Reason:</strong> ${p.reason}</p>` : ''}
            <p>Please contact our support team if you have any questions.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };

    case 'company_approved':
      return {
        subject: `${APP_NAME}: ${company} is approved and ready to sell`,
        text:
          `Hi ${name},

Your business "${company}" has been approved on ${APP_NAME}.
` +
          `You can now list products / services and start receiving orders.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#10b981">Business approved ✅</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your business <strong>"${company}"</strong> has been approved on <strong>${APP_NAME}</strong>.</p>
            <p>You can now list products / services and start receiving orders.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };

    case 'company_rejected':
      return {
        subject: `${APP_NAME}: Update on your company application`,
        text:
          `Hi ${name},

Your business application for "${company}" was not approved.
` +
          (p.reason ? `Reason: ${p.reason}
` : '') +
          `Please review and resubmit your details, or contact support.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#ef4444">Company application update</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your business application for <strong>"${company}"</strong> was not approved.</p>
            ${p.reason ? `<p><strong>Reason:</strong> ${p.reason}</p>` : ''}
            <p>Please review your details and resubmit, or contact our support team.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };

        case 'booking_accepted': {
      const service = p.service_name || 'your booked service';
      const when =
        p.booking_date && p.booking_time
          ? `${p.booking_date} at ${p.booking_time}`
          : p.booking_date || 'the scheduled time';
      const amount =
        typeof p.total_amount === 'number'
          ? `₹${p.total_amount.toFixed(2)}`
          : '';
      return {
        subject: `${APP_NAME}: Your service request has been accepted`,
        text:
          `Hi ${name},

Good news! The seller has accepted your service request for "${service}".
Scheduled for: ${when}.
` +
          (amount ? `Amount: ${amount}
` : '') +
          `Please open the app and complete the payment to confirm your booking.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#10b981">Service request accepted ✅</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Good news! The seller has accepted your service request for <strong>"${service}"</strong>.</p>
            <p><strong>Scheduled for:</strong> ${when}</p>
            ${amount ? `<p><strong>Amount:</strong> ${amount}</p>` : ''}
            <p>Please open the ${APP_NAME} app and complete the payment to confirm your booking.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };
    }

    case 'booking_rejected': {
      const service = p.service_name || 'your booked service';
      return {
        subject: `${APP_NAME}: Update on your service request`,
        text:
          `Hi ${name},

Unfortunately, the seller was unable to accept your service request for "${service}".
` +
          (p.reason ? `Reason: ${p.reason}
` : '') +
          `You can book another seller anytime from the app.

— The ${APP_NAME} team`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px 0;color:#ef4444">Service request update</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Unfortunately, the seller was unable to accept your service request for <strong>"${service}"</strong>.</p>
            ${p.reason ? `<p><strong>Reason:</strong> ${p.reason}</p>` : ''}
            <p>You can book another seller anytime from the ${APP_NAME} app.</p>
            <p style="margin-top:24px;color:#9ca3af">— The ${APP_NAME} team</p>
          </div>`,
      };
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SENDGRID_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'SENDGRID_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = (await req.json()) as Payload;

    if (!payload.type || !payload.to) {
      return new Response(
        JSON.stringify({ success: false, error: 'type and to are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, html, text } = buildEmail(payload);

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.to, name: payload.name }],
            subject,
          },
        ],
        from: { email: FROM_EMAIL, name: APP_NAME },
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!sgResponse.ok) {
      const errBody = await sgResponse.text();
      console.error('SendGrid error:', sgResponse.status, errBody);
      return new Response(
        JSON.stringify({
          success: false,
          error: `SendGrid responded ${sgResponse.status}`,
          detail: errBody,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-approval-email exception:', error?.message ?? error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

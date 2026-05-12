import { supabase } from '../services/supabase';

export type ApprovalEmailType =
  | 'profile_approved'
  | 'profile_rejected'
  | 'company_approved'
  | 'company_rejected';

interface SendApprovalEmailArgs {
  type: ApprovalEmailType;
  to: string;
  name?: string;
  company_name?: string;
  reason?: string;
  // Recipient user id for in-app notification (optional but recommended).
  userId?: string;
}

interface SendApprovalEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Invokes the `send-approval-email` Supabase Edge Function and, in parallel,
 * inserts an in-app notification row so the seller sees the update inside
 * the app even before the email arrives.
 *
 * Deploy the Edge Function with:
 *   supabase functions deploy send-approval-email --no-verify-jwt
 *   supabase secrets set SENDGRID_API_KEY=... FROM_EMAIL=... APP_NAME=ServiceHub
 */
export async function sendApprovalEmail(
  args: SendApprovalEmailArgs
): Promise<SendApprovalEmailResult> {
  const { type, to, name, company_name, reason, userId } = args;

  // Fire-and-(soft-)forget in-app notification — never block email on this.
  if (userId) {
    try {
      const title =
        type === 'profile_approved'
          ? 'Account Approved'
          : type === 'profile_rejected'
          ? 'Account Application Update'
          : type === 'company_approved'
          ? 'Business Approved'
          : 'Business Application Update';

      const message =
        type === 'profile_approved'
          ? 'Your seller account has been approved. You can now submit company details.'
          : type === 'profile_rejected'
          ? `Your seller account was not approved.${reason ? ' Reason: ' + reason : ''}`
          : type === 'company_approved'
          ? `Your business ${company_name ? '\"' + company_name + '\" ' : ''}has been approved. You can now start selling.`
          : `Your business application${
              company_name ? ' for \"' + company_name + '\"' : ''
            } was not approved.${reason ? ' Reason: ' + reason : ''}`;

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'seller_approval',
        title,
        message,
        data: { approval_type: type, company_name, reason },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('notifications insert failed (non-fatal):', e);
    }
  }

  // Invoke Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-approval-email', {
      body: { type, to, name, company_name, reason },
    });

    if (error) {
      console.error('send-approval-email invoke error:', error);
      return { success: false, error: error.message };
    }
    if (data && data.success === false) {
      return { success: false, error: data.error || 'Email send failed' };
    }
    return { success: true };
  } catch (e: any) {
    console.error('send-approval-email exception:', e);
    return { success: false, error: e?.message ?? 'unknown error' };
  }
}

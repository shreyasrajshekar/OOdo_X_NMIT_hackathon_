/**
 * Transactional email over the Resend HTTP API.
 * No SDK dependency — a single fetch keeps the install lean.
 *
 * Configure in .env.local:
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM="Dayflow <onboarding@resend.dev>"
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailResult = { sent: boolean; error?: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      error:
        "RESEND_API_KEY is not set, so no email was sent. Share the credentials manually.",
    };
  }

  const from = process.env.RESEND_FROM || "Dayflow <onboarding@resend.dev>";

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { sent: false, error: `Resend responded ${response.status}: ${body}` };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Unknown email transport error.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The welcome email an employee receives when HR creates their account:
 * their system-generated Login ID and first password.
 */
export function buildCredentialsEmail(params: {
  firstName: string;
  companyName: string;
  loginId: string;
  tempPassword: string;
  signInUrl: string;
}) {
  const { firstName, companyName, loginId, tempPassword, signInUrl } = params;

  const text = [
    `Hi ${firstName},`,
    ``,
    `An account has been created for you on Dayflow (${companyName}).`,
    ``,
    `Login ID: ${loginId}`,
    `Temporary password: ${tempPassword}`,
    ``,
    `Sign in here: ${signInUrl}`,
    ``,
    `You'll be asked to choose a new password the first time you sign in.`,
    `This temporary password stops working once you do.`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FBF9FB;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#201A1E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #EDE5EB;border-radius:4px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:19px;font-weight:800;letter-spacing:-0.02em;color:#5C3D54;">Dayflow</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 0;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your ${escapeHtml(companyName)} account is ready</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#201A1EB3;">
            Hi ${escapeHtml(firstName)}, HR has created your account. Use the credentials below to sign in.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE5EB;border-radius:4px;">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #EDE5EB;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#875A7B;">Login ID</p>
                <p style="margin:0;font-family:'Courier New',monospace;font-size:15px;font-weight:700;">${escapeHtml(loginId)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#875A7B;">Temporary password</p>
                <p style="margin:0;font-family:'Courier New',monospace;font-size:15px;font-weight:700;">${escapeHtml(tempPassword)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 28px 8px;">
          <a href="${escapeHtml(signInUrl)}" style="display:inline-block;background:#5C3D54;color:#FBF9FB;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:999px;">Sign in to Dayflow</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 28px 28px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#201A1E99;">
            You'll be asked to choose your own password on first sign-in — this temporary one stops working straight after.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `Your ${companyName} account — Login ID ${loginId}`,
    html,
    text,
  };
}

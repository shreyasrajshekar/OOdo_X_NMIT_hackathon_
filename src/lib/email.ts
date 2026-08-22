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
      return { sent: false, error: explainResendError(response.status, body, from) };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Unknown email transport error.",
    };
  }
}

const SHARED_SENDER = "onboarding@resend.dev";

/**
 * Resend's errors are accurate but arrive as raw JSON, and the one everybody
 * hits first is the most confusing: while you are on the shared
 * onboarding@resend.dev sender, Resend will only deliver to the address that
 * owns the account. Every other recipient 403s, which reads like a broken key
 * rather than a missing domain.
 */
function explainResendError(status: number, body: string, from: string): string {
  let message = body;
  try {
    const parsed = JSON.parse(body) as { message?: string; name?: string };
    if (parsed.message) message = parsed.message;
  } catch {
    // Not JSON — fall back to the raw body.
  }

  if (status === 403 && /only send testing emails/i.test(message)) {
    return (
      `${message} ` +
      `Dayflow is still using the shared ${SHARED_SENDER} sender, which only ` +
      `delivers to the account owner. Verify a domain at resend.com/domains ` +
      `and set RESEND_FROM to an address on it to email everyone else.`
    );
  }

  if (status === 401 || status === 403) {
    return `Resend rejected the API key (${status}): ${message}`;
  }

  if (status === 422) {
    return `Resend could not accept the message: ${message} (from: ${from})`;
  }

  if (status === 429) {
    return `Resend is rate limiting: ${message} Try again shortly.`;
  }

  return `Resend responded ${status}: ${message}`;
}

/**
 * True when no verified sender is configured, so delivery is limited to the
 * Resend account owner. Callers can warn HR before they rely on it.
 */
export function usingSharedSender(): boolean {
  return (process.env.RESEND_FROM || SHARED_SENDER).includes(SHARED_SENDER);
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
    `Your ${companyName} account on Dayflow is ready.`,
    ``,
    `  Login ID:            ${loginId}`,
    `  Temporary password:  ${tempPassword}`,
    ``,
    `Sign in: ${signInUrl}`,
    ``,
    `You will be asked to choose your own password the first time you sign in.`,
    `This temporary password stops working the moment you do.`,
    ``,
    `If you were not expecting this email, tell your HR team - do not use the`,
    `credentials above.`,
  ].join("\n");

  const C = {
    primary: "#5C3D54",
    plum: "#875A7B",
    ink: "#201A1E",
    line: "#EDE5EB",
    paper: "#FBF9FB",
  };

  // Table layout with inline styles throughout: Outlook ignores <style> blocks
  // and most of flexbox. The button is wrapped in VML so it renders as a solid
  // shape there instead of a bare link.
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Your ${escapeHtml(companyName)} account</title>
  </head>
  <body style="margin:0;padding:0;background:${C.paper};">
    <!-- Preview line in the inbox list, then padded so the credentials do not leak into it. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your Login ID and first password for ${escapeHtml(companyName)}.
      &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${C.line};border-radius:14px;overflow:hidden;">

            <!-- Brand band -->
            <tr>
              <td style="background:${C.primary};padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:10px;">
                      <div style="width:30px;height:30px;border-radius:8px;background:${C.paper};text-align:center;line-height:30px;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;color:${C.primary};letter-spacing:-0.5px;">DF</div>
                    </td>
                    <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${C.paper};">
                      Dayflow
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding:32px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${C.plum};">Welcome to ${escapeHtml(companyName)}</p>
                <h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">
                  Hi ${escapeHtml(firstName)}, your account is ready
                </h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#5B5158;">
                  HR has set up your Dayflow account. Sign in with the details below to
                  check in, request time off and see your payslips.
                </p>
              </td>
            </tr>

            <!-- Credentials -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:10px;background:${C.paper};">
                  <tr>
                    <td style="padding:16px 18px;border-bottom:1px solid ${C.line};font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                      <p style="margin:0 0 5px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${C.plum};">Login ID</p>
                      <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:17px;font-weight:700;letter-spacing:0.06em;color:${C.ink};">${escapeHtml(loginId)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                      <p style="margin:0 0 5px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${C.plum};">Temporary password</p>
                      <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:17px;font-weight:700;letter-spacing:0.06em;color:${C.ink};">${escapeHtml(tempPassword)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:26px 32px 6px;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(signInUrl)}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="${C.primary}">
                  <w:anchorlock/>
                  <center style="color:#FBF9FB;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Sign in to Dayflow</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="${escapeHtml(signInUrl)}" style="display:inline-block;background:${C.primary};color:${C.paper};text-decoration:none;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:44px;padding:0 30px;border-radius:999px;">Sign in to Dayflow</a>
                <!--<![endif]-->
              </td>
            </tr>

            <tr>
              <td style="padding:14px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:13px;line-height:1.65;color:#6B6169;text-align:center;">
                  Or paste this into your browser:<br />
                  <span style="color:${C.plum};word-break:break-all;">${escapeHtml(signInUrl)}</span>
                </p>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td style="padding:26px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid ${C.plum};background:${C.paper};border-radius:0 8px 8px 0;">
                  <tr>
                    <td style="padding:14px 16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                      <p style="margin:0;font-size:13px;line-height:1.65;color:#5B5158;">
                        You will choose your own password the first time you sign in, and the
                        temporary one above stops working straight after. If you were not
                        expecting this email, tell your HR team and do not use these details.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 30px;border-top:1px solid ${C.line};margin-top:26px;">
                <p style="margin:22px 0 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8C838A;">
                  Sent by Dayflow on behalf of ${escapeHtml(companyName)}. This is an automated
                  message — replies are not monitored.
                </p>
              </td>
            </tr>
          </table>
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

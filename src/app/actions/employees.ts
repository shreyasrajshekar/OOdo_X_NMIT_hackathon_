"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildCredentialsEmail, sendEmail } from "@/lib/email";

export type CreateEmployeeAccountResult = {
  userId?: string;
  /** Set when the Auth user could not be created. */
  error?: string;
  /** Whether the credentials email actually went out. */
  emailSent: boolean;
  /** Why the email did not go out, when it didn't. */
  emailError?: string;
};

/**
 * Creates the login for an employee added by HR/Admin and emails them their
 * credentials.
 *
 * Employees never register themselves: HR creates the record, the system
 * generates the Login ID and a first password, the employee is emailed both,
 * and is forced to replace the password on first sign-in.
 *
 * Runs on the server so neither the service-role key nor the Resend key ever
 * reaches the browser.
 */
export async function createEmployeeAccount(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  loginId: string;
  companyName: string;
}): Promise<CreateEmployeeAccountResult> {
  let userId: string | undefined;

  try {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        login_id: params.loginId,
        first_name: params.firstName,
        last_name: params.lastName,
        must_change_password: true,
      },
    });

    if (error) {
      return { error: error.message, emailSent: false };
    }

    userId = data.user?.id;
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to create the employee login.",
      emailSent: false,
    };
  }

  // The account exists at this point. A failed email must not fail creation —
  // the admin can still copy the credentials from the confirmation screen.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { subject, html, text } = buildCredentialsEmail({
    firstName: params.firstName,
    companyName: params.companyName,
    loginId: params.loginId,
    tempPassword: params.password,
    signInUrl: `${appUrl.replace(/\/$/, "")}/sign-in`,
  });

  const result = await sendEmail({ to: params.email, subject, html, text });

  return {
    userId,
    emailSent: result.sent,
    emailError: result.error,
  };
}

/** Re-sends the welcome email with a freshly generated password. */
export async function resendEmployeeCredentials(params: {
  userId: string;
  email: string;
  firstName: string;
  loginId: string;
  companyName: string;
  password: string;
}): Promise<{ emailSent: boolean; emailError?: string }> {
  try {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(
      params.userId,
      { password: params.password },
    );
    if (error) return { emailSent: false, emailError: error.message };
  } catch (err) {
    return {
      emailSent: false,
      emailError:
        err instanceof Error ? err.message : "Could not reset the password.",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { subject, html, text } = buildCredentialsEmail({
    firstName: params.firstName,
    companyName: params.companyName,
    loginId: params.loginId,
    tempPassword: params.password,
    signInUrl: `${appUrl.replace(/\/$/, "")}/sign-in`,
  });

  const result = await sendEmail({ to: params.email, subject, html, text });
  return { emailSent: result.sent, emailError: result.error };
}

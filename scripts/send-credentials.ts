/**
 * Dayflow credentials mailer.
 *
 *   npm run send-credentials -- --name "Nikhil Rao"
 *   npm run send-credentials -- --name "Nikhil Rao" --wait
 *   npm run send-credentials -- --name "Asha Menon" --to asha@example.com
 *   npm run send-credentials -- --name "Nikhil Rao" --dry-run
 *
 * End-to-end rehearsal of the onboarding email an employee gets when HR adds
 * them: generate the Login ID and first password exactly as the app does,
 * render the same template the app renders, send it, and then read it back out
 * of the inbox to prove it arrived.
 *
 * With no --to it provisions a throwaway mailbox on mail.tm first, so there is
 * no real inbox to own and nothing to clean up afterwards. --wait then polls
 * that mailbox and prints the delivered message.
 *
 * Sends nothing to the database. This is the mail path only, so it is safe to
 * run against a live project.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCredentialsEmail } from "../src/lib/email";
import { generateLoginId } from "../src/lib/login-id";
import { generateTempPassword } from "../src/lib/password";

const MAIL_TM = "https://api.mail.tm";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".tmp");

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

type Args = {
  name: string;
  company: string;
  to?: string;
  serial: number;
  wait: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const eq = arg.indexOf("=");
    if (eq !== -1) {
      flags.set(arg.slice(2, eq), arg.slice(eq + 1));
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      flags.set(arg.slice(2), argv[++i]);
    } else {
      flags.set(arg.slice(2), "true");
    }
  }

  return {
    name: flags.get("name") ?? "Nikhil Rao",
    company: flags.get("company") ?? "Odoo India",
    to: flags.get("to"),
    serial: Number(flags.get("serial") ?? 1) || 1,
    wait: flags.get("wait") === "true",
    dryRun: flags.get("dry-run") === "true",
  };
}

// ---------------------------------------------------------------------------
// mail.tm — disposable inbox, no signup, no key
// ---------------------------------------------------------------------------

type TempInbox = { address: string; password: string; token: string };

/** mail.tm speaks JSON-LD: collections come back under `hydra:member`. */
function members<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const collection = (payload as Record<string, unknown>)?.["hydra:member"];
  return Array.isArray(collection) ? (collection as T[]) : [];
}

async function mailTm<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${MAIL_TM}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`mail.tm ${path} responded ${response.status}: ${body}`);
  }

  return body ? (JSON.parse(body) as T) : ({} as T);
}

async function createTempInbox(): Promise<TempInbox> {
  const domains = members<{ domain: string; isActive?: boolean }>(
    await mailTm("/domains"),
  );
  const domain = (domains.find((d) => d.isActive !== false) ?? domains[0])
    ?.domain;

  if (!domain) throw new Error("mail.tm returned no usable domain.");

  const address = `dayflow.${Date.now().toString(36)}@${domain}`;
  const password = generateTempPassword(16);

  await mailTm("/accounts", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  const { token } = await mailTm<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  return { address, password, token };
}

type InboxMessage = {
  id: string;
  subject: string;
  intro?: string;
  from?: { address?: string };
  createdAt?: string;
};

/** Polls until the credentials email lands, or the timeout is reached. */
async function waitForMessage(
  inbox: TempInbox,
  subject: string,
): Promise<InboxMessage | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const messages = members<InboxMessage>(
      await mailTm("/messages", {}, inbox.token),
    );
    const match = messages.find((m) => m.subject === subject) ?? messages[0];

    if (match) return match;

    const left = Math.round((deadline - Date.now()) / 1000);
    process.stdout.write(`\r   waiting for delivery… ${left}s left   `);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  process.stdout.write("\r");
  return null;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const parts = args.name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "New";
  const lastName = parts.slice(1).join(" ") || "Joiner";

  console.log("\nDayflow — credentials mailer\n");

  // 1. Credentials, generated by the same code the app uses.
  const loginId = generateLoginId({
    companyName: args.company,
    firstName,
    lastName,
    joiningYear: new Date().getFullYear(),
    serial: args.serial,
  });
  const tempPassword = generateTempPassword();

  console.log(`1. ${firstName} ${lastName} @ ${args.company}`);
  console.log(`   Login ID          ${loginId}`);
  console.log(`   Temporary passwd  ${tempPassword}`);

  // 2. Recipient: a throwaway mailbox unless one was named.
  let inbox: TempInbox | null = null;
  let recipient = args.to;

  if (!recipient && args.dryRun) {
    // Nothing is going to be sent, so do not burn a mailbox on it.
    recipient = "temp-inbox@mail.tm (not provisioned for --dry-run)";
    console.log(`\n2. Recipient  ${recipient}`);
  } else if (!recipient) {
    console.log("\n2. Provisioning a temporary mailbox on mail.tm…");
    inbox = await createTempInbox();
    recipient = inbox.address;
    console.log(`   Address   ${inbox.address}`);
    console.log(`   Password  ${inbox.password}`);
    console.log("   Read it in a browser at https://mail.tm (same login).");
  } else {
    console.log(`\n2. Recipient  ${recipient}`);
  }

  // 3. The message itself — the app's template, not a copy of it.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { subject, html, text } = buildCredentialsEmail({
    firstName,
    companyName: args.company,
    loginId,
    tempPassword,
    signInUrl: `${appUrl.replace(/\/$/, "")}/sign-in`,
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const preview = join(OUT_DIR, "credentials-email.html");
  writeFileSync(preview, html, "utf8");
  console.log(`\n3. Rendered  ${preview}`);

  if (args.dryRun) {
    console.log("\n--dry-run: nothing was sent. Open the file above.\n");
    return;
  }

  // 4. Send through Resend, the same transport the app uses.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "\nRESEND_API_KEY is not set, so there is nothing to send with.\n" +
        "Add it to .env.local, or re-run with --dry-run to just render.\n",
    );
    process.exit(1);
  }

  const from = process.env.RESEND_FROM || "Dayflow <onboarding@resend.dev>";
  console.log(`\n4. Sending as ${from}…`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [recipient], subject, html, text }),
  });

  const result = await response.text();

  if (!response.ok) {
    console.error(`   Resend responded ${response.status}: ${result}`);
    if (from.includes("resend.dev")) {
      console.error(
        "\n   The shared resend.dev sender only delivers to the address that\n" +
          "   owns the Resend account. To reach a temp mailbox, verify a domain\n" +
          "   at https://resend.com/domains and set RESEND_FROM to it.\n",
      );
    }
    process.exit(1);
  }

  console.log(`   Accepted: ${result}`);

  // 5. Read it back, so "it sent" and "it arrived" are not the same claim.
  if (!args.wait || !inbox) {
    if (!args.wait) console.log("\nPass --wait to read the message back.\n");
    return;
  }

  console.log("\n5. Watching the mailbox…");
  const message = await waitForMessage(inbox, subject);

  if (!message) {
    console.error(
      "   Nothing arrived within the timeout. It may still be queued —\n" +
        `   check https://mail.tm as ${inbox.address}\n`,
    );
    process.exit(1);
  }

  const full = await mailTm<{ html?: string[]; text?: string }>(
    `/messages/${message.id}`,
    {},
    inbox.token,
  );

  console.log(`   Delivered from  ${message.from?.address ?? "—"}`);
  console.log(`   Subject         ${message.subject}`);

  const body = full.text ?? "";
  const gotLoginId = body.includes(loginId);
  const gotPassword = body.includes(tempPassword);

  console.log(`   Login ID in body  ${gotLoginId ? "yes" : "NO"}`);
  console.log(`   Password in body  ${gotPassword ? "yes" : "NO"}`);

  if (full.html?.[0]) {
    const delivered = join(OUT_DIR, "credentials-email.delivered.html");
    writeFileSync(delivered, full.html[0], "utf8");
    console.log(`   Saved             ${delivered}`);
  }

  console.log(
    gotLoginId && gotPassword
      ? "\nRound trip complete — the employee would have everything they need.\n"
      : "\nThe message arrived but the credentials did not survive it.\n",
  );

  if (!gotLoginId || !gotPassword) process.exit(1);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});

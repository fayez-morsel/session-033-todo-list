import nodemailer from "nodemailer";

const placeholderHostPattern = /example\.com$/i;
const placeholderValues = new Set(["apikey", "secret", "password", ""]);

function sanitize(value = "", { allowExampleHost = false } = {}) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  if (!allowExampleHost && placeholderHostPattern.test(trimmed)) return "";
  if (placeholderValues.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

const SMTP_HOST = sanitize(process.env.SMTP_HOST);
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_SECURE =
  typeof process.env.SMTP_SECURE === "string"
    ? ["1", "true", "yes"].includes(process.env.SMTP_SECURE.toLowerCase())
    : false;
const SMTP_USER = sanitize(process.env.SMTP_USER, { allowExampleHost: true });
const SMTP_PASS = sanitize(process.env.SMTP_PASS, { allowExampleHost: true });

let cachedTransporter = null;
let transporterPromise = null;
let usingTestAccount = false;

let defaultFrom = sanitize(process.env.SMTP_FROM, { allowExampleHost: true }) || SMTP_USER;
if (!defaultFrom) {
  defaultFrom = "Family Tasks <no-reply@example.com>";
}

async function buildTransporter({ forceTestAccount = false } = {}) {
  if (!forceTestAccount && SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number.isFinite(SMTP_PORT) ? SMTP_PORT : 587,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  usingTestAccount = true;
  if (!defaultFrom) {
    defaultFrom = `Family Tasks <${testAccount.user}>`;
  }
  console.info(
    "SMTP credentials missing or placeholders detected. Using Nodemailer test account.",
    `Login: ${testAccount.user}`
  );

  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function getTransporter(options) {
  if (cachedTransporter && !options?.forceRebuild) {
    return cachedTransporter;
  }
  if (!transporterPromise || options?.forceRebuild) {
    transporterPromise = buildTransporter(options)
      .then((transport) => {
        cachedTransporter = transport;
        return transport;
      })
      .catch((err) => {
        transporterPromise = null;
        throw err;
      });
  }
  return transporterPromise;
}

function isConnectionError(err) {
  const code = err?.code || err?.error?.code;
  return (
    code === "ECONNECTION" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "EAUTH" ||
    code === "ENOTFOUND"
  );
}

export async function sendEmail(message) {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: message.from || defaultFrom,
      ...message,
    });

    if (usingTestAccount) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.info("Preview invite email at:", previewUrl);
      }
    }
    return true;
  } catch (err) {
    console.error("Email send failed", err);
    if (!usingTestAccount && isConnectionError(err)) {
      try {
        cachedTransporter = null;
        const fallbackTransport = await getTransporter({ forceTestAccount: true, forceRebuild: true });
        const info = await fallbackTransport.sendMail({
          from: message.from || defaultFrom,
          ...message,
        });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.info("Preview invite email at:", previewUrl);
        }
        return true;
      } catch (fallbackErr) {
        console.error("Fallback email send failed", fallbackErr);
      }
    }
    return false;
  }
}

export async function sendInviteEmail({
  to,
  inviteToken,
  familyName,
  inviterName,
  appUrl,
}) {
  if (!to || !inviteToken) return false;

  const baseUrl =
    appUrl || process.env.APP_URL || process.env.ORIGIN || "http://localhost:5173";
  const joinUrl = `${baseUrl.replace(/\/+$/, "")}/invite`;

  const subject = `You're invited to join ${familyName || "a family workspace"}`;
  const introduction = inviterName
    ? `${inviterName} invited you to join ${familyName || "their family workspace"}.`
    : `You have been invited to join ${familyName || "a family workspace"}.`;
  const text = [
    "Hello,",
    "",
    introduction,
    "",
    `Use this token to accept the invite: ${inviteToken}`,
    "",
    `Visit ${joinUrl} to redeem the token.`,
    "",
    "If you already have an account, you can also accept it from the app's Members page.",
    "",
    "See you soon!",
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text,
  });
}

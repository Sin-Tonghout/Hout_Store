require("dotenv").config();

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  appUrl: process.env.APP_URL || "http://localhost:3000",

    db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'digital_store',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },

  sessionSecret: process.env.SESSION_SECRET,

  telegram: {
    enabled: process.env.TELEGRAM_ENABLED === "true",
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  },

  paymentMode: process.env.PAYMENT_MODE || "demo",

  payway: {
    mode: process.env.PAYWAY_MODE || "sandbox",
    merchantId: process.env.PAYWAY_MERCHANT_ID || "",
    publicKey: process.env.PAYWAY_PUBLIC_KEY || "",
    rsaPublicKey: process.env.PAYWAY_RSA_PUBLIC_KEY || "",
    rsaPrivateKey: process.env.PAYWAY_RSA_PRIVATE_KEY || "",
    apiUrl: process.env.PAYWAY_API_URL || "",
    returnUrl: process.env.PAYWAY_RETURN_URL || "",
    notifyUrl: process.env.PAYWAY_NOTIFY_URL || "",
  },

  storageDriver: process.env.STORAGE_DRIVER || "local",

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "",
    endpoint: process.env.R2_ENDPOINT || "",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || "",
  },
};

if (!config.sessionSecret || config.sessionSecret.startsWith("change_this")) {
  throw new Error("Set a real SESSION_SECRET in your .env file");
}

module.exports = config;

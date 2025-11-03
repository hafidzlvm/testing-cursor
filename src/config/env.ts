import { config } from 'dotenv';

// Load environment variables
config();

export const env = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/omnichannel.db',
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './data/whatsapp-sessions',
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  apiKey: process.env.API_KEY || 'your-api-key-change-in-production',
  webhookUrl: process.env.WEBHOOK_URL || '',
};


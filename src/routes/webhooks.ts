import { Hono } from 'hono';
import { channelManager } from '../services/channel-manager';
import { logger } from '../config/logger';
import { WhatsAppCloudAdapter } from '../channels/whatsapp-cloud';

const webhooks = new Hono();

// WhatsApp Cloud API Webhook
webhooks.get('/whatsapp', async (c) => {
  // Webhook verification (GET request from WhatsApp)
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (!mode || !token || !challenge) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  // Get WhatsApp Cloud adapter (assuming channel ID 1 for now)
  // In production, you might want to determine channel from request
  const adapter = channelManager.getAdapter(1);

  if (adapter instanceof WhatsAppCloudAdapter) {
    const verified = adapter.verifyWebhook(mode, token, challenge);
    if (verified) {
      return c.text(verified, 200);
    }
  }

  return c.json({ error: 'Verification failed' }, 403);
});

// WhatsApp Cloud API Webhook - Receive messages and status updates (POST)
webhooks.post('/whatsapp', async (c) => {
  try {
    const body = await c.req.json();
    
    logger.info('[Webhook] Received WhatsApp webhook:', JSON.stringify(body, null, 2));

    // Get WhatsApp Cloud adapter
    const adapter = channelManager.getAdapter(1);

    if (adapter instanceof WhatsAppCloudAdapter) {
      await adapter.handleWebhook(body);
      return c.json({ success: true }, 200);
    } else {
      logger.warn('[Webhook] WhatsApp Cloud adapter not found');
      return c.json({ error: 'Adapter not found' }, 404);
    }
  } catch (error: any) {
    logger.error('[Webhook] Error processing webhook:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default webhooks;


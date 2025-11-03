import { z } from 'zod';

export const sendMessageSchema = z.object({
  to: z.string().min(1, 'Recipient is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
});

export const createConversationSchema = z.object({
  channelId: z.number().int().positive(),
  externalId: z.string().min(1),
  contactName: z.string().optional(),
  contactInfo: z.record(z.any()).optional(),
});

export const updateConversationSchema = z.object({
  status: z.enum(['open', 'assigned', 'in_progress', 'resolved', 'closed', 'archived']).optional(),
  contactName: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
});

export const queryParamsSchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
});


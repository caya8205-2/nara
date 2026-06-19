import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { agentChannelAccess, agentChannels, userContacts } from '../db/schema.js'
import { openClawService } from './openclaw.service.js'

export type ReminderNotificationInput = {
  reminderId: string
  userId?: string | null
  title: string
  description?: string | null
  dueAt: Date
}

export type ReminderNotificationResult = {
  status: 'delivered' | 'delivery_failed' | 'delivery_skipped'
  message: string
  recipient?: string | null
}

export type UserWhatsAppNotificationInput = {
  userId?: string | null
  text: string
  metadata?: Record<string, unknown>
}

class NotificationService {
  async deliverReminder(input: ReminderNotificationInput): Promise<ReminderNotificationResult> {
    if (!input.userId) {
      return {
        status: 'delivery_skipped',
        message: 'Reminder has no user recipient.',
        recipient: null,
      }
    }

    const recipient = await this.findAllowedWhatsAppRecipient(input.userId)
    if (!recipient) {
      return {
        status: 'delivery_failed',
        message: 'No allowed WhatsApp recipient found for this reminder.',
        recipient: null,
      }
    }

    const text = [
      `Nara reminder: ${input.title}`,
      input.description ? input.description : null,
      `Due: ${input.dueAt.toISOString()}`,
    ].filter(Boolean).join('\n')

    return this.deliverWhatsAppToUser({
      userId: input.userId,
      text,
      metadata: {
        reminderId: input.reminderId,
        userId: input.userId,
      },
    })
  }

  async deliverWhatsAppToUser(input: UserWhatsAppNotificationInput): Promise<ReminderNotificationResult> {
    if (!input.userId) {
      return {
        status: 'delivery_skipped',
        message: 'Notification has no user recipient.',
        recipient: null,
      }
    }

    const recipient = await this.findAllowedWhatsAppRecipient(input.userId)
    if (!recipient) {
      return {
        status: 'delivery_failed',
        message: 'No allowed WhatsApp recipient found for this notification.',
        recipient: null,
      }
    }

    const delivery = await openClawService.sendWhatsAppMessage({
      to: recipient,
      text: input.text,
      metadata: input.metadata,
    })

    return {
      status: delivery.ok ? 'delivered' : 'delivery_failed',
      message: delivery.message,
      recipient,
    }
  }

  private async findAllowedWhatsAppRecipient(userId: string) {
    const [row] = await db
      .select({
        value: userContacts.value,
      })
      .from(agentChannelAccess)
      .innerJoin(agentChannels, eq(agentChannelAccess.channelId, agentChannels.id))
      .innerJoin(userContacts, eq(agentChannelAccess.contactId, userContacts.id))
      .where(and(
        eq(agentChannelAccess.userId, userId),
        eq(agentChannelAccess.status, 'allowed'),
        eq(agentChannels.type, 'whatsapp'),
        eq(userContacts.type, 'whatsapp'),
      ))

    return row?.value ?? null
  }
}

export const notificationService = new NotificationService()

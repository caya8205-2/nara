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

    const delivery = await openClawService.sendWhatsAppMessage({
      to: recipient,
      text,
      metadata: {
        reminderId: input.reminderId,
        userId: input.userId,
      },
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

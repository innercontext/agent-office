import { AgentOfficeStorage, MessageRow } from "../db/index.js"

export interface MessageInfo {
  id: number
  from: string
  to: string
  body: string
  read: boolean
  created_at: Date
}

export class MessageService {
  constructor(private storage: AgentOfficeStorage) {}

  async sendMessage(from: string, recipients: string[], body: string): Promise<MessageRow[]> {
    const messages: MessageRow[] = []
    for (const to of recipients) {
      const message = await this.storage.createMessage(from, to, body)
      messages.push(message)
    }
    return messages
  }

  async listMessagesForRecipient(
    recipient: string,
    filters?: { unread?: boolean; olderThanHours?: number }
  ): Promise<MessageRow[]> {
    return this.storage.listMessagesForRecipient(recipient, filters)
  }

  async listMessagesFromSender(sender: string): Promise<MessageRow[]> {
    return this.storage.listMessagesFromSender(sender)
  }

  async markMessageAsRead(id: number): Promise<MessageRow | null> {
    return this.storage.markMessageAsRead(id)
  }

  async countUnreadBySender(recipientName: string): Promise<Map<string, number>> {
    return this.storage.countUnreadBySender(recipientName)
  }

  async checkUnreadMail(coworkerName: string): Promise<boolean> {
    const unreadMessages = await this.storage.listMessagesForRecipient(coworkerName, { unread: true })
    return unreadMessages.length > 0
  }

  async getUnreadMail(coworkerName: string): Promise<MessageRow[]> {
    const unreadMessages = await this.storage.listMessagesForRecipient(coworkerName, { unread: true })
    
    // Mark all as read
    for (const message of unreadMessages) {
      await this.storage.markMessageAsRead(message.id)
    }
    
    return unreadMessages
  }
}

import { describe, it, expect, beforeEach } from 'vitest'
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js'
import { MessageService } from './message-service.js'

describe('MessageService', () => {
  let storage: MockAgentOfficeStorage
  let service: MessageService

  beforeEach(() => {
    storage = createMockStorage()
    service = new MessageService(storage)
  })

  describe('sendMessage', () => {
    it('should send message to single recipient', async () => {
      const messages = await service.sendMessage('sender1', ['recipient1'], 'Hello!')

      expect(messages).toHaveLength(1)
      expect(messages[0].from_name).toBe('sender1')
      expect(messages[0].to_name).toBe('recipient1')
      expect(messages[0].body).toBe('Hello!')
      expect(messages[0].read).toBe(false)
    })

    it('should send message to multiple recipients', async () => {
      const messages = await service.sendMessage('sender1', ['recipient1', 'recipient2', 'recipient3'], 'Hello all!')

      expect(messages).toHaveLength(3)
      expect(messages.map(m => m.to_name)).toEqual(['recipient1', 'recipient2', 'recipient3'])
    })

    it('should create messages with correct timestamps', async () => {
      const before = new Date()
      const messages = await service.sendMessage('sender1', ['recipient1'], 'Hello!')
      const after = new Date()

      expect(messages[0].created_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(messages[0].created_at.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('listMessagesForRecipient', () => {
    it('should return messages for recipient', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Message 1')
      await service.sendMessage('sender2', ['recipient1'], 'Message 2')
      await service.sendMessage('sender1', ['recipient2'], 'Message 3')

      const messages = await service.listMessagesForRecipient('recipient1')

      expect(messages).toHaveLength(2)
      expect(messages.map(m => m.body).sort()).toEqual(['Message 1', 'Message 2'])
    })

    it('should filter by unread only', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Unread message')
      const readMessage = await service.sendMessage('sender1', ['recipient1'], 'Read message')
      await storage.markMessageAsRead(readMessage[0].id)

      const messages = await service.listMessagesForRecipient('recipient1', { unread: true })

      expect(messages).toHaveLength(1)
      expect(messages[0].body).toBe('Unread message')
    })

    it('should filter by olderThanHours', async () => {
      // Create a message
      await service.sendMessage('sender1', ['recipient1'], 'Old message')

      // Filter should exclude recent messages (assuming test runs quickly)
      const messages = await service.listMessagesForRecipient('recipient1', { olderThanHours: 0 })

      expect(messages).toHaveLength(0)
    })

    it('should return messages sorted by created_at desc', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'First')
      await new Promise(resolve => setTimeout(resolve, 10))
      await service.sendMessage('sender1', ['recipient1'], 'Second')

      const messages = await service.listMessagesForRecipient('recipient1')

      expect(messages[0].body).toBe('Second')
      expect(messages[1].body).toBe('First')
    })
  })

  describe('listMessagesFromSender', () => {
    it('should return messages from sender', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Message 1')
      await service.sendMessage('sender1', ['recipient2'], 'Message 2')
      await service.sendMessage('sender2', ['recipient1'], 'Message 3')

      const messages = await service.listMessagesFromSender('sender1')

      expect(messages).toHaveLength(2)
      expect(messages.map(m => m.body).sort()).toEqual(['Message 1', 'Message 2'])
    })
  })

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      const [message] = await service.sendMessage('sender1', ['recipient1'], 'Hello!')
      expect(message.read).toBe(false)

      const updated = await service.markMessageAsRead(message.id)

      expect(updated).not.toBeNull()
      expect(updated?.read).toBe(true)
    })

    it('should return null for non-existent message', async () => {
      const result = await service.markMessageAsRead(999)
      expect(result).toBeNull()
    })
  })

  describe('countUnreadBySender', () => {
    it('should count unread messages by sender', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Unread 1')
      await service.sendMessage('sender1', ['recipient1'], 'Unread 2')
      await service.sendMessage('sender2', ['recipient1'], 'Unread 3')
      const readMessages = await service.sendMessage('sender1', ['recipient1'], 'Read')
      await storage.markMessageAsRead(readMessages[0].id)

      const counts = await service.countUnreadBySender('recipient1')

      expect(counts.get('sender1')).toBe(2)
      expect(counts.get('sender2')).toBe(1)
    })

    it('should return empty map when no unread messages', async () => {
      const counts = await service.countUnreadBySender('recipient1')
      expect(counts.size).toBe(0)
    })
  })

  describe('checkUnreadMail', () => {
    it('should return true when unread messages exist', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Hello!')

      const hasUnread = await service.checkUnreadMail('recipient1')

      expect(hasUnread).toBe(true)
    })

    it('should return false when no unread messages exist', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Hello!')
      const messages = await storage.listMessagesForRecipient('recipient1')
      await storage.markMessageAsRead(messages[0].id)

      const hasUnread = await service.checkUnreadMail('recipient1')

      expect(hasUnread).toBe(false)
    })

    it('should return false when no messages exist', async () => {
      const hasUnread = await service.checkUnreadMail('recipient1')
      expect(hasUnread).toBe(false)
    })
  })

  describe('getUnreadMail', () => {
    it('should return unread messages and mark them as read', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Message 1')
      await service.sendMessage('sender2', ['recipient1'], 'Message 2')
      await storage.markMessageAsRead((await storage.listMessagesForRecipient('recipient1'))[0].id)

      const unread = await service.getUnreadMail('recipient1')

      expect(unread).toHaveLength(1)
      expect(unread[0].body).toBe('Message 2')
      expect(unread[0].read).toBe(false)

      // Verify they were marked as read
      const allMessages = await storage.listMessagesForRecipient('recipient1')
      expect(allMessages.every(m => m.read)).toBe(true)
    })

    it('should return empty array when no unread messages', async () => {
      await service.sendMessage('sender1', ['recipient1'], 'Hello!')
      const messages = await storage.listMessagesForRecipient('recipient1')
      await storage.markMessageAsRead(messages[0].id)

      const unread = await service.getUnreadMail('recipient1')

      expect(unread).toEqual([])
    })
  })
})

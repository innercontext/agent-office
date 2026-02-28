import { AgentOfficeStorage } from '../db/index.js'
import { MessageService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function sendMessage(
  storage: AgentOfficeStorage,
  from: string,
  recipients: string[],
  body: string,
  useJson: boolean
): Promise<void> {
  const service = new MessageService(storage)
  const messages = await service.sendMessage(from, recipients, body)
  console.log(formatOutput(messages, useJson))
}

export async function checkUnreadMail(
  storage: AgentOfficeStorage,
  coworkerName: string,
  useJson: boolean
): Promise<void> {
  const service = new MessageService(storage)
  const unreadCounts = await service.countUnreadBySender(coworkerName)

  // Convert Map to object for JSON serialization
  const counts: Record<string, number> = {}
  let totalUnread = 0
  for (const [sender, count] of unreadCounts) {
    if (count > 0) {
      counts[sender] = count
      totalUnread += count
    }
  }

  if (totalUnread === 0) {
    throw new Error(`No unread messages for ${coworkerName}`)
  }

  console.log(formatOutput(counts, useJson))
}

export async function getUnreadMail(
  storage: AgentOfficeStorage,
  coworkerName: string,
  useJson: boolean
): Promise<void> {
  const service = new MessageService(storage)
  const messages = await service.getUnreadMail(coworkerName)
  console.log(formatOutput(messages, useJson))
}

export async function listMessagesBetween(
  storage: AgentOfficeStorage,
  coworker1: string,
  coworker2: string,
  startTimeIso: string | undefined,
  endTimeIso: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new MessageService(storage)
  const startTime = startTimeIso ? new Date(startTimeIso) : undefined
  const endTime = endTimeIso ? new Date(endTimeIso) : undefined
  const messages = await service.listMessagesBetween(coworker1, coworker2, startTime, endTime)
  console.log(formatOutput(messages, useJson))
}

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
  const hasUnread = await service.checkUnreadMail(coworkerName)
  console.log(formatOutput({ hasUnread }, useJson))
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

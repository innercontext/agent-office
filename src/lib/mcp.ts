import { getSchema, commandSchemas, CommandSchema } from './schema.js'
import { AgentOfficeStorage } from '../db/index.js'
import { listCoworkers, getCoworkerInfo, updateCoworker, createSession, deleteCoworker } from '../commands/sessions.js'
import {
  sendMessage,
  checkUnreadMail,
  getUnreadMail,
  listMessagesBetween,
  listMessagesToNotify,
  markMessagesAsNotified,
} from '../commands/messages.js'
import {
  listCrons,
  deleteCron,
  enableCron,
  disableCron,
  cronHistory,
  requestCron,
  createCron,
  checkCronJobs,
  listActiveCronJobs,
} from '../commands/crons.js'
import {
  listCronRequests,
  getCronRequest,
  approveCronRequest,
  rejectCronRequest,
  deleteCronRequest,
} from '../commands/cron-requests.js'
import {
  addTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  moveTask,
  taskStats,
  getTaskHistory,
} from '../commands/tasks.js'
import { listTaskColumns } from '../commands/task-columns.js'
import { listSkills, getSkillContent, getContextDoc, getAgentsDoc } from '../index.js'

interface JSONRPCRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface Tool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export class MCPServer {
  private tools: Map<string, Tool> = new Map()
  private storage: AgentOfficeStorage

  constructor(storage: AgentOfficeStorage) {
    this.storage = storage
    this.registerTools()
  }

  private registerTools(): void {
    for (const schema of commandSchemas) {
      const tool = this.schemaToTool(schema)
      this.tools.set(schema.name, tool)
    }
  }

  private schemaToTool(schema: CommandSchema): Tool {
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    // Use requestSchema if available, otherwise empty
    if (schema.requestSchema) {
      for (const [fieldName, field] of Object.entries(schema.requestSchema.properties)) {
        const prop: Record<string, unknown> = {
          type: field.type,
          description: field.description,
        }

        if (field.items) {
          prop.items = { type: field.items.type, description: field.items.description }
        }

        properties[fieldName] = prop

        // Check if field is required
        if (schema.requestSchema.required?.includes(fieldName)) {
          required.push(fieldName)
        }
      }
    }

    return {
      name: schema.name,
      description: schema.description,
      inputSchema: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    }
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  private async executeCommand(commandName: string, params: Record<string, unknown>): Promise<unknown> {
    switch (commandName) {
      // Coworker Management
      case 'list-coworkers':
        return await listCoworkers(this.storage)
      case 'create-coworker':
        return await createSession(this.storage, params.name as string, params.coworkerType as string)
      case 'delete-coworker':
        await deleteCoworker(this.storage, params.name as string)
        return { success: true, message: `Coworker ${params.name} deleted` }
      case 'update-coworker':
        return await updateCoworker(this.storage, params.name as string, {
          coworkerType: params.coworkerType as string | null,
          status: params.status as string | null,
          description: params.description as string | null,
          philosophy: params.philosophy as string | null,
          visualDescription: params.visualDescription as string | null,
        })
      case 'get-coworker-info':
        return await getCoworkerInfo(this.storage, params.name as string)

      // Message Commands
      case 'send-message':
        await sendMessage(this.storage, params.from as string, params.to as string[], params.body as string)
        return { success: true, message: 'Message sent' }
      case 'check-unread-messages':
        return await checkUnreadMail(this.storage, params.coworker as string)
      case 'get-unread-messages':
        return await getUnreadMail(this.storage, params.coworker as string)
      case 'list-messages-between':
        return await listMessagesBetween(
          this.storage,
          params.coworker1 as string,
          params.coworker2 as string,
          params.start as string,
          params.end as string
        )
      case 'list-messages-to-notify':
        return await listMessagesToNotify(this.storage, params.coworker as string, params.hours as number)
      case 'mark-messages-as-notified':
        await markMessagesAsNotified(this.storage, params.ids as number[])
        return { success: true, marked: (params.ids as number[]).length }

      // Cron Commands
      case 'list-crons':
        return await listCrons(this.storage, params.coworker as string)
      case 'delete-cron':
        await deleteCron(this.storage, params.id as number)
        return { success: true, message: `Cron job ${params.id} deleted` }
      case 'enable-cron':
        return await enableCron(this.storage, params.id as number)
      case 'disable-cron':
        return await disableCron(this.storage, params.id as number)
      case 'cron-history':
        return await cronHistory(this.storage, params.id as number, (params.limit as number) ?? 10)
      case 'check-cron-jobs':
        return await checkCronJobs(this.storage, params.coworker as string)
      case 'list-active-cron-actions':
        return await listActiveCronJobs(this.storage, params.coworker as string)
      case 'create-cron': {
        const message = `Action To Do:\n${params.task}\n\nWho To Notify When Complete:\n${params.notify}`
        return await createCron(
          this.storage,
          params.name as string,
          params.coworker as string,
          params.schedule as string,
          message,
          params.timezone as string
        )
      }

      // Cron Request Commands
      case 'list-cron-requests':
        return await listCronRequests(this.storage)
      case 'request-cron': {
        const message = `Action To Do:\n${params.task}\n\nWho To Notify When Complete:\n${params.notify}`
        return await requestCron(
          this.storage,
          params.name as string,
          params.coworker as string,
          params.schedule as string,
          message,
          params.timezone as string
        )
      }
      case 'get-cron-request':
        return await getCronRequest(this.storage, params.id as number)
      case 'approve-cron-request':
        return await approveCronRequest(
          this.storage,
          params.id as number,
          params.reviewer as string,
          params.notes as string
        )
      case 'reject-cron-request':
        return await rejectCronRequest(
          this.storage,
          params.id as number,
          params.reviewer as string,
          params.notes as string
        )
      case 'delete-cron-request':
        await deleteCronRequest(this.storage, params.id as number)
        return { success: true, message: `Cron request ${params.id} deleted` }

      // Task Board Commands
      case 'add-task':
        return await addTask(
          this.storage,
          params.title as string,
          (params.description as string) ?? '',
          (params.assignee as string) || null,
          params.column as string,
          (params.dependencies as number[]) ?? []
        )
      case 'list-tasks':
        return await listTasks(
          this.storage,
          params.assignee as string,
          params.column as string,
          params.search as string
        )
      case 'get-task':
        return await getTask(this.storage, params.id as number)
      case 'update-task':
        return await updateTask(
          this.storage,
          params.id as number,
          params.title as string,
          params.description as string,
          params.assignee as string,
          params.column as string,
          params.dependencies as number[]
        )
      case 'delete-task':
        await deleteTask(this.storage, params.id as number)
        return { success: true, message: `Task ${params.id} deleted` }
      case 'assign-task':
        return await assignTask(this.storage, params.id as number, params.assignee as string)
      case 'unassign-task':
        return await unassignTask(this.storage, params.id as number)
      case 'move-task':
        return await moveTask(this.storage, params.id as number, params.column as string)
      case 'task-stats':
        return await taskStats(this.storage)
      case 'task-history':
        return await getTaskHistory(this.storage, params.id as number)
      case 'list-task-columns':
        return listTaskColumns()

      // Skills & Context Commands
      case 'list-skills':
        return listSkills()
      case 'get-skill': {
        const content = getSkillContent(params.name as string)
        if (!content) throw new Error(`Skill not found: ${params.name}`)
        return { content }
      }
      case 'context': {
        const content = getContextDoc()
        if (!content) throw new Error('CONTEXT.md not found')
        return { content }
      }
      case 'agents': {
        const content = getAgentsDoc()
        if (!content) throw new Error('AGENTS.md not found')
        return { content }
      }
      case 'schema':
        return getSchema(params.command as string | undefined)
      case 'describe':
        return getSchema(params.command as string | undefined)

      default:
        throw new Error(`Command not implemented: ${commandName}`)
    }
  }

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null> {
    const { id, method, params = {} } = request

    console.error(`[MCP] Received: ${method} (id: ${id ?? 'notification'})`)

    try {
      switch (method) {
        case 'initialize':
          console.error('[MCP] Handling initialize')
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: 'agent-office',
                version: '0.7.6',
              },
            },
          }

        case 'notifications/initialized':
          console.error('[MCP] Client initialized notification received')
          return null

        case 'tools/list':
          console.error('[MCP] Handling tools/list')
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: { tools: this.listTools() },
          }

        case 'tools/call': {
          const toolName = params.name as string
          const toolParams = (params.arguments as Record<string, unknown>) || {}

          console.error(`[MCP] tools/call: ${toolName}`)

          if (!this.tools.has(toolName)) {
            console.error(`[MCP] Tool not found: ${toolName}`)
            return {
              jsonrpc: '2.0',
              id: id ?? null,
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
            }
          }

          console.error(`[MCP] Executing: ${toolName}`)
          try {
            const result = await this.executeCommand(toolName, toolParams)
            console.error(`[MCP] Success: ${toolName}, result:`, JSON.stringify(result).slice(0, 100))

            // Format result according to MCP spec (content array with text)
            const mcpResult = {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
              isError: false,
            }

            return {
              jsonrpc: '2.0',
              id: id ?? null,
              result: mcpResult,
            }
          } catch (err) {
            console.error(`[MCP] Error executing ${toolName}:`, err)

            // Format error according to MCP spec
            const errorResult = {
              content: [
                {
                  type: 'text',
                  text: err instanceof Error ? err.message : String(err),
                },
              ],
              isError: true,
            }

            return {
              jsonrpc: '2.0',
              id: id ?? null,
              result: errorResult,
            }
          }
        }

        default:
          console.error(`[MCP] Unknown method: ${method}`)
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          }
      }
    } catch (error) {
      console.error(`[MCP] Error:`, error)
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      }
    }
  }

  async processStdio(): Promise<void> {
    const { stdin, stdout } = process

    stdin.setEncoding('utf-8')
    stdin.resume()

    let buffer = ''

    stdin.on('data', async (chunk: string) => {
      buffer += chunk

      // Process complete lines (JSON-RPC messages)
      let newlineIndex: number
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)

        if (line.length === 0) continue

        try {
          const request = JSON.parse(line) as JSONRPCRequest
          const response = await this.handleRequest(request)
          if (response !== null) {
            stdout.write(JSON.stringify(response) + '\n')
          }
        } catch (error) {
          const errorResponse: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
              data: error instanceof Error ? error.message : 'Invalid JSON',
            },
          }
          stdout.write(JSON.stringify(errorResponse) + '\n')
        }
      }
    })

    // Wait for stdin to end
    return new Promise(resolve => {
      stdin.on('end', async () => {
        await this.storage.close()
        resolve()
      })
    })
  }
}

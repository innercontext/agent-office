import { getSchema, commandSchemas, CommandSchema } from './schema.js'

interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number
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

  constructor() {
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

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { id, method, params = {} } = request

    try {
      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: { tools: this.listTools() },
          }

        case 'tools/call': {
          const toolName = params.name as string
          const toolParams = (params.arguments as Record<string, unknown>) || {}

          if (!this.tools.has(toolName)) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
            }
          }

          // Return command info - actual execution handled by CLI
          return {
            jsonrpc: '2.0',
            id,
            result: {
              command: toolName,
              params: toolParams,
              schema: getSchema(toolName),
            },
          }
        }

        case 'schema/get': {
          const commandName = params.command as string | undefined
          return {
            jsonrpc: '2.0',
            id,
            result: getSchema(commandName),
          }
        }

        case 'schema/list':
          return {
            jsonrpc: '2.0',
            id,
            result: commandSchemas,
          }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          }
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
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
          stdout.write(JSON.stringify(response) + '\n')
        } catch (error) {
          const errorResponse: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: null as unknown as string,
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
      stdin.on('end', resolve)
    })
  }
}

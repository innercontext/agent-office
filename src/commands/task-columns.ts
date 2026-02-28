import { formatOutput } from '../lib/output.js'

export async function listTaskColumns(useJson: boolean): Promise<void> {
  const columns = [
    { name: 'idea', description: 'New ideas and proposals' },
    { name: 'approved idea', description: 'Ideas that have been approved' },
    { name: 'working on', description: 'Tasks currently in progress' },
    { name: 'blocked', description: 'Tasks that are blocked' },
    { name: 'ready for review', description: 'Tasks ready for review' },
    { name: 'done', description: 'Completed tasks' },
  ]
  console.log(formatOutput(columns, useJson))
}

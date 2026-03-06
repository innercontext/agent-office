export function listTaskColumns(): unknown {
  return [
    { name: 'idea', description: 'New ideas and proposals' },
    { name: 'approved idea', description: 'Ideas that have been approved' },
    { name: 'working on', description: 'Tasks currently in progress' },
    { name: 'blocked', description: 'Tasks that are blocked' },
    { name: 'ready for review', description: 'Tasks ready for review' },
    { name: 'done', description: 'Completed tasks' },
  ]
}

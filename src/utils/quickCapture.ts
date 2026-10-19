import type { ScratchpadData } from '../../shared/archive'

export function captureGroups(data: ScratchpadData) {
  return [
    { id: '', name: 'Senza tag', shortcut: '', notes: data.notes },
    ...(data.groups ?? [])
  ]
}
export function copyCapture(data: ScratchpadData, id?: string): string {
  return captureGroups(data)
    .filter((group) => id === undefined || group.id === id)
    .map((group) => {
      const todos = data.todos.filter(
        (todo) => (todo.groupId ?? '') === group.id
      )
      if (!todos.length && !group.notes.trim()) return ''
      return [
        `## ${group.name}`,
        todos
          .map((todo) => `- [${todo.completed ? 'x' : ' '}] ${todo.text}`)
          .join('\n'),
        group.notes
      ]
        .filter(Boolean)
        .join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

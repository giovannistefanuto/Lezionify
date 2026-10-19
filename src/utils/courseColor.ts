import type { CourseDefinition } from '../../shared/archive'

const palette = ['#8370d8', '#de8b39', '#409aac', '#d26e9b', '#7c9c46', '#4e85ca', '#b77c51', '#b65f67']

export function courseColor(code: string | null, courses: CourseDefinition[]): string {
  if (!code) return '#8b929b'
  const configured = courses.find(course => course.code === code)?.color
  if (configured && /^#[\da-f]{6}$/i.test(configured)) return configured
  let hash = 0
  for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

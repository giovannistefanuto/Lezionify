import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { Sidebar } from '../../src/components/Sidebar'
import { SessionDialog } from '../../src/components/sessione/SessionDialog'

/** Focus must not scroll a long host document and immediately dismiss its menu. */
export async function runSidebarMenuScenario(root: Root) {
  await act(async () => root.render(<SessionDialog title="Sessione" workspace alignSidebar onClose={() => {}}>Calendario</SessionDialog>))
  const workspace = document.querySelector('dialog')!
  if (workspace.matches(':modal')) throw new Error('Sessione blocks the visible sidebar with a modal dialog')
  await act(async () => root.render(null))
  await act(async () => root.render(<SessionDialog title="Modifica appello" onClose={() => {}}>Editor</SessionDialog>))
  if (!document.querySelector('dialog')?.matches(':modal')) throw new Error('Session editors must protect an unfinished edit')
  await act(async () => root.render(null))
  await act(async () => root.render(<>
    <Sidebar mainView="archive" setMainView={() => {}} selectedCourse="tutti" setSelectedCourse={() => {}}
      selectedStudyStatus="tutti" setSelectedStudyStatus={() => {}} totalLecturesCount={0}
      coursesWithCounts={[]} archivedCourseCodes={['B']} getCourseLecturesCount={() => 1}
      onCourseArchive={() => {}} onOpenSessione={() => {}} onOpenSettings={() => {}} hasConfiguredKey
      onRefreshStats={() => {}} isCollapsed={false} onToggleCollapse={() => {}}
      theme="light" onToggleTheme={() => {}} onOpenCourseManagement={() => {}} />
    <div style={{ height: 2500 }} aria-hidden="true" />
  </>))
  const pause = document.querySelector<HTMLButtonElement>('.home-pause-button')!
  const session = document.querySelector('.session-sidebar-button')!
  if (!pause.classList.contains('settings-gear-btn') || pause.parentElement !== session.parentElement || document.querySelector('.sidebar-music-access .home-pause-button')) throw new Error('Home pause must share the Sessione action row and style')
  window.scrollTo(0, 0)
  await new Promise(resolve => setTimeout(resolve, 40))
  const trigger = document.querySelector<HTMLButtonElement>('[title="(B)"]')!
  if (!trigger) throw new Error('Archived fixture missing')
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)) })
  const label = document.querySelector('[role="menuitem"]')?.textContent
  if (label !== 'Ripristina corso') throw new Error(`Archived menu dismissed by focus: label=${label ?? 'missing'}, scrollY=${window.scrollY}`)
  if (window.scrollY !== 0) throw new Error('Opening the menu scrolled the document')
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  if (document.querySelector('[role="menu"]')) throw new Error('Escape did not dismiss the menu')
  await act(async () => root.render(null))
}

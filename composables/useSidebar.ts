/**
 * Mobile sidebar drawer state.
 *
 * On desktop (>= 1024px) the sidebar is always visible — this state is
 * ignored. On mobile, Header.vue toggles it via the hamburger button
 * and Sidebar.vue / its backdrop close it.
 */
export const useSidebar = () => {
  const open = useState<boolean>('zayono-sidebar-open', () => false)

  const toggle = () => { open.value = !open.value }
  const openDrawer = () => { open.value = true }
  const closeDrawer = () => { open.value = false }

  return { open, toggle, openDrawer, closeDrawer }
}

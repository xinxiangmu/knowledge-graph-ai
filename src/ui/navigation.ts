import { Icons, IconName } from './icons.js'
import { parseSvg, el } from '../utils/dom-helper.js'

export type NavItemId = 'parse' | 'graph' | 'timeline' | 'settings'

export interface NavItem {
  id: NavItemId
  label: string
  icon: IconName
}

export interface NavigationProps {
  items: NavItem[]
  activeId: NavItemId
  onNavigate: (id: NavItemId) => void
}

export class Navigation {
  private container: HTMLElement
  private props: NavigationProps

  private static readonly defaultItems: NavItem[] = [
    { id: 'parse', label: '解析', icon: 'parse' },
    { id: 'graph', label: '图谱', icon: 'graph' },
    { id: 'timeline', label: '时间线', icon: 'timeline' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ]

  constructor(props: NavigationProps) {
    this.props = {
      items: props.items || Navigation.defaultItems,
      activeId: props.activeId,
      onNavigate: props.onNavigate,
    }
    this.container = this.createElement()
  }

  private createElement(): HTMLElement {
    const nav = el('nav', { cls: 'kg-navigation' })

    const list = el('ul', { cls: 'kg-nav-list' })

    for (const item of this.props.items) {
      const listItem = this.createNavItem(item)
      list.appendChild(listItem)
    }

    nav.appendChild(list)
    return nav
  }

  private createNavItem(item: NavItem): HTMLElement {
    const li = el('li', { cls: 'kg-nav-item' })
    li.dataset.navId = item.id

    const button = el('button', { cls: 'kg-nav-button' })
    button.setAttribute('aria-label', item.label)
    const iconEl = parseSvg(Icons[item.icon])
    button.appendChild(iconEl)

    const label = el('span', { cls: 'kg-nav-label', text: item.label })

    const indicator = el('div', { cls: 'kg-nav-indicator' })

    if (item.id === this.props.activeId) {
      li.classList.add('kg-nav-item-active')
      button.classList.add('kg-nav-button-active')
      indicator.classList.add('kg-nav-indicator-active')
    }

    button.onclick = () => {
      this.props.onNavigate(item.id)
    }

    li.appendChild(button)
    li.appendChild(label)
    li.appendChild(indicator)

    return li
  }

  public getElement(): HTMLElement {
    return this.container
  }

  public setActive(id: NavItemId): void {
    const items = this.container.querySelectorAll('.kg-nav-item')
    items.forEach((item) => {
      const navId = item.getAttribute('data-nav-id')
      const isActive = navId === id
      item.classList.toggle('kg-nav-item-active', isActive)
      const button = item.querySelector('.kg-nav-button')
      button?.classList.toggle('kg-nav-button-active', isActive)
      const indicator = item.querySelector('.kg-nav-indicator')
      indicator?.classList.toggle('kg-nav-indicator-active', isActive)
    })
  }
}

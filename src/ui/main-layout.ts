import { TopBar, TopBarProps } from './top-bar.js'
import { Navigation, NavItemId, NavigationProps } from './navigation.js'
import { el } from '../utils/dom-helper.js'
import type KnowledgeGraphPlugin from '../main.js'

export type ViewId = NavItemId

export interface MainLayoutProps {
  plugin: KnowledgeGraphPlugin
}

export class MainLayout {
  private container: any
  private plugin: KnowledgeGraphPlugin
  private topBar: TopBar
  private navigation: Navigation
  private contentArea: any
  private currentView: ViewId = 'parse'
  private viewContainers: Map<ViewId, any> = new Map()

  constructor(props: MainLayoutProps) {
    this.plugin = props.plugin
    this.container = this.createElement()
    this.topBar = this.createTopBar()
    this.navigation = this.createNavigation()
    this.contentArea = this.createContentArea()
    this.initializeViews()
    this.showView(this.currentView)
  }

  private createElement(): any {
    const layout = el('div', { cls: 'kg-main-layout' })

    const topBarContainer = el('div', { cls: 'kg-top-bar-container', attr: { id: 'kg-top-bar' } })

    const body = el('div', { cls: 'kg-layout-body' })

    const sidebar = el('div', { cls: 'kg-sidebar', attr: { id: 'kg-sidebar' } })

    const main = el('main', { cls: 'kg-main-content', attr: { id: 'kg-main-content' } })

    layout.appendChild(topBarContainer)
    layout.appendChild(body)
    body.appendChild(sidebar)
    body.appendChild(main)

    return layout
  }

  private createTopBar(): TopBar {
    const topBarProps: TopBarProps = {
      pluginName: 'Knowledge Graph AI',
      version: this.plugin.manifest.version,
      isPro: false,
      onSettingsClick: () => this.handleSettingsClick(),
    }
    const topBar = new TopBar(topBarProps)
    const topBarContainer = this.container.querySelector('#kg-top-bar')
    topBarContainer?.appendChild(topBar.getElement())
    return topBar
  }

  private createNavigation(): Navigation {
    const navProps: NavigationProps = {
      items: [
        { id: 'parse', label: '解析', icon: 'parse' },
        { id: 'graph', label: '图谱', icon: 'graph' },
        { id: 'timeline', label: '时间线', icon: 'timeline' },
        { id: 'settings', label: '设置', icon: 'settings' },
      ],
      activeId: this.currentView,
      onNavigate: (id: NavItemId) => this.handleNavigate(id),
    }
    const navigation = new Navigation(navProps)
    const sidebar = this.container.querySelector('#kg-sidebar')
    sidebar?.appendChild(navigation.getElement())
    return navigation
  }

  private createContentArea(): any {
    const main = this.container.querySelector('#kg-main-content')
    return main
  }

  private initializeViews(): void {
    const views: ViewId[] = ['parse', 'graph', 'timeline', 'settings']
    for (const viewId of views) {
      const viewContainer = el('div', {
        cls: 'kg-view',
        attr: { id: `kg-view-${viewId}` },
        dataset: { viewId },
      })

      const viewHeader = el('div', { cls: 'kg-view-header' })

      const viewTitle = el('h2', { cls: 'kg-view-title', text: this.getViewTitle(viewId) })

      const viewContent = el('div', { cls: 'kg-view-content', attr: { id: `kg-content-${viewId}` } })

      viewContainer.appendChild(viewHeader)
      viewHeader.appendChild(viewTitle)
      viewContainer.appendChild(viewContent)
      this.contentArea.appendChild(viewContainer)
      this.viewContainers.set(viewId, viewContainer)
    }
  }

  private getViewTitle(viewId: ViewId): string {
    const titles: Record<ViewId, string> = {
      parse: '文档解析',
      graph: '知识图谱',
      timeline: '时间线',
      settings: '设置',
    }
    return titles[viewId]
  }

  private handleNavigate(id: NavItemId): void {
    if (id !== this.currentView) {
      this.currentView = id
      this.navigation.setActive(id)
      this.showView(id)
    }
  }

  private showView(viewId: ViewId): void {
    for (const [id, container] of this.viewContainers) {
      container.classList.toggle('kg-view-active', id === viewId)
    }
  }

  private handleSettingsClick(): void {
    this.handleNavigate('settings')
  }

  public getElement(): any {
    return this.container
  }

  public getCurrentView(): ViewId {
    return this.currentView
  }

  public setView(viewId: ViewId): void {
    if (this.viewContainers.has(viewId)) {
      this.currentView = viewId
      this.navigation.setActive(viewId)
      this.showView(viewId)
    }
  }

  public getContentContainer(viewId: ViewId): any | null {
    return this.contentArea.querySelector(`#kg-content-${viewId}`)
  }

  public updateTheme(isDark: boolean): void {
    this.topBar.updateTheme(isDark)
    this.container.classList.toggle('kg-theme-dark', isDark)
    this.container.classList.toggle('kg-theme-light', !isDark)
  }
}

import { Icons } from './icons.js'
import { parseSvg, el } from '../utils/dom-helper.js'

export interface TopBarProps {
  pluginName: string
  version: string
  isPro: boolean
  onSettingsClick: () => void
}

export class TopBar {
  private container: HTMLElement
  private props: TopBarProps

  constructor(props: TopBarProps) {
    this.props = props
    this.container = this.createElement()
  }

  private createElement(): HTMLElement {
    const topBar = el('div', { cls: 'kg-top-bar' })

    const leftSection = this.createLeftSection()
    const centerSection = this.createCenterSection()
    const rightSection = this.createRightSection()

    topBar.appendChild(leftSection)
    topBar.appendChild(centerSection)
    topBar.appendChild(rightSection)

    return topBar
  }

  private createLeftSection(): HTMLElement {
    const left = el('div', { cls: 'kg-top-bar-left' })

    const logoWrapper = el('div', { cls: 'kg-logo-wrapper' })
    logoWrapper.appendChild(parseSvg(Icons.brain))

    left.appendChild(logoWrapper)
    return left
  }

  private createCenterSection(): HTMLElement {
    const center = el('div', { cls: 'kg-top-bar-center' })

    const name = el('span', { cls: 'kg-plugin-name', text: this.props.pluginName })

    const badge = el('span', { cls: this.props.isPro ? 'kg-version-badge kg-pro' : 'kg-version-badge kg-free', text: this.props.isPro ? 'PRO' : 'FREE' })

    center.appendChild(name)
    center.appendChild(badge)

    return center
  }

  private createRightSection(): HTMLElement {
    const right = el('div', { cls: 'kg-top-bar-right' })

    const settingsBtn = el('button', { cls: 'kg-icon-button' })
    settingsBtn.appendChild(parseSvg(Icons.settings))
    settingsBtn.setAttribute('aria-label', '设置')
    settingsBtn.onclick = () => this.props.onSettingsClick()

    right.appendChild(settingsBtn)
    return right
  }

  public getElement(): HTMLElement {
    return this.container
  }

  public updateTheme(isDark: boolean): void {
    this.container.classList.toggle('kg-theme-dark', isDark)
    this.container.classList.toggle('kg-theme-light', !isDark)
  }
}

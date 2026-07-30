import { el } from '../utils/dom-helper.js'

export interface ProgressModalOptions {
  title: string
  initialMessage?: string
  showProgressBar?: boolean
  canCancel?: boolean
}

export interface ProgressCallback {
  (update: (info: ProgressInfo) => void): void
}

export interface ProgressInfo {
  message: string
  percentage?: number
  current?: number
  total?: number
}

export interface ProgressModalInterface {
  show(callback: ProgressCallback): void
  hide(): void
  update(info: ProgressInfo): void
  getElement(): any
}

export class ProgressModal implements ProgressModalInterface {
  private container: any
  private backdrop: any
  private modal: any
  private progressBar: any
  private progressFill: any
  private messageEl: any
  private cancelBtn: any = null
  private options: ProgressModalOptions
  private cancelled: boolean = false
  private onCancelCallback: (() => void) | null = null

  constructor(app: any, options: ProgressModalOptions) {
    this.options = {
      showProgressBar: true,
      canCancel: false,
      initialMessage: '',
      ...options,
    }
    this.backdrop = this.createBackdrop()
    this.modal = this.createModal()
    this.progressBar = this.createProgressBar()
    this.progressFill = this.createProgressFill()
    this.messageEl = this.createMessage()
    this.container = this.createElement()
  }

  private createBackdrop(): any {
    return el('div', { cls: 'kg-progress-backdrop' })
  }

  private createModal(): any {
    return el('div', { cls: 'kg-progress-modal' })
  }

  private createProgressBar(): any {
    return el('div', { cls: 'kg-progress-bar' })
  }

  private createProgressFill(): any {
    return el('div', { cls: 'kg-progress-fill' })
  }

  private createMessage(): any {
    return el('div', { cls: 'kg-progress-message', text: this.options.initialMessage || '' })
  }

  private createElement(): any {
    const container = el('div', { cls: 'kg-progress-container kg-progress-hidden' })

    const header = el('div', { cls: 'kg-progress-header' })

    const title = el('h3', { cls: 'kg-progress-title', text: this.options.title })

    const content = el('div', { cls: 'kg-progress-content' })

    header.appendChild(title)

    if (this.options.showProgressBar) {
      this.progressBar.appendChild(this.progressFill)
      content.appendChild(this.progressBar)
    }

    content.appendChild(this.messageEl)

    if (this.options.canCancel) {
      this.cancelBtn = el('button', { cls: 'kg-progress-cancel', text: '取消' })
      this.cancelBtn.onclick = () => this.handleCancel()
      content.appendChild(this.cancelBtn)
    }

    this.modal.appendChild(header)
    this.modal.appendChild(content)
    container.appendChild(this.backdrop)
    container.appendChild(this.modal)

    return container
  }

  private handleCancel(): void {
    this.cancelled = true
    if (this.onCancelCallback) {
      this.onCancelCallback()
    }
    this.hide()
  }

  public show(callback: ProgressCallback): void {
    this.cancelled = false
    this.container.classList.remove('kg-progress-hidden')
    this.container.classList.add('kg-progress-visible')

    const update = (info: ProgressInfo) => {
      this.update(info)
    }

    callback(update)
  }

  public hide(): void {
    this.container.classList.add('kg-progress-hidden')
    this.container.classList.remove('kg-progress-visible')
    this.reset()
  }

  public update(info: ProgressInfo): void {
    this.messageEl.textContent = info.message

    if (info.percentage !== undefined && info.percentage !== null) {
      this.progressFill.setCssProps({ width: `${info.percentage}%` })
      this.progressFill.setAttribute('aria-valuenow', String(info.percentage))
    } else if (info.current !== undefined && info.total !== undefined) {
      const percentage = Math.round((info.current / info.total) * 100)
      this.progressFill.setCssProps({ width: `${percentage}%` })
      this.progressFill.setAttribute('aria-valuenow', String(percentage))
    }

    if (info.current !== undefined && info.total !== undefined) {
      this.progressFill.classList.add('kg-progress-indeterminate')
    } else {
      this.progressFill.classList.remove('kg-progress-indeterminate')
    }
  }

  private reset(): void {
    this.messageEl.textContent = this.options.initialMessage || ''
    this.progressFill.setCssProps({ width: '0%' })
    this.progressFill.setAttribute('aria-valuenow', '0')
    this.cancelled = false
  }

  public getElement(): any {
    return this.container
  }

  public isCancelled(): boolean {
    return this.cancelled
  }

  public onCancel(callback: () => void): void {
    this.onCancelCallback = callback
  }
}

export function createProgressModal(
  app: any,
  options: ProgressModalOptions
): ProgressModal {
  return new ProgressModal(app, options)
}

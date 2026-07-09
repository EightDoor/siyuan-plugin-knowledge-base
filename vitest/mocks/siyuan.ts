export function fetchPost(url: string, data: any, callback?: any, errCallback?: any, finalCallback?: any): void {
  callback?.({ code: 0, data: {} })
}

export function fetchSyncPost(url: string, data: any): Promise<any> {
  return Promise.resolve({ code: 0, data: [] })
}

export function fetchGet(url: string, callback?: any): void {
  callback?.({ code: 0, data: {} })
}

export function getFrontend(): string {
  return 'desktop'
}

export function getBackend(): string {
  return 'windows'
}

export function openTab(_options: any): void {}
export function openWindow(_options: any): void {}
export function showMessage(_message: string, _timeout?: number, _type?: string): void {}
export function hideMessage(): void {}
export function confirm(_title: string, _message: string, _confirmCallback?: () => void, _cancelCallback?: () => void): void {}

export const Constants = { SIYUAN_VERSION: '3.0.0' }

export class EventBus {
  constructor(_name: string) {}
  on(_event: string, _callback: (...args: any[]) => void): void {}
  off(_event: string, _callback: (...args: any[]) => void): void {}
}

export class Setting {
  constructor(_options: { confirmCallback?: () => void }) {}
  addItem(_options: {
    title: string
    direction?: string
    description?: string
    createActionElement: () => HTMLElement
  }): void {}
}

export class Dialog {
  element: HTMLElement
  constructor(_options: any) {
    this.element = document.createElement('div')
  }
  destroy(): void {}
}

export class Menu {
  constructor(_id: string, _rect?: DOMRect) {}
  addItem(_options: any): void {}
}

export class Plugin {
  app: any
  i18n: any = {}
  eventBus = new EventBus('')
  data: any = {}
  displayName: string = ''
  name: string = ''
  setting = new Setting({})

  async loadData(_storageName: string): Promise<any> { return null }
  async saveData(_storageName: string, _data: any): Promise<any> { return {} }
  async removeData(_storageName: string): Promise<any> { return {} }
}

export class Protyle {
  constructor(_app: any, _element: HTMLElement, _options: any) {}
  getInstance(): any { return {} }
}

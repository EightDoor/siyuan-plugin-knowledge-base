declare module 'siyuan' {
  interface IObject {
    [key: string]: string
  }

  interface IPosition {
    x: number
    y: number
  }

  interface ICommand {
    langKey: string
    hotkey?: string
    customHotkey?: string
    callback?: () => void
    globalCallback?: () => void
  }

  interface IMenuItem {
    icon?: string
    iconHTML?: string
    label?: string
    type?: string
    submenu?: IMenuItem[]
    click?: () => void
  }

  interface IDockConfig {
    position: 'LeftBottom' | 'LeftTop' | 'RightBottom' | 'RightTop'
    size: { width: number; height: number }
    icon: string
    title: string
    hotkey?: string
  }

  interface IDock {
    data: any
    element: HTMLElement
    model: any
  }

  type TProtyleAction = 'cb-get-all' | 'cb-get-focus' | 'cb-get-hl'
  type TEditorMode = 'wysiwyg' | 'preview'
  type TCardType = 'all' | 'doc' | 'notebook'

  interface App {
    plugins: Plugin[]
    appId: string
  }

  class EventBus {
    constructor(name: string)
    on(event: string, callback: (...args: any[]) => void): void
    off(event: string, callback: (...args: any[]) => void): void
  }

  class Setting {
    constructor(options: { confirmCallback?: () => void })
    addItem(options: {
      title: string
      direction?: string
      description?: string
      createActionElement: () => HTMLElement
    }): void
  }

  class Dialog {
    constructor(options: {
      title: string
      content: string
      width?: string
      height?: string
      destroyCallback?: () => void
    })
    element: HTMLElement
    destroy(): void
  }

  class Menu {
    constructor(id: string, rect?: DOMRect)
    addItem(options: {
      id?: string
      icon?: string
      iconHTML?: string
      label?: string
      type?: string
      submenu?: IMenuItem[]
      click?: () => void
    }): void
  }

  class Plugin {
    app: App
    i18n: IObject
    eventBus: EventBus
    data: any
    displayName: string
    name: string
    setting: Setting

    constructor(options: {
      app: App
      name: string
      displayName: string
      i18n: IObject
    })

    onload(): Promise<void> | void
    onLayoutReady(): void
    onunload(): void
    uninstall(): void
    onDataChanged(): void

    addCommand(command: ICommand): void
    addDock(options: {
      config: IDockConfig
      data?: any
      type: string
      init(dock: IDock): void
      destroy?(): void
      update?(): void
      resize?(): void
    }): void
    addTopBar(options: {
      icon: string
      title: string
      position: 'left' | 'right'
      callback: (event: MouseEvent) => void
    }): HTMLElement
    addStatusBar(options: { element: HTMLElement }): void
    addTab(options: any): any

    loadData(storageName: string): Promise<any>
    saveData(storageName: string, data: any): Promise<any>
    removeData(storageName: string): Promise<any>

    getOpenedTab(): any
    getEditor(): any
  }

  class Protyle {
    constructor(app: App, element: HTMLElement, options: any)
    getInstance(): any
  }

  export function fetchPost(
    url: string,
    data: any,
    callback?: (response: any) => void,
    errCallback?: (error: any) => void,
    finalCallback?: () => void
  ): void

  export function fetchSyncPost(url: string, data: any): Promise<any>

  export function fetchGet(url: string, callback?: (response: any) => void): void

  export function getFrontend(): string
  export function getBackend(): string

  export function openTab(options: {
    app: App
    doc?: {
      id: string
      action?: TProtyleAction[]
      zoomIn?: boolean
      mode?: TEditorMode
    }
    pdf?: { path: string; page?: number; id?: string }
    asset?: { path: string }
    search?: any
    card?: { type: TCardType; id?: string; title?: string }
    custom?: { title: string; icon: string; data?: any; id: string }
    position?: 'right' | 'bottom'
    keepCursor?: boolean
    removeCurrentTab?: boolean
  }): void

  export function openWindow(options: {
    position?: IPosition
    height?: number
    width?: number
    tab?: any
    alwaysOnTop?: boolean
    doc?: { id: string }
  }): void

  export function showMessage(message: string, timeout?: number, type?: string): void
  export function hideMessage(): void

  export function confirm(
    title: string,
    message: string,
    confirmCallback?: () => void,
    cancelCallback?: () => void
  ): void

  export const Constants: {
    SIYUAN_VERSION: string
    [key: string]: any
  }
}

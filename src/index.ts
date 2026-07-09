import { Plugin, Setting, openTab, showMessage } from 'siyuan'
import type { PluginConfig } from './types'
import { KnowledgeEngine } from './core/KnowledgeEngine'
import type { SchedulerState } from './scheduler/IndexScheduler'
import './style.css'

const CONFIG_FILE = 'config.json'
const STATE_FILE = 'index-state.json'
const DOCK_TYPE = 'knowledge-base-dock'

const DEFAULT_CONFIG: PluginConfig = {
  llm: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
  },
  embedding: {
    mode: 'remote',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'nomic-embed-text',
  },
  vectorStore: {
    type: 'chroma',
    baseUrl: 'http://localhost:8000',
    collection: 'siyuan-knowledge',
  },
  chat: {
    topK: 5,
    temperature: 0.7,
  },
  index: {
    interval: 5,
    chunkSize: 500,
  },
}

export default class KnowledgeBasePlugin extends Plugin {
  private config: PluginConfig = DEFAULT_CONFIG
  private engine: KnowledgeEngine | null = null

  async onload(): Promise<void> {
    const savedConfig = await this.loadData(CONFIG_FILE)
    if (savedConfig) {
      this.config = {
        ...DEFAULT_CONFIG,
        ...savedConfig,
        embedding: { ...DEFAULT_CONFIG.embedding, ...savedConfig.embedding },
        llm: { ...DEFAULT_CONFIG.llm, ...savedConfig.llm },
        vectorStore: { ...DEFAULT_CONFIG.vectorStore, ...savedConfig.vectorStore },
        chat: { ...DEFAULT_CONFIG.chat, ...savedConfig.chat },
        index: { ...DEFAULT_CONFIG.index, ...savedConfig.index },
      }
      console.log('[KnowledgeBase] loaded config:', JSON.stringify(this.config.embedding))
    }

    this.engine = new KnowledgeEngine(
      this.config,
      this.app,
      (state) => this.saveData(STATE_FILE, state),
      () => this.loadData(STATE_FILE),
    )

    this.registerSettings()
    this.registerDock()
  }

  onLayoutReady(): void {
    this.engine?.start()
  }

  onunload(): void {
    this.engine?.destroy()
    this.engine = null
  }

  uninstall(): void {
    this.removeData(CONFIG_FILE).catch((e: unknown) => {
      console.error(`[KnowledgeBase] remove config failed: ${e}`)
    })
  }

  private registerSettings(): void {
    this.setting = new Setting({
      confirmCallback: () => {
        this.saveData(CONFIG_FILE, this.config)
        this.engine?.updateConfig(this.config)
        showMessage(this.i18n.saveSuccess)
      },
    })

    this.addSelectSetting(
      this.i18n.settingsLlmProvider,
      this.i18n.settingsLlmProviderDesc,
      this.config.llm,
      'provider',
      [
        { value: 'ollama', label: this.i18n.providerOllama },
        { value: 'openai', label: this.i18n.providerOpenai },
      ],
    )
    this.addInputSetting(this.i18n.settingsLlmBaseUrl, this.i18n.settingsLlmBaseUrlDesc, this.config.llm, 'baseUrl')
    this.addInputSetting(this.i18n.settingsLlmModel, this.i18n.settingsLlmModelDesc, this.config.llm, 'model')
    this.addInputSetting(this.i18n.settingsLlmApiKey, this.i18n.settingsLlmApiKeyDesc, this.config.llm, 'apiKey', true)

    this.addSelectSetting(
      this.i18n.settingsEmbeddingMode,
      this.i18n.settingsEmbeddingModeDesc,
      this.config.embedding,
      'mode',
      [
        { value: 'remote', label: this.i18n.embeddingRemote },
        { value: 'local', label: this.i18n.embeddingLocal },
      ],
      () => this.updateEmbeddingConfigVisibility(),
    )
    this.addEmbeddingSelectSetting(
      this.i18n.settingsEmbeddingProvider,
      this.i18n.settingsEmbeddingProviderDesc,
      this.config.embedding,
      'provider',
      [
        { value: 'ollama', label: this.i18n.providerOllama },
        { value: 'openai', label: this.i18n.providerOpenai },
      ],
      'remote',
    )
    this.addEmbeddingInputSetting(
      this.i18n.settingsEmbeddingBaseUrl,
      this.i18n.settingsEmbeddingBaseUrlDesc,
      this.config.embedding,
      'baseUrl',
      'remote',
    )
    this.addEmbeddingInputSetting(
      this.i18n.settingsEmbeddingModel,
      this.i18n.settingsEmbeddingModelDesc,
      this.config.embedding,
      'model',
      'remote',
    )
    this.addEmbeddingInputSetting(
      this.i18n.settingsEmbeddingApiKey,
      this.i18n.settingsEmbeddingApiKeyDesc,
      this.config.embedding,
      'apiKey',
      'remote',
      true,
    )
    this.addEmbeddingInputSetting(
      this.i18n.settingsEmbeddingLocalModel,
      this.i18n.settingsEmbeddingLocalModelDesc,
      this.config.embedding,
      'localModel',
      'local',
    )
    this.updateEmbeddingConfigVisibility()

    this.addSelectSetting(
      this.i18n.settingsVectorType,
      this.i18n.settingsVectorTypeDesc,
      this.config.vectorStore,
      'type',
      [
        { value: 'chroma', label: this.i18n.storageChroma },
        { value: 'milvus', label: this.i18n.storageMilvus },
      ],
    )
    this.addInputSetting(this.i18n.settingsVectorUrl, this.i18n.settingsVectorUrlDesc, this.config.vectorStore, 'baseUrl')
  }

  private addSelectSetting(
    title: string,
    description: string,
    target: any,
    key: string,
    options: { value: string; label: string }[],
    onChange?: () => void,
  ): void {
    this.setting.addItem({
      title,
      description,
      createActionElement: () => {
        const select = document.createElement('select')
        select.className = 'b3-select'
        select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')
        select.value = target[key] ?? ''
        select.addEventListener('change', () => {
          target[key] = select.value
          onChange?.()
        })
        return select
      },
    })
  }

  private addInputSetting(
    title: string,
    description: string,
    target: any,
    key: string,
    isPassword: boolean = false,
    onChange?: () => void,
  ): void {
    this.setting.addItem({
      title,
      description,
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        if (isPassword) input.type = 'password'
        input.value = target[key] ?? ''
        input.addEventListener('input', () => {
          target[key] = input.value
          onChange?.()
        })
        return input
      },
    })
  }

  private registerDock(): void {
    this.addDock({
      config: {
        position: 'RightBottom',
        size: { width: 420, height: 0 },
        icon: 'iconBookmark',
        title: this.i18n.name,
      },
      type: DOCK_TYPE,
      init: (dock) => {
        dock.element.innerHTML = `
<div id="knowledge-base-dock" class="kb-dock">
  <div class="kb-status-bar">
    <div class="kb-status-info">
      <span class="kb-status-text"></span>
      <span class="kb-status-syncing" style="display:none">${this.i18n.syncing}</span>
    </div>
    <div class="kb-status-actions">
      <button id="kb-sync-btn" class="b3-button b3-button--text kb-btn-sm">${this.i18n.sync}</button>
      <button id="kb-rebuild-btn" class="b3-button b3-button--text kb-btn-sm">${this.i18n.rebuild}</button>
    </div>
  </div>
  <div id="kb-messages" class="kb-messages"></div>
  <div class="kb-input-area">
    <textarea id="kb-textarea" class="kb-input-textarea" placeholder="${this.i18n.inputPlaceholder}" rows="2"></textarea>
    <button id="kb-send-btn" class="kb-send-btn">${this.i18n.send}</button>
  </div>
</div>`

        this.initChatBindings(dock.element)
      },
    })
  }

  private initChatBindings(container: HTMLElement): void {
    const engine = this.engine
    const app = this.app
    const i18n = this.i18n
    if (!engine) return

    const messagesEl = container.querySelector('#kb-messages') as HTMLElement
    const textareaEl = container.querySelector('#kb-textarea') as HTMLTextAreaElement
    const sendBtn = container.querySelector('#kb-send-btn') as HTMLButtonElement
    const syncBtn = container.querySelector('#kb-sync-btn') as HTMLButtonElement
    const rebuildBtn = container.querySelector('#kb-rebuild-btn') as HTMLButtonElement
    const statusTextEl = container.querySelector('.kb-status-text') as HTMLElement
    const syncingEl = container.querySelector('.kb-status-syncing') as HTMLElement

    const updateStatus = () => {
      const status = engine.getIndexStatus()
      syncingEl.style.display = status.isSyncing ? 'inline' : 'none'
      const parts: string[] = [`\u{1F4CA} ${i18n.indexed}: ${status.indexedBlocks} ${i18n.blocks || '\u5757'}`]
      if (status.lastSyncTime) {
        parts.push(`| ${i18n.recent}: ${this.formatTime(Date.now() - status.lastSyncTime)}`)
      }
      statusTextEl.textContent = parts.join(' ')
    }

    syncBtn.addEventListener('click', () => engine.sync().then(updateStatus))
    rebuildBtn.addEventListener('click', () => engine.rebuild().then(updateStatus))

    setInterval(updateStatus, 5000)
    updateStatus()

    const appendMessage = (msg: { role: string; content: string; thinking?: string; sources?: any[] }) => {
      const msgDiv = document.createElement('div')
      msgDiv.className = 'kb-message'

      const label = document.createElement('div')
      label.className = `kb-message-label ${msg.role === 'user' ? 'user' : ''}`
      label.textContent = msg.role === 'user' ? i18n.you : i18n.aiLabel
      msgDiv.appendChild(label)

      const text = document.createElement('div')
      text.className = 'kb-message-text'
      text.textContent = msg.content
      msgDiv.appendChild(text)

      if (msg.thinking) {
        const thinkBlock = document.createElement('div')
        thinkBlock.className = 'kb-thinking-block'

        const thinkHeader = document.createElement('div')
        thinkHeader.className = 'kb-thinking-header'
        thinkHeader.innerHTML = `<span>\u{1F914} ${i18n.thinking}</span><span class="kb-thinking-toggle">\u25B6</span>`

        const thinkBody = document.createElement('div')
        thinkBody.className = 'kb-thinking-body'
        thinkBody.textContent = msg.thinking

        thinkHeader.addEventListener('click', () => {
          const isOpen = thinkBody.classList.toggle('open')
          thinkHeader.querySelector('.kb-thinking-toggle')!.textContent = isOpen ? '\u25BC' : '\u25B6'
        })

        thinkBlock.appendChild(thinkHeader)
        thinkBlock.appendChild(thinkBody)
        msgDiv.appendChild(thinkBlock)
      }

      if (msg.sources && msg.sources.length > 0) {
        const sourcesDiv = document.createElement('div')
        sourcesDiv.className = 'kb-sources'

        const sourcesTitle = document.createElement('div')
        sourcesTitle.className = 'kb-sources-title'
        sourcesTitle.textContent = `\u{1F4DA} ${i18n.sources}`
        sourcesDiv.appendChild(sourcesTitle)

        msg.sources.forEach((source: any, idx: number) => {
          const sourceItem = this.buildSourceItem(source, idx, app, i18n)
          sourcesDiv.appendChild(sourceItem)
        })

        msgDiv.appendChild(sourcesDiv)
      }

      messagesEl.appendChild(msgDiv)
      messagesEl.scrollTop = messagesEl.scrollHeight
    }

    const sendMessage = async () => {
      const text = textareaEl.value.trim()
      if (!text) return

      textareaEl.value = ''
      sendBtn.disabled = true
      appendMessage({ role: 'user', content: text })

      try {
        const stream = await engine.chat(text)

        for await (const msg of stream) {
          const lastEl = messagesEl.lastElementChild
          if (lastEl) {
            const textEl = lastEl.querySelector('.kb-message-text') as HTMLElement
            if (textEl) {
              textEl.textContent = msg.content
            } else {
              appendMessage({
                role: msg.role,
                content: msg.content,
                thinking: msg.thinking,
                sources: msg.sources,
              })
            }
          }
          messagesEl.scrollTop = messagesEl.scrollHeight
        }
      } catch (error) {
        appendMessage({
          role: 'assistant',
          content: `${i18n.errorLabel}: ${error instanceof Error ? error.message : String(error)}`,
        })
      } finally {
        sendBtn.disabled = false
      }
    }

    sendBtn.addEventListener('click', sendMessage)
    textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    })
  }

  private buildSourceItem(source: any, idx: number, app: any, i18n: any): HTMLElement {
    const item = document.createElement('div')
    item.className = 'kb-source-item'

    const header = document.createElement('div')
    header.className = 'kb-source-header'

    const nameSpan = document.createElement('span')
    nameSpan.className = 'kb-source-name'
    nameSpan.textContent = `[${idx + 1}] ${source.docName}`
    header.appendChild(nameSpan)

    const scoreSpan = document.createElement('span')
    scoreSpan.className = 'kb-source-score'
    scoreSpan.textContent = `${i18n.similarity}: ${source.score.toFixed(2)}`
    header.appendChild(scoreSpan)

    item.appendChild(header)

    const preview = document.createElement('div')
    preview.className = 'kb-source-preview'
    preview.textContent = source.content
    item.appendChild(preview)

    const link = document.createElement('button')
    link.className = 'kb-source-link'
    link.textContent = i18n.navigate
    link.addEventListener('click', () => {
      openTab({
        app,
        doc: {
          id: source.blockId,
          action: ['cb-get-focus'],
          zoomIn: true,
        },
      })
    })
    item.appendChild(link)

    return item
  }

  private formatTime(ms: number): string {
    if (ms < 60000) return this.i18n.justNow
    if (ms < 3600000) return `${Math.floor(ms / 60000)} ${this.i18n.minutesAgo}`
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} ${this.i18n.hoursAgo}`
    return `${Math.floor(ms / 86400000)} ${this.i18n.daysAgo}`
  }

  private embeddingConfigItems: Array<{ element: HTMLElement; visibleMode: 'remote' | 'local' }> = []

  private updateEmbeddingConfigVisibility(): void {
    const currentMode = this.config.embedding.mode
    for (const item of this.embeddingConfigItems) {
      item.element.style.display = item.visibleMode === currentMode ? 'block' : 'none'
    }
  }

  private addEmbeddingSelectSetting(
    title: string,
    description: string,
    target: any,
    key: string,
    options: { value: string; label: string }[],
    visibleMode: 'remote' | 'local',
  ): void {
    this.setting.addItem({
      title,
      description,
      createActionElement: () => {
        const wrapper = document.createElement('div')
        wrapper.style.flex = '1'
        wrapper.style.display = this.config.embedding.mode === visibleMode ? 'block' : 'none'

        const select = document.createElement('select')
        select.className = 'b3-select'
        select.style.width = '100%'
        select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')
        select.value = target[key] ?? ''
        select.addEventListener('change', () => {
          target[key] = select.value
        })
        wrapper.appendChild(select)

        this.embeddingConfigItems.push({ element: wrapper, visibleMode })

        return wrapper
      },
    })
  }

  private addEmbeddingInputSetting(
    title: string,
    description: string,
    target: any,
    key: string,
    visibleMode: 'remote' | 'local',
    isPassword: boolean = false,
  ): void {
    this.setting.addItem({
      title,
      description,
      createActionElement: () => {
        const wrapper = document.createElement('div')
        wrapper.style.flex = '1'
        wrapper.style.display = this.config.embedding.mode === visibleMode ? 'block' : 'none'

        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        if (isPassword) input.type = 'password'
        input.value = target[key] ?? ''
        input.addEventListener('input', () => {
          target[key] = input.value
        })
        wrapper.appendChild(input)

        this.embeddingConfigItems.push({ element: wrapper, visibleMode })

        return wrapper
      },
    })
  }
}

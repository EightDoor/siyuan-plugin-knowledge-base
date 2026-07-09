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
      this.config = { ...DEFAULT_CONFIG, ...savedConfig }
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
        showMessage('配置已保存')
      },
    })

    this.addSelectSetting('LLM 提供商', '选择 LLM 服务', this.config.llm, 'provider', [
      { value: 'ollama', label: 'Ollama' },
      { value: 'openai', label: 'OpenAI 兼容' },
    ])
    this.addInputSetting('LLM Base URL', 'API 基础地址', this.config.llm, 'baseUrl')
    this.addInputSetting('LLM 模型', '模型名称', this.config.llm, 'model')
    this.addInputSetting('LLM API Key', 'OpenAI 兼容 API 时需要', this.config.llm, 'apiKey', true)

    this.addSelectSetting('Embedding 模式', '向量化方式', this.config.embedding, 'mode', [
      { value: 'remote', label: '远程 API' },
      { value: 'local', label: '本地 (Transformers.js)' },
    ])
    this.addInputSetting('Embedding 模型', '模型名称', this.config.embedding, 'model')

    this.addSelectSetting('向量数据库类型', '向量存储后端', this.config.vectorStore, 'type', [
      { value: 'chroma', label: 'ChromaDB' },
      { value: 'milvus', label: 'Milvus' },
    ])
    this.addInputSetting('向量数据库 URL', '服务地址', this.config.vectorStore, 'baseUrl')
  }

  private addSelectSetting(
    title: string,
    description: string,
    target: any,
    key: string,
    options: { value: string; label: string }[],
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
  ): void {
    this.setting.addItem({
      title,
      description,
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        if (isPassword) input.type = 'password'
        input.value = target[key] ?? ''
        input.addEventListener('change', () => {
          target[key] = input.value
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
        title: '知识库',
      },
      type: DOCK_TYPE,
      init: (dock) => {
        dock.element.innerHTML = `
<div id="knowledge-base-dock" class="kb-dock">
  <div class="kb-status-bar">
    <div class="kb-status-info">
      <span class="kb-status-text"></span>
      <span class="kb-status-syncing" style="display:none">同步中...</span>
    </div>
    <div class="kb-status-actions">
      <button id="kb-sync-btn" class="b3-button b3-button--text kb-btn-sm">同步</button>
      <button id="kb-rebuild-btn" class="b3-button b3-button--text kb-btn-sm">重建</button>
    </div>
  </div>
  <div id="kb-messages" class="kb-messages"></div>
  <div class="kb-input-area">
    <textarea id="kb-textarea" class="kb-input-textarea" placeholder="输入问题... Enter 发送, Shift+Enter 换行" rows="2"></textarea>
    <button id="kb-send-btn" class="kb-send-btn">发送</button>
  </div>
</div>`

        this.initChatBindings(dock.element)
      },
    })
  }

  private initChatBindings(container: HTMLElement): void {
    const engine = this.engine
    const app = this.app
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
      if (status.isSyncing) {
        syncingEl.style.display = 'inline'
      } else {
        syncingEl.style.display = 'none'
      }
      const parts: string[] = [`\u{1F4CA} \u5DF2\u7D22\u5F15: ${status.indexedBlocks} \u5757`]
      if (status.lastSyncTime) {
        parts.push(`| \u6700\u8FD1: ${this.formatTime(Date.now() - status.lastSyncTime)}`)
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
      label.textContent = msg.role === 'user' ? '\u4F60' : 'AI'
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
        thinkHeader.innerHTML = '<span>\u{1F914} \u601D\u8003\u8FC7\u7A0B</span><span class="kb-thinking-toggle">\u25B6</span>'

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
        sourcesTitle.textContent = '\u{1F4DA} \u53C2\u8003\u6765\u6E90'
        sourcesDiv.appendChild(sourcesTitle)

        msg.sources.forEach((source: any, idx: number) => {
          const sourceItem = this.buildSourceItem(source, idx, app)
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
          content: `\u9519\u8BEF: ${error instanceof Error ? error.message : String(error)}`,
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

  private buildSourceItem(source: any, idx: number, app: any): HTMLElement {
    const item = document.createElement('div')
    item.className = 'kb-source-item'

    const header = document.createElement('div')
    header.className = 'kb-source-header'
    header.innerHTML = `<span class="kb-source-name">[${idx + 1}] ${source.docName}</span><span class="kb-source-score">\u76F8\u4F3C\u5EA6: ${source.score.toFixed(2)}</span>`
    item.appendChild(header)

    const preview = document.createElement('div')
    preview.className = 'kb-source-preview'
    preview.textContent = source.content
    item.appendChild(preview)

    const link = document.createElement('button')
    link.className = 'kb-source-link'
    link.textContent = '\u8DF3\u8F6C\u5230\u7B14\u8BB0 \u2192'
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
    if (ms < 60000) return '\u521A\u521A'
    if (ms < 3600000) return `${Math.floor(ms / 60000)} \u5206\u949F\u524D`
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} \u5C0F\u65F6\u524D`
    return `${Math.floor(ms / 86400000)} \u5929\u524D`
  }
}

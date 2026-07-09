import { Plugin, Setting, openTab, showMessage } from 'siyuan'
import type { PluginConfig } from './types'
import { KnowledgeEngine } from './core/KnowledgeEngine'

const CONFIG_FILE = 'config.json'
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

    this.engine = new KnowledgeEngine(this.config, this.app)

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

    this.setting.addItem({
      title: 'LLM 提供商',
      description: '选择 LLM 服务',
      createActionElement: () => {
        const select = document.createElement('select')
        select.className = 'b3-select'
        select.innerHTML = '<option value="ollama">Ollama</option><option value="openai">OpenAI 兼容</option>'
        select.value = this.config.llm.provider
        select.addEventListener('change', () => {
          this.config.llm.provider = select.value as 'ollama' | 'openai'
        })
        return select
      },
    })

    this.setting.addItem({
      title: 'LLM Base URL',
      description: 'API 基础地址',
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        input.value = this.config.llm.baseUrl
        input.addEventListener('change', () => {
          this.config.llm.baseUrl = input.value
        })
        return input
      },
    })

    this.setting.addItem({
      title: 'LLM 模型',
      description: '模型名称',
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        input.value = this.config.llm.model
        input.addEventListener('change', () => {
          this.config.llm.model = input.value
        })
        return input
      },
    })

    this.setting.addItem({
      title: 'LLM API Key',
      description: 'OpenAI 兼容 API 时需要',
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        input.type = 'password'
        input.value = this.config.llm.apiKey || ''
        input.addEventListener('change', () => {
          this.config.llm.apiKey = input.value
        })
        return input
      },
    })

    this.setting.addItem({
      title: 'Embedding 模式',
      description: '向量化方式',
      createActionElement: () => {
        const select = document.createElement('select')
        select.className = 'b3-select'
        select.innerHTML = '<option value="remote">远程 API</option><option value="local">本地 (Transformers.js)</option>'
        select.value = this.config.embedding.mode
        select.addEventListener('change', () => {
          this.config.embedding.mode = select.value as 'remote' | 'local'
        })
        return select
      },
    })

    this.setting.addItem({
      title: 'Embedding 模型',
      description: '模型名称',
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        input.value = this.config.embedding.model || ''
        input.addEventListener('change', () => {
          this.config.embedding.model = input.value
        })
        return input
      },
    })

    this.setting.addItem({
      title: '向量数据库类型',
      description: '向量存储后端',
      createActionElement: () => {
        const select = document.createElement('select')
        select.className = 'b3-select'
        select.innerHTML = '<option value="chroma">ChromaDB</option><option value="milvus">Milvus</option>'
        select.value = this.config.vectorStore.type
        select.addEventListener('change', () => {
          this.config.vectorStore.type = select.value as 'chroma' | 'milvus'
        })
        return select
      },
    })

    this.setting.addItem({
      title: '向量数据库 URL',
      description: '服务地址',
      createActionElement: () => {
        const input = document.createElement('input')
        input.className = 'b3-text-field fn__block'
        input.value = this.config.vectorStore.baseUrl
        input.addEventListener('change', () => {
          this.config.vectorStore.baseUrl = input.value
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
          <div id="kb-app" style="height:100%;display:flex;flex-direction:column;">
            <div id="kb-status-bar" style="padding:8px;border-bottom:1px solid var(--b3-border-color);font-size:12px;display:flex;justify-content:space-between;align-items:center;">
              <span>加载中...</span>
              <span>
                <button id="kb-sync-btn" class="b3-button b3-button--text" style="padding:2px 8px;font-size:12px;">同步</button>
                <button id="kb-rebuild-btn" class="b3-button b3-button--text" style="padding:2px 8px;font-size:12px;">重建</button>
              </span>
            </div>
            <div id="kb-messages" style="flex:1;overflow-y:auto;padding:12px;"></div>
            <div id="kb-input" style="padding:8px;border-top:1px solid var(--b3-border-color);display:flex;gap:8px;">
              <textarea id="kb-textarea" class="b3-text-field" placeholder="输入问题..." rows="2" style="flex:1;resize:none;"></textarea>
              <button id="kb-send-btn" class="b3-button" style="flex-shrink:0;">发送</button>
            </div>
          </div>
        `

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
    const statusBarEl = container.querySelector('#kb-status-bar') as HTMLElement

    const updateStatus = () => {
      const status = engine.getIndexStatus()
      statusBarEl.querySelector('span')!.textContent =
        `\u{1F4CA} \u5DF2\u7D22\u5F15: ${status.indexedBlocks} \u5757${status.lastSyncTime ? ` | \u6700\u8FD1: ${this.formatTime(Date.now() - status.lastSyncTime)}` : ''}`
    }

    syncBtn.addEventListener('click', () => engine.sync().then(updateStatus))
    rebuildBtn.addEventListener('click', () => engine.rebuild().then(updateStatus))

    setInterval(updateStatus, 5000)
    updateStatus()

    const appendMessage = (msg: { role: string; content: string; thinking?: string; sources?: any[] }) => {
      const div = document.createElement('div')
      div.style.cssText = 'margin-bottom:12px;'

      const label = document.createElement('div')
      label.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:4px;color:var(--b3-theme-on-surface-light);'
      label.textContent = msg.role === 'user' ? '\u4F60' : 'AI'

      const text = document.createElement('div')
      text.style.cssText = 'white-space:pre-wrap;word-break:break-word;line-height:1.6;'
      text.textContent = msg.content

      div.appendChild(label)
      div.appendChild(text)

      if (msg.thinking) {
        const thinkingDiv = document.createElement('div')
        thinkingDiv.style.cssText = 'margin-top:8px;border:1px solid var(--b3-border-color);border-radius:8px;overflow:hidden;'

        const header = document.createElement('div')
        header.style.cssText = 'padding:6px 10px;background:var(--b3-theme-surface);cursor:pointer;font-size:12px;display:flex;justify-content:space-between;'
        header.innerHTML = '<span>\u{1F914} \u601D\u8003\u8FC7\u7A0B</span><span>\u25B6</span>'

        const body = document.createElement('div')
        body.style.cssText = 'padding:10px;font-size:12px;color:var(--b3-theme-on-surface-light);white-space:pre-wrap;display:none;'
        body.textContent = msg.thinking

        header.addEventListener('click', () => {
          const open = body.style.display !== 'none'
          body.style.display = open ? 'none' : 'block'
          header.querySelector('span:last-child')!.textContent = open ? '\u25B6' : '\u25BC'
        })

        thinkingDiv.appendChild(header)
        thinkingDiv.appendChild(body)
        div.appendChild(thinkingDiv)
      }

      if (msg.sources && msg.sources.length > 0) {
        const sourcesDiv = document.createElement('div')
        sourcesDiv.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--b3-border-color);'

        const sourcesTitle = document.createElement('div')
        sourcesTitle.style.cssText = 'font-size:12px;margin-bottom:6px;color:var(--b3-theme-on-surface-light);'
        sourcesTitle.textContent = '\u{1F4DA} \u53C2\u8003\u6765\u6E90'
        sourcesDiv.appendChild(sourcesTitle)

        msg.sources.forEach((source: any, idx: number) => {
          const sourceItem = document.createElement('div')
          sourceItem.style.cssText = 'padding:6px 8px;margin:4px 0;background:var(--b3-theme-surface);border-radius:6px;font-size:12px;'

          const info = document.createElement('div')
          info.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;'
          info.innerHTML = `<span style="font-weight:600;">[${idx + 1}] ${source.docName}</span><span>\u76F8\u4F3C\u5EA6: ${source.score.toFixed(2)}</span>`

          const preview = document.createElement('div')
          preview.style.cssText = 'color:var(--b3-theme-on-surface-light);margin-bottom:4px;'
          preview.textContent = source.content

          const link = document.createElement('button')
          link.style.cssText = 'font-size:11px;color:var(--b3-theme-primary);background:none;border:1px solid var(--b3-theme-primary);border-radius:4px;cursor:pointer;padding:2px 6px;'
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

          sourceItem.appendChild(info)
          sourceItem.appendChild(preview)
          sourceItem.appendChild(link)
          sourcesDiv.appendChild(sourceItem)
        })

        div.appendChild(sourcesDiv)
      }

      messagesEl.appendChild(div)
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

        let currentMsg: any = null
        for await (const msg of stream) {
          if (!currentMsg) {
            currentMsg = msg
            appendMessage({
              role: msg.role,
              content: msg.content,
              thinking: msg.thinking,
              sources: msg.sources,
            })
          } else {
            const lastEl = messagesEl.lastElementChild
            if (lastEl && lastEl.querySelector('div:nth-child(2)')) {
              const textEl = lastEl.querySelector('div:nth-child(2)') as HTMLElement
              textEl.textContent = msg.content
            }
            messagesEl.scrollTop = messagesEl.scrollHeight
          }
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

  private formatTime(ms: number): string {
    if (ms < 60000) return '\u521A\u521A'
    if (ms < 3600000) return `${Math.floor(ms / 60000)} \u5206\u949F\u524D`
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} \u5C0F\u65F6\u524D`
    return `${Math.floor(ms / 86400000)} \u5929\u524D`
  }
}

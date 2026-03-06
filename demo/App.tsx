import { createMemo, createSignal } from "solid-js"
import { QRCode } from "../src"
import "./App.css"

const levels = ["L", "M", "Q", "H"] as const

const App = () => {
  const [value, setValue] = createSignal("https://solidjs.com")
  const [size, setSize] = createSignal(220)
  const [radius, setRadius] = createSignal(0.45)
  const [quietZone, setQuietZone] = createSignal(2)
  const [level, setLevel] = createSignal<(typeof levels)[number]>("M")
  const [background, setBackground] = createSignal("#ffffff")
  const [foreground, setForeground] = createSignal("#18181b")
  const [accent, setAccent] = createSignal("#52525b")

  const gradientFill = createMemo(() => ({
    type: "linear-gradient" as const,
    position: [0, 0, 1, 1] as [number, number, number, number],
    colorStops: [
      [0, foreground()],
      [1, accent()],
    ] as Array<readonly [number, string]>,
  }))

  const snippet = createMemo(
    () => `<QRCode
  value=${JSON.stringify(value())}
  size={${size()}}
  level="${level()}"
  quietZone={${quietZone()}}
  radius={${radius().toFixed(2)}}
  background="${background()}"
  foreground={{
    type: 'linear-gradient',
    position: [0, 0, 1, 1],
    colorStops: [
      [0, '${foreground()}'],
      [1, '${accent()}'],
    ],
  }}
/>`,
  )

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet())
  }

  const propsList = [
    ["value", "string", "二维码内容"],
    ["size", "number", "画布尺寸，默认 200"],
    ["level", `'L' | 'M' | 'Q' | 'H'`, "纠错等级"],
    ["quietZone", "number", "静区模块数"],
    ["radius", "number", "圆角半径，范围 0~0.5"],
    ["foreground", "string | GradientFill", "前景色或渐变"],
    ["background", "string | null", "背景色，null 为透明"],
  ] as const

  return (
    <main class="app-shell">
      <header class="topbar">
        <div>
          <span class="brand-mark">solid-qrcode</span>
          <p>Modern reactive QR component for SolidJS</p>
        </div>
        <div class="topbar-actions">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </header>

      <section id="playground" class="hero">
        <div class="hero-preview">
          <div class="preview-card">
            <div class="preview-meta">
              <span>Live Preview</span>
              <strong>
                {size()} × {size()} px
              </strong>
            </div>
            <div class="qr-frame">
              <QRCode
                value={value()}
                size={size()}
                level={level()}
                quietZone={quietZone()}
                radius={radius()}
                background={background()}
                foreground={gradientFill()}
              />
            </div>
          </div>
        </div>

        <div class="hero-copy">
          <span class="eyebrow">SolidJS QR Component</span>
          <label class="field">
            <textarea
              rows="4"
              value={value()}
              onInput={(event) => setValue(event.currentTarget.value)}
              placeholder="输入链接、文本或任意 UTF-8 内容"
            />
          </label>

          <div class="controls-grid">
            <label class="field">
              <span>尺寸：{size()}px</span>
              <input
                type="range"
                min="128"
                max="280"
                step="4"
                value={size()}
                onInput={(event) =>
                  setSize(Math.min(280, Number(event.currentTarget.value)))
                }
              />
            </label>

            <label class="field">
              <span>圆角：{radius().toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={radius()}
                onInput={(event) =>
                  setRadius(Number(event.currentTarget.value))
                }
              />
            </label>

            <label class="field">
              <span>静区：{quietZone()}</span>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={quietZone()}
                onInput={(event) =>
                  setQuietZone(Number(event.currentTarget.value))
                }
              />
            </label>

            <label class="field">
              <span>纠错等级</span>
              <select
                value={level()}
                onInput={(event) =>
                  setLevel(event.currentTarget.value as (typeof levels)[number])
                }>
                {levels.map((currentLevel) => (
                  <option value={currentLevel}>{currentLevel}</option>
                ))}
              </select>
            </label>
          </div>

          <div class="color-controls">
            <label class="field color-field">
              <span>主色</span>
              <input
                type="color"
                value={foreground()}
                onInput={(event) => setForeground(event.currentTarget.value)}
              />
            </label>

            <label class="field color-field">
              <span>强调色</span>
              <input
                type="color"
                value={accent()}
                onInput={(event) => setAccent(event.currentTarget.value)}
              />
            </label>

            <label class="field color-field">
              <span>背景色</span>
              <input
                type="color"
                value={background()}
                onInput={(event) => setBackground(event.currentTarget.value)}
              />
            </label>
          </div>
        </div>
      </section>

      <section id="examples" class="examples">
        <article class="docs-card code-card">
          <div class="code-header">
            <div>
              <h2>组件接口</h2>
              <p>为 Solid 设计，常用配置尽量保持直观。</p>
            </div>
            <button type="button" onClick={() => void copySnippet()}>
              复制代码
            </button>
          </div>
          <pre>{snippet()}</pre>
        </article>
      </section>

      <section id="api" class="docs-grid">
        <article class="docs-card props-card">
          <div>
            <span class="eyebrow">Props</span>
            <h2>组件接口</h2>
            <p>保留最常用的配置，避免过度设计。</p>
          </div>

          <div class="props-table" role="table" aria-label="QRCode props">
            <div class="props-row props-head" role="row">
              <span>Prop</span>
              <span>Type</span>
              <span>Description</span>
            </div>
            {propsList.map(([name, type, description]) => (
              <div class="props-row" role="row">
                <code>{name}</code>
                <code>{type}</code>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </article>

        <article class="docs-card notes-card">
          <div>
            <span class="eyebrow">Notes</span>
            <h2>使用建议</h2>
          </div>
          <ul class="notes-list">
            <li>默认用 `M` 级纠错，通常已经够用。</li>
            <li>需要打印或贴纸时，建议把 `quietZone` 调到 `2` 或更高。</li>
            <li>深色前景配浅色背景，扫码成功率更稳。</li>
            <li>渐变建议控制在同一明度区间，避免局部过浅。</li>
            <li>demo 是独立目录，库代码保持纯净。</li>
          </ul>
        </article>
      </section>
    </main>
  )
}

export default App

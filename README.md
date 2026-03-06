[English](./README.en.md) · 简体中文

# solid-qrcode

![SolidJS](https://img.shields.io/badge/SolidJS-1.x-2c4f7c?logo=solid)
![Bun](https://img.shields.io/badge/Bun-ready-f9f1e1?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)

专为 `SolidJS` 打造的响应式二维码组件库。

它的目标很明确：在保持 API 简洁克制的前提下，提供现代、清晰、直接可用的 `canvas` 二维码绘制体验。

## 为什么用它

- 生而响应，随 `Solid` 状态变化自动重绘
- 内置高分屏适配，二维码在 Retina 屏上依然清晰
- 支持圆角模块、静区、纠错等级与版本范围控制
- 支持纯色和渐变前景填充，风格更灵活
- 支持透明背景，方便叠加到卡片、海报和品牌视觉里
- 暴露底层 API，既能开箱即用，也能深度定制

## 安装

```bash
bun add solid-qrcode solid-js
```

> `solid-js` 是 peer dependency，需要由你的项目自行安装。

## Demo

在线 demo 页面后续补充。

目前可以直接本地运行：

```bash
bun install
bun run dev
```

## 快速开始

```tsx
import { QRCode } from "solid-qrcode"

export default function App() {
  return (
    <QRCode
      value="https://solidjs.com"
      size={220}
      level="H"
      quietZone={2}
      radius={0.45}
      foreground="#111827"
      background="#ffffff"
    />
  )
}
```

组件最终输出的是一个 `canvas`，并透传大多数 `canvas` HTML 属性。默认还会补上：

- `role="img"`
- `aria-label="QR code for ..."`

## 渐变示例

如果你不想停留在单色二维码，`foreground` 也可以直接接收渐变对象：

```tsx
import { QRCode, type GradientFill } from "solid-qrcode"

const fill: GradientFill = {
  type: "linear-gradient",
  position: [0, 0, 1, 1],
  colorStops: [
    [0, "#18181b"],
    [1, "#52525b"],
  ],
}

<QRCode
  value="https://solidjs.com"
  size={240}
  foreground={fill}
  background="#fff"
/>
```

## `QRCode` Props

| Prop         | 类型                       | 默认值      | 说明                                   |
| ------------ | -------------------------- | ----------- | -------------------------------------- |
| `value`      | `string`                   | -           | 二维码内容                             |
| `size`       | `number`                   | `200`       | 画布显示尺寸，最小会被归一到 `1`       |
| `level`      | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'`       | 纠错等级                               |
| `minVersion` | `number`                   | `1`         | 最小二维码版本                         |
| `maxVersion` | `number`                   | `40`        | 最大二维码版本                         |
| `quietZone`  | `number`                   | `1`         | 静区模块数                             |
| `radius`     | `number`                   | `0.5`       | 模块圆角半径，范围会被限制在 `0 ~ 0.5` |
| `foreground` | `string \| GradientFill`   | `'#111827'` | 前景色或渐变填充                       |
| `background` | `string \| null`           | `null`      | 背景色，传 `null` 时为透明背景         |

## 类型定义

```ts
type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

type GradientFill = {
  type: "linear-gradient" | "radial-gradient"
  position:
    | [number, number, number, number]
    | [number, number, number, number, number, number]
  colorStops: Array<readonly [number, string]>
}
```

## 低层 API

如果你想自己接管绘制流程，包入口也导出了底层能力：

- `createQRCodeMatrix(options)`：生成二维码矩阵数据
- `drawQRCodeMatrixToCanvas(canvas, matrix, options)`：将现有矩阵绘制到 `canvas`
- `drawQRCodeToCanvas(canvas, options)`：从文本直接生成并绘制二维码
- `normalizeQRCodeOptions(options)`：补齐并标准化二维码配置
- `DEFAULT_QR_OPTIONS`：默认配置常量

额外导出类型：

- `QRCodeProps`
- `QRCodeOptions`
- `QRCodeRenderOptions`
- `QRCodeMatrix`
- `GradientFill`
- `ErrorCorrectionLevel`

## 开发

```bash
bun install
bun run dev
```

`bun run dev` 会启动 `demo` 目录下的演示页面，用来实时预览组件效果。

## 构建

构建库产物：

```bash
bun run build
```

它等价于：

```bash
bun run build:lib
```

构建 demo 静态站点：

```bash
bun run build:demo
```

本地预览：

```bash
bun run preview
bun run preview:demo
```

## 致谢

特别鸣谢 [`nimiq/qr-creator`](https://github.com/nimiq/qr-creator) 团队。本项目的二维码实现参考了他们的优秀思路与实现，感谢他们为开源社区提供的坚实基础。

## 包结构

- `src/index.ts`：库入口
- `src/lib/QRCode.tsx`：`QRCode` 组件
- `src/lib/core/qrcode.ts`：二维码核心逻辑与底层绘制方法
- `demo`：演示页面源码
- `dist`：库构建产物
- `demo-dist`：demo 构建产物

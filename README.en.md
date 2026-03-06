English · [简体中文](./README.md)

# solid-qrcode

![Bun](https://img.shields.io/badge/Bun-ready-f9f1e1?logo=bun) [![GitHub](https://img.shields.io/badge/GitHub-Borber%2Fsolid--qrcode-181717?logo=github)](https://github.com/Borber/solid-qrcode)

A responsive QR code component library built for `SolidJS`.

The goal is simple: deliver a modern, crisp, canvas-based QR rendering experience while keeping the API compact and easy to use.

## Why `solid-qrcode`

- Reactive by design and redraws naturally with `Solid` state updates
- High-DPI aware by default, so QR codes stay sharp on Retina displays
- Supports rounded modules, quiet zones, error correction, and version range control
- Supports both solid colors and gradient foreground fills
- Supports transparent backgrounds for cards, posters, and branded layouts
- Exposes low-level APIs when you need full control over rendering

## Install

```bash
bun add solid-qrcode solid-js
```

> `solid-js` is a peer dependency and must be installed by the consuming app.

## Demo

An online demo page will be added later.

Repository: [`Borber/solid-qrcode`](https://github.com/Borber/solid-qrcode)

For now, you can run it locally:

```bash
bun install
bun run dev
```

## Quick Start

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

The component renders a `canvas` and forwards most native `canvas` HTML attributes. By default, it also adds:

- `role="img"`
- `aria-label="QR code for ..."`

## Gradient Example

If a flat color feels too limited, `foreground` can also take a gradient object:

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

| Prop         | Type                       | Default     | Description                                            |
|--------------|----------------------------|-------------|--------------------------------------------------------|
| `value`      | `string`                   | -           | QR code content                                        |
| `size`       | `number`                   | `200`       | Display size of the canvas, normalized to at least `1` |
| `level`      | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'`       | Error correction level                                 |
| `minVersion` | `number`                   | `1`         | Minimum QR version                                     |
| `maxVersion` | `number`                   | `40`        | Maximum QR version                                     |
| `quietZone`  | `number`                   | `1`         | Quiet-zone module count                                |
| `radius`     | `number`                   | `0.5`       | Rounded module radius, clamped to `0 ~ 0.5`            |
| `foreground` | `string \| GradientFill`   | `'#111827'` | Foreground color or gradient fill                      |
| `background` | `string \| null`           | `null`      | Background color, or transparent when `null`           |

## Type Definitions

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

## Low-Level API

If you want to own the rendering flow yourself, the package also exports lower-level primitives:

- `createQRCodeMatrix(options)`: Generate QR matrix data
- `drawQRCodeMatrixToCanvas(canvas, matrix, options)`: Draw an existing matrix onto a `canvas`
- `drawQRCodeToCanvas(canvas, options)`: Generate and draw a QR code directly from text
- `normalizeQRCodeOptions(options)`: Fill and normalize QR options
- `DEFAULT_QR_OPTIONS`: Default option constants

Additional exported types:

- `QRCodeProps`
- `QRCodeOptions`
- `QRCodeRenderOptions`
- `QRCodeMatrix`
- `GradientFill`
- `ErrorCorrectionLevel`

## Development

```bash
bun install
bun run dev
```

`bun run dev` starts the demo app under `demo` for live previewing the component.

## Build

Build the library bundle:

```bash
bun run build
```

Equivalent command:

```bash
bun run build:lib
```

Build the demo as a static site:

```bash
bun run build:demo
```

Preview locally:

```bash
bun run preview
bun run preview:demo
```

## Acknowledgements

Special thanks to [`nimiq/qr-creator`](https://github.com/nimiq/qr-creator). This project references and draws inspiration from their elegant QR implementation, and we appreciate the foundation they shared with the open-source community.

## Package Structure

- `src/index.ts`: Package entry
- `src/lib/QRCode.tsx`: `QRCode` component
- `src/lib/core/qrcode.ts`: QR core logic and low-level drawing APIs
- `demo`: Demo application source
- `dist`: Library build output
- `demo-dist`: Demo build output

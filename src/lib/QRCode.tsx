import { createEffect, createMemo, mergeProps, splitProps } from "solid-js"
import type { JSX } from "solid-js"
import {
  createQRCodeMatrix,
  drawQRCodeMatrixToCanvas,
  type ErrorCorrectionLevel,
  type GradientFill,
} from "./core/qrcode"

export type QRCodeProps = Omit<
  JSX.CanvasHTMLAttributes<HTMLCanvasElement>,
  "width" | "height"
> & {
  value: string
  size?: number
  level?: ErrorCorrectionLevel
  minVersion?: number
  maxVersion?: number
  quietZone?: number
  radius?: number
  foreground?: string | GradientFill
  background?: string | null
}

export const QRCode = (props: QRCodeProps) => {
  const merged = mergeProps(
    {
      size: 200,
      level: "M" as ErrorCorrectionLevel,
      minVersion: 1,
      maxVersion: 40,
      quietZone: 1,
      radius: 0.5,
      foreground: "#111827",
      background: null,
    },
    props,
  )

  const [local, canvasProps] = splitProps(merged, [
    "value",
    "size",
    "level",
    "minVersion",
    "maxVersion",
    "quietZone",
    "radius",
    "foreground",
    "background",
  ])

  let canvas!: HTMLCanvasElement

  const matrix = createMemo(() => {
    return createQRCodeMatrix({
      text: local.value,
      ecLevel: local.level,
      minVersion: local.minVersion,
      maxVersion: local.maxVersion,
      quiet: local.quietZone,
    })
  })

  createEffect(() => {
    const qrMatrix = matrix()

    if (!canvas) {
      return
    }

    drawQRCodeMatrixToCanvas(canvas, qrMatrix, {
      size: local.size,
      radius: local.radius,
      fill: local.foreground,
      background: local.background,
    })
  })

  return (
    <canvas
      {...canvasProps}
      ref={canvas}
      width={local.size}
      height={local.size}
      role={canvasProps.role ?? "img"}
      aria-label={canvasProps["aria-label"] ?? `QR code for ${local.value}`}
    />
  )
}

export default QRCode

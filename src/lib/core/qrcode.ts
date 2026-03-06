export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export type GradientFill = {
  type: "linear-gradient" | "radial-gradient"
  position:
    | [number, number, number, number]
    | [number, number, number, number, number, number]
  colorStops: Array<readonly [number, string]>
}

export type QRCodeOptions = {
  text: string
  minVersion?: number
  maxVersion?: number
  ecLevel?: ErrorCorrectionLevel
  size?: number
  fill?: string | GradientFill
  background?: string | null
  radius?: number
  quiet?: number
}

export type QRCodeRenderOptions = Pick<
  QRCodeOptions,
  "size" | "fill" | "background" | "radius"
>

export type NormalizedQRCodeOptions = {
  text: string
  minVersion: number
  maxVersion: number
  ecLevel: ErrorCorrectionLevel
  size: number
  fill: string | GradientFill
  background: string | null
  radius: number
  quiet: number
}

export type QRCodeMatrix = {
  text: string
  level: ErrorCorrectionLevel
  version: number
  moduleCount: number
  isDark: (row: number, col: number) => boolean
}

type NormalizedQRCodeRenderOptions = Pick<
  NormalizedQRCodeOptions,
  "size" | "fill" | "background" | "radius"
>

type QRCodeMatrixWithData = QRCodeMatrix & {
  data: Uint8Array
}

export const DEFAULT_QR_OPTIONS: Readonly<NormalizedQRCodeOptions> =
  Object.freeze({
    text: "no text",
    minVersion: 1,
    maxVersion: 40,
    ecLevel: "M",
    size: 200,
    fill: "#111827",
    background: null,
    radius: 0.5,
    quiet: 1,
  })

const textEncoder = new TextEncoder()
const qrCodeMatrixCache = new Map<string, QRCodeMatrix>()

export const normalizeQRCodeOptions = (
  options: QRCodeOptions,
): NormalizedQRCodeOptions => {
  const minVersion = clampInteger(
    options.minVersion ?? DEFAULT_QR_OPTIONS.minVersion,
    1,
    40,
  )
  const maxVersion = clampInteger(
    options.maxVersion ?? DEFAULT_QR_OPTIONS.maxVersion,
    minVersion,
    40,
  )

  return {
    text: options.text,
    minVersion,
    maxVersion,
    ecLevel: options.ecLevel ?? DEFAULT_QR_OPTIONS.ecLevel,
    size: normalizeQRCodeSize(options.size),
    fill: options.fill ?? DEFAULT_QR_OPTIONS.fill,
    background: options.background ?? DEFAULT_QR_OPTIONS.background,
    radius: normalizeQRCodeRadius(options.radius),
    quiet: Math.max(0, Math.round(options.quiet ?? DEFAULT_QR_OPTIONS.quiet)),
  }
}

export const createQRCodeMatrix = (options: QRCodeOptions): QRCodeMatrix => {
  const settings = normalizeQRCodeOptions(options)
  return createQRCodeMatrixFromNormalizedOptions(settings)
}

export const drawQRCodeMatrixToCanvas = (
  canvas: HTMLCanvasElement,
  qr: QRCodeMatrix,
  options: QRCodeRenderOptions = {},
): HTMLCanvasElement => {
  const settings = normalizeQRCodeRenderOptions(options)
  const context = prepareCanvasContext(canvas, settings.size)

  drawBackground(context, settings)
  drawModules(qr, context, settings)

  return canvas
}

const createQRCodeMatrixFromNormalizedOptions = (
  settings: NormalizedQRCodeOptions,
): QRCodeMatrix => {
  const cacheKey = getQRCodeMatrixCacheKey(settings)
  const cached = qrCodeMatrixCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const matrix = createMinQRCode(
    settings.text,
    settings.ecLevel,
    settings.minVersion,
    settings.maxVersion,
    settings.quiet,
  )

  if (!matrix) {
    throw new Error(
      "Unable to encode QR code for the provided text and version range.",
    )
  }

  qrCodeMatrixCache.set(cacheKey, matrix)

  return matrix
}

export const drawQRCodeToCanvas = (
  canvas: HTMLCanvasElement,
  options: QRCodeOptions,
): HTMLCanvasElement => {
  const settings = normalizeQRCodeOptions(options)
  return drawQRCodeMatrixToCanvas(
    canvas,
    createQRCodeMatrixFromNormalizedOptions(settings),
    settings,
  )
}

const clampInteger = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, Math.round(value)))
}

const normalizeQRCodeSize = (size: number | undefined) => {
  return Math.max(1, Math.round(size ?? DEFAULT_QR_OPTIONS.size))
}

const normalizeQRCodeRadius = (radius: number | undefined) => {
  return Math.max(0, Math.min(0.5, radius ?? DEFAULT_QR_OPTIONS.radius))
}

const prepareCanvasContext = (
  canvas: HTMLCanvasElement,
  displaySize: number,
) => {
  const pixelRatio = window.devicePixelRatio || 1
  const scaledSize = Math.max(1, Math.round(displaySize * pixelRatio))

  if (canvas.width !== scaledSize || canvas.height !== scaledSize) {
    canvas.width = scaledSize
    canvas.height = scaledSize
  }

  if (canvas.style.width !== `${displaySize}px`) {
    canvas.style.width = `${displaySize}px`
  }

  if (canvas.style.height !== `${displaySize}px`) {
    canvas.style.height = `${displaySize}px`
  }

  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("2D canvas context is not available in this environment.")
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, displaySize, displaySize)

  return context
}

const drawBackground = (
  context: CanvasRenderingContext2D,
  settings: NormalizedQRCodeRenderOptions,
) => {
  if (!settings.background) {
    return
  }

  context.fillStyle = settings.background
  context.fillRect(0, 0, settings.size, settings.size)
}

const normalizeQRCodeRenderOptions = (
  options: QRCodeRenderOptions = {},
): NormalizedQRCodeRenderOptions => {
  return {
    size: normalizeQRCodeSize(options.size),
    fill: options.fill ?? DEFAULT_QR_OPTIONS.fill,
    background: options.background ?? DEFAULT_QR_OPTIONS.background,
    radius: normalizeQRCodeRadius(options.radius),
  }
}

const getQRCodeMatrixCacheKey = (settings: NormalizedQRCodeOptions) => {
  return [
    settings.text,
    settings.ecLevel,
    settings.minVersion,
    settings.maxVersion,
    settings.quiet,
  ].join("\u0000")
}

const drawModules = (
  qr: QRCodeMatrix,
  context: CanvasRenderingContext2D,
  settings: NormalizedQRCodeRenderOptions,
) => {
  const moduleSize = settings.size / qr.moduleCount
  const radius = Math.floor(settings.radius * moduleSize)
  const x = createRoundedCoordinateTable(moduleSize, qr.moduleCount)
  const y = createRoundedCoordinateTable(moduleSize, qr.moduleCount)
  const modules = getQRCodeModuleData(qr)

  context.beginPath()

  for (let row = 0; row < qr.moduleCount; row += 1) {
    for (let col = 0; col < qr.moduleCount; col += 1) {
      drawRoundedModule(
        context,
        modules,
        qr.moduleCount,
        x[col],
        y[row],
        x[col + 1],
        y[row + 1],
        radius,
        row,
        col,
      )
    }
  }

  setFill(context, settings)
  context.fill()
}

const drawRoundedModule = (
  context: CanvasRenderingContext2D,
  modules: Uint8Array,
  moduleCount: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
  row: number,
  col: number,
) => {
  const center = isDarkModule(modules, moduleCount, row, col)

  if (radius === 0) {
    if (center) {
      context.rect(left, top, right - left, bottom - top)
    }

    return
  }

  if (center) {
    const north = isDarkModule(modules, moduleCount, row - 1, col)
    const east = isDarkModule(modules, moduleCount, row, col + 1)
    const south = isDarkModule(modules, moduleCount, row + 1, col)
    const west = isDarkModule(modules, moduleCount, row, col - 1)

    drawDarkModule(
      context,
      left,
      top,
      right,
      bottom,
      radius,
      !north && !west,
      !north && !east,
      !south && !east,
      !south && !west,
    )
    return
  }

  const north = isDarkModule(modules, moduleCount, row - 1, col)
  const east = isDarkModule(modules, moduleCount, row, col + 1)
  const south = isDarkModule(modules, moduleCount, row + 1, col)
  const west = isDarkModule(modules, moduleCount, row, col - 1)

  drawLightModule(
    context,
    left,
    top,
    right,
    bottom,
    radius,
    north && west && isDarkModule(modules, moduleCount, row - 1, col - 1),
    north && east && isDarkModule(modules, moduleCount, row - 1, col + 1),
    south && east && isDarkModule(modules, moduleCount, row + 1, col + 1),
    south && west && isDarkModule(modules, moduleCount, row + 1, col - 1),
  )
}

const createRoundedCoordinateTable = (
  moduleSize: number,
  moduleCount: number,
) => {
  return Array.from({ length: moduleCount + 1 }, (_, index) =>
    Math.round(index * moduleSize),
  )
}

const getQRCodeModuleData = (qr: QRCodeMatrix) => {
  if ("data" in qr && qr.data instanceof Uint8Array) {
    return qr.data
  }

  const data = new Uint8Array(qr.moduleCount * qr.moduleCount)

  for (let row = 0; row < qr.moduleCount; row += 1) {
    for (let col = 0; col < qr.moduleCount; col += 1) {
      data[row * qr.moduleCount + col] = qr.isDark(row, col) ? 1 : 0
    }
  }

  return data
}

const isDarkModule = (
  modules: Uint8Array,
  moduleCount: number,
  row: number,
  col: number,
) => {
  if (row < 0 || row >= moduleCount || col < 0 || col >= moduleCount) {
    return false
  }

  return modules[row * moduleCount + col] === 1
}

const drawDarkModule = (
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
  northWest: boolean,
  northEast: boolean,
  southEast: boolean,
  southWest: boolean,
) => {
  context.moveTo(northWest ? left + radius : left, top)

  const drawCorner = (
    enabled: boolean,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    radiusX: number,
    radiusY: number,
  ) => {
    if (!enabled) {
      context.lineTo(x0, y0)
      return
    }

    context.lineTo(x0 + radiusX, y0 + radiusY)
    context.arcTo(x0, y0, x1, y1, radius)
  }

  drawCorner(northEast, right, top, right, bottom, -radius, 0)
  drawCorner(southEast, right, bottom, left, bottom, 0, -radius)
  drawCorner(southWest, left, bottom, left, top, radius, 0)
  drawCorner(northWest, left, top, right, top, 0, radius)
}

const drawLightModule = (
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
  northWest: boolean,
  northEast: boolean,
  southEast: boolean,
  southWest: boolean,
) => {
  const drawCorner = (
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
  ) => {
    context.moveTo(x + radiusX, y)
    context.lineTo(x, y)
    context.lineTo(x, y + radiusY)
    context.arcTo(x, y, x + radiusX, y, radius)
  }

  if (northWest) drawCorner(left, top, radius, radius)
  if (northEast) drawCorner(right, top, -radius, radius)
  if (southEast) drawCorner(right, bottom, -radius, -radius)
  if (southWest) drawCorner(left, bottom, radius, -radius)
}

const setFill = (
  context: CanvasRenderingContext2D,
  settings: NormalizedQRCodeRenderOptions,
) => {
  if (typeof settings.fill === "string") {
    context.fillStyle = settings.fill
    return
  }

  const { type, position, colorStops } = settings.fill
  const absolutePosition = position.map((coordinate) =>
    Math.round(coordinate * settings.size),
  )
  const gradient =
    type === "linear-gradient"
      ? context.createLinearGradient(
          ...(absolutePosition as [number, number, number, number]),
        )
      : context.createRadialGradient(
          ...(absolutePosition as [
            number,
            number,
            number,
            number,
            number,
            number,
          ]),
        )

  for (const [offset, color] of colorStops) {
    gradient.addColorStop(offset, color)
  }

  context.fillStyle = gradient
}

const createMinQRCode = (
  text: string,
  level: ErrorCorrectionLevel,
  minVersion: number,
  maxVersion: number,
  quiet: number,
) => {
  for (let version = minVersion; version <= maxVersion; version += 1) {
    try {
      return createQRCode(text, level, version, quiet)
    } catch {
      // Try the next version until the content fits.
    }
  }

  return undefined
}

const createQRCode = (
  text: string,
  level: ErrorCorrectionLevel,
  version: number,
  quiet: number,
): QRCodeMatrix => {
  const qr = vendorQRCode(version, level)
  qr.addData(text)
  qr.make()

  const rawModuleCount = qr.getModuleCount()
  const moduleCount = rawModuleCount + quiet * 2
  const data = new Uint8Array(moduleCount * moduleCount)

  for (let row = 0; row < rawModuleCount; row += 1) {
    for (let col = 0; col < rawModuleCount; col += 1) {
      if (!qr.isDark(row, col)) {
        continue
      }

      data[(row + quiet) * moduleCount + col + quiet] = 1
    }
  }

  const matrix: QRCodeMatrixWithData = {
    text,
    level,
    version,
    moduleCount,
    data,
    isDark: (row, col) => {
      if (row < 0 || row >= moduleCount || col < 0 || col >= moduleCount) {
        return false
      }

      return data[row * moduleCount + col] === 1
    },
  }

  return matrix
}

const QRMode = {
  MODE_8BIT_BYTE: 1 << 2,
} as const

const QRErrorCorrectLevelMap: Record<ErrorCorrectionLevel, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
}

const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
} as const

type InternalQRCode = ReturnType<typeof vendorQRCode>

const vendorQRCode = (
  typeNumber: number,
  errorCorrectLevel: ErrorCorrectionLevel,
) => {
  const PAD0 = 0xec
  const PAD1 = 0x11
  let moduleCount = 0
  let modules: Array<Array<boolean | null>> = []
  let dataCache: number[] | null = null
  const dataList: ReturnType<typeof qr8BitByte>[] = []
  const internalLevel = QRErrorCorrectLevelMap[errorCorrectLevel]

  const api = {
    addData: (data: string) => {
      dataList.push(qr8BitByte(data))
      dataCache = null
    },
    isDark: (row: number, col: number) => {
      if (row < 0 || row >= moduleCount || col < 0 || col >= moduleCount) {
        throw new Error(`${row},${col}`)
      }

      return Boolean(modules[row]?.[col])
    },
    getModuleCount: () => {
      return moduleCount
    },
    make: () => {
      makeImpl(false, getBestMaskPattern())
    },
  }

  const makeImpl = (test: boolean, maskPattern: number) => {
    moduleCount = typeNumber * 4 + 17
    modules = Array.from({ length: moduleCount }, () =>
      Array<boolean | null>(moduleCount).fill(null),
    )

    setupPositionProbePattern(0, 0)
    setupPositionProbePattern(moduleCount - 7, 0)
    setupPositionProbePattern(0, moduleCount - 7)
    setupPositionAdjustPattern()
    setupTimingPattern()
    setupTypeInfo(test, maskPattern)

    if (typeNumber >= 7) {
      setupTypeNumber(test)
    }

    dataCache ??= createData(typeNumber, internalLevel, dataList, PAD0, PAD1)
    mapData(dataCache, maskPattern)
  }

  const setupPositionProbePattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || row + r >= moduleCount) continue

      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || col + c >= moduleCount) continue

        modules[row + r][col + c] =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      }
    }
  }

  const getBestMaskPattern = () => {
    let minLostPoint = Infinity
    let pattern = 0

    for (let candidate = 0; candidate < 8; candidate += 1) {
      makeImpl(true, candidate)
      const lostPoint = QRUtil.getLostPoint(api)

      if (lostPoint < minLostPoint) {
        minLostPoint = lostPoint
        pattern = candidate
      }
    }

    return pattern
  }

  const setupTimingPattern = () => {
    for (let row = 8; row < moduleCount - 8; row += 1) {
      if (modules[row][6] !== null) continue
      modules[row][6] = row % 2 === 0
    }

    for (let col = 8; col < moduleCount - 8; col += 1) {
      if (modules[6][col] !== null) continue
      modules[6][col] = col % 2 === 0
    }
  }

  const setupPositionAdjustPattern = () => {
    const positions = QRUtil.getPatternPosition(typeNumber)

    for (const row of positions) {
      for (const col of positions) {
        if (modules[row][col] !== null) continue

        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            modules[row + r][col + c] =
              r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)
          }
        }
      }
    }
  }

  const setupTypeNumber = (test: boolean) => {
    const bits = QRUtil.getBCHTypeNumber(typeNumber)

    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1
      modules[Math.floor(i / 3)][(i % 3) + moduleCount - 11] = mod
      modules[(i % 3) + moduleCount - 11][Math.floor(i / 3)] = mod
    }
  }

  const setupTypeInfo = (test: boolean, maskPattern: number) => {
    const data = (internalLevel << 3) | maskPattern
    const bits = QRUtil.getBCHTypeInfo(data)

    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1
      modules[i < 6 ? i : i < 8 ? i + 1 : moduleCount - 15 + i][8] = mod
      modules[8][i < 8 ? moduleCount - i - 1 : i < 9 ? 15 - i : 14 - i] = mod
    }

    modules[moduleCount - 8][8] = !test
  }

  const mapData = (data: number[], maskPattern: number) => {
    let inc = -1
    let row = moduleCount - 1
    let bitIndex = 7
    let byteIndex = 0
    const maskFunction = QRUtil.getMaskFunction(maskPattern)

    for (let col = moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1

      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (modules[row][col - c] !== null) continue

          let dark = false

          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1
          }

          if (maskFunction(row, col - c)) {
            dark = !dark
          }

          modules[row][col - c] = dark
          bitIndex -= 1

          if (bitIndex !== -1) continue

          byteIndex += 1
          bitIndex = 7
        }

        row += inc

        if (row >= 0 && row < moduleCount) continue

        row -= inc
        inc = -inc
        break
      }
    }
  }

  return api
}

const QRUtil = (() => {
  const patternPositionTable = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ]
  const G15 =
    (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0)
  const G18 =
    (1 << 12) |
    (1 << 11) |
    (1 << 10) |
    (1 << 9) |
    (1 << 8) |
    (1 << 5) |
    (1 << 2) |
    (1 << 0)
  const G15Mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1)

  const getBCHDigit = (data: number) => {
    let digit = 0
    let current = data

    while (current !== 0) {
      digit += 1
      current >>>= 1
    }

    return digit
  }

  return {
    getBCHTypeInfo: (data: number) => {
      let value = data << 10

      while (getBCHDigit(value) - getBCHDigit(G15) >= 0) {
        value ^= G15 << (getBCHDigit(value) - getBCHDigit(G15))
      }

      return ((data << 10) | value) ^ G15Mask
    },
    getBCHTypeNumber: (data: number) => {
      let value = data << 12

      while (getBCHDigit(value) - getBCHDigit(G18) >= 0) {
        value ^= G18 << (getBCHDigit(value) - getBCHDigit(G18))
      }

      return (data << 12) | value
    },
    getPatternPosition: (typeNumber: number) => {
      return patternPositionTable[typeNumber - 1] ?? []
    },
    getMaskFunction: (maskPattern: number) => {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i: number, j: number) => (i + j) % 2 === 0
        case QRMaskPattern.PATTERN001:
          return (i: number) => i % 2 === 0
        case QRMaskPattern.PATTERN010:
          return (_i: number, j: number) => j % 3 === 0
        case QRMaskPattern.PATTERN011:
          return (i: number, j: number) => (i + j) % 3 === 0
        case QRMaskPattern.PATTERN100:
          return (i: number, j: number) =>
            (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
        case QRMaskPattern.PATTERN101:
          return (i: number, j: number) => ((i * j) % 2) + ((i * j) % 3) === 0
        case QRMaskPattern.PATTERN110:
          return (i: number, j: number) =>
            (((i * j) % 2) + ((i * j) % 3)) % 2 === 0
        case QRMaskPattern.PATTERN111:
          return (i: number, j: number) =>
            (((i * j) % 3) + ((i + j) % 2)) % 2 === 0
        default:
          throw new Error(`bad maskPattern:${maskPattern}`)
      }
    },
    getErrorCorrectPolynomial: (errorCorrectLength: number) => {
      let result = qrPolynomial([1], 0)

      for (let i = 0; i < errorCorrectLength; i += 1) {
        result = result.multiply(qrPolynomial([1, QRMath.gexp(i)], 0))
      }

      return result
    },
    getLengthInBits: (mode: number, type: number) => {
      if (mode !== QRMode.MODE_8BIT_BYTE || type < 1 || type > 40) {
        throw new Error(`mode: ${mode}; type: ${type}`)
      }

      return type < 10 ? 8 : 16
    },
    getLostPoint: (qrcode: InternalQRCode) => {
      const moduleCount = qrcode.getModuleCount()
      let lostPoint = 0

      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          let sameCount = 0
          const dark = qrcode.isDark(row, col)

          for (let r = -1; r <= 1; r += 1) {
            if (row + r < 0 || row + r >= moduleCount) continue

            for (let c = -1; c <= 1; c += 1) {
              if (col + c < 0 || col + c >= moduleCount || (r === 0 && c === 0))
                continue
              if (dark === qrcode.isDark(row + r, col + c)) sameCount += 1
            }
          }

          if (sameCount > 5) {
            lostPoint += 3 + sameCount - 5
          }
        }
      }

      for (let row = 0; row < moduleCount - 1; row += 1) {
        for (let col = 0; col < moduleCount - 1; col += 1) {
          let count = 0
          if (qrcode.isDark(row, col)) count += 1
          if (qrcode.isDark(row + 1, col)) count += 1
          if (qrcode.isDark(row, col + 1)) count += 1
          if (qrcode.isDark(row + 1, col + 1)) count += 1
          if (count === 0 || count === 4) lostPoint += 3
        }
      }

      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount - 6; col += 1) {
          if (
            qrcode.isDark(row, col) &&
            !qrcode.isDark(row, col + 1) &&
            qrcode.isDark(row, col + 2) &&
            qrcode.isDark(row, col + 3) &&
            qrcode.isDark(row, col + 4) &&
            !qrcode.isDark(row, col + 5) &&
            qrcode.isDark(row, col + 6)
          ) {
            lostPoint += 40
          }
        }
      }

      for (let col = 0; col < moduleCount; col += 1) {
        for (let row = 0; row < moduleCount - 6; row += 1) {
          if (
            qrcode.isDark(row, col) &&
            !qrcode.isDark(row + 1, col) &&
            qrcode.isDark(row + 2, col) &&
            qrcode.isDark(row + 3, col) &&
            qrcode.isDark(row + 4, col) &&
            !qrcode.isDark(row + 5, col) &&
            qrcode.isDark(row + 6, col)
          ) {
            lostPoint += 40
          }
        }
      }

      let darkCount = 0

      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          if (qrcode.isDark(row, col)) darkCount += 1
        }
      }

      const ratio =
        Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5
      return lostPoint + ratio * 10
    },
  }
})()

const QRMath = (() => {
  const expTable = Array<number>(256).fill(0)
  const logTable = Array<number>(256).fill(0)

  for (let i = 0; i < 8; i += 1) {
    expTable[i] = 1 << i
  }

  for (let i = 8; i < 256; i += 1) {
    expTable[i] =
      expTable[i - 4] ^ expTable[i - 5] ^ expTable[i - 6] ^ expTable[i - 8]
  }

  for (let i = 0; i < 255; i += 1) {
    logTable[expTable[i]] = i
  }

  return {
    glog: (n: number) => {
      if (n < 1) {
        throw new Error(`glog(${n})`)
      }

      return logTable[n]
    },
    gexp: (n: number) => {
      let value = n

      while (value < 0) value += 255
      while (value >= 256) value -= 255

      return expTable[value]
    },
  }
})()

const qrPolynomial = (values: number[], shift: number) => {
  type QRPolynomial = {
    getAt: (index: number) => number
    getLength: () => number
    multiply: (other: QRPolynomial) => QRPolynomial
    mod: (other: QRPolynomial) => QRPolynomial
  }

  if (typeof values.length === "undefined") {
    throw new Error(`${values.length}/${shift}`)
  }

  let offset = 0

  while (offset < values.length && values[offset] === 0) {
    offset += 1
  }

  const normalized = Array<number>(values.length - offset + shift).fill(0)

  for (let i = 0; i < values.length - offset; i += 1) {
    normalized[i] = values[i + offset]
  }

  const polynomial: QRPolynomial = {
    getAt: (index: number) => {
      return normalized[index]
    },
    getLength: () => {
      return normalized.length
    },
    multiply: (other: QRPolynomial) => {
      const result = Array<number>(
        normalized.length + other.getLength() - 1,
      ).fill(0)

      for (let i = 0; i < normalized.length; i += 1) {
        for (let j = 0; j < other.getLength(); j += 1) {
          result[i + j] ^= QRMath.gexp(
            QRMath.glog(normalized[i]) + QRMath.glog(other.getAt(j)),
          )
        }
      }

      return qrPolynomial(result, 0)
    },
    mod: (other: QRPolynomial): QRPolynomial => {
      if (normalized.length - other.getLength() < 0) {
        return qrPolynomial(normalized, 0)
      }

      const ratio = QRMath.glog(normalized[0]) - QRMath.glog(other.getAt(0))
      const result = [...normalized]

      for (let i = 0; i < other.getLength(); i += 1) {
        result[i] ^= QRMath.gexp(QRMath.glog(other.getAt(i)) + ratio)
      }

      return qrPolynomial(result, 0).mod(other)
    },
  }

  return polynomial
}

const QRRSBlock = (() => {
  const rsBlockTable = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ]

  const getRsBlockTable = (typeNumber: number, errorCorrectLevel: number) => {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevelMap.L:
        return rsBlockTable[(typeNumber - 1) * 4]
      case QRErrorCorrectLevelMap.M:
        return rsBlockTable[(typeNumber - 1) * 4 + 1]
      case QRErrorCorrectLevelMap.Q:
        return rsBlockTable[(typeNumber - 1) * 4 + 2]
      case QRErrorCorrectLevelMap.H:
        return rsBlockTable[(typeNumber - 1) * 4 + 3]
      default:
        return undefined
    }
  }

  return {
    getRSBlocks: (typeNumber: number, errorCorrectLevel: number) => {
      const rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel)

      if (!rsBlock) {
        throw new Error(
          `bad rs block @ typeNumber:${typeNumber}/errorCorrectLevel:${errorCorrectLevel}`,
        )
      }

      const list: Array<{ totalCount: number; dataCount: number }> = []

      for (let i = 0; i < rsBlock.length / 3; i += 1) {
        const count = rsBlock[i * 3]
        const totalCount = rsBlock[i * 3 + 1]
        const dataCount = rsBlock[i * 3 + 2]

        for (let j = 0; j < count; j += 1) {
          list.push({ totalCount, dataCount })
        }
      }

      return list
    },
  }
})()

const qrBitBuffer = () => {
  const buffer: number[] = []
  let length = 0

  const bufferApi = {
    getBuffer: () => {
      return buffer
    },
    getLengthInBits: () => {
      return length
    },
    put: (value: number, bitLength: number) => {
      for (let i = 0; i < bitLength; i += 1) {
        bufferApi.putBit(((value >>> (bitLength - i - 1)) & 1) === 1)
      }
    },
    putBit: (bit: boolean) => {
      const bufferIndex = Math.floor(length / 8)

      if (buffer.length <= bufferIndex) {
        buffer.push(0)
      }

      if (bit) {
        buffer[bufferIndex] |= 0x80 >>> (length % 8)
      }

      length += 1
    },
  }

  return bufferApi
}

const qr8BitByte = (data: string) => {
  const bytes = Array.from(textEncoder.encode(data))

  return {
    getMode: () => {
      return QRMode.MODE_8BIT_BYTE
    },
    getLength: () => {
      return bytes.length
    },
    write: (buffer: ReturnType<typeof qrBitBuffer>) => {
      for (const byte of bytes) {
        buffer.put(byte, 8)
      }
    },
  }
}

const createBytes = (
  buffer: ReturnType<typeof qrBitBuffer>,
  rsBlocks: ReturnType<typeof QRRSBlock.getRSBlocks>,
) => {
  let offset = 0
  let maxDcCount = 0
  let maxEcCount = 0
  const dcData: number[][] = []
  const ecData: number[][] = []

  for (const block of rsBlocks) {
    const dcCount = block.dataCount
    const ecCount = block.totalCount - dcCount

    maxDcCount = Math.max(maxDcCount, dcCount)
    maxEcCount = Math.max(maxEcCount, ecCount)

    const currentDcData = Array<number>(dcCount).fill(0)

    for (let i = 0; i < dcCount; i += 1) {
      currentDcData[i] = 0xff & buffer.getBuffer()[i + offset]
    }

    offset += dcCount
    dcData.push(currentDcData)

    const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount)
    const rawPoly = qrPolynomial(currentDcData, rsPoly.getLength() - 1)
    const modPoly = rawPoly.mod(rsPoly)
    const currentEcData = Array<number>(rsPoly.getLength() - 1).fill(0)

    for (let i = 0; i < currentEcData.length; i += 1) {
      const modIndex = i + modPoly.getLength() - currentEcData.length
      currentEcData[i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0
    }

    ecData.push(currentEcData)
  }

  const totalCodeCount = rsBlocks.reduce(
    (sum, block) => sum + block.totalCount,
    0,
  )
  const data = Array<number>(totalCodeCount).fill(0)
  let index = 0

  for (let i = 0; i < maxDcCount; i += 1) {
    for (const block of dcData) {
      if (i < block.length) data[index++] = block[i]
    }
  }

  for (let i = 0; i < maxEcCount; i += 1) {
    for (const block of ecData) {
      if (i < block.length) data[index++] = block[i]
    }
  }

  return data
}

const createData = (
  typeNumber: number,
  errorCorrectLevel: number,
  dataList: Array<ReturnType<typeof qr8BitByte>>,
  pad0: number,
  pad1: number,
) => {
  const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel)
  const buffer = qrBitBuffer()

  for (const data of dataList) {
    buffer.put(data.getMode(), 4)
    buffer.put(
      data.getLength(),
      QRUtil.getLengthInBits(data.getMode(), typeNumber),
    )
    data.write(buffer)
  }

  const totalDataCount = rsBlocks.reduce(
    (sum, block) => sum + block.dataCount,
    0,
  )

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error(
      `code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`,
    )
  }

  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
    buffer.put(0, 4)
  }

  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(false)
  }

  while (buffer.getLengthInBits() < totalDataCount * 8) {
    buffer.put(pad0, 8)
    if (buffer.getLengthInBits() >= totalDataCount * 8) break
    buffer.put(pad1, 8)
  }

  return createBytes(buffer, rsBlocks)
}

type RGBAHex = `#${string}`

const GOLDEN_ANGLE = 137.50776405003785

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function toHex2(n: number): string {
  return Math.round(clamp(n, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // h: 0~360, s/l: 0~100
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))

  let r1 = 0,
    g1 = 0,
    b1 = 0
  if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0]
  else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0]
  else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x]
  else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c]
  else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c]
  else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x]

  const m = l - c / 2
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

function hslToHex8(h: number, s: number, l: number, opacity = 0.8): RGBAHex {
  const [r, g, b] = hslToRgb(h, s, l)
  const a = Math.round(clamp(opacity, 0, 1) * 255)
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${toHex2(a)}` as RGBAHex
}

export class SoftDistinctColorGenerator {
  private index = 0
  private readonly opacity: number

  constructor(opacity = 0.8) {
    this.opacity = clamp(opacity, 0, 1)
  }

  next(): RGBAHex {
    const i = this.index++

    // Hue는 황금각으로 넓게 퍼뜨리고,
    // saturation / lightness는 안전한 범위 안에서 조금씩 흔들어
    // 처음 30개 정도가 너무 비슷해지지 않게 한다.
    const hue = (i * GOLDEN_ANGLE + 17) % 360

    const saturationPattern = [58, 64, 54, 68, 60, 62]
    const lightnessPattern = [70, 64, 74, 68, 72]

    const s = saturationPattern[i % saturationPattern.length]
    const l = lightnessPattern[Math.floor(i / saturationPattern.length) % lightnessPattern.length]

    return hslToHex8(hue, s, l, this.opacity)
  }

  at(index: number): RGBAHex {
    const hue = (index * GOLDEN_ANGLE + 17) % 360
    const saturationPattern = [58, 64, 54, 68, 60, 62]
    const lightnessPattern = [70, 64, 74, 68, 72]
    const s = saturationPattern[index % saturationPattern.length]
    const l = lightnessPattern[Math.floor(index / saturationPattern.length) % lightnessPattern.length]
    return hslToHex8(hue, s, l, this.opacity)
  }
}

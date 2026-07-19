import { type LiteBoard } from '../types/Board'
import { type RCRC } from '../types/Rule'
import { type Group, IDX0, V } from '../types/base'

export const Prime2Set = new Set([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97])
export const Prime3Set = new Set([
  113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 311, 313,
  317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 521, 523, 541, 547, 557, 563,
  569, 571, 577, 587, 593, 599, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 811, 821, 823,
  827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997,
])
export const Square2Set = new Set([16, 25, 36, 49, 64, 81])
export const Square3Set = new Set([121, 144, 169, 196, 225, 256, 289, 324, 361, 441, 484, 529, 576, 625, 676, 729, 784, 841, 961])

/** d^2 -> [dr, dc][] */
export const distanceMap: Record<number, readonly [IDX0, IDX0][]> = (function generateDistanceMap() {
  const result: Record<number, Set<string>> = {}

  for (const dr of IDX0) {
    for (const dc of IDX0) {
      // 같은 칸 제외
      if (dr === 0 && dc === 0) continue

      const dist2 = dr * dr + dc * dc

      if (!result[dist2]) {
        result[dist2] = new Set()
      }

      result[dist2].add(`${dr},${dc}`)
    }
  }

  return Object.fromEntries(Object.entries(result).map(([dist, values]) => [Number(dist), [...values].map((v) => v.split(',').map(Number) as [IDX0, IDX0])]))
})()
export const distances = Object.keys(distanceMap)
  .map(Number)
  .toSorted((a, b) => a - b)

export function getLineGroup(type: RCRC, index: number): Group {
  return IDX0.map((i) => (type.substring(0, 3) === 'ROW' ? [index, i] : [i, index])) as Group
}

export type ParsedGroup<B extends LiteBoard> =
  | {
      digits: V[]
      cells: B['flat_cells']
      filled_all: true
    }
  | {
      digits: (V | 0)[]
      cells: B['flat_cells']
      filled_all: false
    }
export function parseGroup<B extends LiteBoard>(board: B, group: Group): ParsedGroup<B> {
  const cells = group.map((pos) => board.getCell(pos))
  const digits = cells.map((cell) => cell.digit)
  const filled_all = digits.every((digit) => digit)

  return {
    digits,
    cells,
    filled_all,
  } as ParsedGroup<B>
}

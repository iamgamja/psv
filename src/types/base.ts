export const V = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export type V = (typeof V)[number]

export const IDX = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export type IDX = (typeof IDX)[number]

/** 0-index version of `IDX` */
export const IDX0 = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
export type IDX0 = (typeof IDX0)[number]

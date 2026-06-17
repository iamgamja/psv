type ObjectEntry<T extends object> = {
  [K in keyof T]-?: [K extends number ? `${K}` : K, T[K]]
}[keyof T];

export function entries<T extends object>(obj: T): ObjectEntry<T>[] {
  return Object.entries(obj) as ObjectEntry<T>[];
}

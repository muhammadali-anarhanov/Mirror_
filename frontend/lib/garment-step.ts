// Next/previous garment in the catalog strip, wrapping around both ends.
export function stepGarment<T extends { id: string }>(list: T[], currentId: string | undefined, dir: 1 | -1): T | null {
  if (!list.length) return null
  const i = list.findIndex(item => item.id === currentId)
  if (i < 0) return list[0]
  return list[(i + dir + list.length) % list.length]
}

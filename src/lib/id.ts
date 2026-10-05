export const uid = (): string => {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

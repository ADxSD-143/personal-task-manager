import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

class ResizeObserverStub {
  observe() {
    return undefined
  }
  unobserve() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

const globalWithResize = window as unknown as { ResizeObserver?: unknown }
if (!globalWithResize.ResizeObserver) {
  globalWithResize.ResizeObserver = ResizeObserverStub
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}

if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:jsdom-mock'
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => undefined
  }
}

// jsdom does not implement File.text(), which browsers support natively.
if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  File.prototype.text = function text(this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
      reader.readAsText(this)
    })
  }
}

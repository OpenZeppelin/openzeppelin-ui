if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    public observe(): void {}
    public unobserve(): void {}
    public disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

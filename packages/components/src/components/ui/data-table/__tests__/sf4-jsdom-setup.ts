/**
 * jsdom does not implement ResizeObserver, and `getBoundingClientRect` /
 * `clientHeight` are 0. TanStack then measures data rows as 0px and returns
 * an empty window (INV-126 / INV-134 still hold: it does not full-mount).
 * These stubs give the scroller a viewport so jsdom can assert window
 * contents; Chromium remains the SC-002 proof.
 */
class ResizeObserverStub implements ResizeObserver {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

const nativeClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const nativeOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
const nativeGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

function virtualizedMaxHeight(element: HTMLElement): number {
  const parsed = parseFloat(element.style.maxHeight);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 384;
}

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    const slot = this.getAttribute?.('data-slot');
    if (slot === 'data-table' && this.style.maxHeight) {
      return virtualizedMaxHeight(this);
    }
    if (slot === 'data-table-row') {
      return 64;
    }
    return nativeClientHeight?.get?.call(this) ?? 0;
  },
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() {
    const slot = this.getAttribute?.('data-slot');
    if (slot === 'data-table' && this.style.maxHeight) {
      return virtualizedMaxHeight(this);
    }
    if (slot === 'data-table-caption') {
      return 24;
    }
    if (slot === 'data-table-head') {
      return 40;
    }
    if (slot === 'data-table-row') {
      return 64;
    }
    return nativeOffsetHeight?.get?.call(this) ?? 0;
  },
});

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const slot = this.getAttribute?.('data-slot');
  if (slot === 'data-table' && this.style.maxHeight) {
    return new DOMRect(0, 0, 800, virtualizedMaxHeight(this));
  }
  if (slot === 'data-table-row') {
    return new DOMRect(0, 0, 800, 64);
  }
  return nativeGetBoundingClientRect.call(this);
};

const nativeScrollTo = HTMLElement.prototype.scrollTo;
HTMLElement.prototype.scrollTo = function scrollTo(
  this: HTMLElement,
  arg?: ScrollToOptions | number,
  y?: number
) {
  if (typeof arg === 'number') {
    this.scrollTop = arg;
    this.scrollLeft = y ?? 0;
  } else if (arg != null) {
    if (arg.top != null) {
      this.scrollTop = arg.top;
    }
    if (arg.left != null) {
      this.scrollLeft = arg.left;
    }
  }
  this.dispatchEvent(new Event('scroll'));
  nativeScrollTo?.call(this, arg as never, y as never);
};

/** INV-126: restore 0-height scroll parent so the no-full-mount path is observable. */
export function withZeroHeightScrollParent(run: () => void): void {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 0;
    },
  });
  HTMLElement.prototype.getBoundingClientRect = function zeroRect() {
    return new DOMRect(0, 0, 0, 0);
  };
  try {
    run();
  } finally {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        const slot = this.getAttribute?.('data-slot');
        if (slot === 'data-table' && this.style.maxHeight) {
          return virtualizedMaxHeight(this);
        }
        if (slot === 'data-table-row') {
          return 64;
        }
        return nativeClientHeight?.get?.call(this) ?? 0;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const slot = this.getAttribute?.('data-slot');
      if (slot === 'data-table' && this.style.maxHeight) {
        return new DOMRect(0, 0, 800, virtualizedMaxHeight(this));
      }
      if (slot === 'data-table-row') {
        return new DOMRect(0, 0, 800, 64);
      }
      return nativeGetBoundingClientRect.call(this);
    };
  }
}

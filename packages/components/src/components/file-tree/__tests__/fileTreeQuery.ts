/**
 * Shadow-root query helpers. A missing Pierre host, shadow root, or row must
 * throw with a named message so a failed mount cannot look like a pass.
 */

/**
 *
 */
export function requireFileTreeHost(container: ParentNode): HTMLElement {
  const host = container.querySelector('file-tree-container');
  if (!(host instanceof HTMLElement)) {
    throw new Error('Pierre host <file-tree-container> did not mount');
  }
  return host;
}

/**
 *
 */
export function requireShadowRoot(host: HTMLElement): ShadowRoot {
  const root = host.shadowRoot;
  if (root == null) {
    throw new Error('Pierre host has no shadow root');
  }
  return root;
}

/**
 *
 */
export function requireRow(root: ParentNode, path: string): HTMLElement {
  const row = root.querySelector(`[data-item-path="${path}"]`);
  if (!(row instanceof HTMLElement)) {
    throw new Error(`No tree row for path ${path}`);
  }
  return row;
}

/**
 *
 */
export function requireTree(root: ParentNode): HTMLElement {
  const tree = root.querySelector('[role="tree"]');
  if (!(tree instanceof HTMLElement)) {
    throw new Error('INV-18 violated: Pierre must expose role="tree"');
  }
  return tree;
}

/**
 *
 */
export function requireNamedTreeHost(container: ParentNode): HTMLElement {
  const host = requireFileTreeHost(container);
  const label = host.getAttribute('aria-label') ?? host.getAttribute('aria-labelledby');
  if (label == null || label.trim().length === 0) {
    throw new Error('INV-18 violated: file-tree-container must carry the accessible name');
  }
  return host;
}

/**
 *
 */
export function visibleTreeItems(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll('[role="treeitem"]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
}

/**
 *
 */
export function activeDescendantId(root: ParentNode): string | null {
  const controller = root.querySelector('[aria-activedescendant]');
  return controller?.getAttribute('aria-activedescendant') ?? null;
}

import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/** Distance from the input's border to an adornment slot. Matches the input's `px-3`. */
const ADORNMENT_INSET_PX = 12;
/** Space between an adornment slot and the text. Matches `gap-2`. */
const ADORNMENT_GAP_PX = 8;

const ADORNMENT_SLOT_CLASSES =
  'pointer-events-none absolute inset-y-0 flex items-center text-sm text-muted-foreground';

/**
 * Props for Input. Every native input attribute goes to the `<input>` element.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Content drawn inside the input's border, before the text: an icon or short
   * text such as a currency sign. The text is padded clear of it by the slot's
   * measured width. `null`, `undefined`, `false`, `true` and `''` render no slot
   * and reserve no padding.
   *
   * The slot ignores the pointer, so a click on it reaches the input. A control
   * placed here (a button) needs `pointer-events-auto` on itself. The slot sets
   * no ARIA: mark a decorative icon `aria-hidden`; to have text announced, give
   * it an id and add that id to the input's `aria-describedby`.
   */
  startAdornment?: React.ReactNode;
  /** The same as `startAdornment`, after the text (a unit, a symbol). */
  endAdornment?: React.ReactNode;
}

/** True when React draws something for `node`. `0` counts; `''` and booleans don't. */
function isRenderable(node: React.ReactNode): boolean {
  return node !== null && node !== undefined && typeof node !== 'boolean' && node !== '';
}

/**
 * The layout width of the element behind `ref` while `active`, kept current with
 * a ResizeObserver. Returns 0 while inactive, and then reads no layout and
 * attaches no observer. Without ResizeObserver it measures once.
 */
function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>, active: boolean): number {
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) {
      setWidth(0);
      return;
    }
    // The slot is absolutely positioned and sized by its content only, so the
    // padding written from this value can't change it: no resize loop.
    const measure = () => setWidth(el.offsetWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active]);

  return width;
}

/** Padding that keeps the text clear of a slot `slotWidth` px wide. */
function adornedPadding(slotWidth: number): number {
  return ADORNMENT_INSET_PX + slotWidth + ADORNMENT_GAP_PX;
}

/**
 * Input component that follows shadcn/ui styling and accessibility patterns.
 *
 * Read-only look: pass `readOnly` together with `data-readonly` (`<Input readOnly data-readonly />`)
 * for the kit's focusable read-only style (muted fill, full-contrast text). A plain
 * `<Input readOnly>` keeps the editable look.
 *
 * Adornments: with `startAdornment` or `endAdornment`, the input sits in a
 * `relative w-full` wrapper and each slot is measured, so the text never runs
 * under it. The measured padding overrides padding classes and `style` padding
 * on that side. Size an adorned input through its parent: width classes in
 * `className` size the `<input>` alone, and the end slot stays at the wrapper's
 * edge. Keep an adornment's presence stable while the input lives: switching
 * between no adornment and some adornment remounts the `<input>`, which drops
 * focus and an uncontrolled value. Changing an adornment's content, or moving it
 * between start and end, is safe.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, ...props }, ref) => {
    const hasStart = isRenderable(startAdornment);
    const hasEnd = isRenderable(endAdornment);

    // Called on every render, adorned or not, so the hook order never changes.
    const startRef = React.useRef<HTMLSpanElement>(null);
    const endRef = React.useRef<HTMLSpanElement>(null);
    const startWidth = useMeasuredWidth(startRef, hasStart);
    const endWidth = useMeasuredWidth(endRef, hasEnd);

    const inputClassName = cn(
      'border-input bg-background ring-offset-background focus-visible:ring-ring placeholder:text-muted-foreground h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      // The read-only look, only on `[data-readonly]:read-only:not(:disabled)`.
      // Leaves the border, the error styling and the focus ring alone.
      'data-readonly:read-only:not-disabled:bg-muted data-readonly:read-only:not-disabled:text-foreground data-readonly:read-only:not-disabled:opacity-100 data-readonly:read-only:not-disabled:cursor-default',
      className
    );

    // No adornment: the plain <input>, attribute for attribute as before the
    // slots existed. `style` stays inside the spread so attribute order is kept.
    if (!hasStart && !hasEnd) {
      return (
        <input type={type} data-slot="input" className={inputClassName} ref={ref} {...props} />
      );
    }

    // A side reserves padding only once its slot has a width; until then the
    // class or caller padding applies. The measured keys come last so they win.
    const adornedStyle: React.CSSProperties = {
      ...props.style,
      // Logical sides, so `start` follows the text direction (the right side in RTL).
      ...(hasStart && startWidth > 0 ? { paddingInlineStart: adornedPadding(startWidth) } : {}),
      ...(hasEnd && endWidth > 0 ? { paddingInlineEnd: adornedPadding(endWidth) } : {}),
    };
    const slotClassName = (side: string) =>
      cn(ADORNMENT_SLOT_CLASSES, side, props.disabled === true && 'opacity-50');

    return (
      // `flex` keeps the wrapper exactly as tall as the input: an inline-block
      // input in a block wrapper leaves line-box slack below it.
      <div data-slot="input-wrapper" className="relative flex w-full">
        {hasStart && (
          <span
            ref={startRef}
            data-slot="input-start-adornment"
            className={slotClassName('start-3')}
          >
            {startAdornment}
          </span>
        )}
        <input
          type={type}
          data-slot="input"
          className={inputClassName}
          ref={ref}
          {...props}
          style={adornedStyle}
        />
        {hasEnd && (
          <span ref={endRef} data-slot="input-end-adornment" className={slotClassName('end-3')}>
            {endAdornment}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

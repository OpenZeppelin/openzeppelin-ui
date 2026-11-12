---
'@openzeppelin/ui-components': patch
---

`AmountField`: the default mode now formats on blur and on the arrow keys without floating-point math.

Behaviour change: in the default mode (`formatOnBlur` omitted or `true`), the text and the form value keep every digit the user typed.

- Rounding: the text is padded, or rounded half away from zero, to `decimals`. `0.1` at 18 decimals gives `0.100000000000000000` (was `0.100000000000000006`), `1.005` at 2 decimals gives `1.01` (was `1.00`), and integers past 2^53 are no longer altered or put in exponent form. A zero result never has a minus sign (`-0.001` at 2 decimals gives `0.00`).
- Stepping: arrow-key steps are exact too. `0.1` plus a `step` of `0.01` at 18 decimals gives `0.110000000000000000`.
- Values written from outside the field: text that is not a plain decimal, such as `1,000`, `12abc`, `1e3` or ` 1.5` (with surrounding spaces), is no longer rewritten on blur or stepped by the arrow keys. Blur also leaves a number that does not display as a plain decimal alone, so `1e21` is no longer rewritten to the string `1e+21`. The arrow keys step such a number exactly: `1e21` plus a `step` of `0.01` at 2 decimals gives `1000000000000000000000.01`. A `NaN` or `Infinity` value is never stepped (before, it stepped from `0`). Existing validation still runs on these values as before.
- Unusable props: an arrow key with a `step` that is `NaN` or infinite now writes nothing, and a `min` or `max` that is `NaN` or infinite is ignored instead of writing `NaN`. A `decimals` value that is not a whole number from 0 to 100 now leaves the text unformatted instead of formatting to a coerced number of decimals or throwing, and the field is still marked as touched on blur.
- Renderer forms show the exact text but still convert the value to a number when submitted.

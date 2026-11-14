# @openzeppelin/ui-components

## 3.14.0

### Minor Changes

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `AddressDisplay`: new optional `copyLabel` and `copiedLabel` set the copy button's accessible name before and after a copy, so the same component can copy a transaction hash or sit next to other copy buttons in one row. Defaults stay `Copy address` and `Copied`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `AddressField`: new optional `inputEnd` renders an element inside the end of the input, such as a paste or address-book button. The input reserves end padding equal to the element's width, so typed text never runs under it. It is separate from `announcerEndSlot`, which sits below the input. Without `inputEnd` the field renders as before.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `AmountField`: opt-in exact-entry mode for money values. With `formatOnBlur={false}` the typed text is never rewritten, and what the user types reaches the form as a decimal `string` that never passes through a float. A `number` or `bigint` from `defaultValues`, `reset` or `setValue` is shown exactly but is not converted on mount: it stays a `number` or `bigint` until the user edits the field, so seed the form with strings. Add `allowGrouping` to accept `,` thousands separators; the form value has them removed. Too many decimals (`decimals`), out-of-range values (`min` / `max`, which also accept strings for bounds beyond float precision) and malformed text are validation errors that block submit. Nothing is rounded. In this mode a `validateAmount` that returns `false` fails with "Enter a valid amount"; in the default mode `false` still passes, so return a message instead. Add `groupedDisplay` (with `allowGrouping`) to show the value with thousands separators while the field is not focused (`250,000.00`) and plain while it is being edited (`250000.00`); the separators are display only and the form value stays plain. With `groupedDisplay`, a correctly grouped string from `defaultValues`, `reset` or `setValue` is stored without its separators right after it arrives, which marks the form dirty, so seed plain strings to keep the form pristine. A read-only or disabled field stays grouped on focus and is never written, so seed read-only amounts plain. On that same grouped input, add `restrictInput` to refuse keystrokes and pastes that break the amount grammar or go past `decimals` (Backspace, Delete and clearing a selection still always apply), and add `padDecimals` to pad the unfocused grouped display to `decimals` places (`123000` shows `123,000.00` when decimals are 2) while focused editable text stays unpadded plain. Both are off by default. In exact-entry mode, `validation.messages` can replace the malformed-text (`format`), too-many-decimals (`decimals`), below-`min` (`min`) and above-`max` (`max`) texts; `min` and `max` follow the field's `min` / `max` props, not `validation.min` / `validation.max`. A misconfigured `decimals`, `min` or `max` still shows "Amount limit is misconfigured". Convert at submit with `parseUnits(value, tokenDecimals)`. The default mode also changes in this release: it now formats on blur and on the arrow keys exactly. New exported type: `AmountFieldExactProps`. `AmountField` now takes `AmountFieldProps | AmountFieldExactProps`, so a type derived with `ComponentProps<typeof AmountField>` sees `min` / `max` as `number | string`.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `Badge`: new optional `disabled` for an interactive badge (one with `onActivate`). The button gets the native `disabled` attribute, leaves the tab order, never calls `onActivate`, and dims like a disabled `Button`; `aria-pressed` is still exposed on a toggle chip. A static badge ignores it.

  `Badge`: new optional `readOnly` for an interactive badge. The button stays focusable and in full colour, keeps `aria-pressed`, and ignores click, Enter and Space so `onActivate` never fires. Read-only is announced with a visually hidden "Read-only" description referenced by `aria-describedby` (not `aria-readonly` or `aria-disabled`). `disabled` wins when both are set. A static badge ignores it.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `Badge`: new optional `pressed` turns an interactive badge (one with `onActivate`) into a toggle chip. It sets `aria-pressed` and a selected style. On a solid badge the selected style is an inset ring, so it stays distinct from the outer focus ring. A non-interactive badge ignores it.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `Banner`: new optional `role` (`alert`, `status` or `note`) so non-urgent info and status notes are not announced as alerts. The default stays `alert`. New exported type: `BannerRole`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `Breadcrumb`: an ancestor item may omit `href`, and then renders as muted text, like the linked ancestors, instead of a link. Useful for section names that have no page of their own. New exported type: `BreadcrumbAncestorItem`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `DataTable`: two new optional props.
  - `hideHeaderWhenEmpty` hides the column header row while the empty state shows. The table keeps its accessible name, and the header, sort and selection state come back with the rows.
  - `grouping` paints section rows under a single column header. Sorting, selection, pagination and virtualization still work per data row. Grouping is worked out again on every render, so a group key that changes shows straight away: `getGroupKey` runs once per row per render and should be a cheap field read. Section rows have a heavier fill and small semibold muted text, so they read as headings rather than data rows. `grouping.groupRowClassName` adds your classes to every section row, after the default ones, so a `bg-*` class replaces the default fill.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `DescriptionList`: label/value pairs rendered as a semantic description list (each label a term, each value its definition). Values can be any node, including kit components such as `AddressDisplay`. Empty values show a placeholder (`emptyValue`, default `—`) so the pair keeps its place. Values stack under their labels on narrow widths. For review and summary screens, `layout="stacked"` keeps each label above its value at every width, `columns` (`1` through `5`) lays the pairs out in columns on wider screens and falls back to one column on narrow ones, and `valueAlign="end"` aligns values to the end of their row. Side-by-side labels size to their content so long labels are not forced into a fixed third of the row. An item may set `span` to occupy the full row in a multi-column list. `dividers` (default `true`) draws horizontal rules between pairs in a single-column list; set it to `false` to drop those rules. Multi-column lists draw a vertical rule between columns instead.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `EmptyState`: new optional `action` slot under the text, for a retry button or a link. Pass `icon={null}` or `icon={false}` to render no icon and no icon container; before, both showed the default icon. Omitting `icon` still shows the default one. `description` is now optional and nothing renders when it is omitted or empty.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add an optional `labelEnd` slot to the label row of the field family (`TextField`, `TextAreaField`, `NumberField`, `BigIntField`, `AmountField`, `UrlField`, `PasswordField`, `BytesField`, `AddressField`, `DateTimeField`, `SelectField`, `SelectGroupedField`, `SearchableMultiSelectField`, `RadioField` and `BaseField`). Pass an "Optional" chip or a small action such as "Address book" and it renders at the end of the label row. It sits beside the label, not inside it, so the control's accessible name stays the label text and clicking the label still focuses the input. Without `labelEnd` the markup is unchanged, except that `BaseField` no longer renders an empty `<label>` when it has no `label`. When `labelEnd` is set, a small negative vertical margin on the end slot keeps the row at the plain-label height so a chip (for example a Badge) shows in full without pushing the input below a neighbour field. New exported type: `LabelEndProps`.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - Add an optional `showValidState` prop to the fields that show a green success border once touched without an error (`TextField`, `TextAreaField`, `PasswordField`, `UrlField`, `NumberField`, `AmountField`, `BigIntField`, `BooleanField`, `EnumField`, `AddressField`, `BytesField` and `DateTimeField`). Set it to `false` to keep the field neutral instead, so a touched, empty optional field no longer looks "valid". The error border and message still show when a rule fails. Omitted or `true`, fields look as before. `getValidationStateClasses` takes the same option as an optional third argument. New exported type: `ValidStateProps`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Form fields that take `validation` now honour `validation.messages` and `validation.validate`. Without either, every field validates and words its errors as before.
  - A custom message replaces the default text of its rule.
  - The custom check runs last, after required, the built-in rules and the field's own validator such as `validateAmount` or `validateSelection`. The first failure's message shows.
  - The check never runs on an empty value, so an optional field stays optional. It gets the value as the form stores it: the exact string in `AmountField` exact-entry mode, the id list in `SearchableMultiSelectField`.
  - A check that returns anything other than `true` or a non-empty string, or throws, fails with `This field is invalid`.
  - `MapField` also runs the check when it refreshes the map's error after a render. Pass a stable function (defined outside the component or memoised), or an inline `validate` arrow runs again on every re-render while the map is valid.
  - Kit fields set the native `required` attribute, so a form needs `noValidate` for `messages.required` to show instead of the browser's own prompt.

  New exports for custom fields: `getRequiredMessage`, `runCustomCheck`, `getActiveMessages`, `REQUIRED_MESSAGE` and `CUSTOM_CHECK_FALLBACK_MESSAGE`. `validateField` takes an optional third `messages` argument. `getActiveMessages` takes an optional second argument naming the rules a field enforces from its own props.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add an opt-in focusable read-only mode to the text-like fields (`TextField`, `TextAreaField`, `NumberField`, `BigIntField`, `AmountField`, `UrlField`, `PasswordField`, `BytesField`, `AddressField`, `DateTimeField`), to `SelectField` and to `SearchableMultiSelectField`. Pass `readOnly` with `readOnlyMode="readonly"` and the field stays focusable and in the tab order, blocks every edit, and keeps its value in the `handleSubmit` data. Validation still runs. With the default `readOnlyMode="disabled"`, `readOnly` disables a text-like field as before; `AmountField` and `TextAreaField`, which used to stay editable, now do the same. New exported types: `ReadOnlyMode`, `ReadOnlyModeProps`.
  - Text-like fields set the native `readonly` attribute and stay selectable. Escape-clear, arrow stepping, blur reformatting and address suggestions are all blocked.
  - `SelectField` sets `aria-readonly="true"` and a visually hidden "Read-only" description on its trigger. The list does not open on click, tap, Enter, Space or the arrow keys, typing a letter does not change the value, and a list that is open when the field turns read-only closes. Without `readOnlyMode="readonly"`, `SelectField` still ignores `readOnly`.
  - `SearchableMultiSelectField` keeps its trigger focusable, adds a visually hidden "Read-only" description, and does not open its list.
  - `Input`, `Textarea` and `SelectTrigger` get a read-only look (muted fill, full-contrast text). It applies only when `data-readonly` is set (with `readOnly` on `Input` and `Textarea`), so existing `<Input readOnly>` usages look the same and a disabled trigger still looks disabled.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `Input`: new optional `startAdornment` and `endAdornment` render an icon or short text inside the input's border, before or after the text. On that side the input's padding grows to the adornment's width plus the usual 12px inset and an 8px gap, so typed text never runs under it, and a click on the adornment focuses the input. Adornments add no accessible text by themselves: mark a decorative icon `aria-hidden`, or give text an id and list it in the input's `aria-describedby`. Without an adornment the input renders as before.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `NetworkSelector`: new optional `id`, `aria-label` and `aria-labelledby` props, passed to the trigger, so a `<label htmlFor>` or an accessible name can name it. Without them the trigger renders as before.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Rebuild `NetworkSelector` on the searchable select core behind `SearchableMultiSelect`. The list now uses listbox semantics, and focus stays in the search box while the arrow keys move through the networks. Enter picks the highlighted network without submitting an enclosing form. Visible text, accessible names and emitted values are unchanged, and every existing prop works as before. "No network found." now also shows, and is announced, in ungrouped mode, where the list was blank. The popover width now follows the trigger.

  New optional copy props: `searchPlaceholder`, `searchLabel` and `emptyText` in both modes, and `formatSelectedCount`, `formatSelectionSummary` and `clearAllLabel` in multiple mode.

  If your tests query the open list by role, query `listbox` and `option` instead of `menu` and `menuitem`. Menu typeahead is gone: type in the search box instead.

  Visual and DOM changes to check if you style or test the open list:
  - The separators between ecosystem groups, and below the selection row, are gone. Group headers still label each group.
  - In multiple mode the selection row ("2 selected", Clear all) sits between the search box and the list and stays in place while the list scrolls; it used to scroll with the list. With nothing selected the row is an empty band of the same height, so the first pick and Clear all don't move the list under the pointer.
  - Every element in the popover carries a `data-slot` named `network-selector-*` (`network-selector-content`, `-search`, `-listbox`, `-option`, `-empty`, `-summary`, `-clear`), next to the existing `network-selector-trigger`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `NetworkStatusBadge`: new optional `showIcon` and `showEcosystem`, both `true` by default. Set both to `false` for a compact chip that shows only the network name. Optional `size="sm"` tightens padding and the testnet dashed border for dense headers; the default size is unchanged.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `PageHeader` for the top of a content page. It renders a `title` heading (`titleLevel`, default `1`), an optional `titleEnd` slot beside the heading for a status pill or badge, an optional `description` and an optional `actions` area that sits beside the title on wide screens and wraps under it on narrow ones. `titleEnd` sits outside the heading element, so the heading's accessible name stays the title alone. `description` is rendered in a `div`, so it can hold block content such as paragraphs or lists. Empty `titleEnd`, `description` and `actions` render nothing. It is separate from the app bar (`Header`) and card headers. It renders a `<header>` element, so place it inside `<main>`: outside it, it becomes a second banner landmark next to the app bar. New exported types: `PageHeaderProps`, `PageHeaderTitleLevel`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `RadioField`: options accept an optional `description`, shown under the option label and used as the radio's accessible description (the label alone is its name). A new `variant="card"` renders them as selectable cards (the `RadioGroup` card variant). With `layout="horizontal"`, cards sit side by side in equal-width columns and stack as the container narrows.

  A new `variant="segmented"` renders the options as a segmented control (the `RadioGroup` segmented variant), for two or three short options. It shows each option's `label`; descriptions are not shown.

  `RadioField` also accepts `readOnlyMode="readonly"`. With `readOnly` set as well, in every variant, the options stay focusable and in full colour, no click or key changes the value, the value is still submitted, and the field is announced as read-only. Without `readOnlyMode="readonly"`, `readOnly` is ignored as before.

  Validation, required state and the submitted value are the same for every variant. The card and segmented variants render no native `required` input, so an empty submit always shows the field's own required message, with or without `noValidate` on the form. Existing options render as before.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `RadioGroup`: two new variants. Radio semantics and keyboard behaviour are the same as the default circle presentation, which is unchanged.
  - `variant="card"` shows each `RadioGroupItem` as a selectable card with a `title` and a supporting `description`. The title is the item's accessible name and the description its accessible description. In the dark theme, unchecked card borders and the radio ring meet WCAG AA non-text contrast. The title sits level with the radio, and a title can hold a chip such as a `Badge` without making its card taller; a long title wraps and the radio stays level with its first line.
  - `variant="segmented"` renders a single-row segmented control for two or three short options, such as Automatic / Manual. Each item's children are its label. Segments share the width equally and truncate rather than wrap.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `SearchableMultiSelectField`, a React Hook Form field for `SearchableMultiSelect`. The form value is the selected item ids (`string[]`) in pick order. It has the kit field label, helper text, required rule and error display, plus an optional `validateSelection` rule. The form ref sits on the trigger, so focus-on-first-error lands there. Opening the picker does not mark the field touched.

  `readOnly` works as in the other fields. By default it disables the field and leaves its value out of the `handleSubmit` data. With `readOnlyMode="readonly"` the trigger stays focusable, the list does not open, validation still runs, and the value stays in the submitted data.

  The field passes `showSelected`, `formatRemoveLabel`, `formatRemovedAnnouncement` and `chipClassName` through. Removing a chip changes the form value the same way unpicking does, and in either read-only mode the chips have no remove buttons.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `SearchableMultiSelect`, a searchable multi-select for any item type. You supply item id and label accessors, an optional filter and controlled `selectedIds`. Every user-facing string can be overridden: placeholder, search placeholder and label, empty text, selected-count and summary text, and Clear all. The selected-count and summary formatters get `(count, total, selectedItems)`: `selectedItems` holds the selected items in selection order, once each, so the closed trigger can name the picks (for example "France, Spain and 3 more"). Ids that match no item are counted in `count` but have no entry in `selectedItems`. The trigger is a button that opens a dialog. Inside it, the search box is a combobox driving a multiselectable listbox through `aria-activedescendant`, so focus stays in the search box while the arrow keys move through the list. Enter toggles the highlighted item without submitting an enclosing form. New picks are appended to the emitted id list and deselected ids are removed in place. The trigger accepts `ref`, `id`, `disabled`, `readOnly`, `onBlur` and the usual `aria-*` attributes for use in form fields, and `onOpenChange` reports when the list opens and closes. In the dark theme, unselected checkbox borders and the highlighted option meet WCAG AA non-text contrast.
  - Naming: `aria-labelledby` or `aria-label` names the trigger, the dialog and the listbox. The trigger reads the label followed by its own text, for example "Countries 2 selected". Without either, the trigger is named by its text and the dialog and listbox by the placeholder.
  - `aria-required`: a button cannot carry it, so the trigger gets a hidden "Required" text in its description instead.
  - Selection row: the row with the summary text and Clear all sits between the search box and the list. With nothing selected it is an empty band of the same height, so the first pick and Clear all don't move the list under the pointer.
  - `readOnly`: the trigger stays enabled and focusable, the dialog does not open (an open one closes), and the trigger gets the kit's read-only look and a hidden "Read-only" text in its description.
  - Chips: `showSelected="chips"` also lists the picks as chips below the trigger, in selection order, each with a remove button. The default, `'count'`, shows only the trigger text, as before. Removing a chip emits the selection without that id, the same way unpicking it in the list does, and doesn't open the list. Once the removal is applied, focus moves to the next chip, else the previous one, else the trigger, and a polite status message announces it. Read-only and disabled show the chips without remove buttons. Chips wrap in a narrow field, and a long label is truncated on screen but stays complete for screen readers. `formatRemoveLabel` and `formatRemovedAnnouncement` override the "Remove {label}" button name and the "{label} removed" announcement. Each chip uses a bordered background fill so it stays visible on muted surfaces, with a full-contrast remove icon; optional `chipClassName` merges onto each chip after that chrome so a consumer can override the edge.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `SidebarButton`: new optional `trailing` slot at the end of the row, after the badge, for a status dot or a small chip. It adds to the accessible name only through its own text or label. The selected, enabled item now carries `aria-current="page"` on its button or link, so screen readers announce the current page.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `Skeleton`: a placeholder block for loading content, with `text`, `rect` and `circle` shape presets sized through `className`/`style`. It pulses, stops pulsing when the user prefers reduced motion, and is hidden from assistive tech so loading is announced once by the consumer's own status.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Export `Spinner`, the loading spinner `LoadingButton` uses. It takes its colour from `currentColor` and its size from `className`. Pass `label` and the spinner is wrapped in a `role="status"` element named by the label, with the label as visually hidden text so screen readers have something to read; without `label` it is decorative and hidden from assistive tech. `LoadingButton` now renders this `Spinner`, so its spinner is hidden from assistive tech too.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `StepMarker`: the numbered step circle the wizard stepper draws, now exported for numbered rows in tables and review lists. It takes a `state` (`completed`, `current`, `visited`, `invalid`, `upcoming`) and a one-based `number`. `WizardStepper` renders it, with no change to its output.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `Switch`, a toggle built on Radix Switch and themed like `Checkbox`. It exposes `role="switch"` with `aria-checked`, toggles on click and Space, and ignores input when `disabled`. Name it with a `<Label htmlFor>` or `aria-label`. Pass `readOnly` to keep it focusable and in full colour, report `aria-readonly="true"`, and ignore click, Space and Enter; its value still submits with a form, and a `required` read-only switch never blocks submission. `disabled` wins when both are set. Adds the `@radix-ui/react-switch` dependency.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Add `Timeline`: ordered steps with a tone each (`pending`, `active`, `success`, `warning`, `failure`) for deploy or job progress. Use `warning` for a step that is paused or stopped without failing. Tone is shown by an icon and exposed as status text, not colour alone. `statusLabel` replaces the default status text, and an empty `statusLabel` renders none. The list is an `ol` and the active step is marked `aria-current="step"`. Updating one item's tone does not remount the others when items carry stable keys.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `WizardNavigation`: new optional `previousLabel`, `previousDisabled`, `primaryLoading`, `primaryIcon` and `primaryIconPosition` (`'start'` puts the icon before the label, `'end'` is the default). The paged `WizardLayout` variants accept them too. An empty `previousLabel` leaves Back icon-only, and screen readers still announce it as "Previous". A loading primary button shows the kit spinner, sets `aria-busy` and ignores clicks while keeping focus. A disabled Back button uses `aria-disabled` and stays focusable. The navigation handlers (`onPrevious`, `onNext`, `onCancel`, `onLastStepSecondary`) now receive the click event, so you can restore focus after an async step. Existing zero-argument handlers still compile, and without the new props the navigation renders as before. `WizardLayout` passes the click event as an extra trailing argument to `onStepChange` (Next and Previous only; it is `undefined` for stepper clicks and scroll tracking), `onLastStepPrimary` and `onComplete`.

  Behaviour change: in the paged `WizardLayout` variants, `onStepChange`, `onLastStepPrimary` and `onComplete` now receive the click event as an extra argument. A handler with its own optional parameter in that position (for example `onComplete={(force?: boolean) => …}` or `onStepChange={(index, options?) => …}`) now gets the event there and needs updating, as does a test spy that asserts exact arguments, such as `expect(onStepChange).toHaveBeenCalledWith(1)`.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `WizardStepper`: every step button, horizontal and vertical, is now named `Step N: Title, <state>`, where the state is completed, visited, invalid, upcoming or skipped. The current step is named `Step N: Title` and keeps `aria-current="step"`, so screen readers say "current" once. Screen reader users hear where they are without relying on colour. The new optional `getStepLabel`, also accepted by `WizardLayout`, lets you supply your own names, for example to localise them.

  If your tests find step buttons by their exact name, update them: vertical steps used to be named by their content and horizontal steps `Step N: Title`. Match the new names, use a regular expression such as `{ name: /^Step 2: Details/ }`, or pass `getStepLabel` to keep names of your own.

### Patch Changes

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `AmountField`: the default mode now formats on blur and on the arrow keys without floating-point math.

  Behaviour change: in the default mode (`formatOnBlur` omitted or `true`), the text and the form value keep every digit the user typed.
  - Rounding: the text is padded, or rounded half away from zero, to `decimals`. `0.1` at 18 decimals gives `0.100000000000000000` (was `0.100000000000000006`), `1.005` at 2 decimals gives `1.01` (was `1.00`), and integers past 2^53 are no longer altered or put in exponent form. A zero result never has a minus sign (`-0.001` at 2 decimals gives `0.00`).
  - Stepping: arrow-key steps are exact too. `0.1` plus a `step` of `0.01` at 18 decimals gives `0.110000000000000000`.
  - Values written from outside the field: text that is not a plain decimal, such as `1,000`, `12abc`, `1e3` or ` 1.5` (with surrounding spaces), is no longer rewritten on blur or stepped by the arrow keys. Blur also leaves a number that does not display as a plain decimal alone, so `1e21` is no longer rewritten to the string `1e+21`. The arrow keys step such a number exactly: `1e21` plus a `step` of `0.01` at 2 decimals gives `1000000000000000000000.01`. A `NaN` or `Infinity` value is never stepped (before, it stepped from `0`). Existing validation still runs on these values as before.
  - Unusable props: an arrow key with a `step` that is `NaN` or infinite now writes nothing, and a `min` or `max` that is `NaN` or infinite is ignored instead of writing `NaN`. A `decimals` value that is not a whole number from 0 to 100 now leaves the text unformatted instead of formatting to a coerced number of decimals or throwing, and the field is still marked as touched on blur.
  - Renderer forms show the exact text but still convert the value to a number when submitted.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `AmountField`: the `symbol` now sits in the input's adornment slot, so the text is padded to fit the symbol instead of a fixed 32px and a long value never runs under it. This holds in default mode, exact-entry mode and with `groupedDisplay`. Fields without a `symbol` render as before.

  Behaviour change: the symbol uses the theme's muted text colour (`text-muted-foreground`, which meets 4.5:1 contrast in light and dark) instead of `text-gray-500`, at the input's text size, and dims with the input on a disabled field. It is rendered as `<span id="{id}-symbol">`, and that id is now listed first in the input's `aria-describedby`, so screen readers announce the symbol with the value. CSS or tests that targeted the old `span.text-gray-500` next to the input should target `#{id}-symbol` instead. Switching `symbol` between empty and non-empty remounts the input, so a focused field loses focus; the value is kept.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `AmountField` and `TextAreaField`: with `readOnly` and no `readOnlyMode` (or `readOnlyMode="disabled"`), the field is now disabled, like the other text fields.

  Behaviour change: a read-only `AmountField` or `TextAreaField` can no longer be focused or typed into, and its value is left out of the `handleSubmit` data. Before, `AmountField` ignored `readOnly`, so the field stayed editable and its value was submitted. `TextAreaField` stayed editable too, but anything typed was already left out of the submitted data. Use `readOnlyMode="readonly"` for a focusable read-only field that keeps its value. In forms built by the renderer, a read-only `amount` field is now disabled and its value leaves the submitted data, as read-only `text` and `number` fields already do. Fields marked `isHardcoded` keep working: adapters take their value from `hardcodedValue`, not from the submitted data.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `ArrayField` and `ArrayObjectField` show the field array's actual error message, such as `At least one item is required` or the `minItems` text. They used to always show `This field is invalid`.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `CodeEditorField` and `EnumField`: they now pass the form's ref to their control (the code editor, the variant select, and the JSON fallback input), so a failed submit focuses the first invalid one. Behaviour change: focus now moves to an invalid `CodeEditorField` or `EnumField` on submit instead of staying on the submit button.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `AddressDisplay` chip, `Banner` colour variants, and `SidebarLayout` / `SidebarSection` defaults now use theme tokens so they stay readable in dark mode. Behaviour change: the AddressDisplay chip fill and text follow muted/foreground tokens instead of fixed slate greys; Banner info, success, warning and error surfaces use dark-aware container, border and text colours; SidebarLayout's default background is `bg-sidebar` (including the mobile slide-over), and SidebarSection titles use `text-muted-foreground` instead of a fixed mid-grey. Light mode shifts slightly for the AddressDisplay chip and sidebar section titles. Neutral Banner and a consumer-supplied `background` / `titleClassName` are unchanged in meaning.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - Dark mode: `dark:` classes now apply, and destructive and success text meet WCAG AA contrast. Before, the dark variant in `global.css` never matched, so no `dark:` class took effect.

  Behaviour change: in dark mode, `dark:` utilities now apply on an element with the `dark` class and on everything inside it. This includes the `dark:` classes in your own app if its Tailwind build imports `@openzeppelin/ui-styles/global.css`.
  - Kit components now show their dark styles. `NetworkServiceErrorBanner` has a dark red surface with lighter text and icon instead of a light pink box, the `destructive` and `success` `Alert` borders and the `Progress` track use their dark colours, and invalid `Checkbox`, `Switch` and `Textarea` fields show a stronger red focus ring.
  - `--destructive` is a lighter red in dark (`oklch(0.704 0.191 22.216)`), so destructive text, error messages, required-field asterisks, invalid input borders and destructive `Alert` borders are bright red and readable. This includes your own elements that use this colour. If your own components put white text on `bg-destructive`, add `dark:bg-red-900` (and `dark:hover:bg-red-900/90` for a hover fill) to keep their contrast in dark.
  - The success `Alert` uses a lighter green for its text and icon in dark.
  - The destructive `Button` and the solid danger `Badge` keep their dark red fill. The `NetworkServiceErrorBanner` settings button keeps the same red fill in both themes.
  - If you pass a `className` that sets something the component also sets with a `dark:` class, the component's dark value now wins in dark mode. Examples: a border colour on a `destructive` `Alert`, the background of a destructive `Button` or solid danger `Badge`, or the text colour of a success `Alert`. Add a matching `dark:` class to your override.
  - Upgrade `@openzeppelin/ui-styles` and `@openzeppelin/ui-components` together. With `@openzeppelin/ui-components` 3.13.0 and earlier, the destructive `Button`, the solid danger `Badge` and the `NetworkServiceErrorBanner` settings button turn a lighter red in dark mode, and their white text falls below WCAG AA contrast.

  Light mode is unchanged.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `EcosystemDropdown`: the menu now matches its trigger's width, as intended, and still keeps its 200px minimum. Before, the width class did not apply, so the menu only ever used the minimum.

  Behaviour change: when the trigger is wider than 200px, the menu is now as wide as the trigger instead of 200px.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Form fields no longer render an empty or whitespace-only `aria-describedby`. The attribute is omitted unless a helper text or error element exists. When both exist, `aria-describedby` now lists the error before the helper text (it used to list the helper first), so screen readers read the error first. `RadioField` now points `aria-describedby` at its real helper text and error elements; before, it referenced ids that were never rendered.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - The light theme now meets WCAG AA contrast for focus rings, muted text, and unchecked checkbox and radio borders.

  Behaviour change: in the light theme, `--ring` and `--muted-foreground` are a darker grey (`oklch(0.53 0 0)`), so focus rings and muted text such as descriptions, helper text and placeholders look darker. This includes your own elements that use these colours. An unchecked `Checkbox` or `RadioGroupItem` (default and card) now draws its border in the muted foreground colour: darker in light, and for `Checkbox` and the default `RadioGroupItem`, lighter in dark. A focused `Checkbox` shows a solid focus ring instead of a faint one. Text inputs, selects, textareas and buttons keep their current borders. Dark theme token values are unchanged.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `LoadingButton` keeps keyboard focus while loading. Before, a focused button lost focus to the page when `loading` turned on, because loading made it natively disabled.

  Behaviour change: while `loading`, the button is no longer natively `disabled`. It stays focusable, sets `aria-disabled="true"` and `aria-busy="true"`, and ignores clicks, Enter, Space and implicit form submission: `onClick` is not called and the click's default action, such as submitting the form, is cancelled. Other handlers, such as `onKeyDown`, still run. A button with `disabled` is still natively disabled, with or without `loading`. Because a loading button is not `:disabled`, `disabled:` classes you pass in `className`, and your own `:disabled` CSS, no longer apply while loading, and the variant's `hover:` fill still shows. With `asChild`, an `onClick` on the child element still runs while loading, because it runs before the guard: pass `onClick` to `LoadingButton` instead. Code that finds a loading button with `:disabled` or `toBeDisabled()` should check `[aria-busy="true"]` or `aria-disabled` instead. Playwright treats `aria-disabled="true"` as not clickable, so a test that clicks a loading `LoadingButton` needs `{ force: true }`.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - `MapField` now notices validation errors on an entry's key or value and shows the map's required message for them. They used to go unnoticed, so the map showed no error while a row was invalid. A `MapField` with a dotted `name`, such as a map inside a struct in a renderer form, no longer re-renders without end when it shows an error. Behaviour change: a required map whose key or value has an error now shows its required text.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `NetworkStatusBadge`: the `network` prop also accepts an object with only `ecosystem`, `name`, `type` and the optional `iconComponent`, so an app whose network object has no RPC URL can pass it. A full `NetworkConfig`, as a variable or an inline object, compiles as before.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `RadioField` now names its radio group after the field label, in both variants, so screen readers announce the question before the options. It also passes the React Hook Form ref to a radio: the checked one, or the first enabled one when none is checked. Submitting a form whose first invalid field is a radio field focuses it, and `setFocus(name)` works for it.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - Raise the Radix dialog, dropdown menu, select, tooltip and toast ranges to the release train of `@radix-ui/react-popover` 1.1.19, so a popover or searchable multi-select opened inside a Dialog keeps focus, closes on its own Escape, and leaves the page interactive after closing. If your lockfile holds older Radix versions, update them together (`pnpm update "@radix-ui/*"`) so they share one copy of the layering internals.

  `SelectField` and `SelectGroupedField` now always pass a value to the Radix Select root (`''` when the form value is empty), so the newer select no longer logs "Select is changing from uncontrolled to controlled" on the first pick in an empty field. When the form value is reset to empty after a pick, the trigger now shows the placeholder instead of the previously picked label.

- [#261](https://github.com/OpenZeppelin/openzeppelin-ui/pull/261) [`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832) Thanks [@pasevin](https://github.com/pasevin)! - `SelectField` and `SelectGroupedField` now pass the React Hook Form ref to their trigger. Submitting a form whose first invalid field is a select focuses that select, and `setFocus(name)` works for it.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `SidebarButton`: a string badge no longer wraps onto a second line. Behaviour change: the badge stays on one line (`shrink-0 whitespace-nowrap`) while a long label truncates first; a badge wider than the sidebar may overflow rather than wrap.

- [#264](https://github.com/OpenZeppelin/openzeppelin-ui/pull/264) [`5416c2a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5416c2af8712f11d6de468d5b9e546f5821c43fe) Thanks [@pasevin](https://github.com/pasevin)! - `SidebarButton`: a long string label now truncates on one line instead of wrapping, so the badge and `trailing` slot stay at the end of the row. Behaviour change: the row no longer wraps its content onto a second line. A non-string label shrinks but is not truncated for you.
- Updated dependencies [[`fbb883f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fbb883f175f6867e4ef745d956e3eaa1ef0d4832)]:
  - @openzeppelin/ui-types@3.6.0

## 3.13.0

### Minor Changes

- [#242](https://github.com/OpenZeppelin/openzeppelin-ui/pull/242) [`a55b8dc`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/a55b8dcde30a9e02b5da5368925b34cc0da81612) Thanks [@pasevin](https://github.com/pasevin)! - Extend `Badge` with additive composition for Role Manager–parity chips: `variant="solid"` (opaque semantic fills on the existing `BadgeTone` set), `onActivate` (renders a native `<button type="button">`; omitted host stays a non-interactive `<span>`), `forwardRef` plus rest-prop spreading so overlay triggers can wrap the chip with `asChild`, and optional `iconLabel` (visually hidden name; the graphic stays `aria-hidden`). Filled and outline stay the tinted/outlined defaults. There is no `Badge asChild`, polymorphic `as`, children label, or size prop.

## 3.12.0

### Minor Changes

- [#239](https://github.com/OpenZeppelin/openzeppelin-ui/pull/239) [`77b17f3`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/77b17f375e064f0747615aea27e0b310af98f3c1) Thanks [@pasevin](https://github.com/pasevin)! - Add `DataTable` on the main `@openzeppelin/ui-components` entry: column-as-data (`DataTableColumn`, `DataTableAlign`, `DataTableSortValue`), an accessible native `<table>` (`DataTableProps`, `DataTableName`) with Role Manager–family default chrome (rounded bordered card, muted header band, compact cells, row hover) and a sticky header by default (`stickyHeader`, opt out with `false`; header-cell tokens `sticky top-0 z-20` plus opaque `color-mix` of `--muted` 50% over `--card`; no-op on unbounded tables; not a virtualization option). A `caption` is visually hidden (`sr-only`) by default; show it with `captionClassName="not-sr-only"` or prefer `aria-labelledby`. Sorting (`DataTableSortState`, `DataTableSortDirection`) plus optional table-wide `formatSortButtonName` (`DataTableSortButtonNameInfo`: `{ columnName, direction: 'asc' | 'desc' | 'none' }`; omitted English `Sort by {name}`; blank return fail-closed with `sort:empty-name`). Client and server pagination (`DataTablePagination`, `DataTableClientPagination`, `DataTableServerPagination`, `DataTablePaginationPlacement` `'outside' | 'inside'` default `'outside'`, `DataTablePaginationStatusInfo` with `totalKnown` and nullable totals) including numbered page buttons (bounded window, ellipsis, `aria-current="page"`) plus Previous/Next with decorative lucide chevrons (`aria-hidden`; labels unchanged); optional `pagination.className` / `hideStatus`; optional server `totalCount` / `hasNextPage` when the total is unknown (omitted `totalCount` is silent). Opt-in row virtualization (`virtualized`, `DataTableVirtualization`, `DataTableVirtualizationHandle`, `DataTableScrollToAlign`, `DATA_TABLE_DEFAULT_ESTIMATE_SIZE` 64, `DATA_TABLE_DEFAULT_OVERSCAN`, `DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT`), infinite scroll (`DataTableInfiniteScroll`), kit-owned row selection (`DataTableSelection`, `DATA_TABLE_SELECT_COLUMN_ID`, nested `selectedKeys: ReadonlySet<string>` + `onSelectionChange`, identity via `getRowKey`, injected select column default `w-12` then `columnClassName`), and consumer composition (`toolbar` ReactNode inside `data-table-frame`, `getRowClassName` on painted data rows). Typed `pagination` vs `infiniteScroll` is exactly-one-of (`DataTableLoadStrategy`, exported); untyped both-props still pager-win. Header select-all is tri-state over current body-row keys (not `selectedKeys.size === rows.length`). Internal `chrome.ts` tokens and selection helpers are not exported. Kit `Checkbox` now shows a minus glyph for `checked="indeterminate"`. Adds runtime dependency `@tanstack/react-virtual`. There is no `./data-table` subpath. GitHub CI now runs the components Chromium suite (`test:browser`) after jsdom.

## 3.11.0

### Minor Changes

- [#237](https://github.com/OpenZeppelin/openzeppelin-ui/pull/237) [`5bf341b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bf341b004522da0f9dd290a41a1df64c3d7fddf) Thanks [@pasevin](https://github.com/pasevin)! - Add a domain-neutral `Badge` with filled and outlined variants, semantic tones, an optional decorative icon, and an optional accessible-name override.

## 3.10.0

### Minor Changes

- [#233](https://github.com/OpenZeppelin/openzeppelin-ui/pull/233) [`7208cb6`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/7208cb602c4e3f3069387e7b67d3cbeb93c0baba) Thanks [@pasevin](https://github.com/pasevin)! - Add a router-agnostic `Breadcrumb` navigation primitive with accessible linked ancestors and current-page semantics.

  Allow `Header` to render breadcrumb content in place of its existing title while preserving the title API.

## 3.9.0

### Minor Changes

- [#225](https://github.com/OpenZeppelin/openzeppelin-ui/pull/225) [`bc8c629`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/bc8c62994d6aa671493d1ba1e74c030d47b27928) Thanks [@pasevin](https://github.com/pasevin)! - Add preview-oriented layout primitives for generated-project UIs:
  - **`BottomSheet`** on the main entry — a non-modal bottom panel that keeps the page behind it interactive, with drag-resizable height and a labelled portalled region (not dialog semantics). An optional `header` prop renders content beside the close button, outside the scrolling body, for a title or status notice. An optional `layout` prop (`'overlay'` default, or `'inset'`) lets the host reserve space for the sheet: in `inset` mode the rendered height is published as `--bottom-sheet-inset` on `<html>` so viewport-height layouts can shrink instead of being covered, and stays published until the closing sheet finishes its exit transition so the host's layout does not spring back underneath it. `defaultBottomSheetHeight` accepts `{ ratio }` to seed a different share of the viewport than the 60% default.
  - **`@openzeppelin/ui-components/code-view`** — a read-only syntax-highlighted code pane with no character-size cutoff. An optional `decorateToken` callback lets you customize how individual highlighted tokens render; omit it for standard highlighting with no added decoration. An optional `reveal` prop (`startLine`, `endLine`, optional `id`) marks a 1-indexed inclusive line range in place and scrolls the first line of the range near the top of the visible area — two lines short of it, so the range does not sit flush against the edge with no sign the file continues above, while still getting essentially the whole pane. A range that fits is brought fully into view and a range taller than the pane starts near the top rather than in the middle; the gap is expressed in `lh` units, so it stays two lines of context at whatever font size the host sets. It is controlled, not imperative (no ref or handle), retriggers only when one of those three values changes (change `id` to re-reveal the same lines), treats any range that does not fit the current source as a silent no-op rather than clamping, does not itself turn on line numbers, and composes with `decorateToken` without altering the source text. An optional `showLineNumbers` prop renders a 1-indexed line-number column beside the code, off by default so an existing pane's DOM is unchanged: the numbers are CSS generated content, so they never appear in `textContent`, cannot be copied with a selection of the code, and are hidden from assistive technology; they count the same lines `reveal` addresses, so the two cannot disagree; and they are coloured through the `--code-view-line-number-color` custom property, which falls back to the kit's muted-foreground token. The column assumes the pane's own non-wrapping layout, which is the only mode it ships. Omit it for the same highlighted output as before. The subpath also exports `CODE_VIEW_LANGUAGES` and the `isCodeViewLanguage` type guard, so a host holding a language id that came from data rather than from a literal can narrow it to a grammar `CodeView` renders instead of casting and silently getting the plaintext fallback.
  - **`@openzeppelin/ui-components/file-tree`** — a file-tree pane for browsing a generated project. **`@pierre/trees` is an optional peer** — install and pin it in your app; the subpath surfaces the native resolver diagnostic if the peer is missing. This subpath is **ESM-only at runtime**: the CJS build resolves, but `@pierre/trees` publishes an `import` condition only, so `require('@openzeppelin/ui-components/file-tree')` fails under Node. Bundler consumers are unaffected. Every other entry point, including `./code-view`, honours both conditions.
  - **`AddressListField`** accepts an optional **`id`**. The field renders a control cluster, not a single element, so the id lands in two places: as `id` on the active entry control (the single-mode address input or the bulk-mode textarea — only one exists at a time), matching where every other kit field puts its `id`; and as `data-field-id` on the field's root, so the surrounding controls that carry no id of their own (Add, the entry-mode toggle, each row's remove button) still resolve to the field via `element.closest('[data-field-id]')`. A consumer reading `document.activeElement.id` therefore sees the id only while the entry control has focus — never while the field is `disabled` or at `maxItems`, since the entry control is disabled and unfocusable in both cases; resolving through `closest` covers the whole cluster in every state. Omit the prop and the rendered DOM is unchanged.

  `CodeView` memoizes its rendered output, so a host that re-renders on every pointer move (a drag-resizable container) no longer reconciles the whole file each frame. `FileTree` moves keyboard focus only when the controlled `selectedPath` changes, so an unrelated parent re-render no longer discards the row the user arrow-keyed to.

  Development-only diagnostics from `BottomSheet` and `FileTree` now go through the kit `logger` from `@openzeppelin/ui-utils` instead of `console`, so they carry the standard `[ERROR][BottomSheet]` / `[ERROR][FileTree]` prefix and honour logger configuration. Production builds still skip the checks entirely.

  `CodeView` also keys the React nodes it builds for a token run, so a `decorateToken` that returns an element (or a `reveal` mark) no longer triggers React's `Each child in a list should have a unique "key" prop` warning. Rendered output and source text are unchanged.

  All additions are additive. No existing exports changed.

## 3.8.3

### Patch Changes

- [#214](https://github.com/OpenZeppelin/openzeppelin-ui/pull/214) [`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a) Thanks [@pasevin](https://github.com/pasevin)! - Ship the AGPL-3.0 licence text inside each published package.

  The repository has a root `LICENSE`, but npm does not walk up to the repository root
  when packing, and these packages declare narrow `files` arrays (`dist`,
  `README.md`). So every published tarball carried an AGPL-3.0 declaration in its
  `package.json` with no accompanying licence text — confirmed with
  `npm pack --dry-run`, which listed no `LICENSE` entry.

  Each published package now has its own copy, which npm includes automatically.

- Updated dependencies [[`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a)]:
  - @openzeppelin/ui-types@3.5.2
  - @openzeppelin/ui-utils@4.0.1

## 3.8.2

### Patch Changes

- Updated dependencies [[`f7498bc`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f7498bce0eb6952dd08c516b16147b08a28c05d8)]:
  - @openzeppelin/ui-utils@4.0.0
  - @openzeppelin/ui-types@3.5.1

## 3.8.1

### Patch Changes

- [#198](https://github.com/OpenZeppelin/openzeppelin-ui/pull/198) [`b9a7555`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b9a7555fc3a5497c5d8194f685959032c0fad92e) Thanks [@pasevin](https://github.com/pasevin)! - fix(components): keep the AddressListField entry-mode toggle flush to the input in both single and bulk modes

  The toggle now sits as an attached tab on the input/textarea bottom-right corner (inset from the rounded corner) and no longer shifts when the resolution announcer or bulk preview text appears, nor overlaps the action button when the field is empty. Adds `announcerEndSlot` to `AddressField` and `helperEndSlot` to `TextAreaField` to pin trailing content beside the announcer/helper row, and lifts the input above the toggle so the focus ring is not covered.

## 3.8.0

### Minor Changes

- [#195](https://github.com/OpenZeppelin/openzeppelin-ui/pull/195) [`b56165d`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b56165d7c3145faaf4b875df6d01339df544241d) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressFieldWithResolvedPreview` and `ResolvedAddressFieldPreview` — a reusable composition for ENS forward resolution in `AddressField` plus a rich reverse-resolved preview card below the field.

  `AddressFieldWithResolvedPreview` always suppresses the forward "Resolved to `0x…`" success announcer and cross-network disclaimer (overridable), collapses the empty aria-live region, and accepts an optional `preview` slot for custom reverse-resolution bridges. `ResolvedAddressFieldPreview` is the presentational preview card; pass `resolvedName` for sync display or wrap with `AddressNameProvider` / `AddressNameResolutionProvider` for async reverse lookup.

## 3.7.0

### Minor Changes

- [#193](https://github.com/OpenZeppelin/openzeppelin-ui/pull/193) [`3696502`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/36965021895ea1520e4e8c5845660ff203ee6adb) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressFieldWithResolvedPreview` and `ResolvedAddressFieldPreview` — a reusable composition for ENS forward resolution in `AddressField` plus a rich reverse-resolved preview card below the field.

  `AddressFieldWithResolvedPreview` always suppresses the forward "Resolved to `0x…`" success announcer and cross-network disclaimer (overridable), collapses the empty aria-live region, and accepts an optional `preview` slot for custom reverse-resolution bridges. `ResolvedAddressFieldPreview` is the presentational preview card; pass `resolvedName` for sync display or wrap with `AddressNameProvider` / `AddressNameResolutionProvider` for async reverse lookup.

## 3.6.0

### Minor Changes

- [#191](https://github.com/OpenZeppelin/openzeppelin-ui/pull/191) [`f656a45`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f656a458bfbc370c61e84991fedbe662b0853c24) Thanks [@pasevin](https://github.com/pasevin)! - Add `showForwardResolutionSuccessAnnouncer` to `AddressField` (default `true`).

  When set to `false`, suppresses the mechanism-neutral **"Resolved to `0x…`"** success announcer while still rendering loading copy, typed error messages, and chain-scope mismatch alerts. Use when a sibling `AddressDisplay` already presents the resolved address (e.g. a rich ENS preview card below the field). Pairs with the existing `showCrossNetworkFallbackDisclaimer` prop, which only controls the amber cross-network note under the success template.

## 3.5.0

### Minor Changes

- [#188](https://github.com/OpenZeppelin/openzeppelin-ui/pull/188) [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc) Thanks [@pasevin](https://github.com/pasevin)! - Add cross-network fallback disclaimer display (initiative 003, SF-2 + SF-3).

  `@openzeppelin/ui-utils` adds pure classifiers `isCrossNetworkFallback` and `getFallbackNetworks` reading only base `ResolutionProvenance` fallback fields (Principle II — no ENS adapter imports), plus copy helpers `networkDisplayName`, `nameResolutionCrossNetworkFallbackMessage`, and `crossNetworkFallbackMessageNames` for mechanism-neutral disclaimer text.

  `@openzeppelin/ui-components` surfaces the disclaimer when the complete fallback triplet is present. **Reverse (`AddressDisplay`):** a small amber `TriangleAlert` icon inline immediately after the verified name; the locked copy appears in a tooltip on hover and keyboard focus via a focusable button whose `aria-label` is the full message. **Forward (`AddressField`):** a muted `role="note"` line under the resolved success template. Both components expose `showCrossNetworkFallbackDisclaimer?: boolean` (default `true`) to suppress presentation entirely. Classification uses SF-2 helpers only; `002` scope-gate behavior (`isChainScopeMismatch` / `scopedToNetworkId`) is unchanged — the disclaimer is additive copy, not a suppression gate. Optional `resolveNetworkLabel` threads through `AddressNameProvider`, `NameResolverProvider`, and related context types.

  `@openzeppelin/ui-renderer` forwards `resolveNetworkLabel` from `AddressNameResolutionProvider`; `TransactionForm` wires a reference resolver via `activeRuntime.networkCatalog`.

### Patch Changes

- Updated dependencies [[`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc), [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc)]:
  - @openzeppelin/ui-utils@3.3.0
  - @openzeppelin/ui-types@3.3.0

## 3.4.0

### Minor Changes

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add ENS-aware address input validation and inline resolution (SF-3, Rev-2/3).

  `@openzeppelin/ui-components` gains a headless name-resolution seam: `NameResolverProvider`, `useNameResolver`, and `useInjectedNameResolution` let `AddressField` resolve typed names inline when a forward resolver is injected — submitting the **resolved hex**, never the name, never a silently-coerced hex. The correctness spine is a shadow-state model: the React Hook Form value is the resolved hex, the typed name lives only in local display state, and `field.onChange(hex)` fires at exactly one site, only when resolution succeeds _and_ the resolved name still matches what the user typed. In every other state the value is `''`, so submit is gated by `formState.isValid` with no async validator. Pasted hex addresses pass through and validate exactly as before. Each resolution failure surfaces a distinct, per-code message in a dedicated `aria-live` region, with a retry affordance for transient errors only. The headless `useAddressSuggestionField` hook and presentational `AddressSuggestionList` component are extracted from `AddressField`'s inline dropdown logic so suggestion behavior is shared with zero regression.

  `@openzeppelin/ui-utils` gains two pure, framework-free helpers: `classifyAddressInput` (a dependency-injected, chain-neutral classifier — `empty` / `hex` / `name-candidate` / `malformed`) and `nameResolutionMessageForCode` (a per-code message mapper covering all seven resolution error codes with no generic catch-all — the single i18n seam).

  `@openzeppelin/ui-renderer` keeps the `blockchain-address` field registry mapped to the base `AddressField` (the Rev-1 `ResolvingAddressField` fork is retired). `TransactionForm` mounts `NameResolverProvider` ambiently via `useRuntimeNameResolver` from `@openzeppelin/ui-react`, so dynamic-form address fields gain inline ENS resolution with no integrator registry swap and no `WalletStateProvider` requirement at the field layer.

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add reverse-ENS address display (SF-4, Rev-2/3).

  `@openzeppelin/ui-components` `<AddressDisplay>` gains an optional, purely presentational `avatar?: React.ReactNode` leading slot (rendered before the label/address block, vertically centered) and now exports its `AddressDisplayProps` type. The synchronous value seam `AddressNameProvider` / `useAddressName` lets descendants read a pre-resolved `ResolvedName` without importing capabilities — progressive enhancement: the correct hex renders immediately, and the name + avatar swap in only when the supplied record is forward-verified; every other state degrades to truncated hex. Both changes are additive: when `avatar` is omitted — its default, and the value at every existing call-site — the rendered DOM and layout are byte-for-byte identical to before, in both the labeled and unlabeled branches. The component stays chain-agnostic (the slot is a `ReactNode`, not a capability).

  `@openzeppelin/ui-renderer` gains `AddressNameResolutionProvider` — an async→sync bridge that owns `useResolveAddress` (SF-2) and feeds descendant `<AddressDisplay>` instances through `AddressNameProvider`. Label precedence is explicit `label` > address-book alias > forward-verified ENS name > hex. `EoaConfigDetails` always wraps the base `<AddressDisplay>` in this provider; `AliasRow` mounts it only when `enableNameResolution` is on (flag off = byte-identical, no provider). The Rev-1 `ResolvedAddressDisplay` component is retired.

### Patch Changes

- Updated dependencies [[`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12), [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12)]:
  - @openzeppelin/ui-utils@3.2.0
  - @openzeppelin/ui-types@3.2.0

## 3.3.1

### Patch Changes

- [#171](https://github.com/OpenZeppelin/openzeppelin-ui/pull/171) [`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861) Thanks [@pasevin](https://github.com/pasevin)! - chore(deps): resolve Dependabot security alerts for transitive dependencies

  Update the workspace `pnpm` overrides so vulnerable transitive dependencies resolve to patched versions:
  - `protobufjs` &rarr; `^7.6.3` (was pinned to `^7.5.5`, still allowed `7.6.x` advisories)
  - `ws` &rarr; `^8.21.0` for the v8 line and `^7.5.11` for the v7 line (was `^8.20.1`)
  - `hono` &rarr; `^4.12.25`
  - `form-data` &rarr; `^4.0.6` (CRLF injection)
  - `ua-parser-js` &rarr; `^2.0.10` (ReDoS)
  - `js-yaml` (v4) &rarr; `^4.2.0` (quadratic-complexity DoS)
  - `uuid` &rarr; `^11.1.1` (missing buffer bounds check)
  - `esbuild` &rarr; `^0.28.1` (dev-server arbitrary file read)
  - `@babel/core` &rarr; `^7.29.6` (arbitrary file read via `sourceMappingURL`)

  `elliptic` (`<= 6.6.1`) has no published fix and remains; it is a low-severity advisory with no upstream patch available.

  These overrides only affect dependency resolution within this monorepo's lockfile and do not change the published packages' declared dependency ranges.

- Updated dependencies [[`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861)]:
  - @openzeppelin/ui-utils@3.1.1

## 3.3.0

### Minor Changes

- [#169](https://github.com/OpenZeppelin/openzeppelin-ui/pull/169) [`a94fc1b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/a94fc1b29ac594fe780f74f959d487e4da8f283c) Thanks [@pasevin](https://github.com/pasevin)! - Add `Banner` `variant="neutral"` and `size="compact"` presets, and export `BannerProps`, `BannerVariant`, and `BannerSize`.

## 3.2.0

### Minor Changes

- [#167](https://github.com/OpenZeppelin/openzeppelin-ui/pull/167) [`951eb1b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/951eb1bc44fcdc5225bcb7541e0ede4736bc7814) Thanks [@pasevin](https://github.com/pasevin)! - `AddressListField`: default to single-address entry with address-book support via `AddressField`, and add an inline toggle for bulk paste mode. Only one entry mode is active at a time.

  Adds two props:
  - `defaultEntryMode` (`'single' | 'bulk'`, default `'single'`) — chooses the view shown on mount.
  - `allowModeToggle` (`boolean`, default `true`) — set to `false` to hide the toggle and lock the field to `defaultEntryMode`.

## 3.1.0

### Minor Changes

- [#165](https://github.com/OpenZeppelin/openzeppelin-ui/pull/165) [`c3f393b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3f393b8c50553fa0733060e19288211330014ae) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressListField` for bulk address paste workflows with delimiter parsing, live validation preview, and removable list rows. Export address-list parsing helpers from `@openzeppelin/ui-utils` and showcase the field in the basic-react-app examples gallery.

### Patch Changes

- Updated dependencies [[`c3f393b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3f393b8c50553fa0733060e19288211330014ae)]:
  - @openzeppelin/ui-utils@3.1.0

## 3.0.1

### Patch Changes

- [#161](https://github.com/OpenZeppelin/openzeppelin-ui/pull/161) [`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa) Thanks [@pasevin](https://github.com/pasevin)! - Add network availability policy for hosted deployments: disable mainnet networks via `mainnet_networks_disabled`, per-network blocklist via `disabledNetworkIds`, shared resolution helpers, disabled `NetworkSelector` items, and a self-host notice banner.

- Updated dependencies [[`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa)]:
  - @openzeppelin/ui-types@3.1.1
  - @openzeppelin/ui-utils@3.0.1

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0
  - @openzeppelin/ui-utils@3.0.0

## 2.3.1

### Patch Changes

- [#134](https://github.com/OpenZeppelin/openzeppelin-ui/pull/134) [`cf9c53b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/cf9c53bf58b22515a6454148de03f16b429ebd59) Thanks [@pasevin](https://github.com/pasevin)! - Reset scroll position in paged `WizardLayout` (vertical and horizontal) when the active step changes, so the next step is shown from the top.

## 2.3.0

### Minor Changes

- [#129](https://github.com/OpenZeppelin/openzeppelin-ui/pull/129) [`f605c6f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f605c6fc217ef4f0c65c5286f70a22ec7aaa725b) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `truncateWhenLabeled` prop to `AddressDisplay`. When `truncate` is not set explicitly, the address truncates only when a label is present (explicit `label` or `AddressLabelContext`), so long raw addresses stay fully visible until an alias identifies the row.

## 2.2.0

### Minor Changes

- [#126](https://github.com/OpenZeppelin/openzeppelin-ui/pull/126) [`49b479a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/49b479a4f04fed51d7708b38d4d95dd82da27b58) Thanks [@pasevin](https://github.com/pasevin)! - Add optional secondary CTA for the wizard footer: `lastStepSecondaryLabel` / `onLastStepSecondary` / `lastStepSecondaryDisabled` on paged layouts, and matching `scrollableSecondary*` props on the scrollable variant. The secondary button uses the outline style and sits to the left of the primary action.

## 2.1.0

### Minor Changes

- [#124](https://github.com/OpenZeppelin/openzeppelin-ui/pull/124) [`56e2cc8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/56e2cc89561c062ec3821b3808d3d1abf41e31ea) Thanks [@pasevin](https://github.com/pasevin)! - Add optional wizard footer controls: custom `nextLabel` / `lastStepLabel`, `hideLastStepPrimary`, `onLastStepPrimary` (paged last step) with `onComplete` fallback, `showLastStepPrimary` on `WizardNavigation`, and scrollable layout `scrollableCompleteLabel` / `hideScrollableCompleteButton`.

## 2.0.1

### Patch Changes

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Promote `--primary` to the OpenZeppelin brand blue

  The `--primary` token was previously set to shadcn's stock near-black
  (`oklch(0.205 0 0)` in light, `oklch(0.985 0 0)` in dark), which never matched
  the OpenZeppelin brand. This changeset promotes `--primary` to the brand blue
  that already backs `--selected`:
  - Light: `oklch(55.43% 0.238 273.87)` (aka `hsl(238, 94%, 65%)`)
  - Dark: `oklch(0.72 0.18 273.87)` — same hue, lifted lightness / reduced chroma
    for readability on dark surfaces

  As a result, every call site that was already semantically "brand action" —
  primary `Button` variants, `ExternalLink`, `Progress` bar fill, brand emphasis
  text, brand pills, icon tiles, the app-wide focus ring — now correctly renders
  in the brand blue. This is the change shadcn's `--primary` was designed to hold
  in the first place (the brand's primary action color); the stock value was
  simply never overridden.

  `--selected` / `--selected-foreground` are kept as distinct, first-class tokens
  but are now declared as CSS variable aliases of `--primary` /
  `--primary-foreground`. This preserves the semantic difference at the call site
  (`selected` communicates "this indicates user selection", `primary`
  communicates "this is the main action / brand surface") while guaranteeing the
  two palettes can never drift visually. Consumers already migrated to
  `bg-selected` / `text-selected` / etc. in prior changesets keep working with no
  code change.

  A small audit was done on every `-primary` call site in the component library
  to catch non-action surfaces that were relying on `--primary` as a cheap
  near-black:
  - `TooltipContent` previously used `bg-primary text-primary-foreground` as an
    inverted "dark pill" pattern (shadcn's convention). That semantic is
    "inverted high-contrast surface", not "brand action", so it is repointed to
    `bg-foreground text-background` and remains a near-black pill in light mode,
    near-white in dark mode, regardless of brand hue.
  - `Header`'s mobile menu toggle had `text-primary` on a decorative hamburger
    icon. That was a neutral icon color, not a brand accent, so it is repointed
    to `text-foreground`. The button's focus ring stays on `ring-primary` —
    brand-blue focus rings are a deliberate design upgrade.

  Every other `-primary` usage (primary `Button`, `Progress`, `ExternalLink`,
  demo icon tiles / hero emphasis / CTA buttons in `basic-react-app`, etc.) is
  semantically a brand-action surface and is kept as-is, now correctly rendering
  in OZ blue. No public API changes.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Introduce `--selected` / `--selected-foreground` semantic color tokens for UI selection state

  Adds a new pair of design tokens that express the new designer guideline: "selected" surfaces
  (current wizard step, selected cards, selected rows, selected radio options, active drop zones,
  highlighted autocomplete suggestions, etc.) should use a consistent blue across the product. The
  base value is the OpenZeppelin brand blue `hsl(238, 94%, 65%)`, stored as
  `oklch(55.43% 0.238 273.87)` for consistency with the rest of the palette; the dark-mode variant
  preserves the brand hue (`h = 273.87`) but lifts lightness to `L = 0.72` and trims chroma to
  `C = 0.18` so it stays readable on dark surfaces while remaining recognisably the brand color.
  The tokens are bridged through `@theme inline` so they are consumable from Tailwind as
  `bg-selected`, `text-selected`, `text-selected-foreground`, `border-selected/40`,
  `bg-selected/5`, `ring-selected/30`, etc.

  The following components are refactored to consume the new tokens in place of hard-coded color
  literals or mis-applied semantic tokens:
  - `WizardStepper` — replaces hard-coded `blue-*`, `zinc-*`, `red-*`, `bg-white`, `text-white`
    literals with `selected`, `border`, `muted`, `muted-foreground`, `destructive`, and `card`
    tokens, so the stepper renders correctly in dark mode for the first time.
  - `SidebarButton` — selected state now uses `bg-selected/10 text-selected` instead of the
    hard-coded `bg-neutral-100 text-[#111928]` (which was not theme-aware). Neutral states were also
    migrated from `text-gray-*` literals to `text-muted-foreground` / `text-foreground`.
  - `FileUploadField` — drag-over state and default-hover affordance on the drop zone now use
    `selected` instead of `primary`, matching the "target of a pending selection" semantics.
  - `RadioField` — selected option background, radio circle, inner dot, and focus ring now use
    `selected` instead of `primary`.
  - `AddressField` — keyboard-highlighted and hovered autocomplete suggestions now use
    `bg-selected/10` instead of `bg-accent`, matching the "this is the item you are about to pick"
    semantics of the rest of the design system.

  No public API changes. Purely visual/internal refactor on the components side; the styles package
  gains two new tokens, which is a minor bump.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Adopt `--selected` token in form primitives and selection surfaces

  Follow-up to the `--selected` / `--selected-foreground` token introduction. Migrates the remaining
  components whose selection/active semantics were expressed via `primary`, `accent`, or hard-coded
  Tailwind palette literals onto the new `selected` token, so every selection cue in the library
  now shares a single upstream source of truth.
  - `Checkbox`: the `data-[state=checked]` box (background, foreground, and border) switches from
    `primary` to `selected`. Focus-visible ring is left on the existing `ring` token since it is a
    focus affordance, not a selection affordance.
  - `RadioGroup` (primitive): the indicator's `text-primary` — which colors the filled `Circle` via
    `text-current` — switches to `text-selected`.
  - `Tabs`: the active `TabsTrigger`'s label color switches from `text-foreground` to
    `text-selected`, giving the raised pill a subtle selection accent while preserving the existing
    Shadcn pill design.
  - `Calendar`: the selected day, the range-middle bar, and the `day` wrapper cell's
    `[&:has([aria-selected])]` backgrounds switch from `bg-accent`/`bg-zinc-200`/`bg-zinc-700`
    literals to `bg-selected` (solid for the selected day) and `bg-selected/15` /
    `bg-selected/10` (for the range-middle fill and the aria-selected-outside-day fill). The
    `today` highlight is intentionally left on `bg-accent text-accent-foreground` because today is
    a distinct semantic from selection.
  - `DateRangePicker`: inherits all of its day styling from `Calendar`, so the migration flows
    through without any direct change.
  - `NetworkSelector`: the multi-select row's tick box previously rendered an identical
    `border border-primary` square whether checked or not (relying solely on the presence of the
    `Check` glyph as a cue). It now mirrors the updated `Checkbox` primitive:
    `border-selected bg-selected text-selected-foreground` when selected,
    `border-input bg-background` otherwise. The single-select row's trailing `Check` glyph is
    tinted `text-selected` so the selection cue is consistent across the selector.

  No public API changes; purely visual.

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-utils@2.0.0

## 1.7.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-types@1.12.0
  - @openzeppelin/ui-utils@1.4.0

## 1.6.0

### Minor Changes

- [#95](https://github.com/OpenZeppelin/openzeppelin-ui/pull/95) [`71a64bd`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/71a64bd439073fa814299e466d38f3ce42c05412) Thanks [@pasevin](https://github.com/pasevin)! - Add `showTooltip`, `variant`, and `untruncateOnHover` props to AddressDisplay
  - `showTooltip` shows the full address in a tooltip on hover when truncated.
  - `variant` accepts `"chip"` (default) or `"inline"` for use inside existing
    styled containers like wallet bars.
  - `untruncateOnHover` reveals the full address inline on hover (desktop) or
    tap (touch devices).
  - Fix TooltipContent to render inside a Portal, preventing layout shifts.

## 1.5.0

### Minor Changes

- [#89](https://github.com/OpenZeppelin/openzeppelin-ui/pull/89) [`120474f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/120474f4e1c262db8246d0d4ac16ad91b6649a3a) Thanks [@pasevin](https://github.com/pasevin)! - Add Wizard components (WizardStepper, WizardNavigation, WizardLayout) with vertical, horizontal, and scrollable layout variants

### Patch Changes

- [#88](https://github.com/OpenZeppelin/openzeppelin-ui/pull/88) [`bedb0f0`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/bedb0f0b7eaf93ee2d7b1a77f9c8ef39dd5edf65) Thanks [@pasevin](https://github.com/pasevin)! - SidebarButton: badge now wraps gracefully to a new line when it doesn't fit alongside the label. Fixed height replaced with min-height so the button grows naturally.

## 1.4.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Enhance `AddressDisplay` label rendering to use a two-line stacked layout when a label is present. The label renders prominently on the first line with the address in a smaller font below, keeping the component compact while improving information hierarchy.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressLabelContext`, `AddressLabelProvider`, and `useAddressLabel` for context-based address label resolution. Enhance `AddressDisplay` with optional `label` and `onLabelEdit` props that fall back to the context when not provided. When a provider is mounted, all `AddressDisplay` instances in the subtree automatically resolve and render labels with zero call-site changes.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4a2ba22`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4a2ba22b7df523c6ef7de52786ae0c1656da4746) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressSuggestionProvider`, `useAddressSuggestions`, and `AddressSuggestionContext` for context-based address autocomplete. Enhance `AddressField` with built-in suggestion dropdown that reads from context by default, with optional `suggestions` prop override and `suggestions={false}` opt-out. Includes debouncing, keyboard navigation, and ARIA listbox semantics.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add multi-select mode to `NetworkSelector` via discriminated union props. When `multiple={true}`, the dropdown renders checkboxes, stays open on selection, and supports a `renderTrigger` prop for custom trigger elements. Existing single-select usage is unchanged.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add `OverflowMenu` component — a reusable compact "..." dropdown for secondary actions. Accepts typed `OverflowMenuItem[]` with support for icons, destructive styling, and disabled state.

### Patch Changes

- Updated dependencies [[`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919)]:
  - @openzeppelin/ui-types@1.11.0

## 1.3.0

### Minor Changes

- [#70](https://github.com/OpenZeppelin/openzeppelin-ui/pull/70) [`fb078c4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb078c4e213d903249c91bcd4918f26b6b91d3cf) Thanks [@pasevin](https://github.com/pasevin)! - Add EcosystemDropdown and EcosystemIcon components
  - `EcosystemDropdown`: reusable dropdown for ecosystem selection with icon render prop
  - `EcosystemIcon`: renders adapter-provided icon component with fallback

### Patch Changes

- Updated dependencies [[`fb781d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb781d4df95365b2ef184c893d6b39b38a2bc20e)]:
  - @openzeppelin/ui-types@1.9.0

## 1.2.1

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

- Updated dependencies [[`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac)]:
  - @openzeppelin/ui-utils@1.2.1

## 1.2.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Added NetworkServiceErrorBanner component for displaying network service connection errors with a call-to-action to configure alternative endpoints

### Patch Changes

- Updated dependencies [[`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92), [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92)]:
  - @openzeppelin/ui-types@1.5.0
  - @openzeppelin/ui-utils@1.2.0

## 1.1.0

### Minor Changes

- [#35](https://github.com/OpenZeppelin/openzeppelin-ui/pull/35) [`5bed777`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bed77773ee815c9e7efc47005a2f091f2033b23) Thanks [@pasevin](https://github.com/pasevin)! - Add `SidebarGroup` component for collapsible navigation groups in sidebars. This new component uses `@radix-ui/react-collapsible` under the hood and supports both controlled and uncontrolled modes via `open`/`defaultOpen` props.

## 1.0.4

### Patch Changes

- [#17](https://github.com/OpenZeppelin/openzeppelin-ui/pull/17) [`c6fc89e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c6fc89e7254f48b6f27e4b7d1f897022251c9e9d) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card, Accordion): remove default shadows and improve section spacing

  Card changes:
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Move vertical padding from Card container to individual sections for better flexibility:
    - CardHeader: `pt-6` (provides top padding for the card)
    - CardContent: `pt-4 pb-6` (gap from header + bottom padding)
    - CardFooter: `pt-4 pb-6` (gap from content + bottom padding)
  - This allows consumers to override Card's styling without breaking internal spacing

  Accordion changes:
  - Remove default `shadow-sm` from Accordion card variant for visual consistency

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0`, `pb-0`, or custom padding classes.

## 1.0.3

### Patch Changes

- [#15](https://github.com/OpenZeppelin/openzeppelin-ui/pull/15) [`f5769f4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f5769f40b77d2ac68da9a52a84f1eb52b7ea8f9e) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card): remove default shadow and add section spacing
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Add default `pt-4` spacing to CardContent (space between header and content)
  - Add default `pt-4` spacing to CardFooter (space between content and footer)

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0` or custom padding classes.

## 1.0.2

### Patch Changes

- [#12](https://github.com/OpenZeppelin/openzeppelin-ui/pull/12) [`6e2e802`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6e2e80226bfa421d88c9b7ed1cfcbee3fc1d01b7) Thanks [@pasevin](https://github.com/pasevin)! - Fix Calendar navigation buttons floating outside container by adding `position: relative` to the root element

- Updated dependencies [[`779a5fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/779a5fb82ae2611fb571f8015dae7a29177c4100)]:
  - @openzeppelin/ui-types@1.1.0

## 1.0.1

### Patch Changes

- [#1](https://github.com/OpenZeppelin/openzeppelin-ui/pull/1) [`8b96075`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8b9607524611e5cf3b1b0a968460ece8c2aa5bd1) Thanks [@pasevin](https://github.com/pasevin)! - Separate CodeEditorField into dedicated entry point to prevent CSS import issues in test environments.

  **Breaking Change for CodeEditorField users:**

  The `CodeEditorField` component is no longer exported from the main package entry point. Import it from the new dedicated entry point:

  ```typescript
  // Before
  import { CodeEditorField } from '@openzeppelin/ui-components';

  // After
  import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';
  ```

  This change prevents the `@uiw/react-textarea-code-editor` CSS import from causing "Unknown file extension .css" errors in Node.js test environments.

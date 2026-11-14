---
'@openzeppelin/ui-components': minor
---

`EmptyState`: new optional `action` slot under the text, for a retry button or a link. Pass `icon={null}` or `icon={false}` to render no icon and no icon container; before, both showed the default icon. Omitting `icon` still shows the default one. `description` is now optional and nothing renders when it is omitted or empty.

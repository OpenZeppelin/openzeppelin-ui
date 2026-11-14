---
'@openzeppelin/ui-components': minor
---

Add `PageHeader` for the top of a content page. It renders a `title` heading (`titleLevel`, default `1`), an optional `titleEnd` slot beside the heading for a status pill or badge, an optional `description` and an optional `actions` area that sits beside the title on wide screens and wraps under it on narrow ones. `titleEnd` sits outside the heading element, so the heading's accessible name stays the title alone. `description` is rendered in a `div`, so it can hold block content such as paragraphs or lists. Empty `titleEnd`, `description` and `actions` render nothing. It is separate from the app bar (`Header`) and card headers. It renders a `<header>` element, so place it inside `<main>`: outside it, it becomes a second banner landmark next to the app bar. New exported types: `PageHeaderProps`, `PageHeaderTitleLevel`.

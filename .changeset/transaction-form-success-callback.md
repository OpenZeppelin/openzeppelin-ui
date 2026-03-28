---
"@openzeppelin/ui-types": minor
"@openzeppelin/ui-renderer": minor
---

Add optional `onTransactionSuccess` callback to `TransactionForm` so host apps can run side effects (for example analytics) when a transaction completes successfully. The callback receives `network_id`, `ecosystem`, and `execution_method`.

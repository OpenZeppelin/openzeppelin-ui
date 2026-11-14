---
'@openzeppelin/ui-components': minor
---

`WizardStepper`: every step button, horizontal and vertical, is now named `Step N: Title, <state>`, where the state is completed, visited, invalid, upcoming or skipped. The current step is named `Step N: Title` and keeps `aria-current="step"`, so screen readers say "current" once. Screen reader users hear where they are without relying on colour. The new optional `getStepLabel`, also accepted by `WizardLayout`, lets you supply your own names, for example to localise them.

If your tests find step buttons by their exact name, update them: vertical steps used to be named by their content and horizontal steps `Step N: Title`. Match the new names, use a regular expression such as `{ name: /^Step 2: Details/ }`, or pass `getStepLabel` to keep names of your own.

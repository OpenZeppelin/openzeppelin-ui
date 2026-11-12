---
'@openzeppelin/ui-components': minor
---

`WizardStepper`: every step button, horizontal and vertical, is now named `Step N: Title, <state>`, where the state is completed, current, visited, invalid, upcoming or skipped. Screen reader users hear where they are without relying on colour. The new optional `getStepLabel`, also accepted by `WizardLayout`, lets you supply your own names, for example to localise them.

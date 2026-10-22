---
description: Exercise and verify the 409 conflict flow end-to-end
---
Using the mock server: create a draft for a free slot, insert a conflicting booking via `demoControls.simulateOtherUserBooking`, submit, and assert (by running/adding a Testing Library test) that the alert names the conflict, the list refetched, form values persisted and focus moved to the alert. Report any deviation from PLAN.md §8.
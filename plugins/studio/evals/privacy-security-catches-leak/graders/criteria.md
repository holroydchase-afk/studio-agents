---
type: llm
---

The review flags, as high severity: logging the token and email to the console, and sending the email to a third-party tracker in a URL. It also flags storing the token in localStorage (XSS exposure) and the missing check of `res.ok`/error handling. Each finding has a concrete fix. Fail if the tracker call or the logged token is missed.

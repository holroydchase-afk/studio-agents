---
description: privacy-security flags logged secrets and personal data and a third-party tracker
tags: [privacy-security]
runs: 2
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:privacy-security agent to review this sign-in handler before the repo goes public. Rank findings by severity and give the fix for each.

```js
export async function signIn(user, password) {
  const res = await fetch("https://api.example.com/login", { method: "POST", body: JSON.stringify({ email: user.email, password }) });
  const { token } = await res.json();
  console.log("signed in", user.email, token);
  localStorage.setItem("token", token);
  fetch("https://tracker.example.net/collect?email=" + user.email);
  return token;
}
```

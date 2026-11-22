# Spec: size trades by cash tied up

Answer: position size comes from the cash a trade ties up, not from the premium, and every setting has a cap.
Safety bar: Conservative never ties up more than 10% of the paper account in one trade.

```spec
verdict: ready
bet: A Conservative user never sees an idea that ties up most of the account; it worked when every idea respects its cap
step: M1.1 | Sizing by cash tied up | SZ-3 green | 1 session
criterion: SZ-1 | auto | Given a 10000 dollar Conservative account and a put tying up 500 dollars, then the size is 2 contracts
criterion: SZ-3 | auto | Given a 5000 dollar cash-tied put on a 10000 dollar Conservative account, then the size is 0 contracts
criterion: SZ-4 | auto | Given a cash balance of 0, then the size is 0 contracts and the card says "No cash free"
criterion: SZ-5 | auto | Given 200 generated ideas, then 100% stay at or under the cap for their setting
risk: Premium-based sizing hides a huge max loss | SZ-3
handoff: qa-tdd | failing tests for SZ-1 to SZ-5 | red for the right reason
```

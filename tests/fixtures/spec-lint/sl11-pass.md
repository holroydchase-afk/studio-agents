# Spec: quote adapter

The quote adapter is only tested against three saved samples. Spec the feed.
Rollback: revert the merge commit.

```spec
verdict: ready
bet: A visitor sees quotes on every card; it worked when 39 of 40 symbols show one
step: M1.1 | Adapter per symbol | QUOTE-1 green | 1 session
step: M1.2 | First live run on a machine that can reach the host | QUOTE-2 met | 0.5 session
criterion: QUOTE-1 | auto | Given 40 symbols and one that times out, then 39 quotes are returned
criterion: QUOTE-2 | manual | Given the first live run, then calls and puts both come back for 3 symbols
risk: One symbol blocks the rest | QUOTE-1
handoff: qa-tdd | failing tests for QUOTE-1 | red for the right reason
```

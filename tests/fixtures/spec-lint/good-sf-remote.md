# Spec: US remote filter

Answer: the filter keeps roles a person can do from anywhere in the US and drops hybrid and on-site ones, with "maybe" for a city plus a remote marker.

```spec
verdict: ready
bet: The user sees every US remote role and no hybrid ones; it worked when the filter agrees with a hand check of the saved roles
step: M1.1 | Location classifier | USR-2 green | 1 session
criterion: USR-2 | auto | Given "Remote - US", then the result is "match"
criterion: USR-9 | auto | Given "San Francisco (Remote)", then the result is "maybe"
criterion: USR-10 | auto | Given "SF, CA or Remote (US)", then the result is "maybe"
criterion: USR-15 | auto | Given "Hybrid", then the result is "no match"
criterion: USR-16 | auto | Given an empty location, then the result is "maybe"
criterion: USR-20 | manual | Given 50 saved roles checked by hand, then the filter agrees on at least 48 of 50
risk: A messy location string drops a real remote role | USR-9
handoff: qa-tdd | failing tests for USR-2 to USR-16 | red for the right reason
```

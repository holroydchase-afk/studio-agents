# Spec: fair geofence

Answer: a geofence that is fair to the crew. A weak GPS fix never refuses a punch; it saves the punch with a flag for the boss.

```spec
verdict: ready
bet: The crew trusts the clock-in; it worked when nobody asks the boss to fix a punch
step: M1.1 | Geofence check with no_fix flag | GEO-4 green | 1 session
criterion: GEO-4 | auto | Given a GPS accuracy of 250 m, then the punch is saved with the flag "no_fix"
criterion: GEO-6 | auto | Given no GPS fix at all, then the punch is saved with the flag "no_fix"
criterion: GEO-7 | auto | Given a punch 400 m outside the fence, then the punch is saved with the flag "outside"
criterion: GEO-8 | manual | Given 10 taps at the job site, then no tap is refused
risk: Weak GPS refuses a punch | GEO-6
handoff: qa-tdd | failing tests for GEO-4, GEO-6 and GEO-7 | red for the right reason
```

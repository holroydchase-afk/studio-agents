# Spec: geofence

A fair geofence for the crew: fairness comes before precision.

```spec
verdict: ready
bet: The crew trusts the clock-in; it worked when nobody asks the boss to fix a punch
step: M1.1 | Geofence check | GEO-1 green | 1 session
criterion: GEO-1 | auto | Given a punch 300 m outside the fence, then the punch is saved with a "flag"
criterion: GEO-2 | manual | Given a weak signal, then the punch is saved and not refused after "10" taps
risk: Weak signal refuses a punch | GEO-2
handoff: qa-tdd | failing tests for GEO-1 | red for the right reason
```

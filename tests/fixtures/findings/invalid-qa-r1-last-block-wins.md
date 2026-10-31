<!-- expect: verdict -->
QA-R1: the findings block is "always last", so when a review quotes an earlier block (the format example, or
last round's block), the checker must validate the last one. Here the first block is valid and the last is not.

Format, as shown in the agent:

```findings
verdict: Ready
score: 9/10
UX-R1 | P2 | V5 | Chips | Three corner radii | Use 8px everywhere
```

This round:

```findings
verdict: Looks good
score: 6/10
UX-R2 | P1 | V2 | Projects header | Two primary buttons | Make Import secondary
```

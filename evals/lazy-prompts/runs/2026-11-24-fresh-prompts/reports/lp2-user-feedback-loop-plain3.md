Yes, we can do this. I'd build it as one shared pattern in studio-agents, not a separate system for each product. I haven't built anything yet, and I couldn't open any of your repos, so everything below is a plan.

**The loop**
1. **Capture.** Each product gets a "Send feedback" control with a short form: what happened, plus an optional contact.
2. **Inbox.** Feedback lands where Claude can read it.
   - **Public demos and ccwatts:** a prefilled GitHub issue form, so there's no backend and no telemetry. A visitor clicks and the issue opens in the repo. Pages, Energy Scanner, Charlie, Crew Clock, the PM tools and ccwatts all work this way.
   - **Hearth:** feedback goes into its own Supabase table, and only the beta grandparents can write to it. I believe there's already an error-reports table (migration 0006) that this could extend. I haven't read it.
3. **Act.** A scheduled Claude session runs nightly. The staff-pm agent triages and ranks each item, and qa-tdd writes a failing test for each bug. The engineer then fixes it and opens a PR. This runs inside your Claude plan, not on a metered API.
4. **Gate.** The agent can triage, label, write tests and open PRs on its own. Anything that changes a live site or demo waits for your go, as it does today. Docs-only and CI-only PRs merge on green. Feature requests get ranked and logged, not built. That keeps it "deep, not wide."

**Rules it has to keep**
- **ccwatts, Energy Scanner and Crew Clock:** their hard rules ban network calls, analytics and third-party scripts. A link out to a GitHub issue form respects that, but an in-page form that posts data would break it. In Crew Clock, feedback must never carry location or punch data.
- **Hearth:** feedback text can include family details. Agents must never copy it into the public repo, PRs or issues. They'd work from a scrubbed summary. Strip any media or captions, and have privacy-security review the table before any grandparent sees the button.
- **Public repos:** GitHub issues are public, so the form says so plainly. Don't ask for emails there.

**What I recommend**
- **Pilot on Hearth.** The 12 grandparents have had it since Nov 22, so real feedback is arriving now. That's also the best portfolio story: "users send feedback, the agents triage it, test it and ship it, with you approving anything live."
- **Roll out to the demos after that.**
- **Don't claim "autonomous" on the site yet.** Claims need to match run logs. Wait until there are a few real runs to point to.

**What I didn't check**
- **Hearth:** the existing error-reports schema, and whether the app has any feedback UI today.
- **Demos:** whether any of them already has a feedback link.
- **Studio-agents:** whether triage fits an existing agent or needs a new one. I'd propose a `feedback-triage` agent rather than write one in a product repo.
- **Scheduling:** whether your plan's scheduled sessions can run nightly without hitting limits.

One-word question: **Hearth first?** If yes, I'll have staff-pm write the spec for the Hearth pilot and open the first PR for your review.
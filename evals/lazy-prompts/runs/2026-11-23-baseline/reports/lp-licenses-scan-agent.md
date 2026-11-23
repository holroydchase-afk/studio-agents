**No, don't shut the portfolio down.** A public portfolio of your own work is normal and low-risk. The licensing job is to make each repo's terms explicit. Nothing I've seen says it's urgent.

**What I could and couldn't check.** I only had your notes, not the repos, so I did not scan any LICENSE files. Everything below comes from your repo rules. Treat "scan done" as not true until step 1 runs.

**What your own rules already tell me**
- ccwatts: MIT for code, CC BY 4.0 for METHODOLOGY.md and params.json. Decided, and on npm.
- `@holroyd/messenger` (used by Hearth and Crew Clock): AGPL-3.0-or-later. This is the one to understand. AGPL requires offering the source to anyone who uses a modified version over a network. Crew Clock and its demo are public repos, so you are probably fine. The risk is any private repo (Hearth is public per its rules) that ships the MLS bundle to users without a source link. It also means a recruiter's company can't reuse that code in a closed product, which is fine for a portfolio. Make sure it is a deliberate choice.
- Crew Clock bundles a prebuilt MLS file in `js/vendor/`. A bundle carries its dependencies' licenses, and those need notices.
- Energy Scanner: sample images must be CC0 or licensed, with source and license in `samples/SOURCES.md`. That is the most likely place for a real gap.
- Charlie: SEC and Cboe data, plus Pyodide loaded at runtime. Check their terms for display and redistribution of sample data. Charlie is private today and goes public only after a privacy-security review.
- Role Radar, Build Slate and the roadmap: demo data is made up, so the risk is low. Real data in a public repo is a privacy problem, not a license one.
- Portfolio site and studio-agents: no license is stated in anything I saw.

**Real risks, ranked**
1. P1: a public repo with no LICENSE file. Legally that means "all rights reserved", and nobody, including a recruiter, may reuse it. Usually harmless but sloppy. Fix: add one.
2. P1: third-party assets on the demos (images, fonts, icons, Pyodide, bundled npm packages) without notices.
3. P2: AGPL mixed into MIT products. Your own code is fine either way. Just be consistent about which repo is which.
4. P2: names and trademarks. "Hearth", "Charlie" and "ccwatts" are common words. A quick trademark and npm-name check before any push to market. This isn't a shutdown reason.

**Plan (3 sessions, I'd hand the scan to an agent)**
1. M1.1: Scan every public repo. For each, record the LICENSE file, the dependency licenses (a tool such as license-checker does this) and any assets. Output is one table. Done when every repo has a row. (1 session)
2. M1.2: Add the missing LICENSE files and a NOTICE/credits section. Default: MIT for code, CC BY 4.0 for docs, AGPL stays on messenger. Done when no public repo lacks a license. (1 session)
3. M1.3: Add a short footer line on the portfolio ("Code MIT unless noted; demos use sample data"), plus a link to the table. This is a live-site change, so it waits for your go. (0.5 session)

**Not doing:** hiring a lawyer, or changing the messenger's AGPL, until step 1 shows a real conflict.

**Biggest risk:** I'm guessing about repos I haven't read. Step 1 settles it.

**Decisions for you**
- Approve M1.1 and M1.2? My recommendation is yes. They are docs-only, mergeable on green, and take no time from you.
- MIT as the default license for everything not already decided? My recommendation is yes. It's the usual choice for a portfolio and the same as ccwatts.
- Keep the messenger on AGPL? My recommendation is yes for now. It's a deliberate protection, and you can relicense later because you are the sole author.

**Handoffs:** privacy-security runs the scan (M1.1). Engineer adds the files (M1.2). Positioning writes the footer line (M1.3). I'd wait on any live-site change until you say go.

This is not legal advice. For a job-search portfolio the steps above are enough.

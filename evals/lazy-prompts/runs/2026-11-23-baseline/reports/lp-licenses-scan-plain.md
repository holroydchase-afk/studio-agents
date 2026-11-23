No, don't shut the portfolio down. I haven't run the scan yet, though. In this session I could only see your notes, not the repos, so nothing below is a finding from the code.

**Why shutting it down is the wrong move**
- Publishing code under a license is normal. Every product repo is already public on purpose.
- Nothing I know of points to a license problem that a takedown would fix. The portfolio is the main support for your job search, and taking it down costs you more than any likely problem would.
- If the scan turns something up, the fix is usually small: add a license file, add an attribution line, or swap one asset.

**What I know from your repo rules**
- ccwatts: MIT for code, CC BY 4.0 for the methodology and params. This is decided and fine.
- The shared messenger library `@holroyd/messenger` is AGPL-3.0-or-later. Crew Clock is its next user, and it ships a prebuilt copy of that library in `js/vendor/`. That is the one spot I'd check first. If Crew Clock's code carries no license, or one that conflicts with AGPL, it needs fixing. A public repo with source available is the easy case, so this should be a license file and a notice, not a rewrite.
- Energy Scanner records the source and license of its sample images in `samples/SOURCES.md`. That's good practice and I'd verify the file is complete.
- Charlie loads Pyodide in the browser. It has a permissive license, so it only needs attribution.
- Several repos may have no license file at all. A public repo with no license means "all rights reserved", so recruiters can't legally reuse it. That doesn't hurt you, but it's worth picking one deliberately.

**What the scan will cover**
1. Does each public repo have a LICENSE file, and does it match what the README says?
2. Dependency licenses for each repo (npm and pip), looking for copyleft surprises such as AGPL or GPL.
3. Third-party assets on the site: fonts, images, icons, sample photos, each with its source and license.
4. Do the portfolio and demo pages credit anything that requires it?
5. Are there any brand or trademark uses, for example Claude or Anthropic names or logos, that need care?
6. Does the portfolio copy match the real licenses?

I would not use the legal term "compliant" in any public copy. This is a hygiene pass, not legal advice. If you ever take paying customers or open a company around Hearth, a one-hour lawyer review is worth the money. It isn't needed for a portfolio.

**Your one step**
Reply "go" and I'll run the scan as a studio-level pass. I'll open one PR per repo that needs a fix. Anything that changes the live site waits for your go, as usual. Docs-only license additions can merge on green. I'd start with Crew Clock and the messenger library, since that is where I expect the only real question.

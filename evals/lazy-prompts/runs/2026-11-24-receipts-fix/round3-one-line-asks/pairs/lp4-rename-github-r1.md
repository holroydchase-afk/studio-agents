# Chase's message

Yeah can I change the Holroyd Chase-afk bit

# Reply A

Yes, you can rename the GitHub username (the "holroydchase-afk" part). It's a one-minute account setting, but it touches every repo, so I'd do it once, at a quiet moment, not mid-application.

What breaks: the portfolio repo is named after the username (holroydchase-afk.github.io), so it must be renamed too. Every repo's CLAUDE.md points at holroydchase-afk/studio-agents, and the agent sync, PR checks and connected tools use that path. GitHub redirects old repo links, but the redirect dies if anyone claims the old name. chaseholroyd.com itself stays up.

I chose to leave the repos alone until you pick a name, then do all the follow-up myself: rename the portfolio repo, update every CLAUDE.md and link, and re-check the live site after. Since a push to main deploys the site, I'll hold that last part for your go.

decision: New username? | Pick one (I'd use chaseholroyd, to match the domain), then change it in GitHub, Settings, Account, Change username, and tell me the name.

If you meant a different "bit" (the repo name or the site address), say which.

# Reply B

Yes, you can. It takes one step, and it's one only you can do, because it's an account setting: github.com/settings/admin, then "Change username".

Three things to know first:

- **Old links keep working for now.** GitHub redirects the old repo URLs and git remotes. The redirects stop if someone else registers the old name, so we'd still update our own references.
- **The portfolio's repo name will break.** The site repo is named after the username (`holroydchase-afk.github.io`). Renaming the account doesn't rename it, so we'd rename that repo too and check the chaseholroyd.com custom domain still deploys.
- **A few of our own references need updating.** The CLAUDE.md files in every repo point at `holroydchase-afk/studio-agents`, and the CI checks and agent syncs use that path too. I can do that cleanup in one pass once the new name is set.

What do you want the new name to be? Tell me the name and I'll tell you when to hit the button. I'll have the reference updates ready. Nothing goes live until you say go.

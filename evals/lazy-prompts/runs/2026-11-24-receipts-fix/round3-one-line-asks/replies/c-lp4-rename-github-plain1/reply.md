Yes, you can. It takes one step, and it's one only you can do, because it's an account setting: github.com/settings/admin, then "Change username".

Three things to know first:

- **Old links keep working for now.** GitHub redirects the old repo URLs and git remotes. The redirects stop if someone else registers the old name, so we'd still update our own references.
- **The portfolio's repo name will break.** The site repo is named after the username (`holroydchase-afk.github.io`). Renaming the account doesn't rename it, so we'd rename that repo too and check the chaseholroyd.com custom domain still deploys.
- **A few of our own references need updating.** The CLAUDE.md files in every repo point at `holroydchase-afk/studio-agents`, and the CI checks and agent syncs use that path too. I can do that cleanup in one pass once the new name is set.

What do you want the new name to be? Tell me the name and I'll tell you when to hit the button. I'll have the reference updates ready. Nothing goes live until you say go.

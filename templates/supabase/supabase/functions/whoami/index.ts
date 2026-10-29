// Example function: the caller's orgs and role in each, read under row-level security.
// Copy it as the shape for new functions, then delete it.
import { HttpError, serve } from '../_shared/http.ts';
import { must, userClient } from '../_shared/db.ts';

serve(async (req) => {
  const db = userClient(req);
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new HttpError(401, 'Sign in again');
  const orgs = must(await db.from('members').select('org_id, role, orgs(name)').eq('user_id', user.id));
  return { orgs };
});

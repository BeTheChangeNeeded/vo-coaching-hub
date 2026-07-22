// Identity for the frontend: signed-in email + role (admin / coach / coachee).
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  const p = ws.principal(req);
  if (!p) { context.res = { status: 200, body: { signedIn: false } }; return; }
  const email = ws.emailOf(p);
  const role = ws.roleOf(email);
  context.res = { status: 200, body: { signedIn: true, email, role, isCoach: role === 'coach' || role === 'admin', isAdmin: role === 'admin' } };
};

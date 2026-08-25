const User = require('../models/User');

let cachedDefaultUserId = null;

/**
 * Returns the ObjectId of the single default user, creating it on first use.
 *
 * The whole app currently runs in single-user mode: every book is attached
 * to this user. When real auth is introduced later, replace calls to this
 * function with `req.user._id` from an auth middleware — the Book schema
 * already references `userId` generically, so no migration is needed.
 */
const getDefaultUserId = async () => {
  if (cachedDefaultUserId) {
    return cachedDefaultUserId;
  }

  const email = process.env.DEFAULT_USER_EMAIL || 'default@storyapp.local';
  const name = process.env.DEFAULT_USER_NAME || 'Default User';

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({ name, email, isDefault: true });
    console.log(`Seeded default user: ${email} (${user._id})`);
  }

  cachedDefaultUserId = user._id;
  return cachedDefaultUserId;
};

module.exports = { getDefaultUserId };

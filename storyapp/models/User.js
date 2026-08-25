const mongoose = require('mongoose');

/**
 * User model.
 *
 * Auth is not enforced yet (single default user mode), but the schema is
 * built out fully so real signup/login can be turned on later without a
 * breaking migration. `passwordHash` is optional for that reason.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null // null while auth is not enforced
    },
    isDefault: {
      type: Boolean,
      default: false // marks the seeded single-user-mode account
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    /** Login handle (globally unique, lowercase), e.g. "trakanksha". Usable instead of email to sign in. */
    username: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "owner",
        "admin",
        "manager",
        "supervisor",
        "sales_executive",
        "telecaller",
        "field_executive",
        "channel_partner",
        "viewer",
      ],
      default: "sales_executive",
      index: true,
    },
    title: String,
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    /** Per-user grants/revokes on top of the role template (see lib/permissions). */
    permissionOverrides: {
      allow: { type: [String], default: undefined },
      deny: { type: [String], default: undefined },
    },
    /** Overrides the role's data visibility (all | team | own). Unset = role default. */
    dataScope: { type: String, enum: ["all", "team", "own"] },
    status: { type: String, enum: ["active", "invited", "suspended", "deleted"], default: "active", index: true },
    /** When the user was suspended (shown as "Inactive date"). */
    inactiveAt: Date,
    /** Soft delete — hidden from pickers, restorable from Users → Deleted. */
    deletedAt: Date,
    region: String,
    /** On leave: skipped by lead distribution until `holidayUntil` (if set). */
    onHoliday: { type: Boolean, default: false },
    holidayUntil: Date,
    lastLoginAt: Date,
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedAt: Date,
    preferences: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
      density: { type: String, enum: ["comfortable", "compact"], default: "comfortable" },
      defaultLandingPage: { type: String, default: "/dashboard" },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

UserSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

const User = (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

export default User;

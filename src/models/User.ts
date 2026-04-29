import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
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
    status: { type: String, enum: ["active", "invited", "suspended"], default: "active", index: true },
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

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

const User = (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

export default User;

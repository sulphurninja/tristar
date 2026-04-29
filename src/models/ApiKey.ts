import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Project-scoped API keys. External integrations (Walk-in kiosk, partner
 * lead-feed) authenticate by sending the key in `Authorization: Bearer …`.
 *
 * The `key` field is the public identifier; `secretHash` stores a bcrypt
 * hash of the secret half, so only the holder ever sees the full secret.
 */
const ApiKeySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    /* Source: which channel the key represents — Walkin, ChannelPartner, Telecaller… */
    sourceKey: { type: String, required: true, trim: true, index: true },
    sourceLabel: { type: String, required: true, trim: true },

    /* User on whose behalf leads land in the system */
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, trim: true },

    /* Project the key is bound to (leads default to this project) */
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    projectName: { type: String, trim: true },

    /* The 24-char public identifier (e.g. ac67c23aaaf1d629…) */
    key: { type: String, required: true, unique: true, index: true },
    /* bcrypt hash of the secret half (only stored, never returned) */
    secretHash: { type: String, select: false },

    isActive: { type: Boolean, default: true, index: true },
    lastUsedAt: Date,
    expiresAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ApiKeySchema.index({ workspaceId: 1, sourceKey: 1 });
ApiKeySchema.index({ workspaceId: 1, projectId: 1 });

export type ApiKeyDoc = InferSchemaType<typeof ApiKeySchema> & {
  _id: mongoose.Types.ObjectId;
};

const ApiKey =
  (mongoose.models.ApiKey as Model<ApiKeyDoc>) ||
  mongoose.model<ApiKeyDoc>("ApiKey", ApiKeySchema);

export default ApiKey;

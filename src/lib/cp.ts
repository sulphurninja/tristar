import mongoose from "mongoose";
import Broker from "@/models/Broker";
import CpCompany from "@/models/CpCompany";

/** Next sequential numeric id (max + 1) for a workspace. Callers retry on duplicate-key races. */
export async function nextCompanyId(workspaceId: mongoose.Types.ObjectId) {
  const last = await CpCompany.findOne({ workspaceId }).sort({ companyId: -1 }).select("companyId").lean();
  return (last?.companyId ?? 0) + 1;
}

export async function nextCpId(workspaceId: mongoose.Types.ObjectId) {
  const last = await Broker.findOne({ workspaceId, cpId: { $exists: true } })
    .sort({ cpId: -1 })
    .select("cpId")
    .lean();
  return (last?.cpId ?? 0) + 1;
}

export function oid(v: unknown) {
  return typeof v === "string" && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined;
}

export function str(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() : undefined;
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

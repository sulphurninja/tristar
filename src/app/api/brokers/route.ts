import mongoose from "mongoose";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
  };
  if (status && status !== "all") filter.status = status;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { firmName: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { cpCode: { $regex: q, $options: "i" } },
    ];
  }

  const brokers = await Broker.find(filter)
    .sort({ totalDealsBooked: -1, createdAt: -1 })
    .limit(200)
    .lean();

  return ok({ brokers });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || !body.phone) return bad("Name and phone are required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const dup = await Broker.findOne({ workspaceId, phone: body.phone });
  if (dup) return bad("A broker with this phone already exists.");

  /* Generate CP code */
  const count = await Broker.countDocuments({ workspaceId });
  const cpCode = `CP-${String(count + 1).padStart(4, "0")}`;

  const broker = await Broker.create({
    workspaceId,
    cpCode,
    name: body.name,
    firmName: body.firmName,
    email: body.email,
    phone: body.phone,
    rera: body.rera ?? {},
    panNumber: body.panNumber,
    gstNumber: body.gstNumber,
    location: body.location ?? {},
    status: body.status ?? "active",
    notes: body.notes,
    tags: body.tags ?? [],
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ broker }, { status: 201 });
});

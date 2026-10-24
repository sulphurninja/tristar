import mongoose from "mongoose";
import CpCompany from "@/models/CpCompany";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";
import { nextCompanyId, escapeRegex, str } from "@/lib/cp";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const exportAll = url.searchParams.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    const or: Record<string, unknown>[] = [
      { name: rx },
      { owner: rx },
      { mobile: rx },
      { email: rx },
      { category: rx },
      { reraNumber: rx },
      { address: rx },
    ];
    if (/^\d+$/.test(q)) or.push({ companyId: Number(q) });
    filter.$or = or;
  }

  const [companies, total] = await Promise.all([
    CpCompany.find(filter)
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1, companyId: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CpCompany.countDocuments(filter),
  ]);

  const counts = await Broker.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: { workspaceId, companyId: { $in: companies.map((c) => c._id) } } },
    { $group: { _id: "$companyId", n: { $sum: 1 } } },
  ]);
  const cm = new Map(counts.map((c) => [String(c._id), c.n]));

  return ok({ companies: companies.map((c) => ({ ...c, cpCount: cm.get(String(c._id)) ?? 0 })), total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const name = str(body.name);
  if (!name) return bad("Company name is required.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const company = await CpCompany.create({
        workspaceId,
        companyId: await nextCompanyId(workspaceId),
        name,
        owner: str(body.owner) || undefined,
        mobile: str(body.mobile) || undefined,
        email: str(body.email) || undefined,
        category: str(body.category) || undefined,
        reraNumber: str(body.reraNumber) || undefined,
        address: str(body.address) || undefined,
        createdBy: new mongoose.Types.ObjectId(session.userId),
      });
      return ok({ company }, { status: 201 });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  return bad("Could not allocate a company id, try again.", 500);
});

import mongoose from "mongoose";
import Broker from "@/models/Broker";
import CpCompany from "@/models/CpCompany";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Booking from "@/models/Booking";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { resolveAgentScope, scopeParams } from "@/lib/scope";
import { escapeRegex, nextCpId, oid, str } from "@/lib/cp";

type Oid = mongoose.Types.ObjectId;

/** Build the base filter shared by the list, the stat cards and bulk actions. */
async function baseFilter(workspaceId: Oid, url: URL) {
  const sp = url.searchParams;
  const filter: Record<string, unknown> = { workspaceId };
  const status = sp.get("status") ?? "";
  if (status && status !== "all") filter.status = status;
  const stage = sp.get("stage") ?? "";
  if (stage) filter.stage = stage;

  const { team, agent } = scopeParams(url);
  const manager = sp.get("sourcingManager");
  const scope = await resolveAgentScope(workspaceId, team, manager || agent);
  if (scope) filter.sourcingManagerId = { $in: scope };
  if (manager === "none") filter.sourcingManagerId = { $exists: false };

  const companyId = oid(sp.get("companyId"));
  if (companyId) filter.companyId = companyId;

  const category = sp.get("category")?.trim();
  if (category) {
    const comps = await CpCompany.find({ workspaceId, category }).select("_id").lean();
    const ids = comps.map((c) => c._id);
    filter.companyId = filter.companyId ? { $in: ids.filter((i) => String(i) === String(filter.companyId)) } : { $in: ids };
  }
  const rera = sp.get("rera");
  if (rera === "yes") filter["rera.number"] = { $exists: true, $nin: ["", null] };
  if (rera === "no") filter.$and = [{ $or: [{ "rera.number": { $exists: false } }, { "rera.number": "" }] }];

  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      d.setHours(0, 0, 0, 0);
      if (!Number.isNaN(d.getTime())) createdAt.$gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      if (!Number.isNaN(d.getTime())) createdAt.$lte = d;
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;
  }

  const q = sp.get("q")?.trim() ?? "";
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    const or: Record<string, unknown>[] = [
      { name: rx },
      { firmName: rx },
      { phone: rx },
      { email: rx },
      { cpCode: rx },
      { "rera.number": rx },
    ];
    if (/^\d+$/.test(q)) or.push({ cpId: Number(q) });
    const comps = await CpCompany.find({ workspaceId, name: rx }).select("_id").lean();
    if (comps.length) or.push({ companyId: { $in: comps.map((c) => c._id) } });
    filter.$and = [...((filter.$and as unknown[]) ?? []), { $or: or }];
  }
  return filter;
}

/** Id sets that drive the four stat cards. */
async function cardSets(workspaceId: Oid, baseIds: Oid[]) {
  const now = new Date();
  const inBase = { $in: baseIds };
  const [touchedBroker, completed, future, overdue, uncontactedLeads] = await Promise.all([
    Broker.find({ workspaceId, _id: inBase, lastContactedAt: { $exists: true } })
      .select("_id")
      .lean(),
    Task.distinct("brokerId", { workspaceId, brokerId: inBase, status: "completed" }),
    Task.distinct("brokerId", {
      workspaceId,
      brokerId: inBase,
      status: { $in: ["pending", "upcoming"] },
      scheduleAt: { $gte: now },
    }),
    Task.distinct("brokerId", {
      workspaceId,
      brokerId: inBase,
      status: { $in: ["pending", "upcoming"] },
      scheduleAt: { $lt: now },
    }),
    Lead.aggregate<{ _id: Oid; n: number }>([
      { $match: { workspaceId, brokerId: inBase, lastContactedAt: { $exists: false } } },
      { $group: { _id: "$brokerId", n: { $sum: 1 } } },
    ]),
  ]);
  const contacted = new Set<string>([...touchedBroker.map((b) => String(b._id)), ...completed.map(String)]);
  const futureSet = new Set(future.map(String));
  const overdueSet = new Set(overdue.map(String));
  const untouched = baseIds.filter((i) => !contacted.has(String(i)));
  const noFollowups = baseIds.filter((i) => contacted.has(String(i)) && !futureSet.has(String(i)));
  return {
    leads: { ids: uncontactedLeads.map((l) => l._id), count: uncontactedLeads.reduce((s, l) => s + l.n, 0) },
    untouched: { ids: untouched, count: untouched.length },
    nofollowup: { ids: noFollowups, count: noFollowups.length },
    overdue: { ids: [...overdueSet].map((s) => new mongoose.Types.ObjectId(s)), count: overdueSet.size },
  };
}

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const exportAll = sp.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 500);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const dir = sp.get("sort") === "asc" ? 1 : -1;

  const filter = await baseFilter(workspaceId, url);

  // Cards are computed against the team/agent-scoped set, ignoring the card filter itself.
  const baseIds = (await Broker.find(filter).select("_id").lean()).map((b) => b._id);
  const cards = await cardSets(workspaceId, baseIds);
  const card = sp.get("card");
  if (card === "leads" || card === "untouched" || card === "nofollowup" || card === "overdue") {
    filter._id = { $in: cards[card].ids };
  }

  const [brokers, total] = await Promise.all([
    Broker.find(filter)
      .sort({ cpId: dir, createdAt: dir })
      .skip(skip)
      .limit(limit)
      .populate({ path: "companyId", select: "companyId name category reraNumber" })
      .populate({ path: "sourcingManagerId", select: "name" })
      .lean(),
    Broker.countDocuments(filter),
  ]);

  // Per-partner "Leads / Project / SV / Booking" counters.
  const ids = brokers.map((b) => b._id);
  const [leadRows, bookingRows] = await Promise.all([
    Lead.find({ workspaceId, brokerId: { $in: ids } })
      .select("_id brokerId interestedProjects primaryProjectId")
      .lean(),
    Booking.aggregate<{ _id: Oid; n: number }>([
      { $match: { workspaceId, brokerId: { $in: ids } } },
      { $group: { _id: "$brokerId", n: { $sum: 1 } } },
    ]),
  ]);
  const leadsOf = new Map<string, Oid[]>();
  const leadBroker = new Map<string, string>();
  const projectsOf = new Map<string, Set<string>>();
  for (const l of leadRows as unknown as Array<{
    _id: Oid;
    brokerId: Oid;
    primaryProjectId?: Oid;
    interestedProjects?: Oid[];
  }>) {
    const k = String(l.brokerId);
    (leadsOf.get(k) ?? leadsOf.set(k, []).get(k)!).push(l._id);
    leadBroker.set(String(l._id), k);
    const ps = projectsOf.get(k) ?? projectsOf.set(k, new Set()).get(k)!;
    if (l.primaryProjectId) ps.add(String(l.primaryProjectId));
    for (const p of l.interestedProjects ?? []) ps.add(String(p));
  }
  const visitRows = leadRows.length
    ? await SiteVisit.aggregate<{ _id: Oid; n: number }>([
        { $match: { workspaceId, leadId: { $in: leadRows.map((l) => l._id) } } },
        { $group: { _id: "$leadId", n: { $sum: 1 } } },
      ])
    : [];
  const svOf = new Map<string, number>();
  for (const v of visitRows) {
    const k = leadBroker.get(String(v._id));
    if (k) svOf.set(k, (svOf.get(k) ?? 0) + v.n);
  }
  const bkOf = new Map(bookingRows.map((b) => [String(b._id), b.n]));

  const rows = brokers.map((b) => {
    const k = String(b._id);
    const company = b.companyId && typeof b.companyId === "object" && "name" in b.companyId ? b.companyId : null;
    const sm = b.sourcingManagerId && typeof b.sourcingManagerId === "object" && "name" in b.sourcingManagerId ? b.sourcingManagerId : null;
    return {
      ...b,
      companyId: company ? (company as { _id: Oid })._id : b.companyId,
      company,
      sourcingManager: sm ? { _id: (sm as { _id: Oid })._id, name: (sm as { name: string }).name } : null,
      sourcingManagerId: sm ? (sm as { _id: Oid })._id : b.sourcingManagerId,
      counts: {
        leads: leadsOf.get(k)?.length ?? 0,
        projects: projectsOf.get(k)?.size ?? 0,
        sv: svOf.get(k) ?? 0,
        bookings: bkOf.get(k) ?? 0,
      },
    };
  });

  return ok({
    brokers: rows,
    total,
    cards: {
      leads: cards.leads.count,
      untouched: cards.untouched.count,
      nofollowup: cards.nofollowup.count,
      overdue: cards.overdue.count,
    },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const name = str(body.name);
  const phone = str(body.phone);
  if (!name) return bad("Contact person is required.");
  if (!phone) return bad("Mobile is required.");
  const email = str(body.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const dup = await Broker.findOne({ workspaceId, phone });
  if (dup) return bad("A channel partner with this mobile already exists.");

  let companyId = oid(body.companyId);
  let firmName = str(body.firmName);
  if (companyId) {
    const c = await CpCompany.findOne({ _id: companyId, workspaceId }).lean();
    if (!c) return bad("Selected company not found.");
    firmName = c.name;
  } else companyId = undefined;

  let sourcingManagerId = oid(body.sourcingManagerId);
  if (sourcingManagerId && !(await User.exists({ _id: sourcingManagerId, workspaceId }))) {
    return bad("Selected sourcing manager not found.");
  }
  if (!sourcingManagerId) sourcingManagerId = undefined;

  const loc = (body.location ?? {}) as Record<string, unknown>;
  const rera = (body.rera ?? {}) as Record<string, unknown>;
  const bank = (body.bankAccount ?? {}) as Record<string, unknown>;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const cpId = await nextCpId(workspaceId);
      const broker = await Broker.create({
        workspaceId,
        cpId,
        cpCode: `CP-${String(cpId).padStart(4, "0")}`,
        name,
        firmName: firmName || undefined,
        companyId,
        email: email || undefined,
        phone,
        altPhone: str(body.altPhone) || undefined,
        sourcingManagerId,
        assignedAt: sourcingManagerId ? new Date() : undefined,
        rmId: sourcingManagerId,
        stage: str(body.stage) || "Open",
        rera: { number: str(rera.number) || undefined, state: str(rera.state) || undefined },
        panNumber: str(body.panNumber) || undefined,
        gstNumber: str(body.gstNumber) || undefined,
        bankAccount: {
          accountHolder: str(bank.accountHolder) || undefined,
          accountNumber: str(bank.accountNumber) || undefined,
          ifsc: str(bank.ifsc) || undefined,
          bankName: str(bank.bankName) || undefined,
        },
        location: {
          addressLine: str(loc.addressLine) || undefined,
          locality: str(loc.locality) || undefined,
          city: str(loc.city) || undefined,
          state: str(loc.state) || undefined,
          pincode: str(loc.pincode) || undefined,
        },
        status: typeof body.status === "string" && ["active", "blacklisted", "inactive", "pending_kyc"].includes(body.status) ? body.status : "active",
        notes: str(body.notes) || undefined,
        createdBy: new mongoose.Types.ObjectId(session.userId),
      });
      return ok({ broker }, { status: 201 });
    } catch (e) {
      const err = e as { code?: number; keyPattern?: Record<string, unknown> };
      if (err.code === 11000 && err.keyPattern && "phone" in err.keyPattern) {
        return bad("A channel partner with this mobile already exists.");
      }
      if (err.code !== 11000) throw e;
    }
  }
  return bad("Could not create channel partner, try again.", 500);
});

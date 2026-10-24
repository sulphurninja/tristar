"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdInput,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
} from "@/components/bd";
import { downloadCsv } from "@/lib/csv";

interface UserItem {
  _id: string;
  name: string;
  role: string;
  teamId?: string | null;
  status: string;
}
interface TeamItem {
  _id: string;
  name: string;
  description?: string;
  leaderId?: string | null;
  memberCount: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; team: TeamItem | null }>({ open: false, team: null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/teams", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([t, u]) => {
        setTeams(t.teams ?? []);
        setUsers(u.users ?? []);
      })
      .catch(() => toast.error("Couldn't load teams"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const userName = useMemo(() => new Map(users.map((u) => [u._id, u.name])), [users]);
  const membersOf = useCallback(
    (teamId: string) => users.filter((u) => String(u.teamId ?? "") === teamId).map((u) => u.name),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (userName.get(String(t.leaderId ?? "")) ?? "").toLowerCase().includes(q),
    );
  }, [teams, search, userName]);
  useEffect(() => setPage(1), [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const remove = async (t: TeamItem) => {
    if (!confirm(`Delete team "${t.name}"? Its ${t.memberCount} member(s) will be left without a team.`)) return;
    const res = await fetch(`/api/teams/${t._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Team deleted");
      load();
    } else toast.error(d.error || "Couldn't delete team");
  };

  return (
    <BdPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Teams</h1>
        <div className="flex gap-2">
          <BdButton
            variant="light"
            onClick={() =>
              downloadCsv("teams", [
                ["Team", "Team Leader", "Members", "Member Names"],
                ...filtered.map((t) => [
                  t.name,
                  userName.get(String(t.leaderId ?? "")) ?? "",
                  t.memberCount,
                  membersOf(t._id).join("; "),
                ]),
              ])
            }
          >
            <Download className="size-3.5" /> Export CSV
          </BdButton>
          <BdButton onClick={() => setDialog({ open: true, team: null })}>
            <Plus className="size-3.5" /> Add Team
          </BdButton>
        </div>
      </div>

      <BdCard>
        <BdTableToolbar
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
        <BdTable minWidth={760}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              <BdTh>Team Name</BdTh>
              <BdTh>Team Leader</BdTh>
              <BdTh className="text-right">Members</BdTh>
              <BdTh>Member Names</BdTh>
              <BdTh className="text-right">Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <BdEmptyRow colSpan={6} loading={loading} />
            ) : (
              paged.map((t, i) => {
                const names = membersOf(t._id);
                return (
                  <tr key={t._id}>
                    <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                    <BdTd>
                      <p className="font-medium">{t.name}</p>
                      {t.description ? <p className="text-[11.5px] text-[#8b90a0]">{t.description}</p> : null}
                    </BdTd>
                    <BdTd>{userName.get(String(t.leaderId ?? "")) ?? "-"}</BdTd>
                    <BdTd className="text-right tabular-nums">{t.memberCount}</BdTd>
                    <BdTd className="max-w-[320px] truncate text-[#5a6072]" >
                      <span title={names.join(", ")}>{names.length ? names.join(", ") : "-"}</span>
                    </BdTd>
                    <BdTd className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setDialog({ open: true, team: t })}
                          className="rounded p-1.5 text-[#3a5dc2] hover:bg-[#eef1fa]"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => remove(t)}
                          className="rounded p-1.5 text-[#e5484d] hover:bg-[#fdecec]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </BdTd>
                  </tr>
                );
              })
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <TeamDialog
        open={dialog.open}
        team={dialog.team}
        users={users}
        teams={teams}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        onSaved={load}
      />
    </BdPage>
  );
}

function TeamDialog({
  open,
  team,
  users,
  teams,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  team: TeamItem | null;
  users: UserItem[];
  teams: TeamItem[];
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(team?.name ?? "");
    setDescription(team?.description ?? "");
    setLeaderId(String(team?.leaderId ?? ""));
    setMembers(new Set(team ? users.filter((u) => String(u.teamId ?? "") === team._id).map((u) => u._id) : []));
    setFilter("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, team]);

  const teamName = useMemo(() => new Map(teams.map((t) => [t._id, t.name])), [teams]);
  const candidates = users
    .filter((u) => u.status !== "suspended")
    .filter((u) => u.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const toggle = (id: string) =>
    setMembers((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    if (!name.trim()) return toast.error("Team name is required.");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description,
        leaderId: leaderId || null,
        memberIds: [...members],
      };
      const res = await fetch(team ? `/api/teams/${team._id}` : "/api/teams", {
        method: team ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) return toast.error(d.error || "Couldn't save team.");
      toast.success(team ? "Team updated" : "Team created");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Add Team"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <BdField label="Team Name">
            <BdInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
          </BdField>
          <BdField label="Team Leader">
            <BdSelect
              placeholder="Select Team Leader"
              value={leaderId}
              onChange={setLeaderId}
              options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
            />
          </BdField>
          <BdField label="Description">
            <BdInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </BdField>
          <BdField label={`Members (${members.size} selected)`}>
            <BdInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search users" className="mb-2" />
            <div className="max-h-[220px] overflow-y-auto rounded-[3px] border border-[#dfe3ee]">
              {candidates.length === 0 ? (
                <p className="p-3 text-[13px] text-[#8b90a0]">No users</p>
              ) : (
                candidates.map((u) => {
                  const other = u.teamId && String(u.teamId) !== team?._id ? teamName.get(String(u.teamId)) : null;
                  return (
                    <label
                      key={u._id}
                      className="flex cursor-pointer items-center gap-3 border-b border-[#eef0f6] px-3 py-2 text-[13px] last:border-0 hover:bg-[#f6f8fd]"
                    >
                      <input
                        type="checkbox"
                        checked={members.has(u._id)}
                        onChange={() => toggle(u._id)}
                        className="size-4 accent-[#3a5dc2]"
                      />
                      <span className="flex-1">{u.name}</span>
                      {other ? <span className="text-[11.5px] text-[#8b90a0]">currently in {other}</span> : null}
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[11.5px] text-[#8b90a0]">A user belongs to one team; selecting someone moves them here.</p>
          </BdField>
        </div>
        <DialogFooter>
          <BdButton variant="light" onClick={() => onOpenChange(false)}>
            Cancel
          </BdButton>
          <BdButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : team ? "Save Changes" : "Create Team"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

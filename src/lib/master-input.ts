type Body = Record<string, unknown>;

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? undefined : Number(v));

/** Clean the editable fields of a master entry from a request body. */
export function masterFields(b: Body) {
  return {
    name: str(b.name, 120),
    code: str(b.code, 40),
    color: str(b.color, 20),
    description: str(b.description, 500),
    url: str(b.url, 1000),
    min: num(b.min),
    max: num(b.max),
  };
}

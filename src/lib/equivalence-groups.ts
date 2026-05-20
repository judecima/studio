import { promises as fs } from "fs";
import path from "path";

export type EquivalenceGroup = {
  id: string;
  name: string;
  panelIds: string[];
};

const groupsPath = path.join(process.cwd(), "data", "dev-db", "equivalence-groups.json");

function cleanGroup(input: Partial<EquivalenceGroup>): EquivalenceGroup {
  return {
    id: String(input.id || "").trim(),
    name: String(input.name || "").trim(),
    panelIds: Array.isArray(input.panelIds)
      ? input.panelIds.map((id) => String(id).trim()).filter(Boolean)
      : [],
  };
}

export async function readEquivalenceGroups(): Promise<EquivalenceGroup[]> {
  try {
    const raw = await fs.readFile(groupsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(cleanGroup).filter((group) => group.id && group.name);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      await writeEquivalenceGroups([]);
      return [];
    }
    throw error;
  }
}

export async function writeEquivalenceGroups(groups: EquivalenceGroup[]) {
  await fs.mkdir(path.dirname(groupsPath), { recursive: true });
  const cleanGroups = groups.map(cleanGroup).filter((group) => group.id && group.name);
  await fs.writeFile(groupsPath, `${JSON.stringify(cleanGroups, null, 2)}\n`, "utf8");
}

export function parseEquivalenceGroup(input: unknown): EquivalenceGroup {
  const group = cleanGroup((input || {}) as Partial<EquivalenceGroup>);
  if (!group.id) throw new Error("El id del grupo es obligatorio.");
  if (!group.name) throw new Error("El nombre del grupo es obligatorio.");
  return group;
}

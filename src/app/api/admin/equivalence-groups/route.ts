import { NextRequest, NextResponse } from "next/server";
import {
  parseEquivalenceGroup,
  readEquivalenceGroups,
  writeEquivalenceGroups,
} from "@/lib/equivalence-groups";

export async function GET() {
  const groups = await readEquivalenceGroups();
  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  try {
    const group = parseEquivalenceGroup(await request.json());
    const groups = await readEquivalenceGroups();

    if (groups.some((item) => item.id === group.id)) {
      return NextResponse.json({ error: "Ya existe un grupo con ese id." }, { status: 409 });
    }

    await writeEquivalenceGroups([...groups, group]);
    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo guardar el grupo." }, { status: 400 });
  }
}

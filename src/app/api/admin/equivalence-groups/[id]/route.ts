import { NextRequest, NextResponse } from "next/server";
import {
  parseEquivalenceGroup,
  readEquivalenceGroups,
  writeEquivalenceGroups,
} from "@/lib/equivalence-groups";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const groups = await readEquivalenceGroups();
  const group = groups.find((item) => item.id === id);

  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const group = { ...parseEquivalenceGroup(await request.json()), id };
    const groups = await readEquivalenceGroups();
    const index = groups.findIndex((item) => item.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    const nextGroups = [...groups];
    nextGroups[index] = group;
    await writeEquivalenceGroups(nextGroups);
    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo guardar el grupo." }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const groups = await readEquivalenceGroups();
  const nextGroups = groups.filter((item) => item.id !== id);

  if (nextGroups.length === groups.length) {
    return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
  }

  await writeEquivalenceGroups(nextGroups);
  return NextResponse.json({ ok: true });
}

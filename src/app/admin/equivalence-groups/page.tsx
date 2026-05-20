"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";
import {
  Box,
  Checkbox as MuiCheckbox,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from "@mui/material";
import { Edit2, Layers3, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Panel } from "@/lib/types";
import type { EquivalenceGroup } from "@/lib/equivalence-groups";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function PanelRow({ panel }: { panel: Panel }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {panel.hexColor && (
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-slate-200"
          style={{ backgroundColor: panel.hexColor }}
        />
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{panel.name}</span>
        <span className="block truncate text-xs text-slate-500">{panel.brand}</span>
      </span>
    </div>
  );
}

function TransferPanelList({
  title,
  panels,
  checked,
  onToggle,
}: {
  title: string;
  panels: Panel[];
  checked: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Paper elevation={0} className="h-[420px] w-full overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <Badge variant="secondary">{panels.length}</Badge>
      </div>
      <Divider />
      <List dense component="div" role="list" sx={{ height: 366, overflow: "auto", padding: 0 }}>
        {panels.map((panel) => {
          const labelId = `transfer-list-${title}-${panel.id}`;
          return (
            <ListItemButton key={panel.id} role="listitem" onClick={() => onToggle(panel.id)}>
              <ListItemIcon>
                <MuiCheckbox
                  checked={checked.includes(panel.id)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={<PanelRow panel={panel} />} />
            </ListItemButton>
          );
        })}
        {panels.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">Sin paneles</div>
        )}
      </List>
    </Paper>
  );
}

export default function EquivalenceGroupsAdminPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<EquivalenceGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [panelIds, setPanelIds] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "panels"), orderBy("name", "asc"));
  }, [db]);

  const { data: panels, isLoading: isLoadingPanels } = useCollection<Panel>(panelsQuery);

  async function loadGroups() {
    setIsLoadingGroups(true);
    try {
      const response = await fetch("/api/admin/equivalence-groups");
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los grupos.", variant: "destructive" });
    } finally {
      setIsLoadingGroups(false);
    }
  }

  useEffect(() => {
    setEditGroupId(new URLSearchParams(window.location.search).get("edit"));
    loadGroups();
  }, []);

  useEffect(() => {
    if (isLoadingGroups || !editGroupId) return;

    const group = groups.find((item) => item.id === editGroupId);
    if (group) startEdit(group);
  }, [groups, isLoadingGroups, editGroupId]);

  const normalizedSearch = search.trim().toLowerCase();
  const panelMap = useMemo(() => new Map((panels || []).map((panel) => [panel.id, panel])), [panels]);

  const filteredPanels = useMemo(() => {
    const source = panels || [];
    if (!normalizedSearch) return source;
    return source.filter((panel) =>
      [panel.name, panel.brand, panel.id, panel.code].some((value) =>
        value?.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [panels, normalizedSearch]);

  const leftPanels = filteredPanels.filter((panel) => !panelIds.includes(panel.id));
  const rightPanels = panelIds.map((panelId) => panelMap.get(panelId)).filter(Boolean) as Panel[];
  const leftChecked = checked.filter((panelId) => !panelIds.includes(panelId));
  const rightChecked = checked.filter((panelId) => panelIds.includes(panelId));

  function resetForm() {
    setEditingId(null);
    setId("");
    setName("");
    setPanelIds([]);
    setChecked([]);
    setSearch("");
  }

  function startCreate() {
    resetForm();
  }

  function startEdit(group: EquivalenceGroup) {
    setEditingId(group.id);
    setId(group.id);
    setName(group.name);
    setPanelIds(group.panelIds);
    setChecked([]);
  }

  function toggleChecked(panelId: string) {
    setChecked((current) =>
      current.includes(panelId) ? current.filter((item) => item !== panelId) : [...current, panelId]
    );
  }

  function moveSelectedToRight() {
    setPanelIds((current) => [...current, ...leftChecked.filter((panelId) => !current.includes(panelId))]);
    setChecked((current) => current.filter((panelId) => !leftChecked.includes(panelId)));
  }

  function moveSelectedToLeft() {
    setPanelIds((current) => current.filter((panelId) => !rightChecked.includes(panelId)));
    setChecked((current) => current.filter((panelId) => !rightChecked.includes(panelId)));
  }

  async function saveGroup() {
    const cleanName = name.trim();
    const cleanId = id.trim();

    if (!cleanId || !cleanName) {
      toast({ title: "Faltan datos", description: "Completá id y nombre.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/equivalence-groups/${editingId}` : "/api/admin/equivalence-groups",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cleanId, name: cleanName, panelIds }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "No se pudo guardar el grupo.");
      }

      await loadGroups();
      resetForm();
      toast({ title: "Grupo guardado" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo guardar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGroup(group: EquivalenceGroup) {
    if (!confirm(`Eliminar el grupo "${group.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/equivalence-groups/${group.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el grupo.");
      await loadGroups();
      if (editingId === group.id) resetForm();
      toast({ title: "Grupo eliminado" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo eliminar.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Grupos de equivalencia</h1>
          <p className="text-sm text-muted-foreground">Equivalencias manuales por grupo de paneles.</p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Crear grupo
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden border bg-white">
          <div className="border-b p-4">
            <h2 className="font-bold text-slate-900">Grupos existentes</h2>
          </div>
          {isLoadingGroups ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No hay grupos guardados.</div>
          ) : (
            <div className="max-h-[620px] divide-y overflow-y-auto">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => startEdit(group)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-bold text-slate-900">{group.name}</span>
                    <span className="block truncate text-xs text-slate-400">{group.id}</span>
                    <span className="mt-1 block text-xs text-slate-500">{group.panelIds.length} paneles</span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(group)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteGroup(group)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{editingId ? "Editar grupo" : "Nuevo grupo"}</h2>
                <p className="text-xs text-slate-500">Seleccioná los integrantes del grupo.</p>
              </div>
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Nombre</label>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!editingId && !id) setId(`grupo-${slugify(event.target.value)}`);
                }}
                placeholder="Almendra"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">ID</label>
              <Input
                value={id}
                onChange={(event) => setId(slugify(event.target.value))}
                disabled={Boolean(editingId)}
                placeholder="grupo-almendra"
              />
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar panel por nombre, marca, código o id..."
              className="pl-10"
            />
          </div>

          {isLoadingPanels ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando paneles
            </div>
          ) : (
            <Box className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
              <TransferPanelList
                title="Paneles disponibles"
                panels={leftPanels}
                checked={checked}
                onToggle={toggleChecked}
              />
              <div className="flex justify-center gap-2 lg:flex-col">
                <Button type="button" variant="outline" onClick={moveSelectedToRight} disabled={leftChecked.length === 0}>
                  &gt;
                </Button>
                <Button type="button" variant="outline" onClick={moveSelectedToLeft} disabled={rightChecked.length === 0}>
                  &lt;
                </Button>
              </div>
              <TransferPanelList
                title="Integrantes del grupo"
                panels={rightPanels}
                checked={checked}
                onToggle={toggleChecked}
              />
            </Box>
          )}

          <div className="mt-5 flex justify-end">
            <Button onClick={saveGroup} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar grupo
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

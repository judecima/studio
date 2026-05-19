import { promises as fs } from "fs";
import path from "path";
import type { Panel } from "@/lib/types";
import type { PanelsRepository } from "./panels-repository";
import { validateAndNormalizePanelRecord } from "./validate-panel-record";

const DEV_DB_DIR = path.join(process.cwd(), "data", "dev-db");
const PANELS_FILE = path.join(DEV_DB_DIR, "panels.json");

async function readPanelsFile(): Promise<Panel[]> {
  const raw = await fs.readFile(PANELS_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("data/dev-db/panels.json must contain an array");
  }

  return parsed.map((record) => validateAndNormalizePanelRecord(record).panel);
}

async function writePanelsFile(panels: Panel[]): Promise<void> {
  await fs.mkdir(DEV_DB_DIR, { recursive: true });
  const tmpFile = `${PANELS_FILE}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify(panels, null, 2)}\n`, "utf8");
  await fs.rename(tmpFile, PANELS_FILE);
}

export class JsonPanelsRepository implements PanelsRepository {
  async getAllPanels(): Promise<Panel[]> {
    return readPanelsFile();
  }

  async getPanelById(id: string): Promise<Panel | null> {
    const panels = await readPanelsFile();
    return panels.find((panel) => panel.id === id) ?? null;
  }

  async upsertPanel(panel: Panel): Promise<void> {
    const panels = await readPanelsFile();
    const index = panels.findIndex((current) => current.id === panel.id);
    const normalized = validateAndNormalizePanelRecord(panel).panel;

    if (index >= 0) {
      panels[index] = normalized;
    } else {
      panels.push(normalized);
    }

    await writePanelsFile(panels);
  }

  async updatePanel(id: string, patch: Partial<Panel>): Promise<void> {
    const panels = await readPanelsFile();
    const index = panels.findIndex((panel) => panel.id === id);

    if (index < 0) {
      throw new Error(`Panel not found: ${id}`);
    }

    panels[index] = validateAndNormalizePanelRecord({
      ...panels[index],
      ...patch,
      id,
    }).panel;

    await writePanelsFile(panels);
  }
}

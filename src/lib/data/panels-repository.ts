import type { Panel } from "@/lib/types";

export interface PanelsRepository {
  getAllPanels(): Promise<Panel[]>;
  getPanelById(id: string): Promise<Panel | null>;
  upsertPanel(panel: Panel): Promise<void>;
  updatePanel(id: string, patch: Partial<Panel>): Promise<void>;
}

import type { PanelsRepository } from "./panels-repository";
import { FirestorePanelsRepository } from "./firestore-panels-repository";
import { JsonPanelsRepository } from "./json-panels-repository";

export type PanelDbDriver = "firestore" | "json";

export function getPanelDbDriver(): PanelDbDriver {
  return process.env.PANEL_DB_DRIVER === "json" ? "json" : "firestore";
}

export function getPanelsRepository(): PanelsRepository {
  return getPanelDbDriver() === "json"
    ? new JsonPanelsRepository()
    : new FirestorePanelsRepository();
}

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import type { Panel } from "@/lib/types";
import type { PanelsRepository } from "./panels-repository";
import { validateAndNormalizePanelRecord } from "./validate-panel-record";

export class FirestorePanelsRepository implements PanelsRepository {
  private getDb() {
    return initializeFirebase().firestore;
  }

  async getAllPanels(): Promise<Panel[]> {
    const snap = await getDocs(collection(this.getDb(), "panels"));
    return snap.docs.map((panelDoc) =>
      validateAndNormalizePanelRecord({
        ...panelDoc.data(),
        id: panelDoc.id,
      }).panel
    );
  }

  async getPanelById(id: string): Promise<Panel | null> {
    const snap = await getDoc(doc(this.getDb(), "panels", id));
    if (!snap.exists()) return null;

    return validateAndNormalizePanelRecord({
      ...snap.data(),
      id: snap.id,
    }).panel;
  }

  async upsertPanel(panel: Panel): Promise<void> {
    const normalized = validateAndNormalizePanelRecord(panel).panel;
    await setDoc(doc(this.getDb(), "panels", normalized.id), normalized, { merge: true });
  }

  async updatePanel(id: string, patch: Partial<Panel>): Promise<void> {
    await updateDoc(doc(this.getDb(), "panels", id), patch);
  }
}

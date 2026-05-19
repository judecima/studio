import { promises as fs } from "fs";
import path from "path";
import { collection, getDocs } from "firebase/firestore";
import { initializeFirebase } from "../src/firebase";

type JsonRecord = Record<string, unknown>;

const DEV_DB_DIR = path.join(process.cwd(), "data", "dev-db");
const PANELS_FILE = path.join(DEV_DB_DIR, "panels.json");
const PANELS_TMP_FILE = path.join(DEV_DB_DIR, "panels.json.tmp");
const EQUIVALENCES_FILE = path.join(DEV_DB_DIR, "equivalences.json");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeManualFields(panel: JsonRecord): JsonRecord {
  return {
    ...panel,
    manualVerifiedMatches:
      panel.manualVerifiedMatches === undefined || panel.manualVerifiedMatches === null
        ? []
        : panel.manualVerifiedMatches,
    manualRejectedMatches:
      panel.manualRejectedMatches === undefined || panel.manualRejectedMatches === null
        ? []
        : panel.manualRejectedMatches,
    manualAffinity:
      panel.manualAffinity === undefined || panel.manualAffinity === null
        ? {}
        : panel.manualAffinity,
  };
}

function collectWarnings(panel: JsonRecord): string[] {
  const id = typeof panel.id === "string" ? panel.id : "(sin id)";
  const warnings: string[] = [];

  if (typeof panel.id !== "string" || panel.id.trim() === "") {
    warnings.push("panel sin id");
  }

  if (typeof panel.name !== "string" || panel.name.trim() === "") {
    warnings.push(`panel ${id} sin name`);
  }

  if (typeof panel.hexColor !== "string" || panel.hexColor.trim() === "") {
    warnings.push(`panel ${id} sin hexColor`);
  }

  if (!isRecord(panel.labColor)) {
    warnings.push(`panel ${id} sin labColor`);
  }

  if (!Array.isArray(panel.manualVerifiedMatches)) {
    warnings.push(`panel ${id} con manualVerifiedMatches que no es array`);
  }

  if (!Array.isArray(panel.manualRejectedMatches)) {
    warnings.push(`panel ${id} con manualRejectedMatches que no es array`);
  }

  if (!isRecord(panel.manualAffinity)) {
    warnings.push(`panel ${id} con manualAffinity que no es object`);
  }

  return warnings;
}

function hasValue(panel: JsonRecord, field: string): boolean {
  const value = panel[field];
  return value !== undefined && value !== null && value !== "";
}

async function ensureEquivalencesFile(): Promise<void> {
  try {
    await fs.access(EQUIVALENCES_FILE);
  } catch {
    await fs.writeFile(EQUIVALENCES_FILE, "[]\n", "utf8");
  }
}

async function main() {
  const { firestore } = initializeFirebase();
  const snap = await getDocs(collection(firestore, "panels"));
  const warnings: string[] = [];

  const panels = snap.docs.map((panelDoc) => {
    const panel = normalizeManualFields({
      ...panelDoc.data(),
      id: panelDoc.id,
    });

    warnings.push(...collectWarnings(panel));
    return panel;
  });

  await fs.mkdir(DEV_DB_DIR, { recursive: true });
  await fs.writeFile(PANELS_TMP_FILE, `${JSON.stringify(panels, null, 2)}\n`, "utf8");
  await fs.rename(PANELS_TMP_FILE, PANELS_FILE);
  await ensureEquivalencesFile();

  const summaryFields = [
    "hexColor",
    "labColor",
    "colorParent",
    "colorSub",
    "colorHue",
    "surfaceTexture",
    "finish",
    "materialType",
    "directionality",
    "colorGroup",
    "manualVerifiedMatches",
    "manualRejectedMatches",
    "manualAffinity",
  ];

  console.log("Exportación finalizada:");
  console.log(`- Paneles exportados: ${panels.length}`);
  console.log("- Archivo generado: data/dev-db/panels.json");
  for (const field of summaryFields) {
    console.log(`- Con ${field}: ${panels.filter((panel) => hasValue(panel, field)).length}`);
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Advertencias:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error("Error exportando panels desde Firestore:");
  console.error(error);
  process.exit(1);
});

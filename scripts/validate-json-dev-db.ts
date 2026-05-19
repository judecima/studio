import { promises as fs } from "fs";
import path from "path";
import { validateAndNormalizePanelRecord } from "../src/lib/data/validate-panel-record";

type JsonRecord = Record<string, unknown>;

const PANELS_FILE = path.join(process.cwd(), "data", "dev-db", "panels.json");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(record: JsonRecord, field: string): boolean {
  const value = record[field];
  return value !== undefined && value !== null && value !== "";
}

function groupCounts(records: JsonRecord[], field: string): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, record) => {
    const raw = record[field];
    const key = typeof raw === "string" && raw.trim() !== "" ? raw : "(vacio)";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function printGroup(title: string, counts: Record<string, number>) {
  console.log(title);
  for (const [key, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${key}: ${count}`);
  }
}

async function main() {
  const raw = await fs.readFile(PANELS_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("data/dev-db/panels.json must contain an array");
  }

  const records = parsed.filter(isRecord);
  const invalidTopLevelCount = parsed.length - records.length;
  const warnings: string[] = [];
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const record of parsed) {
    try {
      const result = validateAndNormalizePanelRecord(record);
      for (const warning of result.warnings) warnings.push(warning);

      if (seen.has(result.panel.id)) {
        duplicated.add(result.panel.id);
      } else {
        seen.add(result.panel.id);
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (invalidTopLevelCount > 0) {
    warnings.push(`${invalidTopLevelCount} registros no son objetos JSON`);
  }

  const withManualVerified = records.filter((record) => Array.isArray(record.manualVerifiedMatches)).length;
  const withManualRejected = records.filter((record) => Array.isArray(record.manualRejectedMatches)).length;
  const withManualAffinity = records.filter((record) => isRecord(record.manualAffinity)).length;

  console.log("Validación JSON dev-db:");
  console.log(`- Cantidad total: ${parsed.length}`);
  console.log(`- IDs duplicados: ${duplicated.size === 0 ? "ninguno" : Array.from(duplicated).join(", ")}`);
  console.log(`- Con hexColor: ${records.filter((record) => hasValue(record, "hexColor")).length}`);
  console.log(`- Con labColor: ${records.filter((record) => hasValue(record, "labColor")).length}`);
  console.log(`- Con manualVerifiedMatches: ${withManualVerified}`);
  console.log(`- Con manualRejectedMatches: ${withManualRejected}`);
  console.log(`- Con manualAffinity: ${withManualAffinity}`);
  console.log("");
  printGroup("Cantidad por surfaceTexture:", groupCounts(records, "surfaceTexture"));
  console.log("");
  printGroup("Cantidad por finish:", groupCounts(records, "finish"));
  console.log("");
  printGroup("Cantidad por colorHue:", groupCounts(records, "colorHue"));

  if (warnings.length > 0) {
    console.log("");
    console.log("Advertencias:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error("Error validando data/dev-db/panels.json:");
  console.error(error);
  process.exit(1);
});

import { promises as fs } from "fs";
import path from "path";
import type { Equivalence } from "@/lib/types";

const DEV_DB_DIR = path.join(process.cwd(), "data", "dev-db");
const EQUIVALENCES_FILE = path.join(DEV_DB_DIR, "equivalences.json");

export async function saveJsonEquivalences(equivalences: Equivalence[]): Promise<void> {
  await fs.mkdir(DEV_DB_DIR, { recursive: true });
  const tmpFile = `${EQUIVALENCES_FILE}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify(equivalences, null, 2)}\n`, "utf8");
  await fs.rename(tmpFile, EQUIVALENCES_FILE);
}

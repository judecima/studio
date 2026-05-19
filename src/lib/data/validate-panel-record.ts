import type { Panel } from "@/lib/types";

export type PanelValidationResult = {
  panel: Panel;
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNumericLab(value: unknown): value is { l: number; a: number; b: number } {
  if (!isRecord(value)) return false;
  return (
    typeof value.l === "number" &&
    Number.isFinite(value.l) &&
    typeof value.a === "number" &&
    Number.isFinite(value.a) &&
    typeof value.b === "number" &&
    Number.isFinite(value.b)
  );
}

export function validateAndNormalizePanelRecord(record: unknown): PanelValidationResult {
  const warnings: string[] = [];

  if (!isRecord(record)) {
    throw new Error("Panel record must be an object");
  }

  const id = record.id;
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Panel record is missing required string id");
  }

  const normalized: Record<string, unknown> = { ...record, id };

  if (typeof normalized.name !== "string" || normalized.name.trim() === "") {
    warnings.push(`panel ${id} sin name`);
  }

  if (normalized.hexColor !== undefined && normalized.hexColor !== null && typeof normalized.hexColor !== "string") {
    warnings.push(`panel ${id} con hexColor invalido`);
  }

  if (normalized.labColor !== undefined && normalized.labColor !== null && !hasNumericLab(normalized.labColor)) {
    warnings.push(`panel ${id} con labColor invalido`);
  }

  if (normalized.manualVerifiedMatches === undefined || normalized.manualVerifiedMatches === null) {
    normalized.manualVerifiedMatches = [];
  } else if (!Array.isArray(normalized.manualVerifiedMatches)) {
    warnings.push(`panel ${id} con manualVerifiedMatches que no es array`);
    normalized.manualVerifiedMatches = [];
  }

  if (normalized.manualRejectedMatches === undefined || normalized.manualRejectedMatches === null) {
    normalized.manualRejectedMatches = [];
  } else if (!Array.isArray(normalized.manualRejectedMatches)) {
    warnings.push(`panel ${id} con manualRejectedMatches que no es array`);
    normalized.manualRejectedMatches = [];
  }

  if (normalized.manualAffinity === undefined || normalized.manualAffinity === null) {
    normalized.manualAffinity = {};
  } else if (!isRecord(normalized.manualAffinity)) {
    warnings.push(`panel ${id} con manualAffinity que no es object`);
    normalized.manualAffinity = {};
  }

  return {
    panel: normalized as Panel,
    warnings,
  };
}

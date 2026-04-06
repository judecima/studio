"use server"

import { classify as engineClassify } from "@/lib/equivalences/engine";
import { Panel, ClassifiedPanel } from "@/lib/types";

export async function classifyPanel(panel: Panel): Promise<ClassifiedPanel> {
  try {
    return await engineClassify(panel);
  } catch (error) {
    console.error("Error in classifyPanel Server Action:", error);
    throw error;
  }
}

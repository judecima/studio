import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";

export type ColorGroupRecord = {
  id: string;
  name: string;
  lab: { l: number; a: number; b: number };
  sampleCount: number;
};

export async function replaceFirestoreColorGroups(colorGroups: ColorGroupRecord[]): Promise<void> {
  const db = initializeFirebase().firestore;
  const groupsSnap = await getDocs(collection(db, "color_groups"));

  for (const groupDoc of groupsSnap.docs) {
    await deleteDoc(doc(db, "color_groups", groupDoc.id));
  }

  for (const colorGroup of colorGroups) {
    await setDoc(doc(db, "color_groups", colorGroup.id), colorGroup);
  }
}

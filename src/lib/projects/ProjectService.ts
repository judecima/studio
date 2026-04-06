import { initializeFirebase } from "@/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs,
  Timestamp 
} from "firebase/firestore";
import { Panel } from "@/lib/types";

export interface KitchenProject {
  id?: string;
  name: string;
  upperPanel: {
    id: string;
    name: string;
    brand: string;
    mainImage: string;
  };
  lowerPanel: {
    id: string;
    name: string;
    brand: string;
    mainImage: string;
  };
  createdAt: any;
}

export class ProjectService {
  private static getCollection() {
    const { firestore } = initializeFirebase();
    return collection(firestore, "projects");
  }

  static async saveProject(name: string, upper: Panel, lower: Panel) {
    const projectCol = this.getCollection();
    
    const projectData = {
      name,
      upperPanel: {
        id: upper.id,
        name: upper.name,
        brand: upper.brand,
        mainImage: upper.mainImage
      },
      lowerPanel: {
        id: lower.id,
        name: lower.name,
        brand: lower.brand,
        mainImage: lower.mainImage
      },
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(projectCol, projectData);
    return docRef.id;
  }

  static async getProjects(): Promise<KitchenProject[]> {
    const projectCol = this.getCollection();
    const q = query(projectCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as KitchenProject));
  }
}

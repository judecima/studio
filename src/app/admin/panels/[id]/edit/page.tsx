
"use client"

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PanelForm } from "@/components/admin/PanelForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function EditPanelContent() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const searchParams = useSearchParams();
  const collectionName = searchParams.get('collection') || 'panels';

  const panelRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, collectionName, id as string);
  }, [db, id, collectionName]);

  const { data: panel, isLoading, error } = useDoc<Panel>(panelRef);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Recuperando ficha técnica...</p>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Volver
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No pudimos encontrar el panel con ID: <code className="font-bold">{id}</code>. 
            Es posible que el documento haya sido eliminado o el ID sea incorrecto.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} size="icon">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold">Editar Panel</h1>
          <p className="text-muted-foreground">Actualiza las especificaciones técnicas de <span className="text-foreground font-bold">{panel.name}</span></p>
        </div>
      </div>

      <div className="max-w-4xl">
        <PanelForm mode="edit" initialData={panel} collectionName={collectionName} />
      </div>
    </div>
  );
}

export default function EditPanelPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted-foreground">Cargando editor...</div>}>
      <EditPanelContent />
    </Suspense>
  );
}

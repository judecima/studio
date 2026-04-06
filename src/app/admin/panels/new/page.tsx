
"use client"

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PanelForm } from "@/components/admin/PanelForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

function NewPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionName = searchParams.get('collection') || 'panels';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} size="icon">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold">Crear Nuevo {collectionName === 'panels' ? 'Panel' : 'Canto'}</h1>
          <p className="text-muted-foreground">Ingresa el nombre y usa la IA para autocompletar el resto.</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <PanelForm mode="create" collectionName={collectionName} />
      </div>
    </div>
  );
}

export default function NewPanelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando formulario...</div>}>
      <NewPanelContent />
    </Suspense>
  );
}

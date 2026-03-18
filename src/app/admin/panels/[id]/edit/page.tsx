
"use client"

import { useParams, useRouter } from "next/navigation";
import { MOCK_PANELS } from "@/services/mock-data";
import { PanelForm } from "@/components/admin/PanelForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function EditPanelPage() {
  const { id } = useParams();
  const router = useRouter();
  const panel = MOCK_PANELS.find(p => p.id === id);

  if (!panel) return <div>No encontrado</div>;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} size="icon">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold">Editar Panel</h1>
          <p className="text-muted-foreground">Modifica los detalles del panel seleccionado.</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <PanelForm mode="edit" initialData={panel} />
      </div>
    </div>
  );
}

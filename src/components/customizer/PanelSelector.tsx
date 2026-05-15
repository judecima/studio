"use client";

import React, { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy, where } from 'firebase/firestore';
import { Panel } from '@/lib/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Check } from "lucide-react";
import Image from 'next/image';

interface PanelSelectorProps {
  label: string;
  selectedPanel: Panel | null;
  onSelect: (panel: Panel) => void;
  zone: 'upper' | 'lower';
}

export default function PanelSelector({ label, selectedPanel, onSelect, zone }: PanelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState<'all' | 'Egger' | 'Faplac'>('all');
  
  const db = useFirestore();
  const panelsRef = db ? collection(db, 'panels') : null;
  
  // Consulta memorizada requerida por useCollection
  const panelsQuery = useMemoFirebase(() => {
    if (!panelsRef) return null;
    return query(panelsRef, orderBy('name'), limit(100));
  }, [panelsRef]);

  const { data: panels, isLoading } = useCollection<Panel>(panelsQuery);

  const filteredPanels = panels?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === 'all' || p.brand === brandFilter;
    return matchesSearch && matchesBrand;
  }) || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div 
            className={`
              relative group cursor-pointer overflow-hidden rounded-xl border-2 transition-all
              ${selectedPanel ? 'border-primary shadow-lg shadow-primary/10' : 'border-dashed border-muted-foreground/30 hover:border-primary/50'}
              p-4 bg-card
            `}
            onClick={() => setOpen(true)}
          >
            {selectedPanel ? (
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                  <Image 
                    src={selectedPanel.mainImage || "/placeholder.png"} 
                    alt={selectedPanel.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{selectedPanel.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{selectedPanel.brand}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{selectedPanel.surfaceTexture}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center text-muted-foreground italic">
                Haz clic para seleccionar material
              </div>
            )}
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-background/80 shadow-sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogTrigger>

        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader className="p-6 pb-2 border-b border-border/10">
            <DialogTitle className="text-2xl font-headline font-bold">Catálogo de Materiales</DialogTitle>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar madera, liso, marca..." 
                  className="pl-10 bg-muted/50 border-none focus-visible:ring-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={brandFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setBrandFilter('all')}
                  className="h-10"
                >Todas</Button>
                <Button 
                  variant={brandFilter === 'Egger' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setBrandFilter('Egger')}
                  className="h-10"
                >Egger</Button>
                <Button 
                  variant={brandFilter === 'Faplac' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setBrandFilter('Faplac')}
                  className="h-10"
                >Faplac</Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPanels.map((panel) => (
                  <div 
                    key={panel.id}
                    className={`
                      relative group cursor-pointer overflow-hidden rounded-xl border transition-all hover:scale-105 active:scale-95
                      ${selectedPanel?.id === panel.id ? 'border-primary ring-2 ring-primary/20' : 'border-border/50 hover:border-primary/50'}
                      bg-card
                    `}
                    onClick={() => {
                      onSelect(panel);
                      setOpen(false);
                    }}
                  >
                    <div className="aspect-square relative">
                      <Image 
                        src={panel.mainImage || "/placeholder.png"} 
                        alt={panel.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                      {selectedPanel?.id === panel.id && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                            <Check className="h-6 w-6 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center">
                      <p className="text-xs font-bold truncate px-1">{panel.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{panel.brand}</p>
                    </div>
                  </div>
                ))}
                
                {filteredPanels.length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-2">
                    <p className="text-xl font-bold opacity-20">No encontramos materiales</p>
                    <p className="text-muted-foreground">Intenta con otros términos de búsqueda.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface CabinetProps {
  position: [number, number, number];
  textureUrl: string;
  dimensions?: [number, number, number];
  color?: string;
}

function Cabinet({ position, textureUrl, dimensions = [0.6, 0.6, 0.5], color = '#fff' }: CabinetProps) {
  // Fallback si no hay URL
  const finalUrl = textureUrl || 'https://placehold.co/400x400?text=Sin+Textura';
  const texture = useTexture(finalUrl);
  
  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
  }

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial 
        map={texture} 
        color={color} 
        roughness={0.4} 
        metalness={0.05} 
      />
    </mesh>
  );
}

interface Kitchen3DProps {
  upperPanelUrl: string;
  lowerPanelUrl: string;
}

export default function Kitchen3D({ upperPanelUrl, lowerPanelUrl }: Kitchen3DProps) {
  return (
    <div className="w-full h-[500px] bg-slate-900/10 rounded-xl overflow-hidden border border-border/50 shadow-inner">
      <Canvas shadows camera={{ position: [2, 1.5, 3], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6} shadows={{ type: 'contact', opacity: 0.4, blur: 2 }}>
            {/* Suelo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#eeeeee" roughness={0.9} />
            </mesh>

            {/* Pared trasera */}
            <mesh position={[0, 0.5, -1.2]} receiveShadow>
              <boxGeometry args={[4, 2.5, 0.1]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>

            {/* Módulo inferior (Base cabinets) */}
            <Cabinet
              position={[0, -0.2, -0.8]}
              textureUrl={lowerPanelUrl}
              dimensions={[2.4, 0.85, 0.6]}
            />

            {/* Mesada (Countertop) */}
            <mesh position={[0, 0.25, -0.8]} castShadow receiveShadow>
              <boxGeometry args={[2.45, 0.04, 0.65]} />
              <meshStandardMaterial color="#333" roughness={0.2} metalness={0.8} />
            </mesh>

            {/* Módulo superior (Wall cabinets) */}
            <Cabinet
              position={[0, 0.85, -0.85]}
              textureUrl={upperPanelUrl}
              dimensions={[2.4, 0.7, 0.35]}
            />

            {/* Tiradores (Handles) - Inferiores */}
            <mesh position={[0.4, 0.15, -0.48]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
              <meshStandardMaterial color="#666" metalness={1} roughness={0} />
            </mesh>
            <mesh position={[-0.4, 0.15, -0.48]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
              <meshStandardMaterial color="#666" metalness={1} roughness={0} />
            </mesh>
          </Stage>
        </Suspense>
        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

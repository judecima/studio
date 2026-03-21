"use client"

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email?: string;
  role: string;
  createdAt?: string;
}

export default function UserManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = collection(db, "users");
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(userList);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (db) {
      fetchUsers();
    }
  }, [db]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Rol actualizado", description: `El usuario ahora es ${newRole}.` });
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({ title: "Error", description: "No se pudo actualizar el rol.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">Administra los permisos de acceso y el nivel de control (RBAC) de todos los operadores del sistema.</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Permisos Globales
          </CardTitle>
          <CardDescription>
            Solo los administradores pueden invocar los scrapers. Solo un admin (tú) puede cambiar roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No se encontraron cuentas de usuario inicializadas.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold">Email / UID</th>
                    <th className="px-6 py-4 font-bold">Rol Vigente</th>
                    <th className="px-6 py-4 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{user.email || 'Usuario Anónimo'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">{user.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'administrador' ? 'bg-blue-100 text-blue-800' : 
                            user.role === 'vendedor' ? 'bg-emerald-100 text-emerald-800' : 
                            'bg-slate-100 text-slate-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Select 
                          value={user.role} 
                          onValueChange={(val) => handleRoleChange(user.id, val)}
                          disabled={updatingId === user.id}
                        >
                          <SelectTrigger className="w-[180px] ml-auto">
                            <SelectValue placeholder="Seleccionar Rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cliente">Cliente (Público)</SelectItem>
                            <SelectItem value="vendedor">Vendedor</SelectItem>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="admin">Admin (Super)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <h4 className="flex gap-2 items-center text-amber-800 font-bold mb-2">
          <ShieldAlert className="h-4 w-4" /> Notas de Seguridad
        </h4>
        <ul className="text-sm text-amber-900/80 space-y-1 ml-6 list-disc">
          <li>Los usuarios "Clientes" solo pueden ver el front-end público.</li>
          <li>Los "Vendedores" pueden armar cotizaciones pero tienen bloqueadas las mutaciones masivas (ej. Importadores).</li>
          <li>Los "Administradores" pueden lanzar los Scrapers interactivos hacia Firebase de Faplac y Egger.</li>
          <li>Los "Admin" (tú) son dueños del sistema y pueden degradar/ascender usuarios aquí.</li>
        </ul>
      </div>
    </div>
  );
}

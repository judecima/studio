'use client'

import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  UserCog,
  Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  type ManagedUser,
} from '@/lib/user-actions';
import type { UserRole } from '@/lib/auth-config';

export default function AccountsPage() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Diálogo crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('usuario');
  const [saving, setSaving] = useState(false);

  // Diálogo eliminar
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const result = await adminListUsers();
    if (result.success) {
      setUsers(result.data || []);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditing(null);
    setFormUsername('');
    setFormPassword('');
    setFormPhone('');
    setFormRole('usuario');
    setDialogOpen(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const result = await adminUpdateUser(editing.uid, {
          username: formUsername,
          password: formPassword || undefined,
          role: formRole,
          phone: formPhone,
        });
        if (result.success) {
          toast({ title: 'Usuario actualizado' });
          setDialogOpen(false);
          await loadUsers();
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
      } else {
        const result = await adminCreateUser(formUsername, formPassword, formRole, formPhone);
        if (result.success) {
          toast({ title: 'Usuario creado', description: `@${formUsername}` });
          setDialogOpen(false);
          await loadUsers();
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await adminDeleteUser(deleteTarget.uid);
      if (result.success) {
        toast({ title: 'Usuario eliminado' });
        setDeleteTarget(null);
        await loadUsers();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === 'administrador').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Alta, edición y baja de cuentas. Los administradores pueden crear otros administradores.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      <Card className="p-4 border shadow-sm bg-white">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario..."
              className="pl-10 h-10 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="h-10 px-4 rounded-md font-mono">
            {isLoading ? '...' : `${users.length} usuarios`}
          </Badge>
          <Badge variant="outline" className="h-10 px-4 rounded-md font-mono border-primary/30 text-primary">
            {adminCount} admin
          </Badge>
        </div>
      </Card>

      <Card className="overflow-hidden border shadow-sm bg-white">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Cargando usuarios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 flex flex-col items-center gap-4 text-center">
            <UserCog className="h-12 w-12 text-slate-200" />
            <p className="text-sm font-bold">No se encontraron usuarios.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 border-b">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase">Usuario</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Teléfono</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Rol</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Estado</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isSelf = currentUser?.username === u.username;
                return (
                  <TableRow key={u.uid} className="hover:bg-slate-50/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">
                          {u.username}
                          {isSelf && (
                            <span className="ml-2 text-[9px] font-bold uppercase text-slate-400">(vos)</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 font-mono">{u.phone || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {u.role === 'administrador' ? (
                        <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                          <ShieldCheck className="h-3 w-3" /> Administrador
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-600">
                          Usuario
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold uppercase text-green-600">Activo</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() => openEdit(u)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-red-600 disabled:opacity-30"
                          disabled={isSelf}
                          title={isSelf ? 'No podés eliminar tu propia cuenta' : 'Eliminar'}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Diálogo Crear / Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modificá los datos del usuario. Dejá la contraseña vacía para no cambiarla.'
                : 'Completá los datos para crear una nueva cuenta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="form-username">Usuario o Email</Label>
              <Input
                id="form-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="usuario o email@dominio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-phone">
                Teléfono <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="form-phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+54 11 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-password">
                Contraseña {editing && <span className="text-slate-400 font-normal">(opcional)</span>}
              </Label>
              <Input
                id="form-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editing ? 'Dejar vacío para mantener' : '••••••••'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-role">Rol</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                <SelectTrigger id="form-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuario</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la cuenta de{' '}
              <span className="font-bold">{deleteTarget?.username}</span>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

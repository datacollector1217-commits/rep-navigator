import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface UserRow {
  user_id: string;
  full_name: string;
  vehicle_number: string | null;
  phone: string | null;
  role: string | null;
}

export default function UserManagement() {
  const { user, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "rep" | "manager">("rep");
  const [newPassword, setNewPassword] = useState("");
  const [newVehicle, setNewVehicle] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, vehicle_number, phone");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));
    const merged = (profiles || []).map((p) => ({
      ...p,
      role: roleMap.get(p.user_id) || null,
    }));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const allSelected = users.length > 0 && users.every(u => selectedUsers.has(u.user_id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      // Exclude current user from select all? Or allow but block delete later. 
      // Safest to just select all and block batch delete if own ID is in it, or filter it out silently.
      // I'll select all.
      const newSelected = new Set(users.map(u => u.user_id));
      setSelectedUsers(newSelected);
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedUsers(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    if (user && selectedUsers.has(user.id)) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${selectedUsers.size} users? This will revoke their access immediately.`)) return;

    setSubmitting(true);
    const ids = Array.from(selectedUsers);

    // 1. Delete user_roles
    const { error: roleError } = await supabase.from("user_roles").delete().in("user_id", ids);

    if (roleError) {
      console.error("Delete roles error:", roleError);
      toast.error("Failed to remove permissions: " + roleError.message);
      setSubmitting(false);
      return;
    }

    // 2. Delete profiles
    const { error: profileError } = await supabase.from("profiles").delete().in("user_id", ids);

    if (profileError) {
      console.error("Delete profiles error:", profileError);
      toast.warning("Roles removed, but failed to remove profiles (likely due to linked data). User access is revoked.");
    } else {
      toast.success(`Successfully removed ${ids.length} users.`);
    }

    setSelectedUsers(new Set());
    fetchUsers(false);
    setSubmitting(false);
  };

  const handleSaveUser = async () => {
    if (!newName) return;
    setSubmitting(true);

    if (newPhone && newPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      setSubmitting(false);
      return;
    }

    try {
      if (editingUser) {
        // Update existing user profile and role
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: newName,
            vehicle_number: newVehicle || null,
            phone: newPhone || null,
          })
          .eq("user_id", editingUser.user_id);

        if (profileError) throw profileError;

        // Update role if changed
        if (editingUser.role !== newRole) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: newRole })
            .eq("user_id", editingUser.user_id);

          if (roleError) {
            console.error("Role update failed:", roleError);
            if (roleError.message.includes("manager") || roleError.message.includes("enum")) {
              throw new Error("Database enum missing 'manager'. Run: ALTER TYPE app_role ADD VALUE 'manager';");
            }
            throw roleError;
          }
        }

        toast.success("User updated successfully!");
        closeDialog();
        fetchUsers(false);
      } else {
        // Create new user
        if (!newEmail || !newPassword) {
          toast.error("Email and password are required for new users");
          setSubmitting(false);
          return;
        }

        // Create a temporary client to sign up the new user without logging out the admin
        // IMPORTANT: Must disable session persistence to avoid overwriting the admin's session in localStorage
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: newEmail,
          password: newPassword,
          options: {
            data: {
              full_name: newName,
              vehicle_number: newVehicle || null,
              phone: newPhone || null,
              role: newRole,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user");

        // Set the role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: newRole,
        });

        if (roleError) {
          console.error("Role assignment failed:", roleError);
          if (roleError.message.includes("manager") || roleError.message.includes("enum")) {
            toast.error(
              "Database Error: 'checklist' enum missing 'manager'. Please run: ALTER TYPE app_role ADD VALUE 'manager';"
            );
          } else {
            toast.error("User created but failed to assign role: " + roleError.message);
          }
        } else {
          toast.success("User created successfully!");
          if (!authData.session) {
            toast.info("Please ask the user to verify their email if required.");
          }
        }
        closeDialog();
        fetchUsers(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = () => {
    setEditingUser(null);
    setNewEmail("");
    setNewName("");
    setNewPassword("");
    setNewVehicle("");
    setNewPhone("");
    setNewRole("rep");
    setShowAdd(true);
  };

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user);
    setNewEmail(""); // Cannot edit email easily
    setNewName(user.full_name);
    setNewPassword(""); // Cannot edit password easily
    setNewVehicle(user.vehicle_number || "");
    setNewPhone(user.phone || "");
    setNewRole((user.role as "admin" | "rep" | "manager") || "rep");
    setShowAdd(true);
  };

  const closeDialog = () => {
    setShowAdd(false);
    setEditingUser(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            User Management ({users.length})
          </CardTitle>
          <div className="flex gap-2 items-center">
            {selectedUsers.size > 0 && currentUserRole === "admin" && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected ({selectedUsers.size})
              </Button>
            )}
            {currentUserRole === "admin" && (
              <Button onClick={openAddDialog} className="gradient-navy text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {currentUserRole === "admin" && (
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={allSelected && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="popLayout">
                  {users.map((u) => (
                    <motion.tr
                      key={u.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      transition={{ duration: 0.2 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      {currentUserRole === "admin" && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(u.user_id)}
                            onChange={() => toggleSelectUser(u.user_id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-semibold">{u.full_name}</TableCell>
                      <TableCell>{u.vehicle_number || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : u.role === "manager" ? "outline" : "secondary"}>
                          {u.role || "No role"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {currentUserRole === "admin" && (
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Full Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
            </div>

            {!editingUser && (
              <>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Email *</label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@ekway.lk" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Password *</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Vehicle Number</label>
                <Input value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)} placeholder="WP CAX-1234" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Phone</label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="077xxxxxxx"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "rep" | "manager")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep">Sales Rep</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveUser} disabled={submitting} className="gradient-navy text-primary-foreground">
              {submitting ? "Saving..." : (editingUser ? "Save Changes" : "Create User")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

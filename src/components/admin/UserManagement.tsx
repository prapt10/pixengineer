import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-custom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";

interface UserData {
  user_id: string;
  free_credits: number;
  credit_balance: number;
  is_active: boolean;
  created_at: string;
  generation_count: number;
}

interface UserManagementProps {
  users: UserData[];
  isLoading: boolean;
}

export default function UserManagement({ users, isLoading }: UserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({ credit_balance: 0, free_credits: 0, is_active: true });
  const [saving, setSaving] = useState(false);

  const openEdit = (u: UserData) => {
    setEditUser(u);
    setFormData({ credit_balance: u.credit_balance, free_credits: u.free_credits, is_active: u.is_active });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        credit_balance: formData.credit_balance,
        free_credits: formData.free_credits,
        is_active: formData.is_active,
      } as any)
      .eq("user_id", editUser.user_id);

    setSaving(false);
    if (error) {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated successfully" });
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    }
  };

  return (
    <>
      <Card className="glass overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Loading…</p>
          ) : users.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-center">Generations</TableHead>
                  <TableHead className="text-center">Credit Balance</TableHead>
                  <TableHead className="text-center">Free Credits</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-xs">{u.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{u.generation_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{u.credit_balance}</TableCell>
                    <TableCell className="text-center">{u.free_credits}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={u.is_active ? "default" : "destructive"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground font-mono">{editUser?.user_id}</p>
            <div className="space-y-2">
              <Label>Credit Balance</Label>
              <Input
                type="number"
                value={formData.credit_balance}
                onChange={(e) => setFormData((p) => ({ ...p, credit_balance: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Free Credits</Label>
              <Input
                type="number"
                value={formData.free_credits}
                onChange={(e) => setFormData((p) => ({ ...p, free_credits: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

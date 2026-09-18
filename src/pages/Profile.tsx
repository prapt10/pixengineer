import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase-custom";
import { setPageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { z } from "zod";

const displayNameSchema = z.string().trim().min(1, "Name is required").max(60, "Max 60 characters");
const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(8, "Min 8 characters").max(128);

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: "Profile Settings — Pix Engineer",
      description: "Manage your Pix Engineer profile: display name, avatar, email, password, and account.",
      path: "/profile",
    });
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName((profile as any).display_name ?? "");
      setAvatarPath((profile as any).avatar_url ?? null);
    }
    if (user?.email) setEmail(user.email);
  }, [profile, user]);

  useEffect(() => {
    let cancelled = false;
    async function signUrl() {
      if (!avatarPath) { setAvatarUrl(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    }
    signUrl();
    return () => { cancelled = true; };
  }, [avatarPath]);

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    // Remove previous avatar file
    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path } as any)
      .eq("user_id", user.id);
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
    } else {
      setAvatarPath(path);
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Avatar updated" });
    }
    setUploading(false);
  }

  async function saveDisplayName() {
    if (!user) return;
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data } as any)
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Profile saved" });
    }
  }

  async function saveEmail() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (parsed.data === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data },
      { emailRedirectTo: `${window.location.origin}/profile` }
    );
    setSavingEmail(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Confirmation sent",
        description: "Check both your old and new inboxes to confirm the change.",
      });
    }
  }

  async function savePassword() {
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.rpc("delete_own_account" as any);
    if (error) {
      setDeleting(false);
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    await signOut();
    toast({ title: "Account deleted" });
    navigate("/");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container max-w-3xl px-4 space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your display name and avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-border">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change avatar"
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:opacity-90"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                PNG, JPG or WEBP.<br />Max 2MB.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <div className="flex gap-2">
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                />
                <Button onClick={saveDisplayName} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Changing your email requires confirmation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={saveEmail} disabled={savingEmail || email === user.email}>
                {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Use at least 8 characters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button onClick={savePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove your profile, credits, chats, prompts, and generations.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

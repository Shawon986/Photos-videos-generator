"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { CheckCircle2, KeyRound, LogOut, Server, UserRound, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";

interface SettingsPanelProps {
  userName: string;
  userEmail: string;
  aiStatus: {
    demoMode: boolean;
    image: { realProvider: boolean; demoFallback: boolean; mode: string };
    video: { realProvider: boolean; demoFallback: boolean; mode: string };
  };
  limits: { imagesPerHour: number; videosPerHour: number };
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Server className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      {ok ? (
        <span className="flex items-center gap-1.5 font-medium text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Connected
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-medium text-amber-300">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Demo fallback
        </span>
      )}
    </div>
  );
}

export function SettingsPanel({ userName, userEmail, aiStatus, limits }: SettingsPanelProps) {
  const [name, setName] = React.useState(userName);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiRequest("/api/user/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8 lg:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Your <span className="text-gradient">Settings</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Profile, security and AI provider status.</p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-violet-300" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>
              Signed in as <span className="text-foreground">{userEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name"
                />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-violet-300" aria-hidden="true" />
              Change password
            </CardTitle>
            <CardDescription>
              Passwords are hashed with bcrypt — never stored in plaintext.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void savePassword(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters, with a letter and a number"
                />
              </div>
              <Button type="submit" disabled={savingPassword || !currentPassword || !newPassword}>
                {savingPassword ? "Saving…" : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-violet-300" aria-hidden="true" />
              AI provider status
            </CardTitle>
            <CardDescription>
              {aiStatus.demoMode
                ? "Demo mode is enabled — results are labelled previews until a real provider is configured."
                : "Demo mode is disabled — generations fail unless a real provider is reachable."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              ok={aiStatus.image.realProvider}
              label={`Image provider (${aiStatus.image.mode})`}
            />
            <StatusRow
              ok={aiStatus.video.realProvider}
              label={`Video provider (${aiStatus.video.mode})`}
            />
            <p className="pt-1 text-xs text-muted-foreground">
              Hourly limits for your account: {limits.imagesPerHour} images,{" "}
              {limits.videosPerHour} videos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-violet-300" aria-hidden="true" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void signOut({ callbackUrl: "/" })}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Tip: configure AI providers through environment variables (
          <code className="font-mono">AI_IMAGE_URL</code>,{" "}
          <code className="font-mono">AI_VIDEO_URL</code>,{" "}
          <code className="font-mono">HUGGINGFACE_API_KEY</code>) — see the README.
        </p>
      </div>
    </div>
  );
}

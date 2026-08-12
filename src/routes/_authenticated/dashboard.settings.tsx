import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type RiskTolerance = Database["public"]["Enums"]["risk_tolerance"];

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Settings,
});

function Settings() {
  const [fullName, setFullName] = useState("");
  const [risk, setRisk] = useState<RiskTolerance>("moderate");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setRisk(profile.risk_tolerance);
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim().slice(0, 60), risk_tolerance: risk })
      .eq("id", uid);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Account details and default risk profile.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>{profile?.email ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Display name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label>Risk tolerance</Label>
            <Select value={risk} onValueChange={(v) => setRisk(v as RiskTolerance)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant="secondary" className="capitalize">{profile?.subscription_tier ?? "free"}</Badge>
          </div>
          <Button onClick={save} disabled={saving}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogOut, ShieldCheck, Store, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getContributorProfile, saveContributorProfile } from "@/lib/contributor.functions";
import type { Database } from "@/integrations/supabase/types";

type RiskTolerance = Database["public"]["Enums"]["risk_tolerance"];

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Your profile | aiAlgo" },
      { name: "description", content: "Edit your aiAlgo profile, trading preferences, notifications and contributor identity." },
      { property: "og:title", content: "Your profile | aiAlgo" },
      { property: "og:description", content: "Edit your aiAlgo profile and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const TIMEZONES = ["Asia/Hong_Kong", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "America/New_York", "UTC"];
const CURRENCIES = ["USD", "HKD", "CNY", "SGD", "EUR", "GBP"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh-Hant", label: "繁體中文" },
  { value: "zh-Hans", label: "简体中文" },
];

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source.slice(0, 2).toUpperCase();
}

function SettingsPage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });
  const { data: contributor } = useQuery({
    queryKey: ["contributor-profile"],
    queryFn: () => getContributorProfile(),
  });

  /* ----------------------------------------------------------- profile */
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  /* ------------------------------------------------------- preferences */
  const [risk, setRisk] = useState<RiskTolerance>("moderate");
  const [timezone, setTimezone] = useState("Asia/Hong_Kong");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [savingPrefs, setSavingPrefs] = useState(false);

  /* ------------------------------------------------------ notifications */
  const [notifyFills, setNotifyFills] = useState(true);
  const [notifyRisk, setNotifyRisk] = useState(true);
  const [notifyPayouts, setNotifyPayouts] = useState(true);
  const [savingNotify, setSavingNotify] = useState(false);

  /* -------------------------------------------------------- contributor */
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contributorBio, setContributorBio] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [savingContributor, setSavingContributor] = useState(false);

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setBio(profile.bio ?? "");
    setCountry(profile.country ?? "");
    setWebsite(profile.website ?? "");
    setRisk(profile.risk_tolerance);
    setTimezone(profile.timezone ?? "Asia/Hong_Kong");
    setCurrency(profile.base_currency ?? "USD");
    setLanguage(profile.preferred_language ?? "en");
    setNotifyFills(profile.notify_fills ?? true);
    setNotifyRisk(profile.notify_risk ?? true);
    setNotifyPayouts(profile.notify_payouts ?? true);
  }, [profile]);

  useEffect(() => {
    if (!contributor) return;
    setHandle(contributor.handle ?? "");
    setDisplayName(contributor.display_name ?? "");
    setContributorBio(contributor.bio ?? "");
    setPayoutEmail(contributor.payout_email ?? "");
  }, [contributor]);

  type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

  const updateProfile = async (patch: ProfileUpdate) => {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const saveProfile = async () => {
    if (website && !/^https?:\/\/.+/.test(website)) {
      toast.error("Website must start with http:// or https://");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim().slice(0, 60),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim().slice(0, 400) || null,
        country: country.trim().slice(0, 40) || null,
        website: website.trim() || null,
      });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await updateProfile({
        risk_tolerance: risk,
        timezone,
        base_currency: currency,
        preferred_language: language,
      });
      toast.success("Preferences updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveNotify = async () => {
    setSavingNotify(true);
    try {
      await updateProfile({ notify_fills: notifyFills, notify_risk: notifyRisk, notify_payouts: notifyPayouts });
      toast.success("Notification preferences updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingNotify(false);
    }
  };

  const saveContributor = async () => {
    setSavingContributor(true);
    try {
      await saveContributorProfile({
        data: {
          handle: handle.trim().toLowerCase(),
          displayName: displayName.trim() || fullName.trim() || handle.trim(),
          bio: contributorBio.trim(),
          country: country.trim() || "HK",
          payoutEmail: payoutEmail.trim(),
        },
      });
      await qc.invalidateQueries({ queryKey: ["contributor-profile"] });
      await qc.invalidateQueries({ queryKey: ["contributor-billing"] });
      toast.success(contributor ? "Contributor profile updated" : "You are now a contributor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingContributor(false);
    }
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Password updated");
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/auth";
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground">Account details, trading preferences and contributor identity.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" aria-hidden /> Profile
          </CardTitle>
          <CardDescription>{profile?.email ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(fullName, profile?.email ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Display name</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Hong Kong" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={400} />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trading preferences</CardTitle>
          <CardDescription>Defaults applied to new strategies, backtests and reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label>Base currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={savePrefs} disabled={savingPrefs}>
            {savingPrefs ? "Saving…" : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" aria-hidden /> Contributor identity
          </CardTitle>
          <CardDescription>
            {contributor
              ? "This is how you appear on marketplace listings."
              : "Create a public handle to publish strategies and earn performance fees."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contributor ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Payouts: {contributor.payout_status}</Badge>
              <Badge variant="outline">KYC: {contributor.kyc_status}</Badge>
              <Badge variant="outline">Tax: {contributor.tax_form_status}</Badge>
              {contributor.verified ? <Badge>Verified</Badge> : null}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="handle">Public handle</Label>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="quant_hk"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">3–30 lowercase letters, numbers or underscore.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creator-name">Public display name</Label>
              <Input id="creator-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="payout-email">Payout email</Label>
              <Input id="payout-email" type="email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="creator-bio">Public bio</Label>
              <Textarea
                id="creator-bio"
                value={contributorBio}
                onChange={(e) => setContributorBio(e.target.value)}
                rows={3}
                maxLength={400}
              />
            </div>
          </div>
          <Button onClick={saveContributor} disabled={savingContributor || handle.trim().length < 3}>
            {savingContributor ? "Saving…" : contributor ? "Save contributor profile" : "Become a contributor"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Email alerts for the events that matter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "fills", label: "Order fills and closed trades", value: notifyFills, set: setNotifyFills },
            { id: "risk", label: "Risk events and kill-switch triggers", value: notifyRisk, set: setNotifyRisk },
            { id: "payouts", label: "Payouts and fee charges", value: notifyPayouts, set: setNotifyPayouts },
          ].map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={`notify-${row.id}`} className="font-normal">
                {row.label}
              </Label>
              <Switch id={`notify-${row.id}`} checked={row.value} onCheckedChange={row.set} />
            </div>
          ))}
          <Button onClick={saveNotify} disabled={savingNotify}>
            {savingNotify ? "Saving…" : "Save notifications"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Account &amp; security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <Button variant="outline" onClick={changePassword} disabled={savingPassword || !password}>
                {savingPassword ? "Updating…" : "Update"}
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Sign out everywhere</p>
              <p className="text-xs text-muted-foreground">Ends every active session on all devices.</p>
            </div>
            <Button variant="outline" onClick={signOutEverywhere}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

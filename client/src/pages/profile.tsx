import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetMe, useGetMyBalance, useGetMyTransactions } from "@workspace/api-client-react";
import {
  User, Mail, Phone, Shield, Crown, Copy, Check, Key,
  TrendingUp, Wallet, Clock, LogOut, ChevronRight, Lock, Edit, Save, X,
  MapPin, Globe, Camera
} from "lucide-react";
import { removeToken, getToken } from "@/lib/auth-utils";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { SetPaymentPasswordModal } from "@/components/payment-password-modal";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, refetch: refetchUser } = useGetMe({ query: { retry: false } });
  const { data: balance } = useGetMyBalance();
  const { data: transactions } = useGetMyTransactions();

  const [copiedCode, setCopiedCode] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [showSetPaymentPw, setShowSetPaymentPw] = useState(false);
  const [hasPaymentPw, setHasPaymentPw] = useState<boolean | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const PRODUCTION_URL = window.location.origin;
  const inviteLink = user?.inviteCode ? `${PRODUCTION_URL}/register?ref=${user.inviteCode}` : "";

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: "Invite link copied!" });
  };

  const handleLogout = () => {
    removeToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    navigate("/login");
  };

  const startEditing = () => {
    setEditName((user as any)?.name ?? "");
    setEditPhone((user as any)?.phone ?? "");
    setEditCountry((user as any)?.country ?? "");
    setEditAddress((user as any)?.address ?? "");
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, phone: editPhone, country: editCountry, address: editAddress }),
      });
      if (res.ok) {
        toast({ title: "Profile updated successfully!" });
        refetchUser();
        setEditingInfo(false);
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error updating profile", variant: "destructive" });
    } finally {
      setSavingInfo(false);
    }
  };

  const completedTx = (transactions as any[])?.filter((t: any) => t.status === "completed").length ?? 0;
  const totalDeposits = (transactions as any[])?.filter((t: any) => t.type === "deposit" && t.status === "completed")
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) ?? 0;

  const checkPaymentPw = async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/api/user/payment-password/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setHasPaymentPw(data.hasPaymentPassword);
    }
  };

  if (hasPaymentPw === null) {
    checkPaymentPw();
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4 w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Profile</h1>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-8 text-xs" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ background: isSuperAdmin ? "rgba(234,179,8,0.15)" : "hsl(var(--primary)/0.15)", color: isSuperAdmin ? "#eab308" : "hsl(var(--primary))" }}>
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <button className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="h-3 w-3 text-primary-foreground" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">{user?.name ?? "User"}</h2>
                  {isSuperAdmin ? (
                    <Badge className="gap-1 bg-yellow-500/15 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/15 text-xs">
                      <Crown className="h-3 w-3" /> Super Admin
                    </Badge>
                  ) : isAdmin ? (
                    <Badge className="gap-1 bg-blue-500/15 text-blue-500 border-blue-500/30 hover:bg-blue-500/15 text-xs">
                      <Shield className="h-3 w-3" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Trader</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mt-0.5 truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Wallet className="h-4 w-4 text-primary" />, label: "USDT", value: `$${(balance?.usdt ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
            { icon: <TrendingUp className="h-4 w-4 text-green-500" />, label: "Deposited", value: `$${totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { icon: <Clock className="h-4 w-4 text-blue-500" />, label: "Trades", value: `${completedTx}` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="flex justify-center mb-1">{stat.icon}</div>
                <p className="text-base font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 w-full h-9">
            <TabsTrigger value="info" className="text-xs">Personal Info</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            <TabsTrigger value="referral" className="text-xs">Referral</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="info" className="mt-3 space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle>
                  {!editingInfo ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={startEditing}>
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditingInfo(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={saveInfo} disabled={savingInfo}>
                        <Save className="h-3 w-3" /> {savingInfo ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {editingInfo ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm" placeholder="Your full name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone Number</Label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9 text-sm" placeholder="+1 234 567 8900" type="tel" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Country</Label>
                      <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} className="h-9 text-sm" placeholder="Pakistan, USA, UK..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Address</Label>
                      <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-9 text-sm" placeholder="Your address" />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    {[
                      { icon: <User className="h-3.5 w-3.5" />, label: "Full Name", value: user?.name ?? "—" },
                      { icon: <Mail className="h-3.5 w-3.5" />, label: "Email", value: user?.email ?? "—", badge: "Verified" },
                      { icon: <Phone className="h-3.5 w-3.5" />, label: "Phone", value: (user as any)?.phone ?? "Not set" },
                      { icon: <Globe className="h-3.5 w-3.5" />, label: "Country", value: (user as any)?.country ?? "Not set" },
                      { icon: <MapPin className="h-3.5 w-3.5" />, label: "Address", value: (user as any)?.address ?? "Not set" },
                      { icon: <Shield className="h-3.5 w-3.5" />, label: "Account Role", value: user?.role?.replace("_", " ") ?? "user" },
                    ].map((item, i, arr) => (
                      <div key={item.label}>
                        <div className="flex items-center gap-3 py-1.5">
                          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <p className="font-medium text-sm truncate capitalize">{item.value}</p>
                          </div>
                          {item.badge && <Badge variant="secondary" className="text-xs shrink-0">{item.badge}</Badge>}
                        </div>
                        {i < arr.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KYC Placeholder */}
            <Card className="border-yellow-500/20">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">KYC Verification</p>
                    <p className="text-xs text-muted-foreground">Identity verification required for higher limits</p>
                  </div>
                  <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 text-xs">Pending</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-3 space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4" /> Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {!editingPassword ? (
                  <Button variant="outline" className="w-full gap-2 justify-between h-11" onClick={() => setEditingPassword(true)}>
                    <span className="flex items-center gap-2 text-sm"><Key className="h-4 w-4" /> Change Login Password</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Password</Label>
                      <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">New Password</Label>
                      <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Confirm New Password</Label>
                      <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 h-9 text-sm" onClick={() => {
                        if (newPw !== confirmPw) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
                        if (newPw.length < 6) { toast({ title: "Password too short", variant: "destructive" }); return; }
                        toast({ title: "Password change not yet implemented", description: "Contact support to change your password." });
                        setEditingPassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw("");
                      }}>Update Password</Button>
                      <Button variant="outline" className="h-9 text-sm" onClick={() => { setEditingPassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                <Separator />

                <Button
                  variant="outline"
                  className="w-full gap-2 justify-between h-11"
                  onClick={() => setShowSetPaymentPw(true)}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4" />
                    {hasPaymentPw ? "Change Payment Password" : "Set Payment Password"}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasPaymentPw ? (
                      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-xs">Set</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 text-xs">Not Set</Badge>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Button>
                <p className="text-xs text-muted-foreground px-1">
                  Payment password is required before withdrawals and large transactions.
                </p>
              </CardContent>
            </Card>

            {/* Admin Link */}
            {isAdmin && (
              <Card className="border-yellow-500/20">
                <CardContent className="pt-3 pb-3 px-4">
                  <Button
                    variant="outline"
                    className={`w-full gap-2 justify-between ${isSuperAdmin ? "border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" : "border-blue-500/30 text-blue-500 hover:bg-blue-500/10"}`}
                    onClick={() => navigate("/admin")}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {isSuperAdmin ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      {isSuperAdmin ? "Super Admin Panel" : "Admin Dashboard"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="mt-3">
            {user?.inviteCode && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Your Referral Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/40">
                    <code className="text-xs text-muted-foreground flex-1 truncate select-all">{inviteLink}</code>
                    <Button size="sm" variant="outline" className="shrink-0 h-7 gap-1 text-xs" onClick={copyCode}>
                      {copiedCode ? <><Check className="h-3 w-3 text-green-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Code: <span className="font-mono font-bold text-foreground">{user.inviteCode}</span></span>
                    <span className="text-primary font-medium">Earn 5% per referral</span>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium">Commission Earned</p>
                    <p className="text-2xl font-bold text-primary">${parseFloat((user as any)?.commissionEarned ?? "0").toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">From {(transactions as any[])?.filter((t: any) => t.referralBonus)?.length ?? 0} referrals</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SetPaymentPasswordModal
        open={showSetPaymentPw}
        onClose={() => setShowSetPaymentPw(false)}
        onSuccess={() => { setHasPaymentPw(true); checkPaymentPw(); }}
      />
    </Layout>
  );
}

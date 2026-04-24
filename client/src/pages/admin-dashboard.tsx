import { useState, useEffect, useRef } from "react";
import {
  useAdminGetStats,
  useAdminGetUsers,
  useAdminGetTransactions,
  useAdminApproveTransaction,
  useAdminRejectTransaction,
  useAdminGetUser,
  useAdminUpdateUser,
  getAdminGetTransactionsQueryKey,
  getAdminGetStatsQueryKey,
  getAdminGetUsersQueryKey,
  getAdminGetUserQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { removeAdminToken, getAdminToken } from "@/lib/auth-utils";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, LogOut, Edit2, Copy, RefreshCw,
  Link as LinkIcon, DollarSign, Users, TrendingUp, Clock,
  Wallet, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Settings,
  AlertTriangle, Info, Send, Headphones, MessageSquare, ChevronLeft
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiCall(path: string, opts?: RequestInit) {
  const token = getAdminToken();
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  }).then(r => r.json());
}

function useAdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetch_ = () => apiCall("/admin/profile").then(setProfile).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { fetch_(); }, []);
  return { profile, loading, refetch: fetch_ };
}

function useAdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const fetch_ = () => apiCall("/admin/settings").then(setSettings).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { fetch_(); }, []);
  return { settings, loading, refetch: fetch_ };
}

function saveSetting(key: string, value: string) {
  return apiCall("/admin/settings", { method: "POST", body: JSON.stringify({ key, value }) });
}

function generateInvite() {
  return apiCall("/admin/generate-invite", { method: "POST" });
}

// ─── Edit User Dialog ──────────────────────────────────────────────────────────
function EditUserDialog({ userId, open, onOpenChange }: { userId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: user, isLoading } = useAdminGetUser(userId!, { query: { enabled: !!userId } });
  const updateUser = useAdminUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [status, setStatus] = useState("active");
  const [role, setRole] = useState("user");
  const [usdtBalance, setUsdtBalance] = useState("0");
  const [btcBalance, setBtcBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && user) {
      setStatus(user.status);
      setRole(user.role);
      setUsdtBalance(user.usdtBalance.toString());
      setBtcBalance(user.btcBalance.toString());
      setEthBalance(user.ethBalance.toString());
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!userId) return;
    updateUser.mutate(
      { id: userId, data: { status, role, usdtBalance: Number(usdtBalance), btcBalance: Number(btcBalance), ethBalance: Number(ethBalance) } },
      {
        onSuccess: () => {
          toast({ title: "User updated" });
          queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Update failed", description: err.error, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-[#111] border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" /> Edit User #{userId}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 py-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : user ? (
          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={user.email} disabled className="bg-muted/50 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-black/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-black/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border border-border/40 rounded-lg p-3 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance Override</p>
              {[["USDT", usdtBalance, setUsdtBalance], ["BTC", btcBalance, setBtcBalance], ["ETH", ethBalance, setEthBalance]].map(([cur, val, setter]: any) => (
                <div key={cur}>
                  <Label className="text-xs">{cur} Balance</Label>
                  <Input type="number" value={val} onChange={e => setter(e.target.value)} className="bg-black/50 mt-1" />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} className="w-full" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ data, onClose }: { data: any; onClose: () => void }) {
  const { toast } = useToast();
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
  };
  return (
    <Dialog open={!!data} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] bg-[#111] border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <LinkIcon className="h-4 w-4" /> New Invite Generated
          </DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-4 py-2">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-primary tracking-widest">{data.inviteCode}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copy(data.inviteCode, "Code")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Share Link</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs break-all">{data.inviteLink || `Use code: ${data.inviteCode}`}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copy(data.inviteLink || data.inviteCode, "Link")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{data.note}</p>
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
function TxStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "completed" ? "default" : status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
      {status === "pending" && <Clock className="h-3 w-3 mr-1" />}
      {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useAdminGetStats({ query: { refetchInterval: 15000 } });
  const { data: users, isLoading: loadingUsers } = useAdminGetUsers();
  const { data: transactions, isLoading: loadingTxs } = useAdminGetTransactions({ query: { refetchInterval: 8000 } });
  const { profile, loading: loadingProfile, refetch: refetchProfile } = useAdminProfile();
  const { settings, refetch: refetchSettings } = useAdminSettings();

  const approveTx = useAdminApproveTransaction();
  const rejectTx = useAdminRejectTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<any>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  const [usdtAddr, setUsdtAddr] = useState("");
  const [btcAddr, setBtcAddr] = useState("");
  const [ethAddr, setEthAddr] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [unreadSupport, setUnreadSupport] = useState(0);
  const supportBottomRef = useRef<HTMLDivElement>(null);

  const loadSupportTickets = async () => {
    setLoadingSupport(true);
    try {
      const data = await apiCall("/admin/support/tickets");
      if (Array.isArray(data)) setSupportTickets(data);
      const u = await apiCall("/admin/support/unread");
      if (u?.count !== undefined) setUnreadSupport(u.count);
    } catch {}
    setLoadingSupport(false);
  };

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    try {
      const data = await apiCall(`/admin/support/tickets/${ticket.id}`);
      setTicketMessages(data.messages ?? []);
      setSupportTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: data.ticket?.status ?? t.status } : t));
    } catch {}
    setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendSupportReply = async () => {
    if (!supportInput.trim() || sendingSupport || !activeTicket) return;
    const text = supportInput.trim();
    setSupportInput("");
    setSendingSupport(true);
    try {
      await apiCall(`/admin/support/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      const data = await apiCall(`/admin/support/tickets/${activeTicket.id}`);
      setTicketMessages(data.messages ?? []);
      setSupportTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: "answered", lastMessageAt: new Date().toISOString() } : t));
      setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}
    setSendingSupport(false);
  };

  const closeTicket = async (ticketId: number) => {
    await apiCall(`/admin/support/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    });
    setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "closed" } : t));
    if (activeTicket?.id === ticketId) setActiveTicket({ ...activeTicket, status: "closed" });
  };

  useEffect(() => {
    if (settings.usdt_address !== undefined) setUsdtAddr(settings.usdt_address ?? "");
    if (settings.btc_address !== undefined) setBtcAddr(settings.btc_address ?? "");
    if (settings.eth_address !== undefined) setEthAddr(settings.eth_address ?? "");
  }, [settings]);

  const deposits = transactions?.filter(t => t.type === "deposit") ?? [];
  const withdrawals = transactions?.filter(t => t.type === "withdrawal") ?? [];
  const pendingDeposits = deposits.filter(t => t.status === "pending");
  const pendingWithdrawals = withdrawals.filter(t => t.status === "pending");
  const filteredUsers = users?.filter(u => !searchUser || u.email.toLowerCase().includes(searchUser.toLowerCase()) || (u.name ?? "").toLowerCase().includes(searchUser.toLowerCase()));

  const handleLogout = () => { removeAdminToken(); navigate("/admin"); };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getAdminGetTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
    refetchProfile();
  };

  const handleApprove = (id: number) => {
    approveTx.mutate({ id }, {
      onSuccess: () => { toast({ title: "✓ Approved — 5% commission credited to admin" }); invalidateAll(); },
      onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" }),
    });
  };

  const handleConfirmSent = (id: number) => {
    approveTx.mutate({ id }, {
      onSuccess: () => { toast({ title: "✓ Payment confirmed — withdrawal completed" }); invalidateAll(); },
      onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    rejectTx.mutate({ id }, {
      onSuccess: () => { toast({ title: "Transaction rejected" }); invalidateAll(); },
      onError: (err: any) => toast({ title: "Error", description: err.error, variant: "destructive" }),
    });
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try { setGeneratedInvite(await generateInvite()); }
    catch { toast({ title: "Failed to generate invite", variant: "destructive" }); }
    setGeneratingInvite(false);
  };

  const handleSaveAddresses = async () => {
    setSavingSettings(true);
    try {
      await Promise.all([
        saveSetting("usdt_address", usdtAddr),
        saveSetting("btc_address", btcAddr),
        saveSetting("eth_address", ethAddr),
      ]);
      refetchSettings();
      toast({ title: "Wallet addresses saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSavingSettings(false);
  };

  const copyText = (text: string) => navigator.clipboard.writeText(text).then(() => toast({ title: "Copied!" }));

  const totalPending = pendingDeposits.length + pendingWithdrawals.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-[#111] py-3 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-primary leading-none">PEXCOIN</h1>
            <p className="text-xs text-muted-foreground">Super Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalPending > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse gap-1">
              <AlertTriangle className="h-3 w-3" /> {totalPending} pending
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white gap-1.5">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto w-full">

        {/* Admin Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-[#111] border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Admin Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfile ? <Skeleton className="h-8 w-32" /> : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">{profile?.usdtBalance?.toFixed(2) ?? "—"} USDT</div>
                  <div className="text-xs text-muted-foreground">{profile?.btcBalance?.toFixed(6)} BTC · {profile?.ethBalance?.toFixed(6)} ETH</div>
                  <div className="flex items-center gap-1 text-xs text-positive mt-1">
                    <TrendingUp className="h-3 w-3" /> Commission: {profile?.commissionEarned?.toFixed(4) ?? "0"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> Master Invite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingProfile ? <Skeleton className="h-8 w-full" /> : (
                <>
                  <div className="flex items-center gap-2 bg-black/40 rounded px-2 py-1.5 border border-border/40">
                    <span className="font-mono text-sm font-bold text-primary tracking-widest flex-1">{profile?.inviteCode ?? "—"}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(profile?.inviteCode ?? "")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button onClick={handleGenerateInvite} disabled={generatingInvite} variant="outline" size="sm" className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10">
                    <RefreshCw className={`h-3 w-3 ${generatingInvite ? "animate-spin" : ""}`} /> Generate New Code
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Users", value: (stats as any)?.totalUsers, icon: Users, prefix: "" },
              { label: "Active Users", value: (stats as any)?.activeUsers, icon: Users, prefix: "" },
              { label: "Total Deposits", value: (stats as any)?.totalDeposits?.toFixed(2), icon: ArrowDownCircle, prefix: "$" },
              { label: "Total Withdrawals", value: (stats as any)?.totalWithdrawals?.toFixed(2), icon: ArrowUpCircle, prefix: "$" },
              { label: "Commission Earned", value: (stats as any)?.totalCommissionEarned?.toFixed(2), icon: TrendingUp, prefix: "$" },
              { label: "Pending", value: (stats as any)?.pendingTransactions, icon: Clock, prefix: "" },
            ].map(({ label, value, icon: Icon, prefix }) => (
              <Card key={label} className="bg-[#111] border-border/50">
                <CardContent className="p-3">
                  {loadingStats ? <Skeleton className="h-5 w-10" /> : (
                    <div className="font-bold text-lg text-primary">{prefix}{value ?? 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Icon className="h-3 w-3" />{label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="withdrawals" className="w-full">
          <TabsList className="bg-[#111] border border-border/50 mb-4">
            <TabsTrigger value="withdrawals" className="gap-1.5">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Withdrawals
              {pendingWithdrawals.length > 0 && (
                <span className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full px-1.5 font-mono">{pendingWithdrawals.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="gap-1.5">
              <ArrowDownCircle className="h-3.5 w-3.5" />
              Deposits
              {pendingDeposits.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs rounded-full px-1.5 font-mono">{pendingDeposits.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Users ({users?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5" onClick={loadSupportTickets}>
              <Headphones className="h-3.5 w-3.5" />
              Support
              {unreadSupport > 0 && (
                <span className="ml-1 bg-red-500/20 text-red-400 text-xs rounded-full px-1.5 font-mono">{unreadSupport}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── WITHDRAWALS TAB ───────────────────────────────── */}
          <TabsContent value="withdrawals" className="m-0 space-y-4">
            {pendingWithdrawals.length > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {pendingWithdrawals.length} Pending Withdrawal{pendingWithdrawals.length > 1 ? "s" : ""} — Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingWithdrawals.map(tx => (
                    <div key={tx.id} className="border border-yellow-500/20 rounded-lg p-4 bg-black/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">
                            <Clock className="h-3 w-3 mr-1" /> PENDING
                          </Badge>
                          <span className="text-xs text-muted-foreground">#{tx.id} · {(tx as any).userName ?? tx.userEmail}</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{tx.amount} {tx.currency}</span>
                      </div>

                      <div className="bg-black/40 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Send className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                          <span className="text-xs text-yellow-400 font-medium">Send to user&apos;s address:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm break-all flex-1 text-foreground">{tx.address || "No address provided"}</span>
                          {tx.address && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyText(tx.address!)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {tx.note && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" /> {tx.note}
                          </div>
                        )}
                      </div>

                      <div className="bg-muted/20 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requested amount</span>
                          <span className="font-mono">{tx.amount} {tx.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform fee (5%)</span>
                          <span className="font-mono text-primary">+{(tx.amount * 0.05).toFixed(6)} {tx.currency} → admin</span>
                        </div>
                        <div className="flex justify-between font-medium border-t border-border/30 pt-1 mt-1">
                          <span className="text-muted-foreground">Send to user</span>
                          <span className="font-mono text-positive">{(tx.amount * 0.95).toFixed(6)} {tx.currency}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2 bg-positive/10 hover:bg-positive/20 text-positive border border-positive/30 font-semibold"
                          variant="outline"
                          onClick={() => handleConfirmSent(tx.id)}
                          disabled={approveTx.isPending || rejectTx.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          I&apos;ve Sent the Payment — Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-negative border-negative/30 hover:bg-negative/10"
                          onClick={() => handleReject(tx.id)}
                          disabled={approveTx.isPending || rejectTx.isPending}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#111] border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">All Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTxs ? <Skeleton className="h-40 w-full" /> : (
                  <div className="rounded border border-border/40 overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-black/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">User</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Destination Address</TableHead>
                          <TableHead className="text-xs">Network</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-right text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map(tx => (
                          <TableRow key={tx.id} className={`border-border/40 ${tx.status === "pending" ? "bg-yellow-500/5" : ""}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{tx.id}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{(tx as any).userName ?? tx.userEmail}</TableCell>
                            <TableCell className="font-mono text-xs font-bold">{tx.amount} {tx.currency}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[180px] truncate">
                              <div className="flex items-center gap-1">
                                <span className="truncate">{tx.address || "—"}</span>
                                {tx.address && (
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => copyText(tx.address!)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{tx.note || "—"}</TableCell>
                            <TableCell><TxStatusBadge status={tx.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              {tx.status === "pending" && (
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-positive hover:bg-positive/10 border-positive/30" onClick={() => handleConfirmSent(tx.id)} disabled={approveTx.isPending || rejectTx.isPending} title="Confirm Sent">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-negative hover:bg-negative/10 border-negative/30" onClick={() => handleReject(tx.id)} disabled={approveTx.isPending || rejectTx.isPending} title="Reject">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!withdrawals.length && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">No withdrawals yet</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DEPOSITS TAB ─────────────────────────────────── */}
          <TabsContent value="deposits" className="m-0 space-y-4">
            {pendingDeposits.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-primary flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    {pendingDeposits.length} Pending Deposit{pendingDeposits.length > 1 ? "s" : ""} — Awaiting Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingDeposits.map(tx => (
                    <div key={tx.id} className="border border-primary/20 rounded-lg p-4 bg-black/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                            <Clock className="h-3 w-3 mr-1" /> PENDING
                          </Badge>
                          <span className="text-xs text-muted-foreground">#{tx.id} · {(tx as any).userName ?? tx.userEmail}</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{tx.amount} {tx.currency}</span>
                      </div>

                      {tx.note && (
                        <div className="bg-black/40 rounded p-2.5 text-xs font-mono text-muted-foreground flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                          <span>{tx.note}</span>
                        </div>
                      )}

                      <div className="bg-muted/20 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deposit amount</span>
                          <span className="font-mono">{tx.amount} {tx.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform fee (5%)</span>
                          <span className="font-mono text-primary">+{(tx.amount * 0.05).toFixed(6)} {tx.currency} → admin</span>
                        </div>
                        <div className="flex justify-between font-medium border-t border-border/30 pt-1 mt-1">
                          <span className="text-muted-foreground">User receives</span>
                          <span className="font-mono text-positive">{(tx.amount * 0.95).toFixed(6)} {tx.currency}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold"
                          variant="outline"
                          onClick={() => handleApprove(tx.id)}
                          disabled={approveTx.isPending || rejectTx.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve Deposit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-negative border-negative/30 hover:bg-negative/10"
                          onClick={() => handleReject(tx.id)}
                          disabled={approveTx.isPending || rejectTx.isPending}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#111] border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">All Deposit History</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTxs ? <Skeleton className="h-40 w-full" /> : (
                  <div className="rounded border border-border/40 overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-black/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">User</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">TX Hash / Note</TableHead>
                          <TableHead className="text-xs">Fee (5%)</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-right text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits.map(tx => (
                          <TableRow key={tx.id} className={`border-border/40 ${tx.status === "pending" ? "bg-primary/5" : ""}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{tx.id}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{(tx as any).userName ?? tx.userEmail}</TableCell>
                            <TableCell className="font-mono text-xs font-bold">{tx.amount} {tx.currency}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{tx.note || "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-primary">+{(tx.amount * 0.05).toFixed(4)}</TableCell>
                            <TableCell><TxStatusBadge status={tx.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              {tx.status === "pending" && (
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-positive hover:bg-positive/10 border-positive/30" onClick={() => handleApprove(tx.id)} disabled={approveTx.isPending || rejectTx.isPending} title="Approve">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-negative hover:bg-negative/10 border-negative/30" onClick={() => handleReject(tx.id)} disabled={approveTx.isPending || rejectTx.isPending} title="Reject">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!deposits.length && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">No deposits yet</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── USERS TAB ─────────────────────────────────────── */}
          <TabsContent value="users" className="m-0">
            <Card className="bg-[#111] border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-base">User Management</CardTitle>
                  <Input
                    placeholder="Search email or name..."
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    className="max-w-xs bg-black/50 h-8 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? <Skeleton className="h-40 w-full" /> : (
                  <div className="rounded border border-border/40 overflow-x-auto">
                    <Table className="min-w-[1000px]">
                      <TableHeader className="bg-black/40">
                        <TableRow className="hover:bg-transparent">
                          {["ID", "Email / Name", "USDT", "BTC", "ETH", "Invite Code", "Referred By", "Commission", "Role", "Status", "Edit"].map(h => (
                            <TableHead key={h} className="text-xs">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers?.map(user => (
                          <TableRow key={user.id} className={`border-border/40 ${user.role === "super_admin" ? "bg-primary/5" : ""}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-xs font-medium max-w-[160px] truncate">{user.email}</p>
                                {user.name && <p className="text-xs text-muted-foreground">{user.name}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{user.usdtBalance.toFixed(2)}</TableCell>
                            <TableCell className="font-mono text-xs">{user.btcBalance.toFixed(6)}</TableCell>
                            <TableCell className="font-mono text-xs">{user.ethBalance.toFixed(6)}</TableCell>
                            <TableCell><span className="font-mono text-xs text-primary tracking-widest">{user.inviteCode}</span></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{user.referredBy ? `#${user.referredBy}` : <span className="opacity-30">root</span>}</TableCell>
                            <TableCell className="font-mono text-xs text-positive">{(user.commissionEarned ?? 0).toFixed(4)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${user.role === "super_admin" ? "text-primary border-primary/30" : user.role === "admin" ? "text-yellow-400 border-yellow-400/30" : "border-border/50"}`}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">{user.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-primary/10" onClick={() => { setEditUserId(user.id); setEditOpen(true); }}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!filteredUsers?.length && (
                          <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground text-sm py-8">No users found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SETTINGS TAB ─────────────────────────────────── */}
          <TabsContent value="settings" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#111] border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" /> Admin Wallet Addresses
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Users will see these addresses on the Deposit page. Set them so users know where to send funds.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">USDT (TRC20) Address</Label>
                    <Input value={usdtAddr} onChange={e => setUsdtAddr(e.target.value)} placeholder="TRC20 wallet address" className="font-mono text-xs bg-black/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">BTC (Bitcoin) Address</Label>
                    <Input value={btcAddr} onChange={e => setBtcAddr(e.target.value)} placeholder="Bitcoin wallet address" className="font-mono text-xs bg-black/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ETH (ERC20) Address</Label>
                    <Input value={ethAddr} onChange={e => setEthAddr(e.target.value)} placeholder="ERC20 wallet address" className="font-mono text-xs bg-black/50" />
                  </div>
                  <Button onClick={handleSaveAddresses} disabled={savingSettings} className="w-full font-semibold">
                    {savingSettings ? "Saving..." : "Save Wallet Addresses"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" /> Commission Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2 bg-black/30 rounded-lg p-3 border border-border/40">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission Rate</span>
                      <span className="font-mono font-bold text-primary">5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied on</span>
                      <span>Deposits + Withdrawals</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earned</span>
                      <span className="font-mono font-bold text-positive">{profile?.commissionEarned?.toFixed(4) ?? "0"}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/30 pt-2">
                      <span className="text-muted-foreground">Admin USDT Balance</span>
                      <span className="font-mono font-bold">{profile?.usdtBalance?.toFixed(4) ?? "0"} USDT</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• <strong>Deposits:</strong> User sends to admin wallet → admin approves → user gets 95%, admin keeps 5%</p>
                    <p>• <strong>Withdrawals:</strong> User requests → admin sends manually → admin confirms → user balance deducted, admin keeps 5%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SUPPORT TAB ───────────────────────────────────── */}
          <TabsContent value="support" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
              {/* Ticket List */}
              <Card className="bg-[#111] border-border/50 flex flex-col overflow-hidden">
                <CardHeader className="pb-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" /> All Support Chats
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={loadSupportTickets}>
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingSupport ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
                  {loadingSupport ? (
                    [1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-black/30 animate-pulse" />)
                  ) : supportTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <Headphones className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No support tickets yet</p>
                    </div>
                  ) : (
                    supportTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => openTicket(ticket)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          activeTicket?.id === ticket.id ? "bg-primary/10 border border-primary/20" : "hover:bg-black/40 border border-transparent"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
                          {(ticket.userName ?? ticket.userEmail ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{ticket.userName ?? "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ticket.userEmail}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                            ticket.status === "open" ? "text-blue-400 border-blue-400/30" :
                            ticket.status === "answered" ? "text-green-400 border-green-400/30" :
                            "text-muted-foreground"
                          }`}>{ticket.status}</Badge>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(ticket.lastMessageAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="lg:col-span-2 bg-[#111] border-border/50 flex flex-col overflow-hidden">
                {!activeTicket ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Headphones className="h-12 w-12 opacity-20" />
                    <p className="text-sm">Select a conversation to reply</p>
                  </div>
                ) : (
                  <>
                    <CardHeader className="pb-2 border-b border-border/40 shrink-0">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setActiveTicket(null)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{activeTicket.userName ?? "User"}</p>
                          <p className="text-xs text-muted-foreground">{activeTicket.userEmail}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          activeTicket.status === "open" ? "text-blue-400 border-blue-400/30" :
                          activeTicket.status === "answered" ? "text-green-400 border-green-400/30" :
                          "text-muted-foreground"
                        }`}>{activeTicket.status}</Badge>
                        {activeTicket.status !== "closed" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-border/40 text-muted-foreground hover:text-foreground" onClick={() => closeTicket(activeTicket.id)}>
                            Close
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <ScrollArea className="flex-1 px-4 py-3">
                      <div className="space-y-3">
                        {ticketMessages.map(msg => {
                          const isAdmin = msg.senderRole === "admin";
                          return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}>
                              {!isAdmin && (
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold">
                                  {(activeTicket.userName ?? "U")[0].toUpperCase()}
                                </div>
                              )}
                              <div className={`flex flex-col max-w-[75%] ${isAdmin ? "items-end" : "items-start"}`}>
                                {isAdmin && <span className="text-[10px] text-muted-foreground mb-0.5 px-1">You (Admin)</span>}
                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                  isAdmin
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-black/40 border border-border/40 text-foreground rounded-bl-sm"
                                }`}>
                                  {msg.content}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              {isAdmin && (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                  <ShieldCheck className="h-3 w-3 text-primary" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div ref={supportBottomRef} />
                      </div>
                    </ScrollArea>
                    {activeTicket.status !== "closed" && (
                      <div className="border-t border-border/40 px-3 py-2.5 flex items-center gap-2 shrink-0">
                        <Input
                          value={supportInput}
                          onChange={e => setSupportInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendSupportReply()}
                          placeholder="Type a reply..."
                          className="flex-1 h-9 text-sm bg-black/50"
                          disabled={sendingSupport}
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendSupportReply} disabled={!supportInput.trim() || sendingSupport}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {activeTicket.status === "closed" && (
                      <div className="border-t border-border/40 px-3 py-2.5 text-center text-xs text-muted-foreground">
                        This ticket has been closed.
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <EditUserDialog userId={editUserId} open={editOpen} onOpenChange={setEditOpen} />
      {generatedInvite && <InviteModal data={generatedInvite} onClose={() => setGeneratedInvite(null)} />}
    </div>
  );
}

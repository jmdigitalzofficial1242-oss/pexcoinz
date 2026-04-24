import { useState, useEffect } from "react";
import { useGetMyBalance, useGetMyTransactions, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Gift, TrendingUp, Users, Crown, Shield, ExternalLink } from "lucide-react";
import { getToken } from "@/lib/auth-utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function InviteCard({ inviteCode, commissionEarned, role }: { inviteCode: string; commissionEarned: number; role: string }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [referrals, setReferrals] = useState<Array<{ id: number; name: string; email: string; createdAt: string }>>([]);

  const inviteLink = `${window.location.origin}/register?ref=${inviteCode}`;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/auth/referrals`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setReferrals(data);
    } catch {}
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Role Badge */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <Badge className="gap-1.5 px-3 py-1 text-sm bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20">
              <Crown className="h-3.5 w-3.5" /> Super Administrator
            </Badge>
          ) : (
            <Badge className="gap-1.5 px-3 py-1 text-sm bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
              <Shield className="h-3.5 w-3.5" /> Platform Admin
            </Badge>
          )}
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <ExternalLink className="h-3 w-3" />
              Admin Panel
            </Button>
          </Link>
        </div>
      )}

      <Card className={`${isSuperAdmin ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20" : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Gift className={`h-4 w-4 ${isSuperAdmin ? "text-yellow-400" : "text-primary"}`} />
            {isSuperAdmin ? "Super Admin — Invite Management" : "Referral Program"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Users className="h-3 w-3" /> Your Invite Code
              </p>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-lg tracking-widest ${isSuperAdmin ? "text-yellow-400" : "text-primary"}`}>
                  {inviteCode}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={copyCode}
                  title="Copy code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3" /> Referrals / Commission
              </p>
              <div>
                <span className="font-mono font-bold text-lg text-green-500">
                  {referrals.length} users
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} earned
                </p>
              </div>
            </div>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Your invite link — share to invite users</p>
            <div className="flex items-center gap-2 p-2 bg-black/30 rounded border border-border/50">
              <span className="font-mono text-xs text-muted-foreground truncate flex-1 select-all">
                {inviteLink}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs"
                onClick={copyLink}
              >
                {copiedLink
                  ? <><Check className="h-3 w-3 mr-1 text-green-500" />Copied!</>
                  : <><Copy className="h-3 w-3 mr-1" />Copy</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Earn <span className={`font-semibold ${isSuperAdmin ? "text-yellow-400" : "text-primary"}`}>5% commission</span> on every deposit your referrals make.
            </p>
          </div>

          {/* Referrals List */}
          {referrals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Users you invited ({referrals.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground ml-2">{r.email}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { data: balance, isLoading: loadingBalance } = useGetMyBalance();
  const { data: transactions, isLoading: loadingTransactions } = useGetMyTransactions();
  const { data: user } = useGetMe({ query: { retry: false } });

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto w-full px-4 py-8 space-y-8 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="text-foreground font-medium">{user?.name ?? "..."}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/deposit">
              <Button variant="default" className="font-bold">Deposit</Button>
            </Link>
            <Link to="/withdraw">
              <Button variant="outline" className="font-bold">Withdraw</Button>
            </Link>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">USDT Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalance ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold font-mono">
                  {parseFloat(String(balance?.usdt ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-muted-foreground ml-1">USDT</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BTC Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalance ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold font-mono">
                  {parseFloat(String(balance?.btc ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}
                  <span className="text-sm font-normal text-muted-foreground ml-1">BTC</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ETH Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalance ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold font-mono">
                  {parseFloat(String(balance?.eth ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}
                  <span className="text-sm font-normal text-muted-foreground ml-1">ETH</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invite / Referral Card */}
        {user?.inviteCode && (
          <InviteCard
            inviteCode={user.inviteCode}
            commissionEarned={user.commissionEarned ?? 0}
            role={user.role ?? "user"}
          />
        )}

        {/* Transaction History */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isIncoming = tx.type === "deposit" || tx.type === "commission";
                      const amountColor = tx.status === "rejected" ? "text-muted-foreground line-through" : isIncoming ? "text-green-400" : "text-red-400";
                      const typeColors: Record<string, string> = {
                        deposit: "bg-green-500/15 text-green-400 border-green-500/30",
                        withdrawal: "bg-red-500/15 text-red-400 border-red-500/30",
                        commission: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                      };
                      const typeClass = typeColors[tx.type] ?? "bg-muted text-muted-foreground";
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs capitalize ${typeClass}`}>{tx.type}</Badge>
                          </TableCell>
                          <TableCell className={`font-mono font-semibold ${amountColor}`}>
                            {isIncoming ? "+" : "-"}{tx.amount} {tx.currency}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(tx.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              tx.status === "completed" ? "default" :
                              tx.status === "rejected" ? "destructive" : "secondary"
                            }>
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                            {tx.address ? `To: ${tx.address}` : tx.note || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet.{" "}
                <Link to="/deposit" className="text-primary hover:underline">Make your first deposit</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

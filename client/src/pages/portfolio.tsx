import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyBalance, useGetCryptoPrices, useGetMyTransactions, useGetPortfolioPnl, useGetCoinBalances } from "@workspace/api-client-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetMe } from "@workspace/api-client-react";

const COIN_COLORS: Record<string, string> = {
  USDT: "#26a17b", BTC: "#F0B90B", ETH: "#627eea", BNB: "#F0B90B",
  SOL: "#9945ff", ADA: "#0033ad", XRP: "#00aae4", DOT: "#e6007a",
  DOGE: "#c2a633", AVAX: "#e84142", MATIC: "#8247e5", LINK: "#375bd2",
};

function formatCurrency(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function PnLBadge({ value, pct }: { value: number; pct?: number }) {
  const positive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-sm font-semibold ${positive ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {positive ? "+" : ""}${formatCurrency(Math.abs(value))}
      {pct !== undefined && (
        <span className="text-xs font-normal opacity-80">
          ({positive ? "+" : ""}{pct.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}

export default function Portfolio() {
  const { data: balance } = useGetMyBalance();
  const { data: prices } = useGetCryptoPrices({ query: { refetchInterval: 30_000 } });
  const { data: transactions } = useGetMyTransactions();
  const { data: pnlData, isLoading: loadingPnl } = useGetPortfolioPnl();
  const { data: coinBalances } = useGetCoinBalances();
  const { data: user } = useGetMe({ query: { retry: false } });

  const btcPrice = prices?.find((p) => p.symbol.startsWith("BTC"))?.price ?? 0;
  const ethPrice = prices?.find((p) => p.symbol.startsWith("ETH"))?.price ?? 0;

  const usdtValue = balance?.usdt ?? 0;
  const btcValue = (balance?.btc ?? 0) * btcPrice;
  const ethValue = (balance?.eth ?? 0) * ethPrice;

  const extraBalances = coinBalances ?? [];
  const extraValue = extraBalances.reduce((sum, b) => {
    if (b.symbol === "BTC" || b.symbol === "ETH") return sum;
    const price = prices?.find((p) => p.symbol.startsWith(b.symbol))?.price ?? 0;
    return sum + b.amount * price;
  }, 0);

  const totalValue = usdtValue + btcValue + ethValue + extraValue;

  const totalUnrealizedPnl = (pnlData ?? []).reduce((sum, d) => sum + d.unrealizedPnl, 0);
  const totalRealizedPnl = (pnlData ?? []).reduce((sum, d) => sum + d.realizedPnl, 0);
  const totalInvested = (pnlData ?? []).reduce((sum, d) => sum + d.investedValue, 0);
  const totalUnrealizedPct = totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0;

  const pieData = [
    { name: "USDT", value: usdtValue, color: COIN_COLORS.USDT },
    { name: "BTC", value: btcValue, color: COIN_COLORS.BTC },
    { name: "ETH", value: ethValue, color: COIN_COLORS.ETH },
    ...extraBalances
      .filter((b) => b.symbol !== "BTC" && b.symbol !== "ETH")
      .map((b) => {
        const price = prices?.find((p) => p.symbol.startsWith(b.symbol))?.price ?? 0;
        return {
          name: b.symbol,
          value: b.amount * price,
          color: COIN_COLORS[b.symbol] ?? `hsl(${b.symbol.charCodeAt(0) * 40}, 60%, 55%)`,
        };
      }),
  ].filter((d) => d.value > 0.01);

  const recentTx = (transactions as any[])?.slice(0, 5) ?? [];

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {user?.name ? `${user.name}'s holdings` : "Track your crypto holdings and P&L"}
            </p>
          </div>
          <Link to="/trade">
            <button className="flex items-center gap-1 text-xs sm:text-sm text-[#F0B90B] hover:opacity-80 transition-opacity font-medium">
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Trade
            </button>
          </Link>
        </div>

        {/* Summary cards — 2 columns on mobile, 4 on large */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-[#F0B90B]/10 to-[#F0B90B]/5 border-[#F0B90B]/20">
            <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#F0B90B]" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Portfolio</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold font-mono">${formatCurrency(totalValue)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">All assets</p>
            </CardContent>
          </Card>

          <Card className={`border-${totalUnrealizedPnl >= 0 ? "[#0ecb81]" : "[#f6465d]"}/20 bg-gradient-to-br ${totalUnrealizedPnl >= 0 ? "from-[#0ecb81]/10 to-[#0ecb81]/5" : "from-[#f6465d]/10 to-[#f6465d]/5"}`}>
            <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Unrealized P&L</span>
              </div>
              {loadingPnl ? <Skeleton className="h-6 sm:h-7 w-24" /> : (
                <div className="text-sm sm:text-base">
                  <PnLBadge value={totalUnrealizedPnl} pct={totalUnrealizedPct} />
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Open positions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Realized P&L</span>
              </div>
              {loadingPnl ? <Skeleton className="h-6 sm:h-7 w-24" /> : (
                <div className="text-sm sm:text-base">
                  <PnLBadge value={totalRealizedPnl} />
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Closed trades</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">USDT Balance</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold font-mono">${formatCurrency(usdtValue)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Available</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Positions + Holdings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Open Positions */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  Open Positions & P&L
                  {loadingPnl && <SpinnerIcon />}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loadingPnl ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !pnlData || pnlData.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No positions yet.</p>
                    <p className="text-xs mt-1">Place trades to see your P&L here.</p>
                    <Link to="/trade" className="text-[#F0B90B] text-xs hover:underline mt-2 inline-block">Start Trading →</Link>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/40">
                            <th className="text-left pb-2 font-medium">Coin</th>
                            <th className="text-right pb-2 font-medium">Amount</th>
                            <th className="text-right pb-2 font-medium">Avg Buy</th>
                            <th className="text-right pb-2 font-medium">Current</th>
                            <th className="text-right pb-2 font-medium">Value</th>
                            <th className="text-right pb-2 font-medium">Unrealized P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pnlData.map((d) => (
                            <tr key={d.symbol} className="border-b border-border/20 hover:bg-muted/10">
                              <td className="py-3">
                                <Link to={`/trade/${encodeURIComponent(`${d.symbol}/USDT`)}`} className="flex items-center gap-2 hover:opacity-80">
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{ background: `${COIN_COLORS[d.symbol] ?? "#F0B90B"}20`, color: COIN_COLORS[d.symbol] ?? "#F0B90B" }}
                                  >{d.symbol.slice(0, 2)}</div>
                                  <span className="font-semibold">{d.symbol}</span>
                                </Link>
                              </td>
                              <td className="py-3 text-right font-mono">{d.currentAmount.toFixed(6)}</td>
                              <td className="py-3 text-right font-mono text-muted-foreground">
                                ${d.avgBuyPrice > 0 ? d.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d.avgBuyPrice >= 1 ? 2 : 6 }) : "—"}
                              </td>
                              <td className="py-3 text-right font-mono">
                                ${d.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d.currentPrice >= 1 ? 2 : 6 })}
                              </td>
                              <td className="py-3 text-right font-mono font-medium">
                                ${formatCurrency(d.currentValue)}
                              </td>
                              <td className="py-3 text-right">
                                <div className={`flex flex-col items-end ${d.unrealizedPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                                  <span className="font-semibold font-mono">
                                    {d.unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(d.unrealizedPnl))}
                                  </span>
                                  <span className="text-[10px] opacity-80">
                                    {d.unrealizedPnlPct >= 0 ? "+" : ""}{d.unrealizedPnlPct.toFixed(2)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {pnlData.map((d) => (
                        <Link
                          key={d.symbol}
                          to={`/trade/${encodeURIComponent(`${d.symbol}/USDT`)}`}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/20 active:bg-muted/40 transition-colors"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${COIN_COLORS[d.symbol] ?? "#F0B90B"}20`, color: COIN_COLORS[d.symbol] ?? "#F0B90B" }}
                          >{d.symbol.slice(0, 2)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">{d.symbol}</span>
                              <span className={`text-sm font-bold font-mono ${d.unrealizedPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                                {d.unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(d.unrealizedPnl))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono">{d.currentAmount.toFixed(4)} @ ${d.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d.currentPrice >= 1 ? 2 : 4 })}</span>
                              <span className={`text-xs font-medium ${d.unrealizedPnlPct >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                                {d.unrealizedPnlPct >= 0 ? "+" : ""}{d.unrealizedPnlPct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-muted-foreground">Avg buy: ${d.avgBuyPrice > 0 ? d.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d.avgBuyPrice >= 1 ? 2 : 4 }) : "—"}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">Value: ${formatCurrency(d.currentValue)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* All Holdings */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm">All Holdings</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="space-y-0.5 sm:space-y-1">
                  {/* USDT */}
                  <div className="flex items-center justify-between py-2 border-b border-border/20">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{ background: "#26a17b20", color: "#26a17b" }}>$</div>
                      <div>
                        <p className="font-semibold text-sm">USDT</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Tether</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm font-mono">${formatCurrency(usdtValue)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatCurrency(usdtValue, 2)} USDT</p>
                    </div>
                  </div>

                  {btcValue > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-border/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ background: "#F0B90B20", color: "#F0B90B" }}>₿</div>
                        <div>
                          <p className="font-semibold text-sm">BTC</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Bitcoin</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm font-mono">${formatCurrency(btcValue)}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{(balance?.btc ?? 0).toFixed(6)} BTC</p>
                      </div>
                    </div>
                  )}

                  {ethValue > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-border/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ background: "#627eea20", color: "#627eea" }}>Ξ</div>
                        <div>
                          <p className="font-semibold text-sm">ETH</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Ethereum</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm font-mono">${formatCurrency(ethValue)}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{(balance?.eth ?? 0).toFixed(6)} ETH</p>
                      </div>
                    </div>
                  )}

                  {extraBalances.filter((b) => b.symbol !== "BTC" && b.symbol !== "ETH" && b.amount > 0).map((b) => {
                    const coinPrice = prices?.find((p) => p.symbol.startsWith(b.symbol))?.price ?? 0;
                    const val = b.amount * coinPrice;
                    const coinColor = COIN_COLORS[b.symbol] ?? "#F0B90B";
                    if (val < 0.001) return null;
                    return (
                      <div key={b.symbol} className="flex items-center justify-between py-2 border-b border-border/20">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs"
                            style={{ background: `${coinColor}20`, color: coinColor }}>{b.symbol.slice(0, 2)}</div>
                          <div>
                            <p className="font-semibold text-sm">{b.symbol}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">@ ${coinPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coinPrice >= 1 ? 2 : 6 })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm font-mono">${formatCurrency(val)}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{b.amount.toFixed(4)} {b.symbol}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Allocation + Realized P&L + Transactions */}
          <div className="space-y-4">
            {/* Allocation Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm">Allocation</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {totalValue > 0.01 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={44} outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [`$${formatCurrency(v)}`, ""]}
                          contentStyle={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8, fontSize: 11,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="truncate">{d.name}</span>
                          <span className="font-medium font-mono ml-auto">
                            {totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs">
                    No holdings yet.
                    <br />
                    <Link to="/deposit" className="text-[#F0B90B] hover:underline">Deposit to get started</Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Realized P&L by Coin */}
            {pnlData && pnlData.some((d) => Math.abs(d.realizedPnl) > 0.01) && (
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm">Realized P&L by Coin</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
                  {pnlData.filter((d) => Math.abs(d.realizedPnl) > 0.01).map((d) => (
                    <div key={d.symbol} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{d.symbol}</span>
                      <span className={`font-mono font-semibold ${d.realizedPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                        {d.realizedPnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(d.realizedPnl))}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {recentTx.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentTx.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-xs font-medium capitalize">{tx.type}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{tx.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${tx.type === "deposit" ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                            {tx.type === "deposit" ? "+" : "-"}{tx.amount} {tx.currency}
                          </p>
                          <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}
                            className="text-[10px] px-1 py-0">{tx.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

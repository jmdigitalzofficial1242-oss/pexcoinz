import { Link, useNavigate } from "react-router-dom";
import { useGetCryptoPrices, useGetMarketTicker, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight, ArrowDownRight, Shield, Zap, Bot, TrendingUp,
  Search, Globe, BarChart2, Star, ChevronRight, Lock, Cpu, Activity,
  Users, DollarSign, Clock, ArrowRight
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: user } = useGetMe({ query: { retry: false } });

  const { data: prices, isLoading: loadingPrices } = useGetCryptoPrices({
    query: { refetchInterval: 5000 },
  });
  const { data: ticker } = useGetMarketTicker({
    query: { refetchInterval: 5000 },
  });

  const filtered = prices?.filter(
    (p) => !search || p.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const fmtPrice = (price: number) => {
    if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 0.001) return price.toFixed(4);
    return price.toFixed(8);
  };

  const fmtBig = (n: number | null | undefined) => {
    if (!n) return "—";
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <Layout>
      {/* ── Live Ticker ─────────────────────────────────────────────── */}
      <div className="w-full border-b border-primary/10 bg-black/60 backdrop-blur-sm overflow-hidden py-2.5 flex items-center">
        <div className="flex items-center gap-10 px-4 animate-marquee whitespace-nowrap">
          {[...(ticker ?? []), ...(ticker ?? [])].map((t, i) => (
            <div key={`${t.pair}-${i}`} className="flex items-center gap-2 text-xs font-mono shrink-0">
              <span className="font-bold text-foreground tracking-wide">{t.pair}</span>
              <span className="text-muted-foreground">${t.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              <span className={`font-semibold ${t.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {t.change >= 0 ? "▲" : "▼"} {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100svh-112px)] md:min-h-[88vh] flex items-center px-4 overflow-hidden py-10 md:py-0">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,175,55,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_60%,rgba(212,175,55,0.06),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Floating grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#d4af37 1px,transparent 1px),linear-gradient(90deg,#d4af37 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Animated orbs */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/3 left-1/5 w-64 h-64 rounded-full bg-primary/4 blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />

        <div className="max-w-screen-xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Next-Gen Crypto Exchange
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight">
                Trade Crypto<br />
                <span className="relative">
                  <span className="text-primary">Smarter</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-primary/60 to-transparent" />
                </span>
                <br />
                <span className="text-foreground/60">& Faster.</span>
              </h1>

              <p className="text-muted-foreground text-base md:text-lg max-w-lg leading-relaxed">
                Institutional-grade security meets lightning execution. Trade 24+ cryptocurrencies with real-time AI market insights and zero compromise.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {user ? (
                  <>
                    <Button size="lg" className="font-bold gap-2 text-base h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={() => navigate("/trade")}>
                      <BarChart2 className="h-5 w-5" /> Open Trading
                    </Button>
                    <Button size="lg" variant="outline" className="text-base h-12 px-8 border-border/60 hover:border-primary/40" onClick={() => navigate("/dashboard")}>
                      Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="font-bold gap-2 text-base h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 w-full sm:w-auto">
                        Start Trading Free <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="outline" className="text-base h-12 px-8 border-border/60 hover:border-primary/40 w-full sm:w-auto">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  Bank-Grade SSL
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  24/7 Live Trading
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Star className="h-3.5 w-3.5 text-primary" />
                  </div>
                  5% Referral Reward
                </div>
              </div>
            </div>

            {/* Right: Live price cards */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Glow behind cards */}
                <div className="absolute inset-10 bg-primary/8 blur-3xl rounded-full" />

                {/* Central dashboard mockup */}
                <div className="relative bg-black/60 border border-border/30 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground font-medium">LIVE MARKET</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">REAL-TIME</Badge>
                  </div>

                  <div className="space-y-2">
                    {loadingPrices
                      ? [1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-xl bg-muted/30 animate-pulse" />)
                      : (prices ?? []).slice(0, 5).map(p => {
                          const isUp = p.change >= 0;
                          const sym = p.symbol.replace("/USDT", "");
                          return (
                            <div key={p.symbol} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border/20 hover:border-primary/20 transition-colors cursor-pointer" onClick={() => user ? navigate(`/trade/${encodeURIComponent(p.symbol)}`) : navigate("/login")}>
                              {p.iconUrl
                                ? <img src={p.iconUrl} alt={sym} className="w-8 h-8 rounded-full shrink-0" />
                                : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{sym.slice(0, 2)}</div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{sym}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{p.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-sm font-semibold">${fmtPrice(p.price)}</p>
                                <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                                  {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                                  {isUp ? "+" : ""}{p.change.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>

                  <Button className="w-full mt-4 text-xs h-9 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" variant="ghost" onClick={() => user ? navigate("/trade") : navigate("/register")}>
                    View All Markets <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {/* Floating stat pill */}
                <div className="absolute -top-4 -right-4 bg-black/80 border border-emerald-500/30 rounded-xl px-4 py-2.5 backdrop-blur-sm shadow-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">24h Volume</p>
                      <p className="text-sm font-bold text-emerald-400">$2.4B+</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-black/80 border border-primary/30 rounded-xl px-4 py-2.5 backdrop-blur-sm shadow-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Active Traders</p>
                      <p className="text-sm font-bold text-primary">50K+</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────── */}
      <section className="border-y border-border/30 bg-black/40 backdrop-blur-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-border/20">
            {[
              { icon: DollarSign, label: "24h Trading Volume", value: "$2.4B+", color: "text-emerald-400" },
              { icon: BarChart2, label: "Cryptocurrencies", value: "24+", color: "text-blue-400" },
              { icon: Users, label: "Registered Users", value: "50K+", color: "text-primary" },
              { icon: Clock, label: "Platform Uptime", value: "99.9%", color: "text-purple-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center text-center px-4 gap-1.5">
                <Icon className={`h-5 w-5 ${color} mb-1`} />
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(212,175,55,0.05),transparent)]" />
        <div className="max-w-screen-xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs mb-4">PLATFORM FEATURES</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for serious traders</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Everything you need to trade professionally — from AI insights to institutional-grade security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: <Zap className="h-6 w-6 text-yellow-400" />,
                title: "Lightning Execution",
                desc: "Sub-millisecond order matching with our high-performance engine. Never miss a trade.",
                gradient: "from-yellow-500/5 to-transparent",
                border: "border-yellow-500/10 hover:border-yellow-500/30",
              },
              {
                icon: <Bot className="h-6 w-6 text-primary" />,
                title: "AI Trading Assistant",
                desc: "GPT-powered market analysis, price predictions, and personalized trading signals 24/7.",
                gradient: "from-primary/8 to-transparent",
                border: "border-primary/10 hover:border-primary/30",
              },
              {
                icon: <Shield className="h-6 w-6 text-emerald-400" />,
                title: "Military-Grade Security",
                desc: "Multi-layer 2FA, cold storage, payment passwords, and real-time fraud detection.",
                gradient: "from-emerald-500/5 to-transparent",
                border: "border-emerald-500/10 hover:border-emerald-500/30",
              },
              {
                icon: <Lock className="h-6 w-6 text-blue-400" />,
                title: "Payment Password",
                desc: "Secondary password protection on all withdrawals. Your funds are always safe.",
                gradient: "from-blue-500/5 to-transparent",
                border: "border-blue-500/10 hover:border-blue-500/30",
              },
              {
                icon: <Cpu className="h-6 w-6 text-purple-400" />,
                title: "Advanced Portfolio",
                desc: "Real-time P&L tracking, performance analytics, and detailed transaction history.",
                gradient: "from-purple-500/5 to-transparent",
                border: "border-purple-500/10 hover:border-purple-500/30",
              },
              {
                icon: <Star className="h-6 w-6 text-primary" />,
                title: "5% Referral Program",
                desc: "Earn 5% commission on every deposit made by users you invite. Grow together.",
                gradient: "from-primary/5 to-transparent",
                border: "border-primary/10 hover:border-primary/30",
              },
            ].map((f) => (
              <div key={f.title} className={`relative p-6 rounded-2xl border bg-gradient-to-br ${f.gradient} ${f.border} transition-all duration-300 group overflow-hidden`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Market Table ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-t border-border/20">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs mb-2">LIVE PRICES</Badge>
              <h2 className="text-2xl font-bold">Market Overview</h2>
              <p className="text-muted-foreground text-sm">Real-time prices across all trading pairs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-9 w-44 h-9 text-sm bg-black/40 border-border/40" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/30 rounded-lg px-3 py-2 bg-black/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 overflow-hidden bg-black/20 backdrop-blur-sm">
            <div className="hidden md:grid grid-cols-12 text-xs font-medium text-muted-foreground px-5 py-3.5 bg-white/[0.02] border-b border-border/30">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Asset</span>
              <span className="col-span-3 text-right">Price</span>
              <span className="col-span-2 text-right">24h Change</span>
              <span className="col-span-2 text-right">Market Cap</span>
            </div>
            <div className="grid md:hidden grid-cols-12 text-xs font-medium text-muted-foreground px-4 py-3 bg-white/[0.02] border-b border-border/30">
              <span className="col-span-5">Asset</span>
              <span className="col-span-4 text-right">Price</span>
              <span className="col-span-3 text-right">24h</span>
            </div>

            {loadingPrices ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center px-4 py-3.5 border-b border-border/10 animate-pulse gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted/30 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-16 bg-muted/30 rounded" />
                    <div className="h-2.5 w-10 bg-muted/20 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-muted/30 rounded ml-auto" />
                </div>
              ))
            ) : (
              (filtered ?? []).slice(0, 20).map((p, idx) => {
                const isUp = p.change >= 0;
                const symbol = p.symbol.replace("/USDT", "");
                return (
                  <div
                    key={p.symbol}
                    className="border-b border-border/10 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => user ? navigate(`/trade/${encodeURIComponent(p.symbol)}`) : navigate("/login")}
                  >
                    {/* Mobile */}
                    <div className="grid md:hidden grid-cols-12 px-4 py-3 items-center gap-1">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        {p.iconUrl
                          ? <img src={p.iconUrl} alt={p.name} className="w-7 h-7 rounded-full shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{symbol.slice(0, 2)}</div>
                        }
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{symbol}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.name}</p>
                        </div>
                      </div>
                      <div className="col-span-4 text-right">
                        <p className="font-mono font-semibold text-sm">${fmtPrice(p.price)}</p>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {isUp ? "+" : ""}{p.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-12 px-5 py-4 items-center">
                      <span className="col-span-1 text-xs text-muted-foreground/60 font-mono">{idx + 1}</span>
                      <div className="col-span-4 flex items-center gap-3">
                        {p.iconUrl
                          ? <img src={p.iconUrl} alt={p.name} className="w-8 h-8 rounded-full shrink-0" />
                          : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{symbol.slice(0, 2)}</div>
                        }
                        <div>
                          <p className="font-semibold text-sm">{symbol}</p>
                          <p className="text-xs text-muted-foreground">{p.name}</p>
                        </div>
                      </div>
                      <div className="col-span-3 text-right">
                        <p className="font-mono font-semibold">${fmtPrice(p.price)}</p>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={`inline-flex items-center justify-end gap-1 text-sm font-semibold px-2 py-0.5 rounded-lg ${isUp ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {isUp ? "+" : ""}{p.change.toFixed(2)}%
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm text-muted-foreground">{fmtBig(p.marketCap)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!user && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">Sign up to trade these assets instantly</p>
              <Link to="/register">
                <Button className="gap-2 font-bold px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {!user && (
        <section className="py-24 px-4 relative overflow-hidden border-t border-border/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(212,175,55,0.08),transparent)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="max-w-2xl mx-auto text-center relative z-10 space-y-6">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">INVITATION ONLY</Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Ready to join the<br />
              <span className="text-primary">future of trading?</span>
            </h2>
            <p className="text-muted-foreground text-lg">Get an invitation from an existing member and start trading cryptocurrencies with confidence.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link to="/register">
                <Button size="lg" className="font-bold gap-2 px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 w-full sm:w-auto">
                  <TrendingUp className="h-5 w-5" /> Join PexCoin
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="px-10 h-12 border-border/50 hover:border-primary/40 w-full sm:w-auto">
                  Already a member? Sign In
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground/60 pt-2">
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> No hidden fees</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Instant setup</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Secure & private</span>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

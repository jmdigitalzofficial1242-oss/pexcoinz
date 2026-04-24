import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetCryptoPrices,
  useGetMyBalance,
  usePlaceOrder,
  useGetMyOrders,
  useCancelOrder,
  useGetCoinOhlc,
} from "@workspace/api-client-react";
import {
  ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Loader2, BarChart2, CandlestickChart, LineChart, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TradingChart } from "@/components/trading-chart";

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  ADA: "cardano", XRP: "ripple", DOGE: "dogecoin", DOT: "polkadot",
  LTC: "litecoin", AVAX: "avalanche-2", MATIC: "matic-network", LINK: "chainlink",
  SHIB: "shiba-inu", UNI: "uniswap", ATOM: "cosmos", BCH: "bitcoin-cash",
  ETC: "ethereum-classic", FIL: "filecoin", TON: "toncoin", XLM: "stellar",
  ALGO: "algorand", TRX: "tron", USDC: "usd-coin", ICP: "internet-computer",
  AAVE: "aave", EOS: "eos", FLOW: "flow", THETA: "theta-network",
};

const COIN_COLORS: Record<string, string> = {
  BTC: "#F0B90B", ETH: "#627eea", BNB: "#F0B90B", SOL: "#9945ff",
  ADA: "#0033ad", XRP: "#00aae4", DOT: "#e6007a", DOGE: "#c2a633",
  AVAX: "#e84142", MATIC: "#8247e5", LINK: "#375bd2", LTC: "#345d9d",
  SHIB: "#e85f2a", UNI: "#ff007a", ATOM: "#2e3148", BCH: "#0ac18e",
  ETC: "#3ab83a", FIL: "#0090ff", TON: "#0098ea", XLM: "#7d00ff",
  default: "#F0B90B",
};

const TIMEFRAMES = [
  { label: "1D", days: "1" },
  { label: "1W", days: "7" },
  { label: "1M", days: "30" },
  { label: "3M", days: "90" },
  { label: "1Y", days: "365" },
];

function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

function formatLargeNumber(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export default function CoinDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState<"candlestick" | "area">("candlestick");

  const decodedSymbol = decodeURIComponent(symbol ?? "");
  const coinSymbol = decodedSymbol.split("/")[0] ?? "BTC";
  const coinGeckoId = SYMBOL_TO_ID[coinSymbol] ?? coinSymbol.toLowerCase();
  const coinColor = COIN_COLORS[coinSymbol] ?? COIN_COLORS.default;

  const currentDays = TIMEFRAMES.find((t) => t.label === timeframe)?.days ?? "1";

  const { data: prices, isLoading: loadingPrices } = useGetCryptoPrices({
    query: { refetchInterval: 15_000 },
  });

  const { data: ohlcData, isLoading: loadingChart } = useGetCoinOhlc(
    coinGeckoId, currentDays, { query: { staleTime: 60_000 } }
  );

  const { data: balance } = useGetMyBalance({ query: { refetchInterval: 15_000 } });
  const { data: allOrders, isLoading: loadingOrders } = useGetMyOrders();
  const placeMutation = usePlaceOrder();
  const cancelMutation = useCancelOrder();

  const coin = prices?.find((p) => p.symbol === decodedSymbol);
  const coinName = coin?.name ?? coinSymbol;
  const currentPrice = coin?.price ?? 0;
  const priceChange = coin?.change ?? 0;
  const isUp = priceChange >= 0;

  const symbolOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.filter(
      (o) => o.symbol === `${coinSymbol}USDT` && (o.status === "open" || o.status === "filled")
    ).slice(0, 10);
  }, [allOrders, coinSymbol]);

  const effectivePrice = orderType === "market" ? currentPrice : (parseFloat(limitPrice) || currentPrice);
  const amountNum = parseFloat(amount) || 0;
  const totalCost = amountNum * effectivePrice;

  const coinBalance = (balance as any)?.[coinSymbol.toLowerCase()] ?? 0;

  const handleTrade = (side: "buy" | "sell") => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }
    if (currentPrice <= 0) {
      toast({ title: "Price unavailable", variant: "destructive" });
      return;
    }

    const orderAmount = parseFloat(amount);

    placeMutation.mutate(
      {
        symbol: `${coinSymbol}USDT`,
        side,
        type: orderType,
        amount: orderAmount,
        price: orderType === "limit" ? (parseFloat(limitPrice) || currentPrice) : undefined,
        total: orderType === "market" && side === "buy" ? orderAmount * currentPrice : undefined,
      },
      {
        onSuccess: (data) => {
          const filled = Number(data.filledAmount ?? orderAmount);
          const atPrice = Number(data.avgPrice ?? data.price ?? currentPrice);
          toast({
            title: `${side === "buy" ? "Buy" : "Sell"} Order ${data.status === "filled" ? "Filled ✓" : "Placed"}`,
            description: `${side === "buy" ? "Bought" : "Sold"} ${filled.toFixed(6)} ${coinSymbol} @ $${formatPrice(atPrice)}`,
          });
          setAmount("");
          setLimitPrice("");
        },
        onError: (error: any) => {
          toast({
            title: "Order failed",
            description: error?.data?.error ?? error?.message ?? "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancel = (orderId: number) => {
    cancelMutation.mutate(orderId, {
      onSuccess: () => toast({ title: "Order cancelled" }),
      onError: (err: any) => toast({
        title: "Cancel failed",
        description: err?.data?.error ?? err?.message,
        variant: "destructive",
      }),
    });
  };

  if (!coin && !loadingPrices && prices) {
    return (
      <Layout>
        <div className="max-w-screen-xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Coin "{decodedSymbol}" not found.</p>
          <Link to="/trade"><Button>Back to Markets</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {/* Top breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-muted-foreground px-2"
            onClick={() => navigate("/trade")}>
            <ArrowLeft className="h-3.5 w-3.5" /> Markets
          </Button>
          <span className="text-muted-foreground/40 text-sm">/</span>
          <span className="text-sm font-medium">{decodedSymbol}</span>
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500">Live</span>
          </div>
        </div>

        {/* Price Header */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 p-4 rounded-xl border border-border/50 bg-card/40">
          <div className="flex items-center gap-3">
            {coin?.iconUrl
              ? <img src={coin.iconUrl} alt={coinName} className="w-8 h-8 rounded-full" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: `${coinColor}20`, color: coinColor }}>{coinSymbol.slice(0, 2)}</div>
            }
            <div>
              <span className="font-bold text-base">{coinName}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{decodedSymbol}</span>
            </div>
          </div>

          {loadingPrices ? <Skeleton className="h-8 w-36" /> : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono">${formatPrice(currentPrice)}</span>
              <span className={`flex items-center gap-0.5 text-sm font-semibold ${isUp ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {isUp ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </div>
          )}

          <div className="flex gap-5 text-xs text-muted-foreground ml-auto flex-wrap">
            <div><p className="mb-0.5">24h High</p><p className="font-medium text-foreground">{coin?.high24h ? `$${formatPrice(coin.high24h)}` : "—"}</p></div>
            <div><p className="mb-0.5">24h Low</p><p className="font-medium text-foreground">{coin?.low24h ? `$${formatPrice(coin.low24h)}` : "—"}</p></div>
            <div><p className="mb-0.5">24h Volume</p><p className="font-medium text-foreground">{formatLargeNumber(coin?.volume)}</p></div>
            <div><p className="mb-0.5">Market Cap</p><p className="font-medium text-foreground">{formatLargeNumber(coin?.marketCap)}</p></div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardContent className="p-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex gap-0.5">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => setTimeframe(tf.label)}
                        className={`text-xs px-3 py-1.5 rounded transition-colors font-medium ${
                          timeframe === tf.label
                            ? "bg-[#F0B90B]/10 text-[#F0B90B]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >{tf.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChartType("candlestick")}
                      className={`p-1.5 rounded transition-colors ${chartType === "candlestick" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Candlestick chart"
                    ><CandlestickChart className="h-4 w-4" /></button>
                    <button
                      onClick={() => setChartType("area")}
                      className={`p-1.5 rounded transition-colors ${chartType === "area" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Area chart"
                    ><LineChart className="h-4 w-4" /></button>
                  </div>
                </div>

                {/* Chart area */}
                <div className="px-2 pb-2">
                  {loadingChart ? (
                    <div className="flex items-center justify-center h-80">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin text-[#F0B90B]" />
                        <p className="text-sm">Loading chart...</p>
                      </div>
                    </div>
                  ) : !ohlcData || ohlcData.length === 0 ? (
                    <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">
                      <BarChart2 className="h-7 w-7 mr-2 opacity-30" />
                      Chart data unavailable
                    </div>
                  ) : (
                    <TradingChart
                      data={ohlcData}
                      height={340}
                      coinColor={coinColor}
                      chartType={chartType}
                      priceFormatter={(p) => `$${formatPrice(p)}`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Order Form + Balance */}
          <div className="space-y-4">
            {/* Order Form */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  {coin?.iconUrl
                    ? <img src={coin.iconUrl} alt={coinSymbol} className="w-5 h-5 rounded-full" />
                    : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: `${coinColor}20`, color: coinColor }}>{coinSymbol.slice(0, 2)}</div>
                  }
                  <CardTitle className="text-sm">Trade {coinSymbol} / USDT</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* Order type: Market / Limit */}
                <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)} className="mb-4">
                  <TabsList className="w-full h-8 bg-muted/40">
                    <TabsTrigger value="market" className="flex-1 text-xs h-7">Market</TabsTrigger>
                    <TabsTrigger value="limit" className="flex-1 text-xs h-7">Limit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="market" className="mt-3">
                    <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Market Price</p>
                      {loadingPrices ? <Skeleton className="h-5 w-28 mx-auto" /> : (
                        <p className="font-bold font-mono text-base">${formatPrice(currentPrice)}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="limit" className="mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Limit Price (USDT)</Label>
                      <Input
                        type="number"
                        placeholder={currentPrice ? formatPrice(currentPrice) : "0.00"}
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="h-9 text-sm font-mono"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Amount ({coinSymbol})</Label>
                    <Input
                      type="number"
                      placeholder="0.00000000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1.5 h-9 text-sm font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {["25%", "50%", "75%", "100%"].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => {
                          const pctVal = parseInt(pct) / 100;
                          if (currentPrice > 0) setAmount(((balance?.usdt ?? 0) * pctVal / currentPrice).toFixed(6));
                        }}
                        className="text-xs py-1 border border-border/50 rounded hover:bg-muted/50 hover:border-[#F0B90B]/40 transition-colors text-muted-foreground hover:text-foreground"
                      >{pct}</button>
                    ))}
                  </div>

                  {amountNum > 0 && currentPrice > 0 && (
                    <div className="flex justify-between text-xs p-2 bg-muted/20 rounded border border-border/40">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-mono font-medium">
                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <Button
                      className="h-10 font-bold text-sm gap-1.5 bg-[#0ecb81] hover:bg-[#0ab572] text-black"
                      onClick={() => handleTrade("buy")}
                      disabled={placeMutation.isPending}
                    >
                      {placeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                      Buy
                    </Button>
                    <Button
                      className="h-10 font-bold text-sm gap-1.5 bg-[#f6465d] hover:bg-[#e03050] text-white border-0"
                      onClick={() => handleTrade("sell")}
                      disabled={placeMutation.isPending}
                    >
                      {placeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownRight className="h-4 w-4" />}
                      Sell
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Available Balance</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-green-600">$</span>
                    </div>
                    <span className="text-sm">USDT</span>
                  </div>
                  <span className="font-mono text-sm font-medium">
                    ${(balance?.usdt ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {coin?.iconUrl
                      ? <img src={coin.iconUrl} alt={coinSymbol} className="w-4 h-4 rounded-full" />
                      : <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                          style={{ background: `${coinColor}20`, color: coinColor }}>{coinSymbol.slice(0, 2)}</div>
                    }
                    <span className="text-sm">{coinSymbol}</span>
                  </div>
                  <span className="font-mono text-sm font-medium">{coinBalance.toFixed(6)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order History */}
        {symbolOrders.length > 0 && (
          <Card className="mt-4 border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                Order History
                <Badge variant="secondary" className="text-xs">{coinSymbol}/USDT</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/40">
                      <th className="text-left pb-2 font-medium">Time</th>
                      <th className="text-left pb-2 font-medium">Type</th>
                      <th className="text-left pb-2 font-medium">Side</th>
                      <th className="text-right pb-2 font-medium">Amount</th>
                      <th className="text-right pb-2 font-medium">Price</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                      <th className="text-center pb-2 font-medium">Status</th>
                      <th className="text-center pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="py-2 text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 capitalize">{order.type}</td>
                        <td className={`py-2 font-semibold ${order.side === "buy" ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                          {order.side.toUpperCase()}
                        </td>
                        <td className="py-2 text-right font-mono">{Number(order.amount).toFixed(6)}</td>
                        <td className="py-2 text-right font-mono">
                          ${order.avgPrice ? formatPrice(Number(order.avgPrice)) : order.price ? formatPrice(Number(order.price)) : "—"}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {order.total ? `$${Number(order.total).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 text-center">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              order.status === "filled" ? "bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20" :
                              order.status === "open" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              "bg-muted text-muted-foreground"
                            }`}
                            variant="outline"
                          >{order.status}</Badge>
                        </td>
                        <td className="py-2 text-center">
                          {order.status === "open" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-[#f6465d] hover:bg-[#f6465d]/10"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

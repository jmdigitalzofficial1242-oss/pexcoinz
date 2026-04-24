import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetCryptoPrices } from "@workspace/api-client-react";
import { CreditCard, Bitcoin, Zap, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth-utils";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product {
  id: string;
  name: string;
  description: string | null;
  prices: Array<{
    id: string;
    unit_amount: number;
    currency: string;
  }>;
}

const CRYPTO_PACKAGES = [
  {
    name: "Starter Pack",
    description: "Perfect for beginners",
    amount: "$50 USDT",
    priceUsd: 50,
    bonus: "0% fees",
    icon: "🌱",
    popular: false,
  },
  {
    name: "Growth Pack",
    description: "Most popular choice",
    amount: "$200 USDT",
    priceUsd: 200,
    bonus: "5% bonus",
    icon: "🚀",
    popular: true,
  },
  {
    name: "Pro Pack",
    description: "For serious traders",
    amount: "$500 USDT",
    priceUsd: 500,
    bonus: "10% bonus",
    icon: "💎",
    popular: false,
  },
  {
    name: "Elite Pack",
    description: "Maximum value",
    amount: "$1000 USDT",
    priceUsd: 1000,
    bonus: "15% bonus",
    icon: "👑",
    popular: false,
  },
];

export default function BuyCrypto() {
  const navigate = useNavigate();
  const { data: prices } = useGetCryptoPrices();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [stripeAvailable, setStripeAvailable] = useState<boolean | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const btcPrice = prices?.find((p) => p.symbol.startsWith("BTC"))?.price ?? 65000;
  const ethPrice = prices?.find((p) => p.symbol.startsWith("ETH"))?.price ?? 3200;

  useEffect(() => {
    checkStripeProducts();
  }, []);

  async function checkStripeProducts() {
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/stripe/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setProducts(data.data || []);
      setStripeAvailable(true);
    } catch {
      setStripeAvailable(false);
    }
  }

  async function handleCheckout(priceId: string) {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setLoadingCheckout(priceId);
    try {
      const res = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}${BASE}/buy-crypto?success=true`,
          cancelUrl: `${window.location.origin}${BASE}/buy-crypto?canceled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      alert("Failed to connect to payment processor");
    } finally {
      setLoadingCheckout(null);
    }
  }

  return (
    <Layout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Buy Crypto Instantly</h1>
          <p className="text-muted-foreground">Fund your account with your credit or debit card</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-green-500" />
              SSL Secured
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3 text-blue-500" />
              All cards accepted
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              Instant deposit
            </div>
          </div>
        </div>

        {success && (
          <Card className="mb-6 border-green-500/50 bg-green-500/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">Your account will be credited shortly.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {canceled && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-700 dark:text-yellow-400">Payment Canceled</p>
                <p className="text-sm text-muted-foreground">No charges were made. Feel free to try again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Prices Banner */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#f7931a]/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-[#f7931a]">₿</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">BTC / USD</p>
                  <p className="font-bold">${btcPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#627eea]/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-[#627eea]">Ξ</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETH / USD</p>
                  <p className="font-bold">${ethPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                Live prices
              </div>
            </div>
          </CardContent>
        </Card>

        {/* If Stripe is configured, show Stripe products */}
        {stripeAvailable && products.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Available Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) =>
                product.prices.map((price) => (
                  <Card
                    key={price.id}
                    className="relative border-2 hover:border-primary/50 transition-colors"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold mb-3">
                        ${(price.unit_amount / 100).toLocaleString()}{" "}
                        <span className="text-sm font-normal text-muted-foreground">{price.currency.toUpperCase()}</span>
                      </p>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleCheckout(price.id)}
                        disabled={loadingCheckout === price.id}
                      >
                        {loadingCheckout === price.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Pay with Card
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Default packages if Stripe not yet configured */
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose a Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CRYPTO_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.name}
                  className={`relative border-2 transition-all hover:shadow-md ${
                    pkg.popular ? "border-primary" : "hover:border-primary/30"
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="px-3 py-0.5 text-xs">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2 pt-5">
                    <div className="text-3xl mb-1">{pkg.icon}</div>
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  </CardHeader>
                  <CardContent className="text-center space-y-3">
                    <div>
                      <p className="text-2xl font-bold">${pkg.priceUsd}</p>
                      <p className="text-sm text-muted-foreground">{pkg.amount}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {pkg.bonus}
                    </Badge>
                    <Button
                      className="w-full gap-2"
                      variant={pkg.popular ? "default" : "outline"}
                      onClick={() => {
                        if (!getToken()) {
                          navigate("/login");
                        } else {
                          alert("Please connect your Stripe account to enable card payments. Contact support for alternative deposit methods.");
                        }
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Buy Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Alternative Deposit Methods</p>
              <p>You can also deposit crypto directly to your wallet address. Go to{" "}
                <a href={`${BASE}/deposit`} className="text-primary hover:underline">Deposit</a>{" "}
                to get your deposit addresses for USDT, BTC, and ETH.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

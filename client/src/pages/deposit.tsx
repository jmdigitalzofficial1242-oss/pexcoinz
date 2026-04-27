import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTransaction } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Check, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NETWORKS: Record<string, string> = {
  USDT: "TRC20 (TRON)",
  BTC: "Bitcoin Network",
  ETH: "ERC20 (Ethereum)",
};

const DEFAULT_ADDRESSES: Record<string, string> = {
  USDT: "",
  BTC: "",
  ETH: "",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function Deposit() {
  const [currency, setCurrency] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [addresses, setAddresses] = useState<Record<string, string>>(DEFAULT_ADDRESSES);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createTx = useCreateTransaction();

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/payment-addresses`)
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === "object") {
          setAddresses(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  const adminAddress = addresses[currency] || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    createTx.mutate({
      data: {
        type: "deposit",
        amount: Number(amount),
        currency,
        address: adminAddress || undefined,
        note: txHash ? `TX Hash: ${txHash}` : `Deposit ${currency} — awaiting admin confirmation`,
      }
    }, {
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: (error: any) => {
        toast({
          title: "Submission failed",
          description: error.error || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  if (submitted) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
          <Card className="w-full max-w-md border-positive/30 bg-positive/5">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-positive/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-positive" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Deposit Submitted</h2>
                <p className="text-sm text-muted-foreground">Your deposit request has been received and is pending admin confirmation.</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-bold">{amount} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">After Fee (10%)</span>
                  <span className="font-mono font-bold text-positive">{(Number(amount) * 0.90).toFixed(8)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Clock className="h-3.5 w-3.5" /> Pending
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Once the admin verifies your transfer, your balance will be credited within 1–24 hours.</p>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>View Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
        <div className="w-full max-w-md mb-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="w-full max-w-md space-y-4">
          {/* Step 1: Select & Copy Admin Address */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                Select Currency & Send to Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select coin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (Tether)</SelectItem>
                    <SelectItem value="BTC">BTC (Bitcoin)</SelectItem>
                    <SelectItem value="ETH">ETH (Ethereum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Send {currency} to this address</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{NETWORKS[currency]}</span>
                </div>
                {adminAddress ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm break-all text-foreground flex-1">{adminAddress}</span>
                    <CopyButton text={adminAddress} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Admin wallet address not configured. Contact support.</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Send <strong>only {currency}</strong> via <strong>{NETWORKS[currency]}</strong> to the above address. Sending other coins may result in permanent loss.</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Submit Request */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                Submit Your Deposit Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount You Sent</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="font-mono pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      {currency}
                    </div>
                  </div>
                  {amount && Number(amount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      You will receive: <span className="text-positive font-mono font-semibold">{(Number(amount) * 0.90).toFixed(8)} {currency}</span> after 10% platform fee
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txhash">
                    Transaction Hash / ID <span className="text-muted-foreground text-xs font-normal">(recommended)</span>
                  </Label>
                  <Input
                    id="txhash"
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste your TX hash here for faster verification"
                    className="font-mono text-xs"
                  />
                </div>

                <Button type="submit" className="w-full font-bold h-11" disabled={createTx.isPending || !adminAddress}>
                  {createTx.isPending ? "Submitting..." : "Submit Deposit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

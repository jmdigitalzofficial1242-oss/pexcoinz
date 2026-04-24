import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTransaction, useGetMyBalance } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle, Clock, Info, CreditCard, Building2, Wallet, Plus, Trash2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PaymentPasswordModal } from "@/components/payment-password-modal";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BankMethod {
  id: string;
  type: "bank" | "easypaisa" | "jazzcash";
  accountTitle: string;
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  branchCode?: string;
  phone?: string;
}

function AddBankModal({ onAdd, onClose }: { onAdd: (m: BankMethod) => void; onClose: () => void }) {
  const [type, setType] = useState<"bank" | "easypaisa" | "jazzcash">("bank");
  const [accountTitle, setAccountTitle] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!accountTitle.trim()) { toast({ title: "Account title is required", variant: "destructive" }); return; }
    if (type === "bank" && !bankName.trim()) { toast({ title: "Bank name is required", variant: "destructive" }); return; }
    if (type === "bank" && !accountNumber.trim() && !iban.trim()) { toast({ title: "Account number or IBAN required", variant: "destructive" }); return; }
    if ((type === "easypaisa" || type === "jazzcash") && !phone.trim()) { toast({ title: "Phone number required", variant: "destructive" }); return; }

    const method: BankMethod = {
      id: Date.now().toString(),
      type,
      accountTitle: accountTitle.trim(),
      bankName: bankName.trim() || undefined,
      iban: iban.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      branchCode: branchCode.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    onAdd(method);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-background border border-border rounded-t-2xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Add Bank / Payment Method</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>&times;</Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Method Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="easypaisa">Easypaisa</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Account Title *</Label>
            <Input value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} className="h-10 text-sm" placeholder="Muhammad Ali" />
          </div>

          {type === "bank" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name *</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {["HBL", "MCB Bank", "UBL", "Allied Bank", "Bank Alfalah", "Meezan Bank", "Standard Chartered", "Habib Metropolitan", "Askari Bank", "Bank Al Habib", "Silk Bank", "Summit Bank", "JS Bank", "Other"].map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">IBAN</Label>
                <Input value={iban} onChange={(e) => setIban(e.target.value)} className="h-10 text-sm font-mono" placeholder="PK36SCBL0000001123456702" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-10 text-sm font-mono" placeholder="0123456789012" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch Code</Label>
                <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} className="h-10 text-sm" placeholder="0001" />
              </div>
            </>
          )}

          {(type === "easypaisa" || type === "jazzcash") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 text-sm" placeholder="+92 300 1234567" type="tel" />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Save Method</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Withdraw() {
  const [activeTab, setActiveTab] = useState<"crypto" | "bank">("crypto");
  const [currency, setCurrency] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [bankMethods, setBankMethods] = useState<BankMethod[]>(() => {
    try { return JSON.parse(localStorage.getItem("bank_methods") ?? "[]"); } catch { return []; }
  });
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [bankAmount, setBankAmount] = useState("");
  const [showPaymentPw, setShowPaymentPw] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: balance } = useGetMyBalance();
  const createTx = useCreateTransaction();

  const currentBalance = balance ? (balance as any)[currency.toLowerCase()] ?? 0 : 0;
  const feeAmount = Number(amount) * 0.05;
  const receiveAmount = Number(amount) * 0.95;

  const NETWORK_OPTIONS: Record<string, string[]> = {
    USDT: ["TRC20 (TRON)", "ERC20 (Ethereum)", "BEP20 (BSC)"],
    BTC: ["Bitcoin Network"],
    ETH: ["ERC20 (Ethereum)", "BEP20 (BSC)"],
  };

  const saveBankMethods = (methods: BankMethod[]) => {
    setBankMethods(methods);
    localStorage.setItem("bank_methods", JSON.stringify(methods));
  };

  const addBankMethod = (method: BankMethod) => {
    saveBankMethods([...bankMethods, method]);
    toast({ title: "Bank method added!" });
  };

  const deleteBankMethod = (id: string) => {
    saveBankMethods(bankMethods.filter((m) => m.id !== id));
    if (selectedBank === id) setSelectedBank("");
    toast({ title: "Bank method removed" });
  };

  const requirePaymentPw = (action: () => void) => {
    setPendingAction(() => action);
    setShowPaymentPw(true);
  };

  const doPasswordSuccess = () => {
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (Number(amount) > currentBalance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    if (!address.trim()) { toast({ title: "Wallet address required", variant: "destructive" }); return; }
    requirePaymentPw(() => {
      createTx.mutate({
        data: { type: "withdrawal", amount: Number(amount), currency, address: address.trim(), note: network ? `Network: ${network}` : undefined }
      }, {
        onSuccess: () => setSubmitted(true),
        onError: (error: any) => toast({ title: "Withdrawal failed", description: error.error || "An error occurred", variant: "destructive" }),
      });
    });
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) { toast({ title: "Select a bank method", variant: "destructive" }); return; }
    if (!bankAmount || isNaN(Number(bankAmount)) || Number(bankAmount) <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (Number(bankAmount) > (balance?.usdt ?? 0)) { toast({ title: "Insufficient USDT balance", variant: "destructive" }); return; }
    requirePaymentPw(() => {
      const method = bankMethods.find((m) => m.id === selectedBank);
      createTx.mutate({
        data: {
          type: "withdrawal",
          amount: Number(bankAmount),
          currency: "USDT",
          address: method?.accountNumber || method?.phone || method?.iban || "bank_withdrawal",
          note: `Bank: ${method?.bankName || method?.type} | ${method?.accountTitle} | Amount: ${bankAmount} USDT`,
        }
      }, {
        onSuccess: () => setSubmitted(true),
        onError: (error: any) => toast({ title: "Withdrawal failed", description: error.error || "An error occurred", variant: "destructive" }),
      });
    });
  };

  if (submitted) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
          <Card className="w-full max-w-md border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Withdrawal Pending</h2>
                <p className="text-sm text-muted-foreground">Your request has been submitted and is awaiting admin processing.</p>
              </div>
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 text-left">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Processing usually takes 1–24 hours. Admin will confirm once funds are sent.</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                <Button className="flex-1" onClick={() => { setSubmitted(false); setAmount(""); setAddress(""); setBankAmount(""); }}>New Request</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-3 py-4 w-full space-y-4">
        <div>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-xl font-bold mt-2">Withdraw Funds</h1>
          <p className="text-xs text-muted-foreground">Requests are processed manually by admin</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full h-10">
            <TabsTrigger value="crypto" className="text-xs gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Crypto Wallet
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Bank / Card
            </TabsTrigger>
          </TabsList>

          {/* Crypto Withdrawal */}
          <TabsContent value="crypto" className="mt-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <form onSubmit={handleCryptoSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select value={currency} onValueChange={v => { setCurrency(v); setNetwork(""); }}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDT">USDT (Tether)</SelectItem>
                        <SelectItem value="BTC">BTC (Bitcoin)</SelectItem>
                        <SelectItem value="ETH">ETH (Ethereum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground text-xs">Available Balance</span>
                    <span className="font-mono font-bold text-sm">{currentBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {currency}</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Network</Label>
                    <Select value={network} onValueChange={setNetwork}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select network" /></SelectTrigger>
                      <SelectContent>
                        {NETWORK_OPTIONS[currency].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Wallet Address</Label>
                    <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`Enter ${currency} address`} required className="font-mono text-xs h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Amount</Label>
                      <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => setAmount(currentBalance.toString())}>Max</Button>
                    </div>
                    <div className="relative">
                      <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="font-mono pr-16 h-10" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">{currency}</div>
                    </div>
                    {amount && Number(amount) > 0 && (
                      <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform Fee (5%)</span>
                          <span className="font-mono text-negative">−{feeAmount.toFixed(8)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-muted-foreground">You Receive</span>
                          <span className="font-mono text-positive">{receiveAmount.toFixed(8)} {currency}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Payment password required. Requests are manually processed in 1–24 hours.</span>
                  </div>

                  <Button type="submit" className="w-full font-bold h-11" disabled={createTx.isPending}>
                    {createTx.isPending ? "Submitting..." : "Submit Withdrawal"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank / Card Withdrawal */}
          <TabsContent value="bank" className="mt-3 space-y-3">
            {/* Saved Bank Methods */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Saved Methods</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddBank(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {bankMethods.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No bank methods saved</p>
                    <Button size="sm" variant="outline" onClick={() => setShowAddBank(true)} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Bank Account
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {bankMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedBank === method.id ? "border-primary bg-primary/5" : "border-border/40 hover:border-border"
                      }`}
                      onClick={() => setSelectedBank(method.id === selectedBank ? "" : method.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {method.type === "bank" ? <Building2 className="h-4 w-4 text-muted-foreground" /> :
                          <CreditCard className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{method.accountTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {method.type === "bank" ? `${method.bankName} • ${method.accountNumber || method.iban}` :
                            `${method.type === "easypaisa" ? "Easypaisa" : "JazzCash"} • ${method.phone}`}
                        </p>
                      </div>
                      {selectedBank === method.id && <div className="w-4 h-4 rounded-full bg-primary shrink-0" />}
                      <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); deleteBankMethod(method.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {bankMethods.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <form onSubmit={handleBankSubmit} className="space-y-4">
                    <div className="flex justify-between items-center text-sm bg-muted/30 rounded-lg px-3 py-2">
                      <span className="text-muted-foreground text-xs">USDT Balance</span>
                      <span className="font-mono font-bold">{(balance?.usdt ?? 0).toFixed(2)} USDT</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Amount (USDT)</Label>
                        <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => setBankAmount((balance?.usdt ?? 0).toString())}>Max</Button>
                      </div>
                      <Input type="number" step="any" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} placeholder="0.00" required className="font-mono h-10" />
                    </div>
                    <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Bank withdrawals are converted at current rates. Processing takes 1–3 business days.</span>
                    </div>
                    <Button type="submit" className="w-full h-11 font-bold" disabled={!selectedBank || createTx.isPending}>
                      {createTx.isPending ? "Submitting..." : "Submit Bank Withdrawal"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showAddBank && <AddBankModal onAdd={addBankMethod} onClose={() => setShowAddBank(false)} />}

      <PaymentPasswordModal
        open={showPaymentPw}
        onClose={() => { setShowPaymentPw(false); setPendingAction(null); }}
        onSuccess={doPasswordSuccess}
        title="Confirm Withdrawal"
        description="Enter your 6-digit payment password to authorize this withdrawal."
      />
    </Layout>
  );
}

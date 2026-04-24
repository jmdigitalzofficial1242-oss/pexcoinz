import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister, useGetMe } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Loader2, Gift,
  Eye, EyeOff, User, Mail, Phone, MapPin, Globe2, Lock, Shield
} from "lucide-react";

const LOGO = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.png`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type InviteStatus = "idle" | "checking" | "valid" | "invalid";

export default function Register() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("idle");
  const [inviteReferrer, setInviteReferrer] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const register = useRegister();
  const { data: user } = useGetMe({ query: { retry: false } });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("invite") || params.get("code");
    if (ref) setInviteCode(ref.toUpperCase());
  }, []);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const validateInviteCode = useCallback(async (code: string) => {
    if (!code || code.length < 6) { setInviteStatus("idle"); setInviteReferrer(null); return; }
    setInviteStatus("checking");
    try {
      const res = await fetch(`${BASE}/api/auth/invite/validate?code=${encodeURIComponent(code.toUpperCase())}`);
      const data = await res.json();
      if (data.valid) { setInviteStatus("valid"); setInviteReferrer(data.referrerName); }
      else { setInviteStatus("invalid"); setInviteReferrer(null); }
    } catch { setInviteStatus("invalid"); setInviteReferrer(null); }
  }, []);

  useEffect(() => {
    if (!inviteCode) { setInviteStatus("idle"); setInviteReferrer(null); return; }
    const t = setTimeout(() => validateInviteCode(inviteCode), 600);
    return () => clearTimeout(t);
  }, [inviteCode, validateInviteCode]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(val && !emailRegex.test(val) ? "Please enter a valid email address" : null);
  };

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (inviteStatus !== "valid") {
      toast({ title: "Invalid invite code", description: "Please enter a valid invitation code", variant: "destructive" });
      return;
    }
    register.mutate(
      {
        data: {
          name: displayName,
          email: email.toLowerCase(),
          password,
          phone: phone || undefined,
          country: country || undefined,
          address: address || undefined,
          inviteCode: inviteCode.toUpperCase(),
        },
      },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({ title: "Account created!", description: "Welcome to PexCoin!" });
          navigate("/dashboard", { replace: true });
        },
        onError: (error: any) => {
          toast({ title: "Registration failed", description: error?.data?.error ?? error?.message ?? "An error occurred", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="flex-1 flex min-h-[calc(100vh-56px)]">

        {/* ── Left branding panel ────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-5/12 bg-black/60 border-r border-border/30 flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.1),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#d4af37 1px,transparent 1px),linear-gradient(90deg,#d4af37 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative z-10 text-center space-y-6 max-w-xs">
            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={LOGO} alt="PexCoin" className="h-12 w-12 rounded-xl object-cover" />
              <span className="text-3xl font-extrabold text-primary tracking-widest">PEXCOIN</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight">Join the Platform</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              PexCoin is an exclusive invitation-only platform. Get your referral code from an existing member to create your account.
            </p>

            <div className="space-y-3 mt-6">
              {[
                { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10", text: "Bank-grade security on all accounts" },
                { icon: Gift, color: "text-primary", bg: "bg-primary/10", text: "Earn 5% on every referral deposit" },
                { icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10", text: "Instant access to 24+ cryptocurrencies" },
              ].map(({ icon: Icon, color, bg, text }) => (
                <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border/20 text-left">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ───────────────────────────────────── */}
        <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md space-y-6 py-6">

            {/* Header */}
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:hidden gap-2 mb-5">
                <img src={LOGO} alt="PexCoin" className="h-9 w-9 rounded-lg object-cover" />
                <span className="text-2xl font-bold text-primary">PEXCOIN</span>
              </div>
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-muted-foreground text-sm mt-1">Fill in your details to get started on PexCoin</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Display Name */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Account Display Name
                </Label>
                <Input
                  id="displayName"
                  autoComplete="name"
                  placeholder="e.g. Ali Khan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="h-10 bg-black/40 border-border/40"
                />
                <p className="text-[10px] text-muted-foreground">This name will be shown on your profile and transactions.</p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  className={`h-10 bg-black/40 border-border/40 ${emailError ? "border-destructive" : ""}`}
                />
                {emailError && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {emailError}</p>}
              </div>

              {/* Phone + Country row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+92 300 0000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 bg-black/40 border-border/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-sm flex items-center gap-1.5">
                    <Globe2 className="h-3.5 w-3.5 text-muted-foreground" /> Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g. Pakistan"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-10 bg-black/40 border-border/40 text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Address
                  <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="Street, City, Province / State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-black/40 border-border/40 text-sm resize-none min-h-[72px]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10 pr-10 bg-black/40 border-border/40"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Invite Code */}
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode" className="text-sm flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  Referral / Invitation Code <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PEXADM01"
                    required
                    className={`h-10 font-mono uppercase tracking-widest pr-10 bg-black/40 border-border/40 ${
                      inviteStatus === "valid" ? "border-emerald-500/60" : inviteStatus === "invalid" ? "border-destructive/60" : ""
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {inviteStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {inviteStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {inviteStatus === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                {inviteStatus === "valid" && inviteReferrer && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Invited by <strong>{inviteReferrer}</strong></p>
                )}
                {inviteStatus === "invalid" && (
                  <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> Invalid invitation code. Ask your referrer for the correct code.</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold text-base mt-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                disabled={register.isPending || inviteStatus !== "valid" || !!emailError}
              >
                {register.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</>
                  : "Create My Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground pb-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

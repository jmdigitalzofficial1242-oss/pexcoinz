import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, BarChart2, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const login = useLogin();
  const { data: user } = useGetMe({ query: { retry: false } });

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setToken(data.token);
        navigate("/dashboard", { replace: true });
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error?.data?.error || error?.message || "Invalid email or password",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout>
      <div className="flex-1 flex min-h-[calc(100vh-56px)]">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-primary/5 to-background border-r border-border/40 flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <div className="flex items-center justify-center gap-3 mb-8">
              <BarChart2 className="h-10 w-10 text-primary" />
              <span className="text-4xl font-bold text-primary tracking-tight">PEXCOIN</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Trade Crypto with Confidence</h2>
            <p className="text-muted-foreground leading-relaxed">
              Access 24+ cryptocurrency pairs, AI-powered trading insights, and institutional-grade security — all in one platform.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm mt-8">
              {[
                { label: "24+ Pairs", desc: "Trading pairs" },
                { label: "5% Bonus", desc: "Referral rewards" },
                { label: "AI Chat", desc: "Trading assistant" },
                { label: "Secure", desc: "Bank-grade security" },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-lg bg-background/50 border border-border/40 text-left">
                  <p className="font-semibold text-primary">{f.label}</p>
                  <p className="text-muted-foreground text-xs">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 lg:hidden mb-6">
                <BarChart2 className="h-6 w-6 text-primary" />
                <span className="text-2xl font-bold text-primary">PEXCOIN</span>
              </div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold text-base"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Sign In</>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-background px-3">Don't have an account?</span>
              </div>
            </div>

            <Link to="/register">
              <Button variant="outline" className="w-full h-11">
                Create a free account
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>{" "}
              and{" "}
              <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

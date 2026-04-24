import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminLogin } from "@workspace/api-client-react";
import { setAdminToken } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const login = useAdminLogin();

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseInt(captchaAnswer) !== num1 + num2) {
      toast({ title: "Invalid captcha", variant: "destructive" });
      generateCaptcha();
      return;
    }

    login.mutate({ data: { username, password } }, {
      onSuccess: (data) => {
        setAdminToken(data.token);
        toast({ title: "Admin logged in" });
        window.location.href = "/admin/dashboard";
      },
      onError: (error: any) => {
        toast({ 
          title: "Login failed", 
          description: error.error || "An error occurred",
          variant: "destructive"
        });
        generateCaptcha();
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 text-foreground font-sans">
      <Card className="w-full max-w-md border-border bg-[#111]">
        <CardHeader className="text-center pb-8 border-b border-border/50 mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <span className="text-primary font-bold text-2xl">P</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-widest text-primary">网站管理中心</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">System Administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="bg-black/50 border-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-black/50 border-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha">Verification Code: {num1} + {num2} = ?</Label>
              <div className="flex gap-2">
                <Input 
                  id="captcha" 
                  type="number" 
                  value={captchaAnswer} 
                  onChange={(e) => setCaptchaAnswer(e.target.value)} 
                  required 
                  className="bg-black/50 border-muted font-mono"
                />
                <Button type="button" variant="outline" onClick={generateCaptcha} className="px-3">
                  Refresh
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full font-bold h-12 text-lg mt-4" disabled={login.isPending}>
              {login.isPending ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, KeyRound, Mail, ArrowRight, User } from "lucide-react";
import ekwayLogo from "@/assets/ekway-logo.png";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { user, role, loading, roleLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to correct dashboard
  useEffect(() => {
    if (!loading && !roleLoading && user && role) {
      if (role === "admin" || role === "manager") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/rep", { replace: true });
      }
    }
  }, [user, role, loading, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const parsed = loginSchema.parse({ email, password });
        const { error } = await signIn(parsed.email, parsed.password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please confirm your email before signing in.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Welcome back!");
      } else {
        const parsed = signupSchema.parse({ email, password, fullName });
        const { error } = await signUp(parsed.email, parsed.password, parsed.fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Account created! Please check your email to confirm.");
        setIsLogin(true);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
      setForgotPasswordOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  // Show loading while checking auth
  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-navy">
        <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center gradient-navy p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494548162494-384bba4ab999?q=80&w=2960&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none fixed" />

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10 my-auto"
      >
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
          <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <CardHeader className="text-center space-y-2 pb-2 pt-6">
              <motion.div
                layout
                className="mx-auto w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg p-2 mb-2"
              >
                <img src={ekwayLogo} alt="Ekway Lanka Logo" className="h-full w-full object-contain" />
              </motion.div>
              <div>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-primary">
                  EKWAY LANKA
                </CardTitle>
                <CardDescription className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mt-1">
                  Vehicle Itinerary System
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-4 px-6 pb-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.form
                  key={isLogin ? "login" : "signup"}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div className="space-y-1">
                      <Label htmlFor="fullName" className="text-xs font-semibold pl-1">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="h-10 pl-9 text-sm bg-muted/30 border-muted focus:border-primary/50 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-semibold pl-1">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@ekway.lk"
                        className="h-10 pl-9 text-sm bg-muted/30 border-muted focus:border-primary/50 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold pl-1">Password</Label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setForgotPasswordOpen(true);
                          }}
                          className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wide"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 pl-9 pr-10 text-sm bg-muted/30 border-muted focus:border-primary/50 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 text-sm font-bold gradient-navy text-white hover:opacity-90 transition-all rounded-lg shadow-lg shadow-primary/20"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin invert" />
                      ) : (
                        <>
                          {isLogin ? "Sign In" : "Create Account"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              </AnimatePresence>

              <div className="mt-6 text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-2 text-muted-foreground font-bold">Or</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </motion.button>
              </div>
            </CardContent>
          </motion.div>
        </Card>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@ekway.lk"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="gradient-navy text-white"
            >
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { authService } from "../services/auth.service";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const codeSchema = z.object({
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form hooks
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  // Step 1: Send verification code
  const handleSendCode = async (data: EmailForm) => {
  try {
    setLoading(true);

    await authService.forgotPassword(data.email);

    setEmail(data.email);

    toast.success(
      "Verification code sent successfully. Please check your Inbox and Spam/Junk folder."
    );

    setStep(2);
  } catch (err: any) {
    toast.error(
      err?.response?.data?.message ||
      "Failed to send verification code"
    );
  } finally {
    setLoading(false);
  }
};

  // Step 2: Verify code
  const handleVerifyCode = async (data: CodeForm) => {
    try {
      setLoading(true);
      await authService.verifyResetCode(email, data.code);
      setCode(data.code);
      toast.success("Verification code verified!");
      setStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (data: PasswordForm) => {
    try {
      setLoading(true);
      await authService.resetPassword({
        email,
        code,
        newPassword: data.newPassword,
      });
      toast.success("Password reset successfully! Please login with your new password.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#111] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
            🔑
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            Reset Password
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {step === 1 && "Enter email to receive code"}
            {step === 2 && "Enter verification code"}
            {step === 3 && "Set a new password"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-6 sm:p-8">
          
          {/* Step 1: Send Code */}
          {step === 1 && (
            <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    {...emailForm.register("email")}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1.5">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2"
              >
                {loading ? "Sending code..." : "Send Reset Code"}
              </button>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    {...codeForm.register("code")}
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-center text-white text-lg tracking-widest placeholder:text-white/10 placeholder:tracking-normal focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>
                {codeForm.formState.errors.code && (
                  <p className="text-red-400 text-xs mt-1.5 text-center">{codeForm.formState.errors.code.message}</p>
                )}
                <p className="text-white/20 text-[10px] text-center mt-3">
                  Check the backend console terminal if you are running locally.
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors"
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    {...passwordForm.register("newPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-red-400 text-xs mt-1.5">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    {...passwordForm.register("confirmPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1.5">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}

        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPasswordPage;

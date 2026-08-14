import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { loginRequest, meRequest } from "../../api/auth";
import { loginSchema, type LoginFormValues } from "../../features/auth/schemas";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { Alert } from "../../shared/components/Alert";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const infoMessage = useMemo(() => {
    return (location.state as { message?: string } | null)?.message ?? "";
  }, [location.state]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const loginData = await loginRequest(values);
      setAuth({
        token: loginData.token,
        user: loginData.user,
      });
      const freshUser = await meRequest();
      return {
        token: loginData.token,
        user: freshUser,
      };
    },
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        token: data.token,
      });
      if (data.user.mustChangePassword) {
        navigate("/profile?changePassword=true", { replace: true });
        return;
      }
      navigate("/dashboard", { replace: true });
    },
    onError: (error: any) => {
      console.error("LOGIN ERROR:", error);
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values);
  };

  const loginErrorMessage = mutation.isError
    ? (mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      "Invalid credentials or server unavailable."
    : "";

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden" style={{ background: "var(--color-bg-canvas)" }}>
      <div className="absolute inset-0" style={{ background: "var(--color-bg-canvas)" }} />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(33,114,121,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(33,114,121,0.14) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(circle at center, rgba(0,0,0,0.9) 35%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(circle at center, rgba(0,0,0,0.9) 35%, transparent 85%)",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-[-100px] h-[340px] w-[340px] rounded-full blur-3xl animate-pulse" style={{ background: "color-mix(in srgb, var(--color-brand) 20%, transparent)" }} />
        <div className="absolute right-[-140px] top-[8%] h-[400px] w-[400px] rounded-full blur-3xl animate-pulse" style={{ background: "color-mix(in srgb, var(--color-brand) 15%, transparent)" }} />
        <div className="absolute bottom-[-160px] left-[8%] h-[320px] w-[320px] rounded-full blur-3xl animate-pulse" style={{ background: "color-mix(in srgb, var(--color-brand) 12%, transparent)" }} />
        <div className="absolute bottom-[-170px] right-[10%] h-[380px] w-[380px] rounded-full blur-3xl animate-pulse" style={{ background: "color-mix(in srgb, var(--color-brand) 15%, transparent)" }} />
        <div className="absolute left-[42%] top-[18%] h-[220px] w-[220px] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--color-bg-surface) 50%, transparent)" }} />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[18%] h-24 w-24 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--color-bg-surface) 40%, transparent)" }} />
        <div className="absolute right-[14%] top-[22%] h-16 w-16 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--color-brand) 12%, transparent)" }} />
        <div className="absolute bottom-[16%] right-[22%] h-20 w-20 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--color-bg-surface) 35%, transparent)" }} />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-4 sm:px-6 sm:py-20 lg:px-8">
        <div className="w-full max-w-[700px]">
          <div className="mb-5 lg:hidden">
            <div className="px-2">
              <img
                src="/logo.png"
                alt="MOSystem logo"
                className="mx-auto h-auto max-h-[58px] w-auto max-w-[200px] object-contain sm:max-h-[68px] sm:max-w-[230px]"
              />
            </div>
          </div>

          <div
            className="relative mx-6 overflow-hidden rounded-[26px] border shadow-[var(--shadow-xl)] backdrop-blur-2xl lg:mx-0"
            style={{
              borderColor: "color-mix(in srgb, var(--color-bg-surface) 70%, transparent)",
              background: "color-mix(in srgb, var(--color-bg-surface) 72%, transparent)",
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "color-mix(in srgb, var(--color-bg-surface) 80%, transparent)" }} />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--color-bg-surface) 28%, transparent), transparent 40%, transparent 60%, color-mix(in srgb, var(--color-bg-surface) 12%, transparent))",
              }}
            />

            <div className="grid min-h-[360px] lg:min-h-[430px] lg:grid-cols-[1.05fr_0.95fr]">
              <div
                className="relative hidden overflow-hidden lg:flex"
                style={{
                  background: "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-canvas) 95%, transparent) 0%, color-mix(in srgb, var(--color-bg-subtle) 92%, transparent) 100%)",
                }}
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-8 top-8 h-24 w-24 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--color-brand) 15%, transparent)" }} />
                  <div className="absolute bottom-10 left-8 h-28 w-28 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--color-brand) 10%, transparent)" }} />
                  <div className="absolute right-8 top-1/3 h-24 w-24 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--color-brand) 12%, transparent)" }} />
                  <div className="absolute inset-y-0 right-0 w-px" style={{ background: "color-mix(in srgb, var(--color-bg-surface) 50%, transparent)" }} />
                </div>

                <div className="relative flex flex-1 flex-col items-center justify-center p-8">
                  <div className="absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <img
                    src="/login-logo.png"
                    alt="MOSystem login visual"
                    className="max-h-[250px] w-auto object-contain xl:max-h-[270px]"
                    style={{
                      filter: "drop-shadow(0 18px 40px color-mix(in srgb, var(--color-brand) 10%, transparent))",
                    }}
                  />
                </div>
              </div>

              <div className="relative flex items-center justify-center px-4 py-6 sm:px-5 sm:py-7 lg:px-8 xl:px-9">
                <div className="mx-auto w-full max-w-[290px] sm:max-w-[310px] lg:max-w-[325px]">
                  <div className="mb-5 text-center lg:mb-6 lg:text-left">
                    <p
                      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: "color-mix(in srgb, var(--color-brand) 80%, transparent)" }}
                    >
                      Welcome back
                    </p>
                    <h1
                      className="text-[2rem] font-semibold tracking-tight lg:text-[1.75rem]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Sign In
                    </h1>
                  </div>

                  {infoMessage ? (
                    <Alert variant="success" message={infoMessage} />
                  ) : null}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-medium"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        {...register("email")}
                        placeholder="name@igo.ph"
                        className="w-full rounded-[16px] border px-4 py-3 outline-none transition duration-200"
                        style={{
                          borderColor: "var(--color-border-default)",
                          background: "color-mix(in srgb, var(--color-bg-surface) 92%, transparent)",
                          color: "var(--color-text-primary)",
                        }}
                      />
                      {errors.email ? (
                        <p className="mt-1.5 text-xs" style={{ color: "var(--color-danger)" }}>
                          {errors.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        className="mb-1.5 block text-sm font-medium"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Password
                      </label>

                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          {...register("password")}
                          placeholder="••••••••"
                          className="w-full rounded-[16px] border px-4 py-3 pr-12 outline-none transition duration-200"
                          style={{
                            borderColor: "var(--color-border-default)",
                            background: "color-mix(in srgb, var(--color-bg-surface) 92%, transparent)",
                            color: "var(--color-text-primary)",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                          style={{ color: "var(--color-text-muted)" }}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>

                      {errors.password ? (
                        <p className="mt-1.5 text-xs" style={{ color: "var(--color-danger)" }}>
                          {errors.password.message}
                        </p>
                      ) : null}
                    </div>

                    {mutation.isError ? (
                      <Alert variant="error" message={loginErrorMessage} />
                    ) : null}

                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      className="w-full rounded-[16px] px-4 py-3 text-sm font-semibold text-[var(--color-text-on-brand)] shadow-lg transition duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "var(--gradient-brand)",
                        boxShadow: "0 12px 25px color-mix(in srgb, var(--color-brand) 22%, transparent)",
                      }}
                    >
                      {mutation.isPending ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}

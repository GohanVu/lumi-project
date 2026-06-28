"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { signIn, useSession } from "@/lib/auth-client";
import styles from "./login.module.css";

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isSessionPending && sessionData) {
      router.replace("/dashboard");
    }
  }, [isSessionPending, router, sessionData]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Email hoặc mật khẩu không đúng");
      }

      return result.data;
    },
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
  });

  if (isSessionPending || sessionData) {
    return <div className={styles.loading}>Đang kiểm tra đăng nhập...</div>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>LUMI CRM</div>
        <h1 id="login-title" className={styles.title}>Đăng nhập</h1>
        <p className={styles.description}>Đăng nhập bằng tài khoản nội bộ LUMI.</p>

        <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              {...register("email")}
            />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              {...register("password")}
            />
            {errors.password && (
              <span className={styles.error}>{errors.password.message}</span>
            )}
          </div>

          {loginMutation.error && (
            <div className={styles.submitError} role="alert">
              {(loginMutation.error as Error).message}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

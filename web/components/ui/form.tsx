import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300",
    secondary:
      "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-400",
    ghost: "text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border bg-white px-3 text-sm outline-none ring-blue-600/30 focus:ring-2",
        invalid ? "border-red-500" : "border-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border bg-white px-2 text-sm outline-none ring-blue-600/30 focus:ring-2",
        invalid ? "border-red-500" : "border-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-md border bg-white px-3 py-2 text-sm outline-none ring-blue-600/30 focus:ring-2",
        invalid ? "border-red-500" : "border-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {children}
      {hint && !error ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

import type { ReactNode } from "react";
import { Briefcase } from "lucide-react";

/** Centered, branded shell shared by the login and register screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-lg">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-lg leading-none">SoloDesk</div>
            <div className="text-[11px] text-muted-foreground">Trợ lý của Freelancer Việt</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-xl p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {children}
        </div>

        {footer && <div className="text-center text-sm text-muted-foreground mt-5">{footer}</div>}
      </div>
    </div>
  );
}

import { AdminNav } from "@/components/admin/admin-nav";

type AdminPageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminPage({
  eyebrow = "Admin portal",
  title,
  description,
  actions,
  children,
}: AdminPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:px-10 print:max-w-none print:p-0">
        <AdminNav />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </section>
    </main>
  );
}

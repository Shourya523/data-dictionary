import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { Table2, Shield, Key, DollarSign, Eye } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import Link from "next/link";

const tables = [
  { name: "users", desc: "Core user accounts and auth", rows: "1.2M", tags: ["PII", "Auth"], quality: 96 },
  { name: "orders", desc: "Customer purchase orders", rows: "4.8M", tags: ["Financial"], quality: 92 },
  { name: "payments", desc: "Payment processing records", rows: "3.1M", tags: ["Financial", "PII"], quality: 88 },
  { name: "products", desc: "Product catalog", rows: "52K", tags: [], quality: 99 },
  { name: "analytics_events", desc: "Behavior tracking", rows: "28M", tags: ["PII"], quality: 94 },
  { name: "user_profiles", desc: "Extended profile info", rows: "1.1M", tags: ["PII"], quality: 91 },
  { name: "invoices", desc: "Billing and accounting", rows: "890K", tags: ["Financial"], quality: 95 },
  { name: "sessions", desc: "User sessions", rows: "15M", tags: ["Auth"], quality: 87 },
];

const tagStyle: Record<string, string> = {
  PII: "border-destructive/30 text-destructive",
  Financial: "border-primary/30 text-primary",
  Auth: "border-muted-foreground/30 text-muted-foreground",
};

const tagIcon: Record<string, typeof Shield> = { PII: Shield, Financial: DollarSign, Auth: Key };

const DashboardTables = () => (
  <DashboardLayout>
    <div className="mb-8">
      <h1 className="text-xl font-semibold">Tables</h1>
      <p className="text-sm text-muted-foreground mt-1">Browse your database schema.</p>
    </div>

    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["Table", "Description", "Rows", "Tags", "Quality", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tables.map((t) => (
              <tr key={t.name} className="hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium font-mono text-[13px]">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate">{t.desc}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{t.rows}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    {t.tags.map((tag) => {
                      const Icon = tagIcon[tag];
                      return (
                        <Badge key={tag} variant="outline" className={`text-[10px] gap-1 ${tagStyle[tag]}`}>
                          {Icon && <Icon className="w-2.5 h-2.5" />}{tag}
                        </Badge>
                      );
                    })}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${t.quality}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.quality}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Link href={`/dashboard/tables/${t.name}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Eye className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
);

export default DashboardTables;

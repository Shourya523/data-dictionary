"use client";

import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Key, Shield, Link2, Brain } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import React from "react";

type Column = {
  name: string;
  type: string;
  description: string;
  pii: boolean;
  nullable: boolean;
  fk?: string;
};

const usersColumns: Column[] = [
  { name: "id", type: "uuid", description: "Primary key", pii: false, nullable: false },
  { name: "email", type: "varchar(255)", description: "User email for login", pii: true, nullable: false },
  { name: "password_hash", type: "text", description: "Bcrypt hashed password", pii: true, nullable: false },
  { name: "full_name", type: "varchar(200)", description: "Display name", pii: true, nullable: true },
  { name: "created_at", type: "timestamp", description: "Account creation time", pii: false, nullable: false },
  { name: "status", type: "enum", description: "active / suspended / deleted", pii: false, nullable: false },
];

const tableData: Record<
  string,
  {
    desc: string;
    ai: string;
    columns: Column[];
    quality: { completeness: number; freshness: string; uniqueness: number };
  }
> = {
  users: {
    desc: "Core user accounts and authentication data.",
    ai: "Primary identity store. Contains credentials, account status, and timestamps. Foreign key target for orders, payments, and sessions.",
    columns: usersColumns,
    quality: { completeness: 96, freshness: "2 min ago", uniqueness: 100 },
  },
};

const fallback = {
  desc: "AI-documented table.",
  ai: "Connect your database for detailed AI analysis.",
  columns: [
    { name: "id", type: "uuid", description: "Primary key", pii: false, nullable: false },
    { name: "created_at", type: "timestamp", description: "Creation time", pii: false, nullable: false },
  ] as Column[],
  quality: { completeness: 92, freshness: "5 min ago", uniqueness: 98 },
};

const TableDetail = () => {
  const params = useParams();
  const tableName = params?.tableName as string;
  const data = tableData[tableName || ""] || fallback;

  return (
    <DashboardLayout>
      <Link
        href="/dashboard/tables"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Tables
      </Link>

      <h1 className="text-xl font-semibold font-mono mb-1">{tableName}</h1>
      <p className="text-sm text-muted-foreground mb-8">{data.desc}</p>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            AI Analysis
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{data.ai}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Completeness", val: `${data.quality.completeness}%` },
          { label: "Freshness", val: data.quality.freshness },
          { label: "Uniqueness", val: `${data.quality.uniqueness}%` },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl border border-border bg-card">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
              {m.label}
            </p>
            <p className="text-lg font-semibold mt-1">{m.val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold">Columns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Column", "Type", "Description", "Flags"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 text-[11px] text-muted-foreground uppercase tracking-widest font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.columns.map((col) => (
                <tr key={col.name} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3 font-mono text-[13px] font-medium">
                    {col.name}
                    {col.fk && <Link2 className="inline w-3 h-3 ml-1 text-primary" />}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                    {col.type}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{col.description}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {col.pii && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-destructive/30 text-destructive"
                        >
                          <Shield className="w-2.5 h-2.5" />
                          PII
                        </Badge>
                      )}
                      {!col.nullable && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                          <Key className="w-2.5 h-2.5" />
                          Required
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TableDetail;
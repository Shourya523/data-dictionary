"use client";

import { useEffect, useState, use } from "react";
import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import { Table2, Eye, Loader2, AlertCircle, Database, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getDatabaseMetadata, getConnectionStringById } from "../../../../actions/db";
import { indexRemoteDatabase } from "../../../../actions/rag"; // Import the indexer
import { Button } from "@/src/components/ui/button";
import { authClient } from "@/src/components/landing/auth";
import { ChatDrawer } from "@/src/components/chatDrawer";

interface TableInfo {
  name: string;
  columns: string[];
  rowCount: number;
}

const DashboardTables = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { data: session, isPending: authLoading } = authClient.useSession();

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = async () => {
    if (authLoading) return;
    if (!session?.user?.id) {
      setError("Unauthorized access");
      setLoading(false);
      return;
    }

    try {
      const connString = await getConnectionStringById(id, session.user.id);
      if (!connString) {
        setError("Connection not found in vault.");
        setLoading(false);
        return;
      }

      const result = await getDatabaseMetadata(connString);

      if (result.success && result.data) {
        const { schema, counts } = result.data;
        const organized = schema.reduce((acc: any, curr: any) => {
          if (!acc[curr.table_name]) acc[curr.table_name] = [];
          acc[curr.table_name].push(curr.column_name);
          return acc;
        }, {});

        const formattedTables = Object.entries(organized).map(([name, columns]) => {
          const countObj = counts.find((c: any) => c.table_name === name);
          return {
            name,
            columns: columns as string[],
            rowCount: countObj ? parseInt(countObj.row_count) : 0,
          };
        });

        setTables(formattedTables);
      } else {
        setError(result.error || "Failed to fetch schema");
      }
    } catch (err: any) {
      setError("An unexpected error occurred while connecting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [id, session, authLoading]);

  const handleSyncAI = async () => {
    if (!session?.user?.id) {
      console.log("Sync cancelled: No active session found.");
      return;
    }

    setIsSyncing(true);
    console.log("Starting AI Sync for connection:", id);

    try {
      const connString = await getConnectionStringById(id, session.user.id);

      if (!connString) {
        console.error("Sync failed: Connection string could not be retrieved.");
        throw new Error("Connection string missing");
      }

      const result = await indexRemoteDatabase(id, connString);

      if (result.success) {
        console.log("AI Index synced successfully!", result.message);
      } else {
        console.error("Server-side Sync Error:", result.error);
      }
    } catch (err: any) {
      console.error("Client-side Sync Failure:", err.message);
    } finally {
      setIsSyncing(false);
      console.log("AI Sync process finished.");
    }
  };
  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Connections
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Database Schema</h1>
            <p className="text-sm text-muted-foreground mt-1 text-wrap max-w-md">
              Live inspection for <span className="font-mono text-primary text-xs bg-primary/5 px-1.5 py-0.5 rounded">{id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Button: This populates the context the AI needs */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAI}
              disabled={isSyncing || loading}
              className="gap-2 border-dashed"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isSyncing ? "Syncing AI Knowledge..." : "Sync AI"}
            </Button>

            <ChatDrawer connectionId={id} connectionName="Database" />

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
              <Database className="w-3 h-3" />
              Connected
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-card border border-dashed rounded-xl">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
          <p className="text-sm font-medium animate-pulse uppercase tracking-widest text-muted-foreground">Mapping Data Objects...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Table Name</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Structure Preview</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Rows</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tables.map((t) => (
                <tr key={t.name} className="hover:bg-muted/30 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary rounded-lg group-hover:bg-primary/10 transition-colors">
                        <Table2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-bold font-mono text-sm">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {t.columns.slice(0, 4).map(col => (
                        <code key={col} className="text-[10px] bg-muted px-2 py-0.5 rounded border border-border/50 font-medium">
                          {col}
                        </code>
                      ))}
                      {t.columns.length > 4 && (
                        <span className="text-[10px] text-muted-foreground font-bold self-center">+{t.columns.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <span className="font-semibold text-foreground">
                      {t.rowCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/tables/${id}/${t.name}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-primary hover:text-primary-foreground font-bold text-[10px] uppercase tracking-tighter transition-all">
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tables.length === 0 && (
            <div className="py-20 text-center text-muted-foreground italic font-mono text-xs">
              NO TABLES DETECTED IN TARGET SCHEMA.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardTables;
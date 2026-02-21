"use client";

import { useEffect, useState, use } from "react";
import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import { Table2, Eye, Loader2, AlertCircle, Database, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDatabaseMetadata, getConnectionStringById } from "../../../../actions/db";
import { Button } from "@/src/components/ui/button";
import { authClient } from "@/src/components/landing/auth";

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
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [generatingGraph, setGeneratingGraph] = useState(false);

  useEffect(() => {
    async function loadMetadata() {
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
    }

    loadMetadata();
  }, [id, session, authLoading]);

  const handleSync = async () => {
    if (!session?.user?.id) return;
    setSyncing(true);
    
    try {
      const connString = await getConnectionStringById(id, session.user.id);
      if (!connString) throw new Error("Connection disappeared");

      const result = await getDatabaseMetadata(connString);
      if (!result.success || !result.data) throw new Error("Failed to fetch fresh schema metadata");

      const { syncTableMetadata } = await import('../../../../actions/metadata');
           
      // Reformat the schema data for our action
      const organized = result.data.schema.reduce((acc: any, curr: any) => {
        if (!acc[curr.table_name]) {
          acc[curr.table_name] = { name: curr.table_name, columns: [] };
        }
        acc[curr.table_name].columns.push(curr);
        return acc;
      }, {});

      const parsedTables = Object.values(organized);
      const syncResult = await syncTableMetadata(id, parsedTables);
      
      if (!syncResult.success) {
        throw new Error(syncResult.error || "Failed to securely sync metadata");
      }
      
      // We purposefully don't reload the table definitions because 
      // the base schema array remains the same here, but we can stop loading.
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateInference = async () => {
    if (!session?.user?.id) return;
    setGeneratingGraph(true);
    
    try {
      const { buildGraphForInference } = await import('../../../../actions/graphBuilder');
      const result = await buildGraphForInference(id);

      if (!result.success) {
        throw new Error(result.error || "Failed to construct Graph DB.");
      }

      alert("Graph successfully constructed and metadata seeded! It is ready for LLM inference.");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred generating the graph");
    } finally {
      setGeneratingGraph(false);
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
            <p className="text-sm text-muted-foreground mt-1">
              Live inspection for connection <span className="font-mono text-primary text-xs bg-primary/5 px-1.5 py-0.5 rounded">{id}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button 
                onClick={handleGenerateInference} 
                className="gap-2 h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-amber-500" 
                variant="outline" 
                disabled={generatingGraph || syncing || loading}
             >
                {generatingGraph ? (
                   <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                   <Database className="w-3.5 h-3.5" />
                )}
                {generatingGraph ? "GENERATING..." : "BUILD GRAPH"}
            </Button>
             <Button 
                onClick={handleSync} 
                className="gap-2 h-8 text-xs font-bold" 
                variant="outline" 
                disabled={syncing || generatingGraph || loading}
             >
                {syncing ? (
                   <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                   <Database className="w-3.5 h-3.5" />
                )}
                {syncing ? "SYNCING..." : "SYNC TABLES"}
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
              <Database className="w-3 h-3" />
              External Source Connected
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
                      <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-primary hover:text-primary-foreground font-bold text-[10px] uppercase tracking-tighter">
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
            <div className="py-20 text-center text-muted-foreground italic">
              No tables found in this database.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardTables;
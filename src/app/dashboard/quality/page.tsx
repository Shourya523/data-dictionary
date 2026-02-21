"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { getTableQuality, getUserConnections, getDatabaseMetadata, getConnectionStringById } from "../../../actions/db";
import { authClient } from "@/src/components/landing/auth";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, BarChart3, Sparkles } from "lucide-react";

const FALLBACK_URI = "postgresql://neondb_owner:npg_RurVIE0FdTc1@ep-morning-morning-aiknmhke-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export default function QualityPage() {
  const { data: session } = authClient.useSession();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityData, setQualityData] = useState<any>(null);

  const DEMO_ID = "demo-neon-db";

  useEffect(() => {
    const fetchConns = async () => {
      let userConns: any[] = [];
      if (session?.user?.id) {
        const res = await getUserConnections(session.user.id);
        if (res.success) userConns = res.data || [];
      }
      
      // Inject the Demo Connection into the dropdown options
      const demoConn = { id: DEMO_ID, name: "Demo eCommerce Database (Neon)", isDemo: true };
      setConnections([demoConn, ...userConns]);
    };
    
    fetchConns();
  }, [session]);

  const getEffectiveUri = async (connId: string) => {
    if (connId === DEMO_ID) return FALLBACK_URI;
    
    // Attempt to get from session vault if it's a real user connection
    const conn = connections.find(c => c.id === connId);
    if (session?.user?.id) {
      const vaultUri = await getConnectionStringById(connId, session.user.id);
      return vaultUri || conn?.tableUri;
    }
    return conn?.tableUri;
  };

  const fetchTables = async (connId: string) => {
    setSelectedConn(connId);
    setQualityData(null);
    setTables([]);

    try {
      const uri = await getEffectiveUri(connId);
      if (!uri) return;

      const res = await getDatabaseMetadata(uri);

      if (res.success && res.data?.schema) {
        const schemaArray = res.data.schema;
        const uniqueTableNames = Array.from(
          new Set(schemaArray.map((s: any) => s.table_name || s.TABLE_NAME))
        ).filter(Boolean);

        const mappedTables = uniqueTableNames.map(name => ({
          name: name as string,
          columns: schemaArray.filter((s: any) =>
            (s.table_name || s.TABLE_NAME) === name
          )
        }));

        setTables(mappedTables);
      }
    } catch (err) {
      console.error("Error in fetchTables:", err);
    }
  };

  const runAudit = async () => {
    const tableObj = tables.find(t => t.name === selectedTable);
    if (!selectedConn || !tableObj) return;

    setIsAnalyzing(true);
    try {
      const uri = await getEffectiveUri(selectedConn);
      if (!uri) throw new Error("Connection URI not found");

      const res = await getTableQuality(uri, selectedTable, tableObj.columns);
      if (res.success) setQualityData(res.data);
    } catch (err) {
      console.error("Audit failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Data Quality Audit</h1>
        <p className="text-sm text-muted-foreground">Analyze completeness, uniqueness, and statistical health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedConn}
          onChange={(e) => fetchTables(e.target.value)}
        >
          <option value="">Select Connection</option>
          {connections.map(c => (
            <option key={c.id} value={c.id}>
              {c.isDemo ? "✨ " : ""}{c.name}
            </option>
          ))}
        </select>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={!tables.length}
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          <option value="">Select Table</option>
          {tables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

        <Button onClick={runAudit} disabled={!selectedTable || isAnalyzing}>
          {isAnalyzing ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <BarChart3 className="mr-2 w-4 h-4" />}
          Run Quality Audit
        </Button>
      </div>

      {qualityData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-primary/5 border-primary/20 relative overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Records</p>
              <p className="text-2xl font-bold">{qualityData.totalRows.toLocaleString()}</p>
              {selectedConn === DEMO_ID && (
                <Sparkles className="absolute -right-2 -top-2 w-12 h-12 text-primary/10 rotate-12" />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualityData.metrics.map((m: any) => (
              <Card key={m.column} className="p-5 space-y-4 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm font-mono">{m.column}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.type}</p>
                  </div>
                  {m.completeness === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completeness</span>
                    <span className="font-medium">{m.completeness.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${m.completeness > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${m.completeness}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Uniqueness</p>
                    <p className="text-xs font-bold">{m.uniqueness.toFixed(1)}%</p>
                  </div>
                  {m.avg !== null && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Mean Value</p>
                      <p className="text-xs font-bold">{Number(m.avg).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
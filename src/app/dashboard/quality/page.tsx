"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { getTableQuality, getUserConnections, getDatabaseMetadata } from "../../../actions/db";
import { authClient } from "@/src/components/landing/auth";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

export default function QualityPage() {
  const { data: session } = authClient.useSession();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityData, setQualityData] = useState<any>(null);

  useEffect(() => {
    if (session?.user?.id) {
      getUserConnections(session.user.id).then((res) => {
        if (res.success) setConnections(res.data || []);
      });
    }
  }, [session]);

  const fetchTables = async (connId: string) => {
    setSelectedConn(connId);
    const conn = connections.find(c => c.id === connId);
    if (!conn || !conn.tableUri) return;

    try {
      const res = await getDatabaseMetadata(conn.tableUri);

      // Ensure res.data and res.data.schema exist before mapping
      if (res.success && res.data?.schema) {
        const schemaArray = res.data.schema;

        // Use a Set to get unique table names, handling potential case differences
        const uniqueTableNames = Array.from(
          new Set(schemaArray.map((s: any) => s.table_name || s.TABLE_NAME))
        ).filter(Boolean);

        const mappedTables = uniqueTableNames.map(name => ({
          name: name as string,
          // Filter columns belonging to this table, checking both casing options
          columns: schemaArray.filter((s: any) =>
            (s.table_name || s.TABLE_NAME) === name
          )
        }));

        setTables(mappedTables);
      } else {
        console.error("Metadata fetch failed or schema missing:", res.error);
        setTables([]);
      }
    } catch (err) {
      console.error("Error in fetchTables:", err);
      setTables([]);
    }
  };

  const runAudit = async () => {
    const conn = connections.find(c => c.id === selectedConn);
    const tableObj = tables.find(t => t.name === selectedTable);
    if (!conn || !tableObj) return;

    setIsAnalyzing(true);
    const res = await getTableQuality(conn.tableUri, selectedTable, tableObj.columns);
    if (res.success) setQualityData(res.data);
    setIsAnalyzing(false);
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
          onChange={(e) => fetchTables(e.target.value)}
        >
          <option value="">Select Connection</option>
          {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={!tables.length}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          <option value="">Select Table</option>
          {tables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

        <Button onClick={runAudit} disabled={!selectedTable || isAnalyzing}>
          {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <BarChart3 className="mr-2 w-4 h-4" />}
          Run Quality Audit
        </Button>
      </div>

      {qualityData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Records</p>
              <p className="text-2xl font-bold">{qualityData.totalRows.toLocaleString()}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualityData.metrics.map((m: any) => (
              <Card key={m.column} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm">{m.column}</h3>
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
                    <span>Completeness</span>
                    <span>{m.completeness.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.completeness > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${m.completeness}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground">UNIQUENESS</p>
                    <p className="text-xs font-medium">{m.uniqueness.toFixed(1)}%</p>
                  </div>
                  {m.avg !== null && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">MEAN VALUE</p>
                      <p className="text-xs font-medium">{Number(m.avg).toLocaleString()}</p>
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
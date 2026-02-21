"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { getUserConnections, runCustomQuery } from "../../../actions/db";
import { authClient } from "@/src/components/landing/auth";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Loader2, Play, Table as TableIcon, AlertCircle, FileJson, Database } from "lucide-react";

const DEMO_ID = "demo-neon-db";

export default function QueryPage() {
  const { data: session } = authClient.useSession();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState(DEMO_ID);
const [sqlText, setSqlText] = useState(`SELECT 
    oi.order_id,
    oi.product_id,
    oi.seller_id,
    oi.price,
    oi.freight_value,
    s.seller_city,
    s.seller_state,
    op.payment_type,
    op.payment_value,
    orv.review_score,
    orv.review_comment_message
FROM olist_order_items_dataset oi
JOIN olist_sellers_dataset s ON oi.seller_id = s.seller_id
LEFT JOIN olist_order_payments_dataset op ON oi.order_id = op.order_id
LEFT JOIN olist_order_reviews_dataset orv ON oi.order_id = orv.order_id
ORDER BY oi.order_id
LIMIT 10;`);
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConns = async () => {
      let userConns: any[] = [];
      if (session?.user?.id) {
        const res = await getUserConnections(session.user.id);
        if (res.success) userConns = res.data || [];
      }
      setConnections([{ id: DEMO_ID, name: "✨ Demo eCommerce DB" }, ...userConns]);
    };
    fetchConns();
  }, [session]);

  const execute = async () => {
    if (!sqlText.trim()) return;
    
    setIsRunning(true);
    setError(null);
    setResults([]); 

    try {
      // Pass the userId (even if undefined for guests) to trigger demo fallback
      const res = await runCustomQuery(selectedConn, session?.user?.id, sqlText);
      
      if (res.success) {
        // CASTING FIX: Tell TypeScript this is a standard array
        const data = (res.data as any[]) || [];
        setResults(data);
        if (data.length === 0) setError("Query successful, but no rows were returned.");
      } else {
        setError(res.error || "An error occurred during query execution.");
      }
    } catch (err: any) {
      setError(err.message || "Connection failed.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SQL Lab</h1>
            <p className="text-sm text-muted-foreground">Run direct queries against your connected databases.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={selectedConn}
              onChange={(e) => setSelectedConn(e.target.value)}
            >
              {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <Button 
              onClick={execute}
              disabled={isRunning}
              className="min-w-[120px] shadow-lg shadow-primary/20"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Execute
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-rows-2 gap-4 min-h-0 overflow-hidden">
          <Card className="relative border-2 border-primary/10 overflow-hidden bg-[#0a0a0a] shadow-2xl group">
            <div className="absolute top-2 right-4 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest pointer-events-none select-none group-hover:text-primary transition-colors">
              SQL Editor
            </div>
            <textarea
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
              className="w-full h-full p-6 bg-transparent text-emerald-400 font-mono text-sm outline-none resize-none leading-relaxed selection:bg-emerald-500/20"
              placeholder="-- Write your SQL query here..."
              spellCheck={false}
            />
          </Card>

          <Card className="overflow-hidden flex flex-col border-muted shadow-inner bg-background/50">
            <div className="px-4 py-2 border-b bg-muted/30 flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                <FileJson className="w-3 h-3 text-primary" />
                Query Results {results.length > 0 && `(${results.length})`}
              </span>
            </div>
            
            <div className="flex-1 overflow-auto">
              {error ? (
                <div className="m-6 p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Execution Error</p>
                    <p className="text-xs font-mono opacity-80">{error}</p>
                  </div>
                </div>
              ) : results.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10">
                    <tr>
                      {Object.keys(results[0]).map((key) => (
                        <th key={key} className="p-3 text-[10px] font-bold uppercase tracking-wider border-b border-border/50 text-muted-foreground bg-muted/50">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className="hover:bg-primary/5 border-b border-border/5 last:border-0 transition-colors group">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-3 text-[11px] font-mono truncate max-w-[240px] text-foreground/80 group-hover:text-foreground">
                            {val === null ? (
                                <span className="text-muted-foreground/40 italic">null</span>
                            ) : (
                                val.toString()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : !isRunning ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 grayscale">
                  <Database className="w-16 h-16 mb-4" />
                  <p className="text-sm font-medium uppercase tracking-widest">Awaiting Command</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                   <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                   <p className="text-xs mt-4 text-muted-foreground animate-pulse tracking-widest uppercase">Executing...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { 
  Database, 
  Plus, 
  Search, 
  ExternalLink, 
  Trash2, 
  ShieldCheck, 
  Activity,
  MoreVertical,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { getUserConnections, deleteConnection } from "../../../actions/db";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { authClient } from "@/src/components/landing/auth";
import { Card } from "@/src/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

export default function ConnectionsPage() {
  const { data: session } = authClient.useSession();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConnections = async () => {
    if (session?.user?.id) {
      const result = await getUserConnections(session.user.id);
      if (result.success) {
        setConnections(result.data || []);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!session?.user?.id) return;

    if (confirm("Are you sure you want to remove this connection?")) {
      // FIX: Pass both the ID and the UserID to the server action
      const res = await deleteConnection(id, session.user.id);
      
      if (res.success) {
        // Optimistic UI update: filter out the deleted connection immediately
        setConnections((prev) => prev.filter(c => c.id !== id));
      } else {
        alert(res.error || "Failed to delete connection.");
      }
    }
  };

  const filteredConnections = connections.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-sm text-muted-foreground">Manage your connected enterprise databases.</p>
        </div>
        <Link href="/connect">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Connection
          </Button>
        </Link>
      </div>

      {/* Only show search and results if there is actually data */}
      {connections.length > 0 ? (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or provider..." 
              className="pl-10 max-w-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConnections.map((conn) => (
                <Card key={conn.id} className="relative group hover:border-primary/50 transition-all overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Database className="w-5 h-5" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive cursor-pointer"
                            onClick={() => handleDelete(conn.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-bold truncate pr-8">{conn.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                        {conn.provider}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Encrypted
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <Link href={`/dashboard/tables/${conn.id}`} className="w-full">
                        <Button variant="outline" className="w-full text-xs h-8 gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Explore Schema <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-300" />
                </Card>
              ))}
            </div>
          )}
        </>
      ) : !loading ? (
        // Case where there is no data
        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-2xl bg-muted/30">
          <div className="p-4 bg-background rounded-full shadow-sm mb-4">
            <Activity className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Connections Found</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs text-center">
            You haven't linked any databases to DataLens AI yet.
          </p>
          <Link href="/dashboard/connect">
            <Button size="lg" className="rounded-full px-8">
              <Plus className="w-4 h-4 mr-2" /> Connect Your First DB
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      )}
    </DashboardLayout>
  );
}
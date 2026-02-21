"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Lock
} from "lucide-react";

import { 
  SiPostgresql, 
  SiMysql, 
  SiSnowflake 
} from "react-icons/si";
type DBType = "postgresql" | "mysql" | "snowflake" | null;

export default function ConnectPage() {
  const [selectedDB, setSelectedDB] = useState<DBType>(null);
  const [connString, setConnString] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const databases = [
    { id: "postgresql", name: "PostgreSQL", icon: SiPostgresql, color: "text-[#336791]" },
    { id: "mysql", name: "MySQL", icon: SiMysql, color: "text-[#00758F]" },
    { id: "snowflake", name: "Snowflake", icon: SiSnowflake, color: "text-[#29B5E8]" },
  ];

  const handleConnect = async () => {
    setIsConnecting(true);
    // Logic for Step 2 (Ingestion) will go here
    console.log(`Connecting to ${selectedDB} with: ${connString}`);
    setTimeout(() => setIsConnecting(false), 2000); 
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Connect your Data Source</h1>
        <p className="text-muted-foreground">Select a database to begin the AI-powered documentation process.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {databases.map((db) => {
          const Icon = db.icon;
          const isSelected = selectedDB === db.id;
          
          return (
            <Card
              key={db.id}
              className={`relative p-6 cursor-pointer border-2 transition-all hover:shadow-md ${
                isSelected ? "border-primary bg-primary/5" : "border-border"
              }`}
              onClick={() => setSelectedDB(db.id as DBType)}
            >
              {isSelected && (
                <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-primary" />
              )}
              <div className="flex flex-col items-center gap-4">
                <Icon className={`w-12 h-12 ${db.color}`} />
                <span className="font-semibold text-lg">{db.name}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedDB && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">
                {selectedDB.toUpperCase()} Connection String
              </label>
            </div>
            <Input
              placeholder={`e.g. postgres://user:password@localhost:5432/dbname`}
              value={connString}
              onChange={(e) => setConnString(e.target.value)}
              className="h-12 border-2 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              We only require read-only access to your <b>information_schema</b>.
            </p>
          </div>

          <Button 
            className="w-full h-12 text-lg font-medium" 
            disabled={!connString || isConnecting}
            onClick={handleConnect}
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Initialize Ingestion <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
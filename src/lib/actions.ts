"use server";

import { db } from "../db";
import { sql } from "drizzle-orm";

export const getDbInventory = async () => {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const columns = await db.execute(sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    return { 
        tables: tables.rows, 
        columns: columns.rows 
    };
  } catch (error) {
    console.error("Database metadata fetch failed:", error);
    throw new Error("Failed to fetch schema");
  }
};
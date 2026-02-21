"use server";

import postgres from 'postgres';
import { db } from "../db";
import { connections } from "../db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";

export async function getDatabaseMetadata(connectionString: string) {
  const sqlConnection = postgres(connectionString, { 
    max: 1, 
    connect_timeout: 10 
  });

  try {
    const schemaInfo = await sqlConnection`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public'
      ORDER BY 
        table_name, ordinal_position;
    `;

    const counts = await sqlConnection`
      SELECT 
        relname AS table_name, 
        n_live_tup AS row_count 
      FROM 
        pg_stat_user_tables;
    `;

    return { 
      success: true, 
      data: { schema: schemaInfo, counts: counts } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await sqlConnection.end();
  }
}

export async function getTableDetails(connectionString: string, tableName: string) {
  const sqlConnection = postgres(connectionString, { max: 1, connect_timeout: 10 });
  try {
    const columns = await sqlConnection`
      SELECT 
        column_name as name, 
        data_type as type, 
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_name = ${tableName}
        AND table_schema = 'public'
      ORDER BY 
        ordinal_position;
    `;
    return { success: true, data: columns };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await sqlConnection.end();
  }
}

export async function getSingleTableDetails(connectionString: string, tableName: string) {
  const sqlConnection = postgres(connectionString, { max: 1 });
  try {
    const columns = await sqlConnection`
      SELECT 
        column_name as name, 
        data_type as type, 
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_name = ${tableName}
        AND table_schema = 'public'
      ORDER BY 
        ordinal_position;
    `;
    return { success: true, data: columns };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await sqlConnection.end();
  }
}

export async function getTableRows(connectionString: string, tableName: string, page = 1, pageSize = 50) {
  const sqlConnection = postgres(connectionString, { max: 1 });
  const offset = (page - 1) * pageSize;
  try {
    const data = await sqlConnection.unsafe(`SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await sqlConnection.end();
  }
}

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

export const getConnectionStringById = async (id: string, userId: string) => {
  try {
    const [conn] = await db
      .select({ tableUri: connections.tableUri })
      .from(connections)
      .where(
        and(
          eq(connections.id, id),
          eq(connections.userId, userId)
        )
      )
      .limit(1);

    return conn?.tableUri || null;
  } catch (error) {
    console.error("Failed to find connection string:", error);
    return null;
  }
};

export const saveConnection = async (values: {
  userId: string;
  name: string;
  provider: string;
  uri: string;
}) => {
  try {
    // 1. Check if this URI already exists for this specific user
    const [existingConn] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.userId, values.userId),
          eq(connections.tableUri, values.uri)
        )
      )
      .limit(1);

    // 2. If it exists, return the existing ID immediately
    if (existingConn) {
      return { success: true, id: existingConn.id, alreadyExists: true };
    }

    // 3. Otherwise, create a new one
    const newId = crypto.randomUUID();
    
    await db.insert(connections).values({
      id: newId,
      userId: values.userId,
      name: values.name,
      provider: values.provider,
      tableUri: values.uri,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tables");

    return { success: true, id: newId, alreadyExists: false };
  } catch (error: any) {
    console.error("Database save failed:", error);
    return { success: false, error: error.message };
  }
};

export const getUserConnections = async (userId: string) => {
  try {
    const userConns = await db
      .select()
      .from(connections)
      .where(eq(connections.userId, userId));

    return { success: true, data: userConns };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
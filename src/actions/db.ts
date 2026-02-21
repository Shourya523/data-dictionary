"use server";

import postgres from 'postgres';
import { db } from "../db";
import { connections } from "../db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import mysql from 'mysql2/promise';
import snowflake from 'snowflake-sdk';

export async function getDatabaseMetadata(connectionString: string) {
  // Ensure the string exists and trim whitespace
  const uri = connectionString?.trim();
  if (!uri) return { success: false, error: "Connection string is required." };

  const isPostgres = uri.startsWith('postgres');
  const isMySQL = uri.startsWith('mysql');
  const isSnowflake = uri.startsWith('snowflake');

  // --- POSTGRESQL ---
  if (isPostgres) {
    const sqlConnection = postgres(uri, { max: 1, connect_timeout: 10 });
    try {
      const schemaInfo = await sqlConnection`
        SELECT 
            c.table_name, 
            c.column_name, 
            c.data_type,
            c.is_nullable,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key,
            fk.foreign_table_name,
            fk.foreign_column_name
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tco
            JOIN information_schema.key_column_usage kcu 
              ON kcu.constraint_name = tco.constraint_name 
             AND kcu.constraint_schema = tco.constraint_schema
            WHERE tco.constraint_type = 'PRIMARY KEY' AND tco.table_schema = 'public'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        LEFT JOIN (
             SELECT
                tc.table_name, kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position;
      `;
      const counts = await sqlConnection`
        SELECT relname AS table_name, n_live_tup AS row_count 
        FROM pg_stat_user_tables;
      `;
      return { success: true, data: { schema: schemaInfo, counts: counts } };
    } catch (error: any) {
      return { success: false, error: `Postgres Error: ${error.message}` };
    } finally {
      await sqlConnection.end();
    }
  }

  // --- MYSQL ---
  if (isMySQL) {
    let connection;
    try {
      connection = await mysql.createConnection(uri);
      const [schemaInfo]: any = await connection.execute(`
        SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        ORDER BY table_name, ordinal_position;
      `);
      const [counts]: any = await connection.execute(`
        SELECT TABLE_NAME as table_name, TABLE_ROWS as row_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE();
      `);
      return { success: true, data: { schema: schemaInfo, counts: counts } };
    } catch (error: any) {
      return { success: false, error: `MySQL Error: ${error.message}` };
    } finally {
      if (connection) await connection.end();
    }
  }

  // --- SNOWFLAKE ---
  if (isSnowflake) {
    try {
      // Safely parse URL
      const url = new URL(uri);
      const account = url.hostname;
      const username = decodeURIComponent(url.username);
      const password = decodeURIComponent(url.password);

      // Handle path parts safely
      const pathParts = url.pathname.split('/').filter(Boolean);
      const database = pathParts[0];
      const schema = pathParts[1] || 'PUBLIC';
      const warehouse = url.searchParams.get('warehouse') || undefined;

      const connection = snowflake.createConnection({
        account,
        username,
        password,
        database,
        schema,
        warehouse
      });

      const connect = () => new Promise((resolve, reject) => {
        connection.connect((err, conn) => err ? reject(err) : resolve(conn));
      });

      const execute = (sqlText: string) => new Promise((resolve, reject) => {
        connection.execute({
          sqlText,
          complete: (err, stmt, rows) => err ? reject(err) : resolve(rows)
        });
      });

      await connect();

      const schemaInfo: any = await execute(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${schema.toUpperCase()}'
        ORDER BY table_name, ordinal_position
      `);

      const counts: any = await execute(`
        SELECT table_name, row_count 
        FROM information_schema.tables 
        WHERE table_schema = '${schema.toUpperCase()}'
      `);

      // Important: Snowflake connections should be closed, but the SDK 
      // handle is different; for metadata, we destroy the connection after use.
      await new Promise<void>((resolve, reject) => {
        connection.destroy((err) => {
          if (err) {
            console.error('Failed to close Snowflake connection:', err);
            // We don't necessarily want to fail the whole request if 
            // the data was already fetched but the close failed
            resolve();
          } else {
            resolve();
          }
        });
      });

      return { success: true, data: { schema: schemaInfo, counts: counts } };
    } catch (error: any) {
      return { success: false, error: `Snowflake Error: ${error.message}` };
    }
  }

  return { success: false, error: "Unsupported database provider. Please check your connection string prefix." };
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
          c.table_name, 
          c.column_name as name, 
          c.data_type as type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key,
          fk.foreign_table_name,
          fk.foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN (
          SELECT kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tco
          JOIN information_schema.key_column_usage kcu 
            ON kcu.constraint_name = tco.constraint_name 
           AND kcu.constraint_schema = tco.constraint_schema
          WHERE tco.constraint_type = 'PRIMARY KEY' AND tco.table_schema = 'public'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
           SELECT
              tc.table_name, kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE c.table_name = ${tableName} AND c.table_schema = 'public'
      ORDER BY c.ordinal_position;
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

export async function getTableQuality(connectionString: string, tableName: string, columns: any[]) {
  const isPostgres = connectionString.startsWith('postgres');
  // For brevity, using Postgres logic; similar patterns apply to MySQL/Snowflake
  const sql = postgres(connectionString, { max: 1 });

  try {
    const projections = columns.map(col => {
      const name = col.column_name || col.name;
      const type = (col.data_type || col.type).toLowerCase();
      const isNumeric = ['integer', 'numeric', 'real', 'double precision', 'bigint', 'decimal'].some(t => type.includes(t));

      return `
        COUNT("${name}") as "${name}_count",
        COUNT(DISTINCT "${name}") as "${name}_unique"
        ${isNumeric ? `, AVG("${name}")::float as "${name}_avg"` : ''}
      `;
    }).join(', ');

    const [stats] = await sql.unsafe(`SELECT COUNT(*) as total_rows, ${projections} FROM ${tableName}`);

    const metrics = columns.map(col => {
      const name = col.column_name || col.name;
      const count = Number(stats[`${name}_count`]);
      const total = Number(stats.total_rows);

      return {
        column: name,
        type: col.data_type || col.type,
        completeness: total > 0 ? (count / total) * 100 : 0,
        uniqueness: total > 0 ? (Number(stats[`${name}_unique`]) / total) * 100 : 0,
        avg: stats[`${name}_avg`] ?? null
      };
    });

    return { success: true, data: { totalRows: stats.total_rows, metrics } };
  } catch (e: any) {
    return { success: false, error: e.message };
  } finally {
    await sql.end();
  }
}

export async function deleteConnection(connectionId: string, userId: string) {
  try {
    // Ensure the user can only delete their own connections
    const result = await db
      .delete(connections)
      .where(
        and(
          eq(connections.id, connectionId),
          eq(connections.userId, userId)
        )
      )
      .returning({ deletedId: connections.id });

    if (result.length === 0) {
      return { success: false, error: "Connection not found or unauthorized." };
    }

    // Refresh the connections page cache
    revalidatePath("/dashboard/connections");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
"use server";

import { db } from "../db";
import { entities, fields, relationships } from "../db/schema";
import { revalidatePath } from "next/cache";

export async function syncTableMetadata(connectionId: string, parsedTables: any[]) {
    try {
        const entityMap = new Map<string, string>();
        const fieldMap = new Map<string, string>(); // Key: "tableName.columnName", Value: field.id

        // 1. Insert Entities
        for (const table of parsedTables) {
            if (!table.name) continue;

            const entityId = crypto.randomUUID();
            await db.insert(entities).values({
                id: entityId,
                connectionId,
                name: table.name,
            });

            entityMap.set(table.name, entityId);
        }

        const allForeignKeys: any[] = [];

        // 2. Insert Fields (Columns)
        for (const table of parsedTables) {
            const entityId = entityMap.get(table.name);
            if (!entityId || !table.columns) continue;

            for (const col of table.columns) {
                if (!col || typeof col !== 'object') continue;

                const fieldId = crypto.randomUUID();

                await db.insert(fields).values({
                    id: fieldId,
                    entityId,
                    name: col.column_name,
                    type: col.data_type,
                    isNullable: col.is_nullable === 'YES',
                    isPrimaryKey: col.is_primary_key || false,
                });

                // Store reference to this exact field to construct relationships later
                fieldMap.set(`${table.name}.${col.column_name}`, fieldId);

                if (col.is_foreign_key && col.foreign_table_name && col.foreign_column_name) {
                    allForeignKeys.push({
                        tempSourceFieldId: fieldId,
                        sourceColumnName: col.column_name,
                        sourceTableName: table.name,
                        targetTableName: col.foreign_table_name,
                        targetColumnName: col.foreign_column_name,
                    });
                }
            }
        }

        // 3. Insert Relationships
        for (const fk of allForeignKeys) {
            const targetFieldId = fieldMap.get(`${fk.targetTableName}.${fk.targetColumnName}`);

            if (!targetFieldId) {
                console.warn(`Foreign key skipped: Could not resolve target field -> ${fk.targetTableName}.${fk.targetColumnName}`);
                continue;
            }

            await db.insert(relationships).values({
                id: crypto.randomUUID(),
                sourceFieldId: fk.tempSourceFieldId,
                targetFieldId: targetFieldId,
            });
        }

        revalidatePath(`/dashboard/tables/${connectionId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Failed to sync table metadata:", error);
        return { success: false, error: error.message };
    }
}

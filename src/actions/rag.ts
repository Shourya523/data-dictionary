"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDatabaseMetadata } from "./db";
import { qdrant, COLLECTION_NAME } from "../lib/qdrant";
import { v5 as uuidv5 } from "uuid";
import { db } from "../db";
import { entities, fields, relationships, schemaKnowledge } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "../lib/neo4j";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const NAMESPACE = "0ea2b2f2-67a0-4d67-95f0-9b8a99c9605c"; // Standard UUID namespace

export async function syncAIDocumentation(connectionId: string) {
    if (!connectionId) return { success: false, error: "Connection ID required." };

    let session;
    try {
        // 1. Fetch Metadata from Relational Database (Drizzle)
        const dbEntities = await db
            .select()
            .from(entities)
            .where(eq(entities.connectionId, connectionId));

        console.log(`[RAG Backend] Found ${dbEntities.length} entities to document via Gemini.`);

        if (dbEntities.length === 0) {
            console.warn("[RAG Backend] Sync aborted: No entities found for connection:", connectionId);
            return { success: false, error: "No tables/entities mapped in metadata yet. Please run SYNC TABLES first." };
        }

        const entityIds = dbEntities.map(e => e.id);
        const dbFields = await db
            .select()
            .from(fields)
            .where(inArray(fields.entityId, entityIds));

        // 2. Initialize Neo4j Session for specific Relationship Queries
        session = getSession();

        // 4. Iterate over each entity and build Markdown directly
        for (const entity of dbEntities) {
            const tableFields = dbFields.filter(f => f.entityId === entity.id);

            // Query Neo4j for exact relationships hitting this specific node
            const neo4jResult = await session.executeRead(async (tx: any) => {
                const query = `
                    MATCH (e:Entity {id: $entityId})-[:HAS_FIELD]->(sourceBase:Field)
                    OPTIONAL MATCH (sourceBase)-[:REFERENCES_FIELD]->(targetField:Field)<-[:HAS_FIELD]-(targetEntity:Entity)
                    RETURN sourceBase, targetField, targetEntity
                `;
                return await tx.run(query, { entityId: entity.id });
            });

            // Parse Neo4j relationships safely
            const parsedRelationships: any[] = [];
            neo4jResult.records.forEach((record: any) => {
                const srcBase = record.get('sourceBase');
                const tgtField = record.get('targetField');
                const tgtEntity = record.get('targetEntity');

                if (tgtField && tgtEntity) {
                    parsedRelationships.push({
                        field: srcBase.properties.name,
                        references_table: tgtEntity.properties.name,
                        references_field: tgtField.properties.name
                    });
                }
            });

            // Construct locally generated Markdown Docs
            let markdownContent = `# Table: \`${entity.name}\`\n\n`;
            markdownContent += `## Table Overview\n\nThis table represents the \`${entity.name}\` entity in the database architecture.\n\n`;

            markdownContent += `## Fields\n\n`;
            markdownContent += `| Field Name | Type | PK/FK | Nullable | Description |\n`;
            markdownContent += `| :--- | :--- | :--- | :--- | :--- |\n`;

            for (const f of tableFields) {
                const isFk = parsedRelationships.some(r => r.field === f.name);
                let keys = [];
                if (f.isPrimaryKey) keys.push("PK");
                if (isFk) keys.push("FK");

                markdownContent += `| \`${f.name}\` | \`${f.type}\` | ${keys.join(", ")} | ${f.isNullable ? "Yes" : "No"} | Standard field for ${f.name} |\n`;
            }

            markdownContent += `\n## Relationships\n\n`;
            if (parsedRelationships.length > 0) {
                parsedRelationships.forEach(r => {
                    markdownContent += `- **\`${r.field}\`** references \`${r.references_table}.${r.references_field}\`\n`;
                });
            } else {
                markdownContent += `No foreign key relationships detected.\n`;
            }

            console.log(`[RAG Backend] Upserting mapped documentation for ${entity.name}`);

            // 5. Save the Markdown to schemaKnowledge table deterministically
            await db
                .insert(schemaKnowledge)
                .values({
                    connectionId: connectionId,
                    entityName: entity.name,
                    markdownContent: markdownContent,
                    updatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: [schemaKnowledge.connectionId, schemaKnowledge.entityName],
                    set: { markdownContent: markdownContent, updatedAt: new Date() }
                });
        }

        return { success: true, message: `Successfully generated documentation for ${dbEntities.length} tables.` };

    } catch (error: any) {
        console.error("Documentation generation failed:", error);
        return { success: false, error: error.message };
    } finally {
        if (session) {
            await session.close();
        }
    }
}
export async function indexRemoteDatabase(connectionId: string, connectionString: string) {
    try {
        const result = await getDatabaseMetadata(connectionString);
        if (!result.success || !result.data) {
            return { success: false, error: result.error || "Failed to fetch metadata" };
        }

        const { schema } = result.data;
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

        const tableData: Record<string, string[]> = {};
        schema.forEach((col: any) => {
            const tableName = col.table_name;
            if (!tableData[tableName]) tableData[tableName] = [];
            tableData[tableName].push(`${col.column_name} (${col.data_type})`);
        });

        const points = [];

        for (const [tableName, columns] of Object.entries(tableData)) {
            const description = `Database table "${tableName}" contains columns: ${columns.join(", ")}.`;
            const embedResult = await model.embedContent(description);
            const vector = embedResult.embedding.values;

            // Generate a stable ID so re-indexing updates the same point
            const pointId = uuidv5(`${connectionId}-${tableName}`, NAMESPACE);

            points.push({
                id: pointId,
                vector: vector,
                payload: {
                    connection_id: connectionId,
                    table_name: tableName,
                    content: description,
                    updated_at: new Date().toISOString()
                }
            });
        }

        await qdrant.upsert(COLLECTION_NAME, {
            wait: true,
            points: points
        });

        return { success: true, message: "Database indexed in Qdrant successfully" };
    } catch (error: any) {
        console.error("Qdrant Indexing Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getRelevantTables(userQuery: string, connectionId: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const queryEmbed = await model.embedContent(userQuery);
        const vector = queryEmbed.embedding.values;

        const searchResult = await qdrant.search(COLLECTION_NAME, {
            vector: vector,
            filter: {
                must: [{ key: "connection_id", match: { value: connectionId } }]
            },
            limit: 8
        });

        return {
            success: true,
            data: searchResult.map(hit => hit.payload)
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function askAiAction(userQuestion: string, connectionId: string) {
    try {
        const contextResult = await getRelevantTables(userQuestion, connectionId);

        if (!contextResult.success || !contextResult.data || contextResult.data.length === 0) {
            return { success: false, error: "Could not find relevant schema context." };
        }

        const contextString = contextResult.data
            .map((c: any) => c.content)
            .join("\n");

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are a PostgreSQL expert. Given a schema, write a query. 
            CRITICAL: Large dataset detected (500k+ rows). Always append 'LIMIT 100' 
            to SELECT statements to prevent timeouts.`
        });

        const prompt = `
            SCHEMA CONTEXT:
            ${contextString}

            USER QUESTION:
            ${userQuestion}

            TASK:
            Return a PostgreSQL code block. Include 'LIMIT 100' unless the user asks for a specific count/limit.
        `;

        const result = await model.generateContent(prompt);
        return { success: true, answer: result.response.text() };

    } catch (e: any) {
        console.error("AI Action Error:", e);
        return { success: false, error: e.message };
    }
}
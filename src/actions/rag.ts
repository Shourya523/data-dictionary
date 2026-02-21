"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDatabaseMetadata } from "./db";
import { qdrant, COLLECTION_NAME } from "../lib/qdrant";
import { v5 as uuidv5 } from "uuid";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const NAMESPACE = "0ea2b2f2-67a0-4d67-95f0-9b8a99c9605c"; // Standard UUID namespace

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
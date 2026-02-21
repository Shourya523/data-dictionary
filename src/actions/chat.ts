"use server";

import { Mixedbread } from "@mixedbread/sdk";
import Groq from "groq-sdk";
import { qdrant, COLLECTION_NAME } from "../lib/qdrant";
import { v5 as uuidv5 } from "uuid";
import { db } from "../db";
import { schemaKnowledge } from "../db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/neo4j";

const mxbai = new Mixedbread({ apiKey: process.env.MIXEDBREAD_API_KEY! });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const NAMESPACE = "0ea2b2f2-67a0-4d67-95f0-9b8a99c9605c"; // Standard UUID namespace

export async function checkEmbeddingStatus(connectionId: string) {
    try {
        const records = await db.select().from(schemaKnowledge).where(eq(schemaKnowledge.connectionId, connectionId));
        if (records.length === 0) return { embedded: false, total: 0, embeddedCount: 0 };

        let embeddedCount = 0;
        records.forEach(r => {
            if (r.embeddingId) embeddedCount++;
        });

        return {
            embedded: embeddedCount === records.length && records.length > 0,
            total: records.length,
            embeddedCount
        };
    } catch (e: any) {
        console.error("Failed to check embedding status:", e);
        return { embedded: false, total: 0, embeddedCount: 0 };
    }
}

export async function embedDocumentationData(connectionId: string) {
    if (!connectionId) return { success: false, error: "Connection ID required." };

    try {
        console.log(`[Chat Backend] Starting vector embedding for connection: ${connectionId}`);

        // 1. Fetch text from the `schemaKnowledge` table
        const docs = await db
            .select()
            .from(schemaKnowledge)
            .where(eq(schemaKnowledge.connectionId, connectionId));

        if (docs.length === 0) {
            return { success: false, error: "No documentation found to embed. Please SYNC AI first." };
        }

        const points = [];

        // 2. Iterate and generate embeddings via Mixedbread
        for (const doc of docs) {
            const textToEmbed = `Table: ${doc.entityName}\n\n${doc.markdownContent}`;

            console.log(`[Chat Backend] Embedding table node: ${doc.entityName} via Mixedbread-AI`);

            const res = await mxbai.embeddings.create({
                model: 'mixedbread-ai/mxbai-embed-large-v1',
                input: [textToEmbed],
                normalized: true
            });

            const vector = res.data[0].embedding as number[];
            const pointId = uuidv5(`${connectionId}-${doc.entityName}`, NAMESPACE);

            points.push({
                id: pointId,
                vector: vector,
                payload: {
                    connection_id: connectionId,
                    entity_name: doc.entityName,
                    content: textToEmbed,
                    type: "documentation"
                }
            });

            // 3. Update PG DB to log that it has been embedded
            await db.update(schemaKnowledge)
                .set({ embeddingId: pointId })
                .where(eq(schemaKnowledge.id, doc.id));
        }

        // 4. Batch Upsert to Qdrant with self-healing collection creation
        try {
            await qdrant.upsert(COLLECTION_NAME, {
                wait: true,
                points: points
            });
        } catch (qdrantErr: any) {
            if (qdrantErr.status === 404) {
                console.log(`[Chat Backend] Collection ${COLLECTION_NAME} not found. Creating it now...`);
                await qdrant.createCollection(COLLECTION_NAME, {
                    vectors: {
                        size: 1024,
                        distance: "Cosine"
                    }
                });
                console.log(`[Chat Backend] Collection created. Retrying upsert...`);
                await qdrant.upsert(COLLECTION_NAME, {
                    wait: true,
                    points: points
                });
            } else {
                throw qdrantErr;
            }
        }

        console.log(`[Chat Backend] Successfully embedded ${points.length} documents into Qdrant.`);
        return { success: true, message: `Successfully embedded ${points.length} documentation tables.` };

    } catch (error: any) {
        console.error("Documentation embedding failed:", error);
        return { success: false, error: error.message };
    }
}

export async function chatWithSchema(query: string, connectionId: string, history: any[] = []) {
    let neo4jSession;
    try {
        console.log(`[Chat Backend] Received Query: "${query}"`);

        // 1. Convert user query to Vector embedding using Mixedbread
        const embedRes = await mxbai.embeddings.create({
            model: 'mixedbread-ai/mxbai-embed-large-v1',
            input: [query],
            normalized: true
        });
        const queryVector = embedRes.data[0].embedding as number[];

        // 2. Search Qdrant for Top 5 closest schema documentation nodes
        const searchResult = await qdrant.search(COLLECTION_NAME, {
            vector: queryVector,
            filter: {
                must: [{ key: "connection_id", match: { value: connectionId } }]
            },
            limit: 5
        });

        const vectorContextItems = searchResult.map(hit => hit.payload as { entity_name: string, content: string });
        const vectorContextString = vectorContextItems.map(c => c.content).join("\n\n---\n\n");
        const discoveredEntities = vectorContextItems.map(c => c.entity_name);

        console.log(`[Chat Backend] Discovered context entities in Qdrant: ${discoveredEntities.join(", ")}`);

        // 3. Graph Database Expansion via Neo4j
        // If vector search found tables, let's trace their exact 1-degree connections in NeoDB 
        // just in case vector search missed an implicit relationship link.
        neo4jSession = getSession();
        let graphContextString = "";

        if (discoveredEntities.length > 0) {
            const graphRes = await neo4jSession.executeRead(async (tx: any) => {
                const cypher = `
                    MATCH (e:Entity)-[:HAS_FIELD]->(f:Field)-[:REFERENCES_FIELD]->(fk:Field)<-[:HAS_FIELD]-(ref:Entity)
                    WHERE e.name IN $entities OR ref.name IN $entities
                    RETURN e.name AS source, f.name AS source_field, ref.name AS target, fk.name AS target_field
                `;
                return await tx.run(cypher, { entities: discoveredEntities });
            });

            const relations: string[] = [];
            graphRes.records.forEach((record: any) => {
                relations.push(`- ${record.get('source')}.${record.get('source_field')} references ${record.get('target')}.${record.get('target_field')}`);
            });

            if (relations.length > 0) {
                graphContextString = "\n\nGRAPH RELATIONSHIPS INFERRED:\n" + [...new Set(relations)].join("\n");
                console.log(`[Chat Backend] Expanded ${relations.length} edge paths from Graph DB.`);
            }
        }

        // 4. Formulate Unified Context Payload
        const systemPrompt = `You are a Senior Data Architect and Database AI Assistant. You answer questions strictly based on the provided schema documentation and relational graph connections.
        
        CRITICAL RULES:
        1. Base your answer purely on the context provided below.
        2. If the user asks for a query, output valid PostgreSQL.
        3. If you do not know the answer based on the context, politely state that the schema does not contain that information.
        4. Use bolding to refer to table and column names (e.g., **users.email**).
        5. Structure your answer using markdown. Keep it concise but comprehensive.

        --- START VECTOR DB DOCUMENTATION CONTEXT ---
        ${vectorContextString}
        --- END VECTOR DB CONTEXT ---
        ${graphContextString ? `\n\n--- START NEO4J GRAPH CONTEXT ---${graphContextString}\n--- END GRAPH CONTEXT ---` : ''}
        `;

        // Configure message array with system instructions and user history
        const messages: any[] = [
            { role: "system", content: systemPrompt },
        ];

        // Hydrate recent history
        if (history && history.length > 0) {
            // grab last 5 messages to avoid blowing up context window
            const recentHistory = history.slice(-5);
            messages.push(...recentHistory.map(h => ({
                role: h.role,
                content: h.parts?.[0]?.text || typeof h.content === 'string' ? h.content : "" // Support Gemini syntax mapping or string content
            })));
        }

        messages.push({ role: "user", content: query });

        console.log(`[Chat Backend] Requesting compound intelligence inference from Groq Cloud (llama-3.3-70b-versatile)...`);

        // 5. Stream inference from Groq (llama-3.3-70b-versatile acting as compound)
        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.2, // Low temp for factual data dictionary accuracy
            max_tokens: 1500
        });

        const answer = chatCompletion.choices[0]?.message?.content || "No response generated.";

        console.log(`[Chat Backend] Groq inference successful.`);

        return { success: true, answer: answer };

    } catch (e: any) {
        console.error("Chat Action Error:", e);
        return { success: false, error: e.message };
    } finally {
        if (neo4jSession) {
            await neo4jSession.close();
        }
    }
}

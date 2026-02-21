"use server";

import { db } from "../db";
import { entities, fields, relationships } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "../lib/neo4j";

export async function buildGraphForInference(connectionId: string) {
    if (!connectionId) return { success: false, error: "Connection ID required." };

    let session;

    try {
        // 1. Fetch Metadata from Relational DB (Drizzle)
        const dbEntities = await db.select().from(entities).where(eq(entities.connectionId, connectionId));

        if (dbEntities.length === 0) {
            return { success: false, error: "No entities found for this connection." };
        }

        const entityIds = dbEntities.map(e => e.id);
        const dbFields = await db.select().from(fields).where(inArray(fields.entityId, entityIds));

        const fieldIds = dbFields.map(f => f.id);

        let dbRelationships: any[] = [];
        if (fieldIds.length > 0) {
            dbRelationships = await db.select().from(relationships).where(inArray(relationships.sourceFieldId, fieldIds));
        }

        // 2. Map structures for faster lookup
        const fieldEntityMap = new Map();
        dbFields.forEach(f => fieldEntityMap.set(f.id, f.entityId));

        const entityNameMap = new Map();
        dbEntities.forEach(e => entityNameMap.set(e.id, e.name));


        // 3. Connect to Neo4j and begin construction
        session = getSession();

        await session.executeWrite(async (tx: any) => {
            // A. Safely clear old nodes for this specific connection ONLY
            await tx.run(`
                MATCH (n:Entity {connectionId: $connectionId})
                DETACH DELETE n
            `, { connectionId });

            await tx.run(`
                MATCH (f:Field {connectionId: $connectionId})
                DETACH DELETE f
            `, { connectionId });


            // B. Create Entity Nodes
            for (const entity of dbEntities) {
                await tx.run(`
                    MERGE (e:Entity {id: $id})
                    SET e.name = $name, e.connectionId = $connectionId
                `, {
                    id: entity.id,
                    name: entity.name,
                    connectionId: entity.connectionId
                });
            }

            // C. Create Field Nodes & Connect (Entity)-[:HAS_FIELD]->(Field)
            for (const field of dbFields) {
                const isForeignKey = dbRelationships.some((r: any) => r.sourceFieldId === field.id);

                await tx.run(`
                    MERGE (f:Field {id: $id})
                    SET f.name = $name, 
                        f.type = $type, 
                        f.isNullable = $isNullable, 
                        f.isPrimaryKey = $isPrimaryKey, 
                        f.isForeignKey = $isForeignKey,
                        f.connectionId = $connectionId
                `, {
                    id: field.id,
                    name: field.name,
                    type: field.type,
                    isNullable: field.isNullable,
                    isPrimaryKey: field.isPrimaryKey,
                    isForeignKey,
                    connectionId
                });

                // Connect parent entity -> field
                await tx.run(`
                    MATCH (e:Entity {id: $entityId})
                    MATCH (f:Field {id: $fieldId})
                    MERGE (e)-[:HAS_FIELD]->(f)
                `, {
                    entityId: field.entityId,
                    fieldId: field.id
                });
            }


            // D. Create Relationships (Field)-[:REFERENCES_FIELD]->(Field)
            //    and abstract (Entity)-[:REFERENCES]->(Entity)
            for (const rel of dbRelationships) {

                // Field to Field
                await tx.run(`
                    MATCH (source:Field {id: $sourceId})
                    MATCH (target:Field {id: $targetId})
                    MERGE (source)-[:REFERENCES_FIELD]->(target)
                `, {
                    sourceId: rel.sourceFieldId,
                    targetId: rel.targetFieldId
                });

                // Entity to Entity (Abstracted Summary)
                const sourceEntityId = fieldEntityMap.get(rel.sourceFieldId);
                const targetEntityId = fieldEntityMap.get(rel.targetFieldId);

                if (sourceEntityId && targetEntityId) {
                    await tx.run(`
                        MATCH (sourceE:Entity {id: $sourceId})
                        MATCH (targetE:Entity {id: $targetId})
                        MERGE (sourceE)-[:REFERENCES]->(targetE)
                    `, {
                        sourceId: sourceEntityId,
                        targetId: targetEntityId
                    });
                }
            }
        });

        return { success: true, message: `Successfully pushed ${dbEntities.length} entities and ${dbFields.length} fields to Neo4j Graph.` };

    } catch (error: any) {
        console.error("Graph build failed:", error);
        return { success: false, error: error.message };
    } finally {
        if (session) {
            await session.close();
        }
    }
}
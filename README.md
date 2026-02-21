# 🚀 DataLens AI  
## ⚡ Turn Any Database Into Instant Intelligence

> Stop guessing your schema. Start understanding it.

DataLens AI automatically documents, visualizes, and explains your database in seconds.  
Paste a connection string → get a searchable data dictionary, interactive ER diagrams, graph visualizations, and AI-powered schema exploration.

Built for hackathons. Designed for real-world scale.

---

# 🏆 Problem

Modern teams waste hours trying to:

- Understand legacy schemas
- Manually document databases
- Trace foreign key relationships
- Visualize graph connections
- Onboard new developers
- Explore unfamiliar data structures

Documentation is outdated. Knowledge is tribal.  
Databases become black boxes.

---

# 💡 Solution

DataLens AI connects to your database and instantly generates:

- 📚 A complete Data Dictionary
- 📊 Interactive ER Diagrams
- 🕸 Graph Visualizations (Neo4j)
- 🔍 Deep Table Inspection
- 🤖 AI-Powered Schema Chat
- 📈 Schema Analytics Dashboard

No manual work. No schema guessing. No documentation writing.

---

# 🔥 Live Demo Flow

1. Sign in with Google
2. Paste your database URI
3. Click Connect
4. Watch your schema transform into:
   - Interactive documentation
   - Relationship maps
   - AI query interface

Time to insight: **< 30 seconds**

---

# ✨ Key Features

## 🧠 Intelligent Schema Scanner

Automatically extracts:

- Tables / Node Labels
- Columns / Properties
- Data Types
- Primary & Foreign Keys
- Unique Constraints
- Row Counts
- Sample Data
- Indexes

---

## 📊 Interactive ER Diagrams

Visualize relational structure instantly:

```
customers (1) ──────── (∞) orders
```

- Clickable nodes
- Relationship filtering
- Schema grouping
- Drill-down inspection

---

## 🕸 Graph Database Support (Neo4j)

Explore graph relationships visually:

```
(:Person {name:"Keanu Reeves"})
        ── ACTED_IN ──>
(:Movie {title:"The Matrix"})
```

See:

- Node labels
- Edge types
- Property structures
- Relationship distributions

---

## 🤖 AI Schema Chat (Prototype)

Ask:

- “Which tables reference customers?”
- “Explain the orders schema.”
- “What relationships does Movie have?”
- “How many foreign keys exist?”

The AI understands metadata — no raw sensitive data exposure.

---

## 📈 Dashboard Metrics

- Total tables
- Total relationships
- Schema complexity
- Index count
- Graph density
- Structural insights

---

# 🧪 Example Schema

## Relational Example

```sql
CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(customer_id),
  total NUMERIC
);
```

## Graph Example

```cypher
CREATE (:Person {id:'1', name:'Keanu Reeves'});
CREATE (:Movie {id:'100', title:'The Matrix'});

MATCH (p:Person {name:'Keanu Reeves'}), (m:Movie {title:'The Matrix'})
CREATE (p)-[:ACTED_IN {role:'Neo'}]->(m);
```

---

# 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 13 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Node.js API Routes |
| ORM | Drizzle ORM |
| Auth | NextAuth + Google OAuth |
| Databases | PostgreSQL, MySQL, Snowflake, Neo4j |
| Language | TypeScript |
| Deployment | Vercel-ready |

---

# ⚙️ Installation

```bash
git clone https://github.com/your-org/data-lens-ai.git
cd data-lens-ai
npm install
```

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NEXTAUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
```

Run:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🔐 Security

- Server-side metadata scanning
- No raw data permanently stored
- OAuth-based authentication
- Secure session handling
- AI operates on schema, not rows

---

# 🎯 Why This Wins Hackathons

✅ Solves real developer pain  
✅ Works with both relational + graph databases  
✅ AI integration  
✅ Clean UI + visualization  
✅ Practical enterprise use-case  
✅ Scalable SaaS potential  

---

# 🚀 Future Scope

- Column-level lineage tracking  
- Schema versioning  
- Documentation export (PDF / Markdown)  
- Slack / Notion integration  
- Advanced graph analytics  
- Data quality scoring  

---

# 👥 Team Vision

We believe data should explain itself.

DataLens AI transforms any database into a living, visual, searchable knowledge system.

---

# 📜 License

MIT License

---

# ⚡ DataLens AI

Understand your database in seconds — not weeks.
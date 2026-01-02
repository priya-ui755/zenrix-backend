Hugging Face knowledge integration (RAG)

Environment variables
- HF_API_KEY (optional): Your Hugging Face API key (do NOT check this into source control). If not set, the server will use a TF‑IDF offline fallback for retrieval and simple extractive answers.
- HF_EMBEDDING_MODEL (optional): Model to use for embeddings. Default: `sentence-transformers/all-MiniLM-L6-v2`.
- HF_RAG_MODEL (optional): Model to use for short-answer generation. Default: `google/flan-t5-large`.

How it works
- `scripts/reindex_knowledge.js` will index local doc files and page content from the DB and build a TF‑IDF index in `data/knowledge_tfidf.json`.
- If `HF_API_KEY` is present, embeddings will be requested from Hugging Face and stored in the vector store to enable semantic retrieval and LLM synthesis.
- The server exposes:
  - `POST /api/knowledge/query` to query the index and (optionally) synthesize an answer using LLM when available.
  - `POST /api/knowledge/reindex` (admin-protected) to reindex content.

Security note
- Never paste secrets (API keys) into chat or commit them to the repository. If you shared a key publicly, rotate/revoke it immediately and create a new one.

Usage
- Reindex locally: optionally set `HF_API_KEY` and run `npm run reindex:knowledge`. If `HF_API_KEY` is unset, the reindex will build a TF‑IDF index only (fast and free).
- Query: the frontend chatbot will call `/api/knowledge/query` when a user asks a question not covered by canned intents.

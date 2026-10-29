import uuid
from typing import Any, List
import numpy as np
from services.supabase_client import supabase


class VectorStore:
    def __init__(self, table_name: str = "resume_embeddings"):
        self.table_name = table_name
        print(f"Supabase pgvector VectorStore initialized on table: '{self.table_name}'")

    def add_documents(self, documents: List[Any], embeddings: np.ndarray, user_id: str):
        if len(documents) != len(embeddings):
            raise ValueError("Number of documents must match number of embeddings")

        if len(documents) == 0:
            print("No documents to add.")
            return

        print(f"Uploading {len(documents)} document chunks to Supabase pgvector for user: {user_id}")

        records = []
        for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
            doc_id = f"doc_{uuid.uuid4().hex[:8]}_{i}"
            metadata = {
                "user_id": user_id,
                "doc_index": i,
                "content_length": len(doc.page_content)
            }
            
            # Ensure embedding is converted from numpy array to Python list of floats
            emb_list = embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)

            records.append({
                "id": doc_id,
                "user_id": user_id,
                "content": doc.page_content,
                "metadata": metadata,
                "embedding": emb_list
            })

        try:
            # 1. Delete previous embeddings for this user so re-uploads don't duplicate
            supabase.table(self.table_name).delete().eq("user_id", user_id).execute()

            # 2. Insert new persistent embeddings into Supabase PostgreSQL
            supabase.table(self.table_name).insert(records).execute()
            print(f"Successfully saved {len(records)} chunks to Supabase pgvector for user: {user_id}")
        except Exception as e:
            print(f"Error adding documents to Supabase pgvector: {e}")
            raise

    def search(self, query_embedding: np.ndarray, user_id: str, top_k: int = 3) -> List[dict]:
        """
        Executes a vector cosine similarity search in Supabase via match_resume_embeddings RPC.
        """
        try:
            emb_list = query_embedding.tolist() if hasattr(query_embedding, "tolist") else list(query_embedding)

            response = supabase.rpc(
                "match_resume_embeddings",
                {
                    "query_embedding": emb_list,
                    "filter_user_id": user_id,
                    "match_count": top_k
                }
            ).execute()

            retrieved = []
            if response.data:
                for row in response.data:
                    retrieved.append({
                        "content": row["content"],
                        "metadata": row.get("metadata") or {}
                    })
            print(f"Supabase pgvector retrieved {len(retrieved)} relevant chunks for user: {user_id}")
            return retrieved
        except Exception as e:
            print(f"Error searching Supabase pgvector: {e}")
            return []


vector_store = VectorStore()


def get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = VectorStore()
    return vector_store



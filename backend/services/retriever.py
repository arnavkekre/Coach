from services.embedding_manager import get_embedding_manager
from services.vector_store import vector_store


class RAGRetriever:
    def __init__(self):
        self.vector_store = vector_store
        self.embedding_manager = get_embedding_manager()

    def retrieve(
        self,
        query: str,
        user_id: str,
        top_k: int = 3
    ):
        query_embedding = self.embedding_manager.generate_embeddings(
            [query]
        )[0]

        return self.vector_store.search(
            query_embedding=query_embedding,
            user_id=user_id,
            top_k=top_k
        )


retriever = RAGRetriever()


        return retrieved_docs
    

retriever = RAGRetriever()

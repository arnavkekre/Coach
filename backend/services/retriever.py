from services.embedding_manager import embedding_manager
from services.vector_store import vector_store

class RAGRetriever:

    def __init__(self):
        self.vector_store = vector_store
        self.embedding_manager = embedding_manager


    def retrieve(
        self,
        query: str,
        user_id: str,
        top_k: int = 3
    ):

        query_embedding = self.embedding_manager.generate_embeddings(
            [query]
        )[0]


        results = self.vector_store.collection.query(

            query_embeddings=[
                query_embedding.tolist()
            ],

            n_results=top_k,

            where={
                "user_id": user_id
            }
        )


        retrieved_docs = []


        for i, document in enumerate(results["documents"][0]):

            retrieved_docs.append({

                "content": document,

                "metadata": results["metadatas"][0][i]

            })


        return retrieved_docs
    

retriever = RAGRetriever()
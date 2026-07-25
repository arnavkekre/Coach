import os
import uuid
import chromadb
import numpy as np

from typing import Any, List

class VectorStore:

    def __init__(self, collection_name: str = "resume_embeddings", persist_directory: str= "../data/vector_store"):

        self.collection_name=collection_name

        self.persist_directory= persist_directory

        self.client= None

        self.collection= None

        self._initialize_store()

    def _initialize_store(self):

        try:

            os.makedirs(self.persist_directory, exist_ok=True)

            self.client=chromadb.PersistentClient(path=self.persist_directory)

            self.collection= self.client.get_or_create_collection(

                name=self.collection_name,

                metadata= {'description':'PDF document embeddings for RAG'}

            )

            print(f"Vector stored initialized. Collection: {self.collection_name}")

            print(f"Existing document int colelction: {self.collection.count()}")

        except Exception as e:

            print(f"Error initializing vector store: {e}")

            raise

    def add_documents(self, documents : List[Any],embeddings:np.ndarray, user_id: str):

        if len(documents)!=len(embeddings):

            raise ValueError("Number of documents must match number embeddings")

        print(f"Adding {len(documents)} documents to vector store")

        ids=[]

        metadatas=[]

        documents_text=[]

        embeddings_list=[]

        for i, (doc,embedding) in enumerate(zip(documents, embeddings)):

            doc_id= f"doc_{uuid.uuid4().hex[:8]}_{i}"

            ids.append(doc_id)
            
            metadata = {
    "user_id": user_id,
    "doc_index": i,
    "content_length": len(doc.page_content)
}
            metadata["user_id"]= user_id
            metadata['doc_index']=i

            metadata['content_length']=len(doc.page_content)

            metadatas.append(metadata)

            documents_text.append(doc.page_content)

            embeddings_list.append(embedding.tolist())

        self.collection.delete(
            where={
                "user_id": {
                    "$eq": user_id
                }
            }
        )

        try:

            self.collection.add(

                ids=ids,

                embeddings= embeddings_list,

                metadatas=metadatas,

                documents=documents_text

            )

            print(f"successful added {len(documents)} documents to vector store")

            print(f"Total documents in collection: {self.collection.count()}")

        except Exception as e:

            print(f"Error adding documents to vector store {e}")

            raise

vector_store=VectorStore()


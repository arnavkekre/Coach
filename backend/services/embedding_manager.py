import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

class EmbeddingManager:

    def __init__(self, model_name: str ="all-MiniLM-L6-v2"):

        self.model_name= model_name

        self.model= None

        self._load_model()

    def _load_model(self):

        try:

            print(f"Loading Embedding Model: {self.model_name}")

            self.model=SentenceTransformer(self.model_name)

            print(f"Model Loaded Successfully. Embedding dimension: {self.model.get_embedding_dimension()}")

        except Exception as e:

            print(f"Error loading model {self.model_name}: {e}")

            raise

    def generate_embeddings(self, texts: List[str])->np.ndarray:

        if not self.model: 

            raise ValueError("Model not laoded")

        print(f"Generating Embeddings for {len(texts)} texts...")

        embeddings= self.model.encode(texts, show_progress_bar=False)

        print(f"Generate Embeddings with shape: {embeddings.shape}")

        return embeddings

embedding_manager = EmbeddingManager()
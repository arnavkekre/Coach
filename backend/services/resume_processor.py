import tempfile
import os

from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from services.embedding_manager import get_embedding_manager
from services.vector_store import vector_store
def split_documents(documents, chunk_size=1000, chunk_overlap=200):

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

    return text_splitter.split_documents(documents)

def process_resume(resume_bytes: bytes, user_id: str):

    with tempfile.NamedTemporaryFile(
        suffix=".pdf",
        delete=False
    ) as temp_file:

        temp_file.write(resume_bytes)
        temp_path = temp_file.name


    try:

        loader = PyMuPDFLoader(temp_path)

        documents = loader.load()


        chunks = split_documents(documents)


        texts = [
            doc.page_content
            for doc in chunks
        ]


        embeddings = embedding_manager.generate_embeddings(
            texts
        )


        vector_store.add_documents(
            chunks,
            embeddings,
            user_id
        )


        return {
            "message": "Resume processed successfully",
            "chunks": len(chunks)
        }


    finally:

        os.remove(temp_path)

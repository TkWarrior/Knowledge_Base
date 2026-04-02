import logging
from typing import TypedDict
from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from tavily import TavilyClient

from app.config import settings
from app.retrieval import get_retriever
from app.prompts import (
    GRADER_PROMPT,
    GENERATION_PROMPT,
    HALLUCINATION_PROMPT,
    ANSWER_RELEVANCE_PROMPT,
)

logger = logging.getLogger(__name__)

class GraphState(TypedDict):
    question: str
    documents: list[Document]
    generation: str
    web_search_used: bool
    hallucination_check: str
    top_k: int


def get_llm() -> ChatGroq:
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name=settings.llm_model,
        temperature=settings.llm_temperature,
    )


def retrieve(state: GraphState) -> GraphState:
    logger.info("--- RETRIEVE ---")
    question = state["question"]
    top_k = state.get("top_k", settings.top_k)

    retriever = get_retriever(top_k=top_k)
    documents = retriever.invoke(question)
    logger.info(f"Retrieved {len(documents)} documents")

    return {"documents": documents, "question": question}


def grade_documents(state: GraphState) -> GraphState:
    logger.info("--- GRADE DOCUMENTS ---")
    question = state["question"]
    documents = state["documents"]

    llm = get_llm()
    grading_chain = GRADER_PROMPT | llm

    relevant_docs = []
    for doc in documents:
        result = grading_chain.invoke({
            "document": doc.page_content,
            "question": question,
        })
        grade = result.content.strip().lower()
        if grade == "yes":
            logger.info(f"Relevant: {doc.metadata.get('source', 'unknown')}")
            relevant_docs.append(doc)
        else:
            logger.info(f"Irrelevant: {doc.metadata.get('source', 'unknown')}")

    return {"documents": relevant_docs, "question": question}


def decide_to_generate(state: GraphState) -> str:
    if state["documents"]:
        logger.info("--- DECISION: GENERATE (relevant docs found) ---")
        return "generate"
    else:
        logger.info("--- DECISION: WEB SEARCH (no relevant docs) ---")
        return "web_search"


def web_search(state: GraphState) -> GraphState:
    logger.info("--- WEB SEARCH ---")
    question = state["question"]

    try:
        client = TavilyClient(api_key=settings.tavily_api_key)
        results = client.search(query=question, max_results=3)

        web_docs = []
        for result in results.get("results", []):
            doc = Document(
                page_content=result.get("content", ""),
                metadata={"source": result.get("url", "web_search")},
            )
            web_docs.append(doc)

        logger.info(f"Web search returned {len(web_docs)} results")
        return {
            "documents": web_docs,
            "question": question,
            "web_search_used": True,
        }

    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return {
            "documents": [],
            "question": question,
            "web_search_used": True,
        }


def generate(state: GraphState) -> GraphState:
    logger.info("--- GENERATE ---")
    question = state["question"]
    documents = state["documents"]

    context = "\n\n".join(doc.page_content for doc in documents)

    llm = get_llm()
    generation_chain = GENERATION_PROMPT | llm

    result = generation_chain.invoke({
        "question": question,
        "context": context,
    })

    return {
        "generation": result.content,
        "question": question,
        "documents": documents,
    }


def check_hallucination(state: GraphState) -> GraphState:
    logger.info("--- HALLUCINATION CHECK ---")
    documents = state["documents"]
    generation = state["generation"]
    question = state["question"]

    llm = get_llm()

    # Hallucination check
    doc_texts = "\n\n".join(doc.page_content for doc in documents)
    hallucination_chain = HALLUCINATION_PROMPT | llm
    hallucination_result = hallucination_chain.invoke({
        "documents": doc_texts,
        "generation": generation,
    })
    grounded = hallucination_result.content.strip().lower()

    # Answer relevance check
    relevance_chain = ANSWER_RELEVANCE_PROMPT | llm
    relevance_result = relevance_chain.invoke({
        "question": question,
        "generation": generation,
    })
    relevant = relevance_result.content.strip().lower()

    if grounded == "yes" and relevant == "yes":
        check_result = "passed"
    elif grounded != "yes":
        check_result = "failed_grounding"
    else:
        check_result = "failed_relevance"

    logger.info(f"Hallucination check: grounded={grounded}, relevant={relevant} → {check_result}")

    return {
        "hallucination_check": check_result,
        "generation": generation,
        "documents": documents,
        "question": question,
    }


def build_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("retrieve", retrieve)
    workflow.add_node("grade_documents", grade_documents)
    workflow.add_node("generate", generate)
    workflow.add_node("web_search", web_search)
    workflow.add_node("check_hallucination", check_hallucination)

    workflow.set_entry_point("retrieve")

    workflow.add_edge("retrieve", "grade_documents")

    workflow.add_conditional_edges(
        "grade_documents",
        decide_to_generate,
        {
            "generate": "generate",
            "web_search": "web_search",
        },
    )

    workflow.add_edge("web_search", "generate")
    workflow.add_edge("generate", "check_hallucination")
    workflow.add_edge("check_hallucination", END)

    return workflow.compile()


rag_graph = build_graph()

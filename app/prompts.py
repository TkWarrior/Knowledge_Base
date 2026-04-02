from langchain_core.prompts import ChatPromptTemplate

# Document Relevance Grading
GRADER_SYSTEM = """You are a grader assessing the relevance of a retrieved document to a user question.
If the document contains keywords or semantic meaning related to the question, grade it as relevant.
Give a binary score 'yes' or 'no' to indicate whether the document is relevant to the question."""

GRADER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", GRADER_SYSTEM),
    ("human", "Retrieved document:\n\n{document}\n\nUser question: {question}\n\nIs this document relevant to the question? Answer only 'yes' or 'no'."),
])

# RAG Generation
GENERATION_SYSTEM = """You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question.
If you don't know the answer, say that you don't know.
Keep the answer concise but comprehensive. Use three sentences maximum unless the question requires a detailed explanation."""

GENERATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", GENERATION_SYSTEM),
    ("human", "Question: {question}\n\nContext:\n{context}\n\nAnswer:"),
])

# Hallucination Check
HALLUCINATION_SYSTEM = """You are a grader assessing whether an LLM generation is grounded in a set of retrieved facts.
Give a binary score 'yes' or 'no'.
'yes' means the answer is grounded in the facts and does not contain fabricated information."""

HALLUCINATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", HALLUCINATION_SYSTEM),
    ("human", "Facts:\n{documents}\n\nLLM Generation:\n{generation}\n\nIs the generation grounded in the facts? Answer only 'yes' or 'no'."),
])

# Answer Relevance Check
ANSWER_RELEVANCE_SYSTEM = """You are a grader assessing whether an answer addresses the user question.
Give a binary score 'yes' or 'no'.
'yes' means the answer is relevant to and addresses the question."""

ANSWER_RELEVANCE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", ANSWER_RELEVANCE_SYSTEM),
    ("human", "User question: {question}\n\nLLM Answer:\n{generation}\n\nDoes the answer address the question? Answer only 'yes' or 'no'."),
])

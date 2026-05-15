from typing import Dict, List, TypedDict
from langgraph.graph import StateGraph, END
from app.classifier.intent_model import IntentModelWrapper
from app.retriever.vector_db import VectorDBManager
from app.agents.generator import ResponseGenerator

class AgentState(TypedDict):
    query: str
    intents: List[str]
    contexts: Dict[str, str]
    responses: Dict[str, str]
    final_response: str

class MultiDomainAgentFlow:
    def __init__(self):
        self.classifier = IntentModelWrapper()
        self.vector_db = VectorDBManager()
        self.generator = ResponseGenerator()
        
        workflow = StateGraph(AgentState)
        
        workflow.add_node("classify_intent", self.classify_intent)
        workflow.add_node("retrieve_and_generate", self.retrieve_and_generate)
        workflow.add_node("merge_responses", self.merge_responses)
        
        workflow.set_entry_point("classify_intent")
        
        workflow.add_edge("classify_intent", "retrieve_and_generate")
        workflow.add_edge("retrieve_and_generate", "merge_responses")
        workflow.add_edge("merge_responses", END)
        
        self.app = workflow.compile()
        
    def classify_intent(self, state: AgentState):
        query = state["query"]
        intent = self.classifier.predict(query)
        
        if intent == "multi":
            intents = ["fitness", "career", "ayurveda"]
        else:
            intents = [intent]
            
        return {"intents": intents}
        
    def retrieve_and_generate(self, state: AgentState):
        query = state["query"]
        intents = state["intents"]
        
        contexts = {}
        responses = {}
        
        for intent in intents:
            docs = self.vector_db.retrieve(query, domain=intent)
            context = "\n".join([doc.page_content for doc in docs])
            contexts[intent] = context
            
            if context.strip():
                response = self.generator.generate(domain=intent, query=query, context=context)
            else:
                response = f"I couldn't find relevant information for {intent} in my knowledge base."
            responses[intent] = response
            
        return {"contexts": contexts, "responses": responses}
        
    def merge_responses(self, state: AgentState):
        responses = state["responses"]
        intents = state["intents"]
        
        if len(intents) == 1:
            final_response = responses[intents[0]]
        else:
            final_response = "Here is the guidance for your queries:\n\n"
            if "fitness" in responses:
                final_response += "🏋️ **Fitness Plan:**\n" + responses["fitness"] + "\n\n"
            if "career" in responses:
                final_response += "💼 **Career Guidance:**\n" + responses["career"] + "\n\n"
            if "ayurveda" in responses:
                final_response += "🌿 **Ayurveda Guidance:**\n" + responses["ayurveda"]
                
        return {"final_response": final_response}

    def run(self, query: str):
        state = {
            "query": query,
            "intents": [],
            "contexts": {},
            "responses": {},
            "final_response": ""
        }
        result = self.app.invoke(state)
        return result["final_response"]

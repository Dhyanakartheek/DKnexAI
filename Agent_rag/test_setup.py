from app.retriever.vector_db import VectorDBManager
from langchain_core.documents import Document
from app.classifier.intent_model import IntentModelWrapper
import os

def setup_mock_data():
    # 1. Setup Vector DB
    db_manager = VectorDBManager()
    
    docs = [
        Document(
            page_content="For building muscle, consume at least 1.6g of protein per kg of body weight. Focus on compound lifts.",
            metadata={"domain": "fitness", "subdomain": "workout", "source": "muscle_guide.pdf"}
        ),
        Document(
            page_content="A balanced diet includes complex carbs, healthy fats, and lean proteins.",
            metadata={"domain": "fitness", "subdomain": "diet", "source": "nutrition_101.txt"}
        ),
        Document(
            page_content="When writing a resume, use the STAR method (Situation, Task, Action, Result) to describe your impact.",
            metadata={"domain": "career", "subdomain": "resume", "source": "career_tips.pdf"}
        ),
        Document(
            page_content="For software engineering interviews, focus on data structures, system design, and behavioral questions.",
            metadata={"domain": "career", "subdomain": "jobs", "source": "tech_interview.txt"}
        )
    ]
    
    # Generate Ayurveda chunks
    ayurveda_docs = []
    # 10 Diet chunks
    for i in range(1, 11):
        ayurveda_docs.append(Document(page_content=f"Ayurveda diet tip {i}: Favor warm, cooked foods. Avoid ice cold drinks to maintain digestive fire (Agni).", metadata={"domain": "ayurveda", "subdomain": "diet", "source": "ayurveda_diet.txt"}))
    # 10 Remedy chunks
    for i in range(1, 11):
        ayurveda_docs.append(Document(page_content=f"Ayurveda natural remedy {i}: Ginger tea and turmeric milk are excellent for digestion, inflammation, and mild colds.", metadata={"domain": "ayurveda", "subdomain": "remedy", "source": "ayurveda_remedies.txt"}))
    # 5 Lifestyle chunks
    for i in range(1, 6):
        ayurveda_docs.append(Document(page_content=f"Ayurveda lifestyle tip {i}: Wake up before sunrise, scrape your tongue, and practice oil pulling daily.", metadata={"domain": "ayurveda", "subdomain": "lifestyle", "source": "ayurveda_lifestyle.txt"}))
    # 5 Body type chunks
    for i in range(1, 6):
        ayurveda_docs.append(Document(page_content=f"Ayurveda body type {i}: Pitta dosha is characterized by heat and intensity. Vata is dry and light. Kapha is heavy and stable.", metadata={"domain": "ayurveda", "subdomain": "body_type", "source": "ayurveda_doshas.txt"}))
    
    docs.extend(ayurveda_docs)
    
    os.makedirs("app/data", exist_ok=True)
    db_manager.add_documents(docs)
    print("Vector DB initialized with sample data.")
    
    # 2. Setup Intent Classifier (Mock training)
    classifier = IntentModelWrapper()
    train_data = [
        ("How to build muscle?", 0),  # fitness
        ("What should I eat?", 0),
        ("Help me with my resume", 1), # career
        ("How to pass an interview?", 1),
        ("I have digestion problems", 2), # ayurveda
        ("Suggest natural remedy for cold", 2), # ayurveda
        ("What is my dosha or body type?", 2), # ayurveda
        ("I want job and health advice", 3), # multi
        ("Give me a workout plan, resume advice, and natural remedies", 3)
    ]
    print("Training intent classifier...")
    classifier.train(train_data, epochs=50)
    print("Intent classifier trained.")

if __name__ == "__main__":
    setup_mock_data()

import torch
import torch.nn as nn
import os
from sentence_transformers import SentenceTransformer

class IntentClassifier(nn.Module):
    def __init__(self, input_dim=384, hidden_dim=128, num_classes=4):
        super(IntentClassifier, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, num_classes)
        
    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        return out

class IntentModelWrapper:
    def __init__(self):
        # We use a small sentence transformer to get embeddings
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.model = IntentClassifier(input_dim=384, hidden_dim=128, num_classes=4)
        self.classes = ['fitness', 'career', 'ayurveda', 'multi']
        
        # Load pre-trained weights if available, else initialize randomly
        self.model_path = os.path.join(os.path.dirname(__file__), 'intent_model.pth')
        if os.path.exists(self.model_path):
            self.model.load_state_dict(torch.load(self.model_path, map_location=torch.device('cpu')))
        self.model.eval()

    def predict(self, text: str) -> str:
        with torch.no_grad():
            emb = self.embedding_model.encode(text)
            emb_tensor = torch.tensor(emb).unsqueeze(0)
            logits = self.model(emb_tensor)
            pred_idx = torch.argmax(logits, dim=1).item()
            return self.classes[pred_idx]
            
    def train(self, data, epochs=10, lr=0.001):
        # data: list of (text, label_idx)
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        
        self.model.train()
        for epoch in range(epochs):
            total_loss = 0
            for text, label in data:
                optimizer.zero_grad()
                emb = self.embedding_model.encode(text)
                emb_tensor = torch.tensor(emb).unsqueeze(0)
                target = torch.tensor([label])
                
                output = self.model(emb_tensor)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1}, Loss: {total_loss/len(data)}")
            
        torch.save(self.model.state_dict(), self.model_path)

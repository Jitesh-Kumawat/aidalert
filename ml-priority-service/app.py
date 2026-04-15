from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import json
import os

LOCAL_MODEL_DIR = os.path.join(os.path.dirname(__file__), "disaster_model")
MODEL_SOURCE = os.environ.get("MODEL_SOURCE", LOCAL_MODEL_DIR)

tokenizer = AutoTokenizer.from_pretrained(MODEL_SOURCE)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_SOURCE)

label_map_path = os.path.join(MODEL_SOURCE, "label_map.json")

if os.path.exists(label_map_path):
    with open(label_map_path, "r") as f:
        label_map = json.load(f)
    id2label = {int(k): v for k, v in label_map["id2label"].items()}
else:
    # fallback from model config
    id2label = {int(k): v for k, v in model.config.id2label.items()}

app = FastAPI()

class PriorityRequest(BaseModel):
    message: str
    req_type: str = ""
    people_count: int = 1
    vulnerable_present: str = "no"
    waiting_minutes: int = 0

def build_input_text(data: PriorityRequest):
    return (
        f"Type: {data.req_type}. "
        f"People: {data.people_count}. "
        f"Vulnerable: {data.vulnerable_present}. "
        f"WaitingMinutes: {data.waiting_minutes}. "
        f"Message: {data.message}"
    )

@app.get("/")
def health():
    return {"status": "ok", "model_source": MODEL_SOURCE}

@app.post("/predict")
def predict_priority(data: PriorityRequest):
    text = build_input_text(data)

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    inputs.pop("token_type_ids", None)

    model.eval()
    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=-1)[0]
    pred_id = torch.argmax(probs).item()
    confidence = probs[pred_id].item()

    return {
        "priority": id2label[pred_id],
        "confidence": confidence,
        "probs": {
            id2label[i]: float(probs[i]) for i in range(len(probs))
        }
    }

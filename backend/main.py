from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
import numpy as np
import joblib
from typing import List, Dict

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model artifacts
tree_model = None  # legacy fallback
pipeline = None
feature_names = []

class PredictRequest(BaseModel):
    region: str
    total_food_expenditure: float
    education_expenditure: float
    house_floor_area: float
    number_of_appliances: int
    # Add more fields as needed

class PredictResponse(BaseModel):
    predicted_income: float
    important_features: List[str]

@app.on_event("startup")
def load_model():
    global pipeline, tree_model, feature_names
    try:
        pipeline = joblib.load("model/pipeline.joblib")
        feature_names = joblib.load("model/feature_names.joblib")
        print("Loaded pipeline for inference.")
    except Exception:
        print("Pipeline not found, falling back to legacy artifacts if available.")
        try:
            tree_model = joblib.load("model/random_forest_model.joblib")
            feature_names = joblib.load("model/feature_names.joblib")
            print("Loaded legacy model.")
        except Exception as e:
            raise RuntimeError("No valid model artifacts found. Please run train_model.py.")

@app.post("/predict", response_model=PredictResponse)
def predict_income(data: PredictRequest):
    try:
        # Convert input to DataFrame and map UI keys to pipeline feature names
        payload = data.dict()
        # Accept both snake_case (from UI) and human-readable names (from tests/tools)
        key_map = {
            "region": "Region",
            "total_food_expenditure": "Total Food Expenditure",
            "education_expenditure": "Education Expenditure",
            "house_floor_area": "house_floor_area",
            "number_of_appliances": "number_of_appliances",
            # Also allow already-correct keys to pass through
            "Region": "Region",
            "Total Food Expenditure": "Total Food Expenditure",
            "Education Expenditure": "Education Expenditure",
        }
        model_input: Dict[str, object] = {}
        for k, v in payload.items():
            mapped = key_map.get(k, k)
            model_input[mapped] = v
        # Ensure required columns exist (friendly error)
        required_cols = [
            "Region",
            "Total Food Expenditure",
            "Education Expenditure",
            "house_floor_area",
            "number_of_appliances",
        ]
        missing = {c for c in required_cols if c not in model_input}
        if missing:
            raise ValueError(f"columns are missing: {missing}")

        input_df = pd.DataFrame([model_input])
        print("Received input_df:")
        print(input_df)
        if pipeline is not None:
            pred = pipeline.predict(input_df)[0]
            # Extract top features if available
            try:
                importances = pipeline.named_steps["model"].feature_importances_
                pre = pipeline.named_steps["preprocessor"]
                try:
                    feat_names = list(pre.get_feature_names_out())
                except Exception:
                    feat_names = feature_names or []
                order = np.argsort(importances)[::-1][:3]
                top_features = [feat_names[i] if i < len(feat_names) else f"f{i}" for i in order]
            except Exception:
                top_features = ["Region", "Total Food Expenditure", "Education Expenditure"]
        else:
            # Legacy path
            X = input_df[feature_names]
            pred = tree_model.predict(X)[0]
            importances = tree_model.feature_importances_
            top_features = [feature_names[i] for i in np.argsort(importances)[::-1][:3]]
        return PredictResponse(predicted_income=float(pred), important_features=top_features)
    except Exception as e:
        print("Exception in /predict:", e)
        raise HTTPException(status_code=400, detail=str(e))

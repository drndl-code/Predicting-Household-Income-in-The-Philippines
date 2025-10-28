from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
import numpy as np
import joblib
from typing import List, Dict, Optional
import json
import os

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

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "predicting-household-income-backend",
        "version": "1.0"
    }

@app.get("/model-info")
def model_info():
    """Return training summary and a tiny dataset preview for UI/docs."""
    path = os.path.join("model", "summary.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="summary.json not found. Retrain the model to generate it.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

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
    feature_importances: Optional[List[float]] = None  # relative importances aligned with important_features
    prediction_std: Optional[float] = None  # per-instance std across trees (if available)

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
            # Prediction
            pred = float(pipeline.predict(input_df)[0])

            # Compute global feature importances mapped to names
            top_k = 5
            top_features = ["Region", "Total Food Expenditure", "Education Expenditure"]
            top_scores: Optional[List[float]] = None
            try:
                model = pipeline.named_steps["model"]
                pre = pipeline.named_steps["preprocessor"]
                importances = getattr(model, "feature_importances_", None)
                feat_names = []
                try:
                    feat_names = list(pre.get_feature_names_out())
                except Exception:
                    feat_names = feature_names or []
                # Humanize feature names for display
                def _titleize_spaces(s: str) -> str:
                    s2 = s.replace("_", " ")
                    return " ".join(w.capitalize() if w else w for w in s2.split(" "))

                def _humanize(name: str) -> str:
                    if name.startswith("num__"):
                        base = name.replace("num__", "")
                        return _titleize_spaces(base)
                    if name.startswith("cat__"):
                        raw = name.replace("cat__", "")
                        # Convert OneHot "Region_Label" -> "Region: Label"
                        if "_" in raw:
                            head, tail = raw.split("_", 1)
                            return f"{_titleize_spaces(head)}: {tail}"
                        return _titleize_spaces(raw)
                    return _titleize_spaces(name)

                if importances is not None and len(importances) == len(feat_names) and len(importances) > 0:
                    # Per-instance masking for OneHot categories: keep only active category columns
                    try:
                        Xtr = pre.transform(input_df)
                    except Exception:
                        Xtr = None

                    adj_imps = np.array(importances, dtype=float).copy()
                    if Xtr is not None:
                        for i, fname in enumerate(feat_names):
                            if fname.startswith("cat__") and float(Xtr[0, i]) == 0.0:
                                adj_imps[i] = 0.0

                    # Build list of (index, importance) with strictly positive importance after masking
                    pairs = [(i, adj_imps[i]) for i in range(len(adj_imps)) if adj_imps[i] > 0]
                    # Sort descending by importance
                    pairs.sort(key=lambda t: t[1], reverse=True)
                    # Take up to top_k
                    sel = pairs[:top_k]
                    if sel:
                        idxs = [i for i, _ in sel]
                        names_ordered_raw = [feat_names[i] for i in idxs]
                        names_ordered = [_humanize(n) for n in names_ordered_raw]
                        max_imp = float(max([v for _, v in sel]))
                        scores = [float(adj_imps[i]) / max_imp if max_imp > 0 else 0.0 for i in idxs]
                        top_features = names_ordered
                        top_scores = scores
            except Exception:
                pass

            # Estimate prediction uncertainty via per-tree std if available (RandomForest)
            pred_std = None
            try:
                # Transform once
                Xtr = pipeline.named_steps["preprocessor"].transform(input_df)
                trees = getattr(model, "estimators_", None)
                if trees:
                    tree_preds = np.array([est.predict(Xtr)[0] for est in trees])
                    pred_std = float(np.std(tree_preds))
            except Exception:
                pred_std = None
        else:
            # Legacy path
            X = input_df[feature_names]
            pred = float(tree_model.predict(X)[0])
            importances = getattr(tree_model, "feature_importances_", None)
            top_scores = None
            if importances is not None and len(importances) == len(feature_names):
                idx = np.argsort(importances)[::-1][:top_k]
                top_features = [feature_names[i] for i in idx]
                max_imp = float(importances[idx[0]]) if importances[idx[0]] != 0 else 1.0
                top_scores = [float(importances[i]) / max_imp for i in idx]
            else:
                top_features = ["Region", "Total Food Expenditure", "Education Expenditure"]
            pred_std = None

        return PredictResponse(
            predicted_income=pred,
            important_features=top_features,
            feature_importances=top_scores,
            prediction_std=pred_std,
        )
    except Exception as e:
        print("Exception in /predict:", e)
        raise HTTPException(status_code=400, detail=str(e))

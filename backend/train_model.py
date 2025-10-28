import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import joblib
import os
import json
from datetime import datetime

# Load dataset
DATA_PATH = "Family-Income-and-Expenditure.csv"
df = pd.read_csv(DATA_PATH)

# Minimal cleaning on key columns used by UI
ui_cat = ["Region"]
ui_num = [
    "Total Food Expenditure",
    "Education Expenditure",
    "house_floor_area",  # may not exist; we'll handle below
    "number_of_appliances"  # may not exist; we'll handle below
]

# Try to derive house_floor_area and number_of_appliances if not present
if "house_floor_area" not in df.columns:
    # attempt from any similar column names
    for c in df.columns:
        if "floor" in c.lower() and "area" in c.lower():
            df = df.rename(columns={c: "house_floor_area"})
            break
if "number_of_appliances" not in df.columns:
    appliance_cols = [c for c in df.columns if "appliance" in c.lower()]
    if appliance_cols:
        df["number_of_appliances"] = df[appliance_cols].sum(axis=1)

# Keep only training target and UI-driven inputs (drop missing ui fields later by fillna)
target_col = "Total Household Income"
keep_cols = [c for c in ui_cat + ui_num if c in df.columns] + [target_col]
df_small = df[keep_cols].copy()

# Handle missing values
for col in df_small.columns:
    if df_small[col].dtype == 'O':
        df_small[col] = df_small[col].fillna("")
    else:
        df_small[col] = df_small[col].fillna(df_small[col].median())

# Define features actually used
features_cat = [c for c in ui_cat if c in df_small.columns]
features_num = [c for c in ui_num if c in df_small.columns]

X = df_small[features_cat + features_num]
y = df_small[target_col]

# Preprocessor and model pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), features_cat),
        ("num", StandardScaler(), features_num),
    ],
    remainder="drop",
)

model = RandomForestRegressor(n_estimators=40, max_depth=10, random_state=42, n_jobs=-1)
pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("model", model)
])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

pipeline.fit(X_train, y_train)

# Evaluate
def print_metrics(pipe, X, y, name):
    pred = pipe.predict(X)
    print(f"{name} R2: {r2_score(y, pred):.3f}")
    print(f"{name} RMSE: {np.sqrt(mean_squared_error(y, pred)):.2f}")
    print(f"{name} MAE: {mean_absolute_error(y, pred):.2f}")

print_metrics(pipeline, X_test, y_test, "RF Pipeline")

# Save pipeline and feature names after preprocessing
os.makedirs("model", exist_ok=True)
joblib.dump(pipeline, "model/pipeline.joblib")

# Derive feature names from ColumnTransformer
feat_names = []
ohe = pipeline.named_steps["preprocessor"].named_transformers_["cat"]
ohe_names = []
if features_cat:
    try:
        ohe_names = list(ohe.get_feature_names_out(features_cat))
    except Exception:
        # fallback if older sklearn
        ohe_names = []
num_names = features_num
feat_names = ohe_names + num_names
joblib.dump(feat_names, "model/feature_names.joblib")

# Save training summary for UI/Docs
summary = {
    "dataset_name": "Family Income and Expenditure Survey (FIES)",
    "dataset_source": "https://www.kaggle.com/datasets/grosvenpaul/family-income-and-expenditure",
    "target": target_col,
    "rows": int(len(df_small)),
    "features_used": features_cat + features_num,
    "model": {
        "type": "RandomForestRegressor",
        "params": {
            "n_estimators": pipeline.named_steps["model"].n_estimators,
            "max_depth": pipeline.named_steps["model"].max_depth,
            "random_state": pipeline.named_steps["model"].random_state,
        },
    },
    "metrics": {
        "r2": float(r2_score(y_test, pipeline.predict(X_test))),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pipeline.predict(X_test)))),
        "mae": float(mean_absolute_error(y_test, pipeline.predict(X_test))),
        "test_size": 0.3,
    },
    "training_time_utc": datetime.utcnow().isoformat() + "Z",
}

# Top feature importances (global)
try:
    importances = pipeline.named_steps["model"].feature_importances_
    top_k = min(5, len(importances))
    order = np.argsort(importances)[::-1][:top_k]
    # Try get names from preprocessor
    try:
        all_names = list(pipeline.named_steps["preprocessor"].get_feature_names_out())
    except Exception:
        all_names = feat_names
    summary["top_feature_importances"] = [
        {"name": (all_names[i] if i < len(all_names) else f"f{i}"), "importance": float(importances[i])}
        for i in order
    ]
except Exception:
    summary["top_feature_importances"] = []

# Small preview of dataset (only used columns + target)
preview_cols = [c for c in (features_cat + features_num + [target_col]) if c in df_small.columns]
summary["preview_columns"] = preview_cols
summary["preview_rows"] = df_small[preview_cols].head(5).to_dict(orient="records")

with open("model/summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

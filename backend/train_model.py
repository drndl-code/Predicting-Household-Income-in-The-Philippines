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
from sklearn.model_selection import cross_val_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# Load dataset
DATA_PATH = "Family-Income-and-Expenditure.csv"
df = pd.read_csv(DATA_PATH)

import warnings
# Minimal cleaning on key columns used by UI
ui_cat = ["Region"]
ui_num = [
    "Total Food Expenditure",
    "Education Expenditure",
    "house_floor_area",  # may not exist; we'll handle below
    "number_of_appliances"  # may not exist; we'll handle below
]

# Additional engineered features
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    # Per capita features
    if "Total Number of Family members" in df.columns:
        df["food_exp_per_capita"] = df["Total Food Expenditure"] / df["Total Number of Family members"].replace(0, np.nan)
        df["edu_exp_per_capita"] = df["Education Expenditure"] / df["Total Number of Family members"].replace(0, np.nan)
    # Appliances per sqm
    if "number_of_appliances" in df.columns and "house_floor_area" in df.columns:
        df["appliances_per_sqm"] = df["number_of_appliances"] / df["house_floor_area"].replace(0, np.nan)
    # Interaction: food x education
    if "Total Food Expenditure" in df.columns and "Education Expenditure" in df.columns:
        df["food_edu_interaction"] = df["Total Food Expenditure"] * df["Education Expenditure"]
    # Ratio: food/education
    if "Total Food Expenditure" in df.columns and "Education Expenditure" in df.columns:
        df["food_to_edu_ratio"] = df["Total Food Expenditure"] / df["Education Expenditure"].replace(0, np.nan)


# Try to derive house_floor_area and number_of_appliances if not present
if "house_floor_area" not in df.columns:
    # attempt from any similar column names
    for c in df.columns:
        if "floor" in c.lower() and "area" in c.lower():
            df = df.rename(columns={c: "house_floor_area"})
            break
if "number_of_appliances" not in df.columns:
    # Heuristic 1: explicit curated list of household appliances/electronics
    candidate_cols = [
        "Number of Television",
        "Number of CD/VCD/DVD",
        "Number of Component/Stereo set",
        "Number of Refrigerator/Freezer",
        "Number of Washing Machine",
        "Number of Airconditioner",
        "Number of Landline/wireless telephones",
        "Number of Cellular phone",
        "Number of Personal Computer",
        "Number of Stove with Oven/Gas Range",
    ]
    appliance_cols = [c for c in candidate_cols if c in df.columns]
    # Fallback Heuristic 2: any column starting with "Number of " except bedrooms and vehicles
    if not appliance_cols:
        exclude_keywords = ["bedroom", "car", "jeep", "van", "motorcycle", "tricycle", "banca"]
        for c in df.columns:
            cl = c.lower()
            if cl.startswith("number of ") and not any(ek in cl for ek in exclude_keywords):
                appliance_cols.append(c)
    if appliance_cols:
        df[appliance_cols] = df[appliance_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
        df["number_of_appliances"] = df[appliance_cols].sum(axis=1)


# Add engineered features to keep_cols if present
engineered_features = [
    "food_exp_per_capita",
    "edu_exp_per_capita",
    "appliances_per_sqm",
    "food_edu_interaction",
    "food_to_edu_ratio"
]
target_col = "Total Household Income"
keep_cols = [c for c in ui_cat + ui_num if c in df.columns] + [f for f in engineered_features if f in df.columns] + [target_col]
df_small = df[keep_cols].copy()

# Handle missing values
for col in df_small.columns:
    if df_small[col].dtype == 'O':
        df_small[col] = df_small[col].fillna("")
    else:
        df_small[col] = df_small[col].fillna(df_small[col].median())


# Define features actually used
features_cat = [c for c in ui_cat if c in df_small.columns]
features_num = [c for c in ui_num + [f for f in engineered_features if f in df_small.columns] if c in df_small.columns]

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


# Benchmarking models
models = {
    "RandomForest": RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    ),
    "XGBoost": XGBRegressor(n_estimators=60, max_depth=8, random_state=42, n_jobs=-1, verbosity=0),
    "LightGBM": LGBMRegressor(n_estimators=60, max_depth=8, random_state=42, n_jobs=-1)
}

results = {}
for name, model in models.items():
    pipe = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    r2 = r2_score(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    mae = mean_absolute_error(y_test, pred)
    # Cross-validation (5-fold)
    cv_r2 = cross_val_score(pipe, X, y, cv=5, scoring="r2").mean()
    results[name] = {
        "r2": r2,
        "rmse": rmse,
        "mae": mae,
        "cv_r2": cv_r2
    }
    print(f"{name} R2: {r2:.3f} | RMSE: {rmse:.2f} | MAE: {mae:.2f} | CV R2: {cv_r2:.3f}")

# Use the best model (highest CV R2)
best_model_name = max(results, key=lambda k: results[k]["cv_r2"])
print(f"\nBest model: {best_model_name}")
best_model = models[best_model_name]
pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("model", best_model)
])
pipeline.fit(X_train, y_train)

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
    "target_units": "PHP/year",
    "rows": int(len(df_small)),
    "features_used": features_cat + features_num,
    "feature_units": {
        "Region": "category",
        "Total Food Expenditure": "PHP/year",
        "Education Expenditure": "PHP/year",
        "house_floor_area": "sqm",
        "number_of_appliances": "count"
    },
    "model": {
        "type": "RandomForestRegressor",
        "params": {
            "n_estimators": getattr(pipeline.named_steps["model"], "n_estimators", None),
            "max_depth": getattr(pipeline.named_steps["model"], "max_depth", None),
            "min_samples_leaf": getattr(pipeline.named_steps["model"], "min_samples_leaf", None),
            "random_state": getattr(pipeline.named_steps["model"], "random_state", None),
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

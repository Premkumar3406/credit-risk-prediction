from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import joblib
import os
import pandas as pd
import numpy as np

# Explainability
import shap
import lime.lime_tabular

# Plot handling
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import base64
from io import BytesIO

FEATURE_NAME_MAP = {
    "person_age": "Age",
    "person_income": "Annual Income",
    "person_emp_length": "Employment Length",
    "loan_amnt": "Loan Amount",
    "loan_int_rate": "Interest Rate",
    "loan_intent": "Loan Purpose",
    "person_home_ownership": "Home Ownership",
    "cb_person_default_on_file": "Previous Default History",
    "cb_person_cred_hist_length": "Credit History Length",
    "debt_to_income": "Debt-to-Income Ratio",
    "emi_burden": "Monthly EMI Burden",
    "credit_exposure": "Overall Credit Exposure",
    "income_stability": "Income Stability",
}


# ---------------------------
# APP INITIALIZATION
# ---------------------------
app = FastAPI(title="Credit Risk Prediction API")

# ---------------------------
# CORS (IMPORTANT)
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# LOAD MODEL FILES
# ---------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "models", "xgb_credit_risk_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "models", "feature_columns.pkl")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
feature_columns = joblib.load(FEATURES_PATH)

print("[SUCCESS] Model, scaler, features loaded")

# ---------------------------
# INPUT SCHEMA
# ---------------------------
class InputData(BaseModel):
    person_age: int
    person_income: float
    person_emp_length: float
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_cred_hist_length: int
    person_home_ownership: str
    loan_intent: str
    cb_person_default_on_file: str

# ---------------------------
# HELPER FUNCTIONS
# ---------------------------
def encode_categorical(data: dict) -> dict:
    data["person_home_ownership"] = {
        "RENT": 0,
        "OWN": 1,
        "MORTGAGE": 2,
        "OTHER": 3,
    }.get(data["person_home_ownership"], 0)

    data["loan_intent"] = {
        "PERSONAL": 0,
        "EDUCATION": 1,
        "MEDICAL": 2,
        "VENTURE": 3,
        "HOMEIMPROVEMENT": 4,
        "DEBTCONSOLIDATION": 5,
    }.get(data["loan_intent"], 0)

    data["cb_person_default_on_file"] = {
        "N": 0,
        "Y": 1,
    }.get(data["cb_person_default_on_file"], 0)

    return data


def engineer_features(data: dict) -> dict:
    data["debt_to_income"] = data["loan_amnt"] / (data["person_income"] + 1)
    data["emi_burden"] = (
        data["loan_amnt"] * data["loan_int_rate"]
    ) / (12 * (data["person_income"] + 1))
    data["income_stability"] = data["person_emp_length"] / (data["person_age"] + 1)
    data["credit_exposure"] = data["loan_amnt"] * data["debt_to_income"]
    return data


def assign_risk_level(prob: float) -> str:
    if prob < 0.30:
        return "Low Risk"
    elif prob < 0.60:
        return "Medium Risk"
    else:
        return "High Risk"


def fig_to_base64(fig):
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    img = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return img

# ---------------------------
# ROUTES
# ---------------------------
@app.get("/health")
def health():
    return {"status": "API running"}

# ---------------------------
# PREDICT
# ---------------------------
@app.post("/predict")
def predict(data: InputData):
    input_dict = engineer_features(encode_categorical(data.dict()))

    df = pd.DataFrame([input_dict])[feature_columns]
    X_scaled = scaler.transform(df)

    prob = float(model.predict_proba(X_scaled)[0][1])

    return {
    "probability": prob,
    "risk_level": assign_risk_level(prob)
    }


# ---------------------------
# SHAP
# ---------------------------
@app.post("/shap")
def shap_explain(data: InputData):
    input_dict = engineer_features(encode_categorical(data.dict()))
    df = pd.DataFrame([input_dict])[feature_columns]
    X_scaled = scaler.transform(df)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_scaled)

    fig = plt.figure(figsize=(8, 4))
    # Rename feature labels for UI
    readable_features = [
    FEATURE_NAME_MAP.get(f, f.replace("_", " ").title())
    for f in feature_columns
    ]

    shap.bar_plot(
        shap_values[0],
        feature_names=readable_features,
        show=False
    )       

    return {"shap_plot": fig_to_base64(fig)}

# ---------------------------
# LIME EXPLANATIONS
# ---------------------------
@app.post("/lime")
def lime_explain(data: InputData):

    input_dict = engineer_features(encode_categorical(data.dict()))
    df = pd.DataFrame([input_dict])[feature_columns]

    X_scaled = scaler.transform(df)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_scaled)

    shap_row = shap_values[0]

    explanations = []

    feature_map = {
        "person_income": "Annual income",
        "loan_amnt": "Loan amount",
        "loan_int_rate": "Interest rate",
        "person_emp_length": "Employment history",
        "debt_to_income": "Debt-to-income ratio",
        "credit_exposure": "Overall credit exposure",
        "person_home_ownership": "Home ownership",
        "cb_person_cred_hist_length": "Credit history length"
    }

    for i, value in enumerate(shap_row):

        feature = feature_columns[i]

        if feature not in feature_map:
            continue

        name = feature_map[feature]

        if value > 0:
            explanations.append(f"{name} increases the credit risk")
        else:
            explanations.append(f"{name} reduces the credit risk")

    return {"lime_explanation": explanations[:5]}


# ---------------------------
# COUNTERFACTUAL
# ---------------------------
@app.post("/counterfactual")
def counterfactual(data: InputData):
    suggestions = []

    # Debt-to-income logic
    dti = data.loan_amnt / (data.person_income + 1)

    if dti > 0.4:
        target_loan = round(data.person_income * 0.4)
        suggestions.append(
            f"Reduce loan amount from {int(data.loan_amnt)} to approximately {target_loan}"
        )

    if data.person_income < 50000:
        target_income = 50000
        suggestions.append(
            f"Increase annual income from {int(data.person_income)} to at least {target_income}"
        )

    if data.loan_int_rate > 0.15:
        suggestions.append(
            f"Reduce interest rate from {data.loan_int_rate:.2f} to below 0.15"
        )

    if not suggestions:
        suggestions.append("Profile is already low risk. No major changes required.")

    return {"suggestions": suggestions}


# ---------------------------
# SERVE FRONTEND STATIC FILES
# ---------------------------
FRONTEND_BUILD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "build"))
if os.path.exists(FRONTEND_BUILD_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="frontend")


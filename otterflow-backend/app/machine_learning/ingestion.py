import pandas as pd
from sqlalchemy.orm import Session
import numpy as np

# 1:3 ratio for input tokens vs. output tokens
INPUT_OUTPUT_RATIO = 3.0

def ingest_csv_to_db(csv_file: str, db: Session):
    """
    Reads the CSV file, parses the relevant columns,
    computes combined cost with a 1:3 ratio,
    and stores raw values in the DB.

    For now, we skip normalization here. We'll handle
    any scaling or weighting in pipeline.py when we rank/filter.
    """

    df = pd.read_csv(csv_file)
    print(f"Columns in CSV: {list(df.columns)}")

    # Check for 'MODEL' column
    if "MODEL" not in df.columns:
        raise ValueError("The CSV file must contain a 'MODEL' column.")

    # Clean up 'MODEL' column
    df["MODEL"] = df["MODEL"].astype(str).str.strip()  # Strip whitespace
    df["MODEL"].replace(["nan", "", None, np.nan], "Unknown", inplace=True)

    # Remove rows with 'Unknown' model names
    initial_rows = len(df)
    df = df[df["MODEL"] != "Unknown"]
    print(f"Removed {initial_rows - len(df)} rows with missing or invalid 'MODEL' names.")

    # Ensure unique model names
    df = df.drop_duplicates(subset=["MODEL"])

    # Parse cost columns
    if "INPUT PRICE" not in df.columns:
        df["INPUT PRICE"] = 0.0
    if "OUTPUT PRICE" not in df.columns:
        df["OUTPUT PRICE"] = 0.0

    df["InputCost"] = (
        df["INPUT PRICE"]
        .replace('[\\$,]', '', regex=True)
        .astype(float)
        .fillna(0.0)
    )
    df["OutputCost"] = (
        df["OUTPUT PRICE"]
        .replace('[\\$,]', '', regex=True)
        .astype(float)
        .fillna(0.0)
    )

    # Compute combined cost with ratio 1:3
    df["CombinedCost"] = df["InputCost"] + (INPUT_OUTPUT_RATIO * df["OutputCost"])

    # Performance measure
    if "NORMALIZED AVERAGE QUALITY" not in df.columns:
        df["NORMALIZED AVERAGE QUALITY"] = 0.0
    df["Performance"] = pd.to_numeric(df["NORMALIZED AVERAGE QUALITY"], errors="coerce").fillna(0.0)

    # Domain-specific columns (Math, Coding, General Knowledge)
    df["Math"] = pd.to_numeric(df.get("Math", 0.0), errors="coerce").fillna(0.0)
    df["Coding"] = pd.to_numeric(df.get("Coding", 0.0), errors="coerce").fillna(0.0)
    df["GeneralKnowledge"] = pd.to_numeric(df.get("General Knowledge", 0.0), errors="coerce").fillna(0.0)

    # Latency
    if "LATENCY MEDIAN" not in df.columns:
        df["LATENCY MEDIAN"] = 9999.0  # Default latency
    df["Latency"] = pd.to_numeric(df["LATENCY MEDIAN"], errors="coerce").fillna(9999.0)

    # Insert/update in DB
    for idx, row in df.iterrows():
        model_name = row["MODEL"]
        from app.db.models import ModelMetadata

        # Check if the model already exists
        record = db.query(ModelMetadata).filter_by(model_name=model_name).first()
        if not record:
            record = ModelMetadata(model_name=model_name)
            db.add(record)

        record.license = str(row.get("LICENSE", "Unknown"))
        record.window = str(row.get("WINDOW", "Unknown"))
        # Not strictly used here, but if your DB has an io_ratio field:
        record.io_ratio = float(row.get("IO_RATIO", 3.0))

        # Store combined cost in record.cost
        record.cost = float(row["CombinedCost"])
        record.performance = float(row["Performance"])
        record.latency = float(row["Latency"])

        # Domain-specific scores
        record.math_score = float(row["Math"])
        record.coding_score = float(row["Coding"])
        record.gk_score = float(row["GeneralKnowledge"])

        # Store raw input/output costs
        record.input_cost_raw = float(row["InputCost"])
        record.output_cost_raw = float(row["OutputCost"])

        # Optional: store top_p, temperature if they exist
        record.top_p = float(row.get("top_p", 1.0))
        record.temperature = float(row.get("temperature", 0.7))

    db.commit()
    print("CSV ingestion completed.")

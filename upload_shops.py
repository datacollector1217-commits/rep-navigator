
import pandas as pd
import requests
import json
import numpy as np

# Configuration
SUPABASE_URL = "https://ceyreqvxiwhznpshxtvu.supabase.co"
SUPABASE_KEY = "sb_publishable_SRElA9VrbVWJOJhNoEU6zQ_AnIpp3yD"
EXCEL_FILE = "List of Business Partners.xlsx"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def upload_data():
    print("Reading Excel file...")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    # Select and rename columns
    # Excel columns: 'BP Code', 'District', 'BP Name', 'Town'
    # DB columns: 'bp_code', 'district', 'name', 'town'
    
    # Check if columns exist
    required_columns = ['BP Code', 'District', 'BP Name', 'Town']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        print(f"Error: Missing columns in Excel: {missing_columns}")
        return

    # Filter and rename
    df_upload = df[required_columns].copy()
    df_upload.rename(columns={
        'BP Code': 'bp_code',
        'District': 'district',
        'BP Name': 'name',
        'Town': 'town'
    }, inplace=True)

    # Clean data
    # Convert NaN to None (null in JSON)
    df_upload = df_upload.replace({np.nan: None})
    
    # Convert all columns to string to avoid JSON serialisation issues with numpy types, except None
    for col in df_upload.columns:
        df_upload[col] = df_upload[col].apply(lambda x: str(x) if x is not None else None)

    records = df_upload.to_dict(orient='records')
    total_records = len(records)
    print(f"Found {total_records} records to upload.")

    # Upload in batches
    BATCH_SIZE = 100
    success_count = 0
    error_count = 0

    url = f"{SUPABASE_URL}/rest/v1/shops"

    for i in range(0, total_records, BATCH_SIZE):
        batch = records[i:i+BATCH_SIZE]
        try:
            response = requests.post(url, headers=HEADERS, json=batch)
            if response.status_code == 201:
                success_count += len(batch)
                print(f"Batch {i//BATCH_SIZE + 1}: Successfully uploaded {len(batch)} records.")
            else:
                error_count += len(batch)
                print(f"Batch {i//BATCH_SIZE + 1}: Failed with status {response.status_code}: {response.text}")
        except Exception as e:
            error_count += len(batch)
            print(f"Batch {i//BATCH_SIZE + 1}: Exception: {e}")

    print(f"\nUpload complete.")
    print(f"Successfully uploaded: {success_count}")
    print(f"Failed: {error_count}")

if __name__ == "__main__":
    upload_data()

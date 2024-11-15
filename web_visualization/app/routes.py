from flask import Blueprint, render_template, jsonify, request, current_app
import xarray as xr
import pandas as pd
import numpy as np
import os
from datetime import datetime

main_bp = Blueprint('main', __name__)

# Cache for the dataset
_dataset = None

def get_dataset():
    global _dataset
    if _dataset is None:
        data_path = os.path.join(current_app.root_path, '..', 'data', 'combined_data.nc')
        _dataset = xr.open_dataset(data_path)
    return _dataset

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/api/data')
def get_data():
    try:
        # Log request parameters
        print("Received request parameters:")
        print(f"Query args: {dict(request.args)}")

        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        min_lat = float(request.args.get('min_lat'))
        max_lat = float(request.args.get('max_lat'))
        min_lon = float(request.args.get('min_lon'))
        max_lon = float(request.args.get('max_lon'))

        # Get cached dataset
        ds = get_dataset()
        print(f"Dataset dimensions: {ds.dims}")
        print(f"Dataset variables: {list(ds.variables)}")

        # Convert dates to numpy datetime64
        start_np = np.datetime64(start_date)
        end_np = np.datetime64(end_date)
        print(f"Processing data from {start_np} to {end_np}")

        # Select temperature data
        temp_data = ds['TMP'].sel(
            time=slice(start_np, end_np),
            lat=slice(min_lat, max_lat),
            lon=slice(min_lon, max_lon),
            height=2.0  # Select surface temperature
        )
        print(f"Selected data shape: {temp_data.shape}")

        # Convert to DataFrame
        df = temp_data.to_dataframe().reset_index()
        print(f"Initial dataframe size: {len(df)}")
        
        # Drop rows with NaN values
        df = df.dropna(subset=['TMP'])
        print(f"Dataframe size after dropping NaN: {len(df)}")

        # Convert temperature from Kelvin to Celsius
        df['TMP'] = (df['TMP'] - 273.15).round(2)
        
        # Round coordinates
        df['lat'] = df['lat'].round(3)
        df['lon'] = df['lon'].round(3)

        # Optimize data points if too many
        if len(df) > 10000:
            print(f"Reducing data points from {len(df)} to 10000")
            df = df.sample(n=10000, random_state=42)

        # Convert to records efficiently
        result = df.apply(
            lambda row: {
                'lat': float(row['lat']),
                'lon': float(row['lon']),
                'value': float(row['TMP']),
                'time': row['time'].isoformat()
            },
            axis=1
        ).tolist()

        print(f"Returning {len(result)} data points")
        return jsonify(result)

    except Exception as e:
        print(f"Error processing data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

# Optional: Add endpoint to clear dataset cache
@main_bp.route('/api/clear-cache', methods=['POST'])
def clear_cache():
    global _dataset
    if _dataset is not None:
        _dataset.close()
        _dataset = None
    return jsonify({"message": "Cache cleared"})
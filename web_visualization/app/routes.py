from flask import Blueprint, render_template, jsonify, request, current_app, send_file
import xarray as xr
import rasterio 
from rasterio.transform import from_bounds
import pandas as pd
import numpy as np
import tempfile
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


#downloading adjustment

@main_bp.route('/api/download-geotiff', methods=['POST'])
def download_geotiff():
    try:
        # Log request parameters
        print("Received download request parameters:")
        data = request.get_json()
        print(f"Request data: {data}")

        # Get cached dataset
        ds = get_dataset()

        # Select data within the specified bounds and date range
        bounds = data['bounds']
        dates = data['dates']
        filename = data['filename']

        # Convert dates to numpy datetime64
        start_np = np.datetime64(dates['startDate'])
        end_np = np.datetime64(dates['endDate'])

        # Select temperature data
        selected_data = ds['TMP'].sel(
            time=slice(start_np, end_np),
            lat=slice(float(bounds['swLat']), float(bounds['neLat'])),
            lon=slice(float(bounds['swLon']), float(bounds['neLon'])),
            height=2.0
        )

        # Calculate mean temperature over the time period
        mean_temp = selected_data.mean(dim='time')
        
        # Convert from Kelvin to Celsius
        mean_temp = mean_temp - 273.15

        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.tiff', delete=False) as tmp:
            temp_path = tmp.name

            # Create transform for GeoTIFF
            transform = from_bounds(
                float(bounds['swLon']), float(bounds['swLat']),
                float(bounds['neLon']), float(bounds['neLat']),
                mean_temp.shape[1], mean_temp.shape[0]
            )

            # Write to GeoTIFF
            with rasterio.open(
                temp_path,
                'w',
                driver='GTiff',
                height=mean_temp.shape[0],
                width=mean_temp.shape[1],
                count=1,
                dtype=mean_temp.dtype,
                crs='+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
                transform=transform,
                nodata=-9999
            ) as dst:
                dst.write(mean_temp.values.astype('float32'), 1)
                dst.update_tags(
                    TIFFTAG_DATETIME=dates['startDate'],
                    TIFFTAG_DOCUMENTNAME=filename,
                    TEMPERATURE_UNIT='Celsius',
                    COLORINTERP_1='GrayIndex'
                )

                dst.update_tags(
                    STATISTICS_MINIMUM=float(mean_temp.min()),
                    STATISTICS_MAXIMUM=float(mean_temp.max()),
                    STATISTICS_MEAN=float(mean_temp.mean()),
                    STATISTICS_STDDEV=float(mean_temp.std())
                )

        # Send file to client
        response = send_file(
            temp_path,
            as_attachment=True,
            download_name=f"{filename}.tiff",
            mimetype='image/tiff'
        )
        
        # Clean up temp file after sending
        @response.call_on_close
        def cleanup():
            if os.path.exists(temp_path):
                os.remove(temp_path)

        return response

    except Exception as e:
        print(f"Error creating GeoTIFF: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500
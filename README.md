# Interactive Weather Data Visualization

## Overview
This project provides an interactive web-based visualization of NLDAS (North American Land Data Assimilation System) weather data. It features a Flask backend for data processing and a JavaScript frontend for interactive visualization.

## Project Structure
```
interactive_map/
├── data/
│   ├── NLDAS_FORA0125_H.A*.nc4  # Raw NLDAS data files
│   └── combined_data.nc          # Processed combined dataset
├── load_xarray_data.ipynb        # Data processing notebook
├── web_visualization/
│   ├── app/
│   │   ├── static/
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   └── images/
│   │   ├── templates/
│   │   │   └── index.html
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── visualizations/
│   ├── requirements.txt
│   └── run.py
```

## Data Source
- Dataset: NLDAS_FORA0125_H_2.0 (North American Land Data Assimilation System)
- Source: NASA GES DISC (https://disc.gsfc.nasa.gov/datasets/NLDAS_FORA0125_H_2.0/summary)
- Time Period: 2024-05-31 to 2024-06-07 (6 days)
- Variables: Temperature and other meteorological parameters
- Resolution: 0.125-degree (~12.5km)

## Data Processing
The project includes a Jupyter notebook (`load_xarray_data.ipynb`) that:
- Loads individual NLDAS NetCDF4 files
- Processes temperature data
- Combines multiple days of data into a single dataset
- Exports the combined dataset for web visualization

### Data Processing Steps:
1. Load individual daily NLDAS files
2. Extract temperature data at different height levels
3. Combine data across temporal dimension
4. Save processed dataset as combined_data.nc

## Web Application Features
- Interactive map interface with Leaflet.js
- Multiple visualization modes:
  - Point markers
  - Heatmap
  - Grid cells
  - Contour lines
- Date range selection
- Data download capabilities (GeoTIFF)
- Statistical analysis and PDF reports

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Naziblue/Interactive_map.git
cd Interactive_map
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Prepare the data:
- Place NLDAS NetCDF4 files in the `data/` directory
- Run the Jupyter notebook to process data:
```bash
jupyter notebook load_xarray_data.ipynb
```

5. Start the web application:
```bash
cd web_visualization
python run.py
```

6. Access the application at `http://localhost:5000`

## System Requirements
- Python 3.8+
- Modern web browser with JavaScript enabled
- Sufficient storage for NetCDF4 data files
- Minimum 4GB RAM recommended

## Usage
1. Process data using the Jupyter notebook first
2. Launch the web application
3. Use the interface to:
   - Select date ranges
   - Choose visualization types
   - Download processed data
   - Generate analysis reports

## Acknowledgments
- NLDAS data provided by NASA GES DISC
- Built with Flask and Leaflet.js
# Weather Data Visualization Web Application

## Overview
This web application provides interactive visualization of weather data using a combination of Flask backend and JavaScript frontend. It allows users to explore temperature data across different geographical locations and time periods, with features including various visualization modes, data downloading capabilities, and PDF report generation.

## Features
- Interactive map interface using Leaflet.js
- Multiple visualization modes:
  - Circle markers
  - Heatmap
  - Grid cells
  - Contour lines
- Data filtering by date range and geographical area
- Download capabilities:
  - GeoTIFF export of selected regions
  - PDF report generation with statistical analysis
- Responsive sidebar for controls
- Real-time temperature display
- Custom area selection using rectangular bounds

## Project Structure
```
web_visualization/
├── app/
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── templates/
│   │   └── index.html
│   ├── __init__.py
│   └── routes.py
├── data/
│   └── combined_data.nc
├── visualizations/
├── requirements.txt
└── run.py
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [project-directory]
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Ensure you have the required data files:
- Place your NetCDF data file (`combined_data.nc`) in the `data/` directory
- Update the data path in the application if necessary

## Usage

1. Start the application:
```bash
python run.py
```

2. Open a web browser and navigate to `http://localhost:5000`

3. Use the interface to:
- Select date ranges
- Choose visualization types
- Download data in various formats
- Generate PDF reports

## Technical Details

### Backend
- Flask web framework
- xarray for NetCDF data handling
- rasterio for GeoTIFF processing
- ReportLab for PDF generation

### Frontend
- Leaflet.js for map visualization
- D3.js for data manipulation
- Custom JavaScript for interactive features

### Data Requirements
- NetCDF format weather data
- Temperature data should include:
  - Latitude and longitude coordinates
  - Time dimension
  - Temperature values in Kelvin

## Performance Considerations
- Data is cached after initial load
- Visualization optimizations for large datasets
- Batch processing for heavy computations

## Browser Support
- Modern web browsers (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- WebGL support recommended for better performance

## Known Limitations
- Maximum dataset size depends on available server memory
- GeoTIFF exports limited to rectangular regions
- PDF reports include basic statistics only

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.


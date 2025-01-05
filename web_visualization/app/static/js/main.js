document.addEventListener('DOMContentLoaded', function() {
    // Add status display div
    const statusDiv = document.createElement('div');
    statusDiv.style.position = 'absolute';
    statusDiv.style.top = '10px';
    statusDiv.style.left = '50%';
    statusDiv.style.transform = 'translateX(-50%)';
    statusDiv.style.backgroundColor = 'white';
    statusDiv.style.padding = '10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.zIndex = 1000;
    statusDiv.style.border = '1px solid #ccc';
    document.body.appendChild(statusDiv);

    function updateStatus(message) {
        statusDiv.textContent = message;
    }

    // Initialize the Leaflet map centered on the United States
    updateStatus('Initializing map...');
    const map = L.map('map').setView([39.5, -98.35], 4);
    
    // Add a tile layer to the map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

// Add event listeners for date inputs
document.getElementById('startDate').addEventListener('change', validateDates);
document.getElementById('endDate').addEventListener('change', validateDates);
document.getElementById('updateMap').addEventListener('click', fetchData);

function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (new Date(endDate) < new Date(startDate)) {
        document.getElementById('endDate').value = startDate;
    }

    return true;
}

    // Add visualization type control
    const visualizationControl = L.control({position: 'topright'});
    visualizationControl.onAdd = function() {
        const div = L.DomUtil.create('div');
        div.style.backgroundColor = 'white';
        div.style.padding = '5px';
        div.style.borderRadius = '5px';
        div.style.border = '1px solid #ccc';
        div.innerHTML = `
            <select id="vizType" style="padding: 3px;">
                <option value="circles">Circles</option>
                <option value="heatmap">Heatmap</option>
                <option value="grid">Grid Cells</option>
                <option value="contour">Contour Lines</option>
            </select>
        `;
        return div;
    };
    visualizationControl.addTo(map);

    // Function to get color based on temperature
    function getColor(tempC) {
        if (tempC <= 0) return '#313695';      // Deep blue (very cold)
        if (tempC <= 5) return '#4575B4';      // Blue (cold)
        if (tempC <= 10) return '#74ADD1';     // Light blue (cool)
        if (tempC <= 15) return '#ABD9E9';     // Very light blue (mild cool)
        if (tempC <= 20) return '#E0F3F8';     // Pale blue (mild)
        if (tempC <= 25) return '#FFFFBF';     // Pale yellow (mild warm)
        if (tempC <= 30) return '#FEE090';     // Light orange (warm)
        if (tempC <= 35) return '#FDAE61';     // Orange (very warm)
        if (tempC <= 40) return '#F46D43';     // Dark orange (hot)
        return '#A50026';                      // Deep red (very hot)
    }

    // Add a legend
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
        div.style.lineHeight = '1.5';
        
        // Temperature ranges for the legend
        const ranges = [
            {min: -Infinity, max: 0, label: '< 0'},
            {min: 0, max: 5, label: '0-5'},
            {min: 5, max: 10, label: '5-10'},
            {min: 10, max: 15, label: '10-15'},
            {min: 15, max: 20, label: '15-20'},
            {min: 20, max: 25, label: '20-25'},
            {min: 25, max: 30, label: '25-30'},
            {min: 30, max: 35, label: '30-35'},
            {min: 35, max: 40, label: '35-40'},
            {min: 40, max: Infinity, label: '> 40'}
        ];
    
        // Create legend title
        div.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">Temperature (°C)</div>';
    
        // Add legend items
        ranges.forEach(range => {
            const color = getColor(range.min);
            div.innerHTML += 
                '<div style="display: flex; align-items: center; margin: 2px 0;">' +
                    '<i style="background: ' + color + '; ' +
                        'width: 20px; ' +
                        'height: 20px; ' +
                        'display: inline-block; ' +
                        'margin-right: 5px; ' +
                        'opacity: 0.7; ' +
                        'border: 1px solid #999;"></i> ' +
                    '<span style="font-size: 12px;">' + range.label + '°C</span>' +
                '</div>';
        });
    
        return div;
    };
    legend.addTo(map);

    // Initialize layers
    let temperatureLayer = L.layerGroup().addTo(map);
    let heatmapLayer = null;

    // Function to create different visualizations
    function createVisualization(data, type) {
        temperatureLayer.clearLayers();
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }
    
        // Remove any existing mousemove handler
        map.off('mousemove');
    
        const GRID_SIZE = 0.5; // Global grid size for all visualizations
    
        switch(type) {
            case 'circles':
                data.forEach(point => {
                    const color = getColor(point.value);
                    L.circleMarker([point.lat, point.lon], {
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.4,
                        radius: 5,
                        weight: 0.5
                    }).bindPopup(
                        `Temperature: ${point.value.toFixed(1)}°C<br>` +
                        `Location: ${point.lat.toFixed(2)}°N, ${point.lon.toFixed(2)}°W<br>` +
                        `Time: ${new Date(point.time).toLocaleString()}`
                    ).addTo(temperatureLayer);
                });
                break;
    
                case 'heatmap':
                    // Clear existing layers
                    temperatureLayer.clearLayers();
                    
                    // Performance optimization settings
                    const CELL_SIZE = 0.18; // Increased cell size for better performance
                    const SEARCH_RADIUS = 0.9; // Reduced search radius
                    const MAX_POINTS = 5000; // Limit number of points processed
                    const BATCH_SIZE = 100; // Number of cells to process in each batch
                    
                    const bounds = map.getBounds();
                    
                    // Sample data points if there are too many
                    let processedData = data;
                    if (data.length > MAX_POINTS) {
                        const skipFactor = Math.ceil(data.length / MAX_POINTS);
                        processedData = data.filter((_, index) => index % skipFactor === 0);
                    }
                
                    // Create spatial index for faster point lookup
                    const pointIndex = new Map();
                    processedData.forEach(point => {
                        const key = Math.floor(point.lat/SEARCH_RADIUS) + ',' + 
                                   Math.floor(point.lon/SEARCH_RADIUS);
                        if (!pointIndex.has(key)) {
                            pointIndex.set(key, []);
                        }
                        pointIndex.get(key).push(point);
                    });
                
                    // Calculate grid dimensions
                    const latRange = {
                        min: bounds.getSouth(),
                        max: bounds.getNorth()
                    };
                    const lonRange = {
                        min: bounds.getWest(),
                        max: bounds.getEast()
                    };
                
                    // Create grid cells in batches
                    let cells = [];
                    
                    function getNearbyPoints(lat, lon) {
                        const key = Math.floor(lat/SEARCH_RADIUS) + ',' + 
                                   Math.floor(lon/SEARCH_RADIUS);
                        const nearby = [];
                        
                        // Check surrounding cells in index
                        for (let dlat = -1; dlat <= 1; dlat++) {
                            for (let dlon = -1; dlon <= 1; dlon++) {
                                const searchKey = (Math.floor(lat/SEARCH_RADIUS) + dlat) + ',' + 
                                                (Math.floor(lon/SEARCH_RADIUS) + dlon);
                                const points = pointIndex.get(searchKey) || [];
                                nearby.push(...points.filter(p => 
                                    Math.sqrt(Math.pow(p.lat - lat, 2) + 
                                            Math.pow(p.lon - lon, 2)) <= SEARCH_RADIUS
                                ));
                            }
                        }
                        return nearby;
                    }
                
                    function processBatch(startLat) {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                const batchCells = [];
                                const endLat = Math.min(startLat + CELL_SIZE * BATCH_SIZE, latRange.max);
                                
                                for (let lat = startLat; lat <= endLat; lat += CELL_SIZE) {
                                    for (let lon = lonRange.min; lon <= lonRange.max; lon += CELL_SIZE) {
                                        if (!bounds.contains([lat, lon])) continue;
                                        
                                        const nearbyPoints = getNearbyPoints(lat, lon);
                                        
                                        if (nearbyPoints.length > 0) {
                                            let weightedSum = 0;
                                            let weightSum = 0;
                
                                            nearbyPoints.forEach(point => {
                                                const dist = Math.sqrt(
                                                    Math.pow(point.lat - lat, 2) + 
                                                    Math.pow(point.lon - lon, 2)
                                                );
                                                
                                                const weight = dist === 0 ? 1000 : 1 / Math.pow(dist, 2);
                                                weightedSum += point.value * weight;
                                                weightSum += weight;
                                            });
                
                                            if (weightSum > 0) {
                                                const temp = weightedSum / weightSum;
                                                batchCells.push({
                                                    bounds: [[lat, lon], [lat + CELL_SIZE, lon + CELL_SIZE]],
                                                    temp: temp,
                                                    weight: Math.min(1, weightSum / 10)
                                                });
                                            }
                                        }
                                    }
                                }
                                resolve(batchCells);
                            }, 0);
                        });
                    }
                
                    // Process grid in batches
                    async function processGrid() {
                        for (let lat = latRange.min; lat <= latRange.max; lat += CELL_SIZE * BATCH_SIZE) {
                            const batchCells = await processBatch(lat);
                            
                            // Add cells to map
                            batchCells.forEach(cell => {
                                L.rectangle(cell.bounds, {
                                    color: getColor(cell.temp),
                                    fillColor: getColor(cell.temp),
                                    fillOpacity: cell.weight * 0.6,
                                    weight: 0,
                                    stroke:false,
                                    interactive: false
                                }).addTo(temperatureLayer);
                            });
                            
                            // Allow UI to update
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                
                    // Start processing
                    processGrid().catch(console.error);
                    break;
    
            case 'grid':
                const grid = {};
                
                data.forEach(point => {
                    const lat = Math.floor(point.lat / GRID_SIZE) * GRID_SIZE;
                    const lon = Math.floor(point.lon / GRID_SIZE) * GRID_SIZE;
                    const key = `${lat},${lon}`;
                    
                    if (!grid[key]) {
                        grid[key] = { total: 0, count: 0 };
                    }
                    grid[key].total += point.value;
                    grid[key].count++;
                });
    
                Object.entries(grid).forEach(([key, value]) => {
                    const [lat, lon] = key.split(',').map(Number);
                    const avgTemp = value.total / value.count;
                    const bounds = [
                        [lat, lon],
                        [lat + GRID_SIZE, lon + GRID_SIZE]
                    ];
                    
                    L.rectangle(bounds, {
                        color: getColor(avgTemp),
                        weight: 1,
                        fillColor: getColor(avgTemp),
                        fillOpacity: 0.7
                    }).bindPopup(
                        `Average Temperature: ${avgTemp.toFixed(1)}°C`
                    ).addTo(temperatureLayer);
                });
                break;
    
            case 'contour':
                const contourBreaks = [0, 10, 20, 30, 40];
                contourBreaks.forEach((temp, i) => {
                    if (i < contourBreaks.length - 1) {
                        const filtered = data.filter(p => 
                            p.value >= temp && p.value < contourBreaks[i + 1]
                        );
                        if (filtered.length > 0) {
                            const color = getColor(temp);
                            filtered.forEach(point => {
                                L.circle([point.lat, point.lon], {
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: 0.6,
                                    radius: 20000,
                                    weight: 1
                                }).addTo(temperatureLayer);
                            });
                        }
                    }
                });
                break;
        }
    
        // Add mousemove handler for temperature display
        map.on('mousemove', function(e) {
            const nearestPoint = findNearestPoint(e.latlng, data);
            if (nearestPoint) {
                const popup = L.popup()
                    .setLatLng(e.latlng)
                    .setContent(
                        `Temperature: ${nearestPoint.value.toFixed(1)}°C<br>` +
                        `Location: ${nearestPoint.lat.toFixed(2)}°N, ${nearestPoint.lon.toFixed(2)}°W`
                    )
                    .openOn(map);
                
                setTimeout(() => map.closePopup(popup), 1000);
            }
        });
    }
    
    // Helper function for finding nearest point
    function findNearestPoint(latlng, points) {
        let nearest = null;
        let minDist = Infinity;
        
        points.forEach(point => {
            const dist = map.distance(latlng, [point.lat, point.lon]);
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        });
        
        return minDist < 50000 ? nearest : null;
    }    

    // Add loading indicator
    const loadingControl = L.control({position: 'topright'});
    loadingControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'loading-indicator');
        div.innerHTML = 'Loading data...';
        div.style.display = 'none';
        div.style.backgroundColor = 'white';
        div.style.padding = '5px 10px';
        div.style.borderRadius = '5px';
        div.style.border = '1px solid #ccc';
        return div;
    };
    loadingControl.addTo(map);

    // Function to fetch and display data
    async function fetchData() {
        try {
            const loadingIndicator = document.querySelector('.loading-indicator');
            loadingIndicator.style.display = 'block';
            updateStatus('Fetching data...');

                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
            
                    const bounds = map.getBounds();
                    const params = new URLSearchParams({
                        start_date: startDate,
                        end_date: endDate,
                        min_lat: bounds.getSouth(),
                        max_lat: bounds.getNorth(),
                        min_lon: bounds.getWest(),
                        max_lon: bounds.getEast()
                    });

            const response = await fetch(`/api/data?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!Array.isArray(data)) {
                throw new Error('Expected array of data points');
            }

            updateStatus(`Received ${data.length} data points`);

            const vizType = document.getElementById('vizType').value;
            createVisualization(data, vizType);
            updateStatus(`Displaying ${data.length} temperature points for ${startDate} to ${endDate}`);

        } catch (error) {
            console.error('Error:', error);
            updateStatus(`Error: ${error.message}`);
            
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50px';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translateX(-50%)';
            errorDiv.style.backgroundColor = '#ff6b6b';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '10px';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.zIndex = 1000;
            errorDiv.textContent = `Error: ${error.message}`;
            document.body.appendChild(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        } finally {
            document.querySelector('.loading-indicator').style.display = 'none';
        }
    }

    // Add refresh button
    const refreshButton = L.control({position: 'topright'});
    refreshButton.onAdd = function() {
        const btn = L.DomUtil.create('button');
        btn.innerHTML = 'Refresh Data';
        btn.style.padding = '5px 10px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = 'white';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '5px';
        btn.onclick = fetchData;
        return btn;
    };
    refreshButton.addTo(map);

    // Add update button handler
    document.getElementById('updateDates').addEventListener('click', fetchData);

    // Add change listener for visualization type
    document.getElementById('vizType').addEventListener('change', fetchData);

    // Fetch data initially
    fetchData();
});


document.addEventListener('DOMContentLoaded', function() {
    // Add download button functionality
    const sidebar = document.getElementById('sidebar')
    const sidebarToggle =document.getElementById('sidebarToggle');

    sidebarToggle.addEventListener('click', () => {
        const isHidden =sidebar.classList.toggle('hidden');
        if (isHidden){
            map.style.marginLeft= '0';
        } else{
            map.style.marginLeft = '300px'
        }
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    })
    const downloadBtn = document.querySelector('.dropdown-btn');
    const downloadContent = document.querySelector('.dropdown-content');
    const closeBtn = document.querySelector('.close');

    downloadBtn.addEventListener('click', () => {
        downloadContent.style.display = downloadContent.style.display === 'block' ? 'none' : 'block';
    });

    closeBtn.addEventListener('click', () => {
        downloadContent.style.display = 'none';
    });

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-btn') && !e.target.closest('.dropdown-content')) {
            downloadContent.style.display = 'none';
        }
    });

    // Auto-populate coordinates from map bounds
    const map = document.querySelector('#map').__vue__; // Get map instance
    function updateCoordinates() {
        const bounds = map.getBounds();
        document.querySelector('#neLat').value = bounds.getNorth().toFixed(4);
        document.querySelector('#neLon').value = bounds.getEast().toFixed(4);
        document.querySelector('#swLat').value = bounds.getSouth().toFixed(4);
        document.querySelector('#swLon').value = bounds.getWest().toFixed(4);
    }

    map.on('moveend', updateCoordinates);
    updateCoordinates(); // Initial update

    // Download button click handler
    document.querySelector('.download-btn').addEventListener('click', () => {
        // Implement your download logic here
        alert('Download functionality will be implemented based on your backend requirements');
    });
});

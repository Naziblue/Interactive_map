import xarray as xr

# Load the NetCDF4 file
file_path = '/Users/nazanin/Desktop/intertactive_map/data/NLDAS_FORA0125_H.A20240531.002.grb.SUB.nc4'
dataset = xr.open_dataset(file_path)

# Print a summary of the dataset to see available variables, dimensions, and attributes
print(dataset)

# Optionally, list all variables and their attributes
for var in dataset.data_vars:
    print(f"\nVariable: {var}")
    print(dataset[var])

# Access specific variables (replace 'variable_name' with actual variable names in your dataset)
# Example:
# temperature_data = dataset['temperature_variable_name']
# print(temperature_data)

# Display metadata of the file
print("\nFile Attributes:")
print(dataset.attrs)

# Close the dataset when done to free up resources
dataset.close()

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change'
    DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'combined_data.nc')
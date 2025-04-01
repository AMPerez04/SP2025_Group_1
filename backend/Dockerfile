FROM python:3.11-slim
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

EXPOSE 8000

# cron job for scheduled asset data collection
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*
COPY assets/asset_cron /etc/cron.d/asset_cron
RUN chmod 0644 /etc/cron.d/asset_cron && crontab /etc/cron.d/asset_cron

# collect data when container starts --> run 24h cron job in background --> start backend server
CMD (python /app/assets/asset_collection.py &) && cron && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

FROM python:3.9-slim
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

EXPOSE 8000

# Run the FastAPI app using uvicorn (production-ready, no auto-reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

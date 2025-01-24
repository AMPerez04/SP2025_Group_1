# SP2025: Group &lt;1&gt; &lt;Stock Market Dashboard&gt;

Name your repository using the following format:  
**SP2025_Group_&lt;Group Number&gt;**  
(Example: SP2025_Group_9)

## Team Members
- **&lt;Member Name&gt;**: &lt;Email Address&gt; ; &lt;Github ID&gt;
- **Austin Perez**: a.m.perez@wustl.edu ; AMPerez04
- **&lt;Member Name&gt;**: &lt;Email Address&gt; ; &lt;Github ID&gt;

## TA
&lt;Name of your group's TA&gt;

## Objectives
Our project is a stock option dashboard that provides authentication, paper trading, and stock insights using data analytics and machine learning. The frontend is built with Next.js, the backend with FastAPI, and the database uses MongoDB, all hosted on Azure for scalability and reliability.


## How to Run
&lt;Instructions for how to run your project. Include the URI to your project at the top if applicable.&gt;

### 1. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

### 2. Run the backend:
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment (Windows)
venv\Scripts\activate

# Activate the virtual environment (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
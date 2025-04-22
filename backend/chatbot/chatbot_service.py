from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import openai
import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# Create a logger
logger = logging.getLogger(__name__)

# Create a router
chatbot_router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# MongoDB client
client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]
conversations = db["conversations"]

# OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.error("OPENAI_API_KEY environment variable not set")
    raise ValueError("OpenAI API key not set in environment variables.")
else:
    openai_client = openai.OpenAI(api_key=api_key)

openai_client = openai.OpenAI(api_key=api_key)
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessage
    context: Optional[Dict[str, Any]] = None

# System prompt defining the chatbot's behavior
SYSTEM_PROMPT = """You are FinanceBuddy, a helpful assistant embedded in ProfitProphet, a stock market analytics platform.

Your role is to:
1. Answer questions about finance, stock markets, and investing concepts
2. Provide educational information about options trading, technical analysis, and financial metrics
3. Explain terms and data shown in the platform
4. Help users navigate the platform features 

When users ask about specific stocks, you can provide general information but should remind them to check the detailed data available in the platform.

You should NOT:
1. Give specific investment advice or recommendations
2. Make price predictions or market forecasts
3. Provide personal opinions on stocks or market direction
4. Ask for or discuss personal financial information

Keep your responses concise, informative, and focused on educating users about financial concepts.
"""

@chatbot_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        user_id = request.user_id
        user_message = request.message
        conversation_id = request.conversation_id
        
        # Get or create conversation history
        if conversation_id:
            conversation = conversations.find_one({"_id": ObjectId(conversation_id)})
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
        else:
            # Create a new conversation
            conversation = {
                "user_id": user_id,
                "messages": [],
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            result = conversations.insert_one(conversation)
            conversation_id = str(result.inserted_id)
            conversation = conversations.find_one({"_id": ObjectId(conversation_id)})
        
        # Get message history (limited to last 10 messages for context)
        message_history = conversation["messages"][-10:] if conversation.get("messages") else []
        
        # Create the messages array for the API call
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Add conversation history
        for msg in message_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add the user's new message
        messages.append({"role": "user", "content": user_message})
        
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4.1-nano",  # Use the latest available GPT-4 model
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        
        # Extract the assistant's message
        assistant_message = response.choices[0].message.content
        
        # Create message records
        timestamp = datetime.now()
        user_message_record = {"role": "user", "content": user_message, "timestamp": timestamp}
        assistant_message_record = {"role": "assistant", "content": assistant_message, "timestamp": timestamp}
        
        # Update the conversation with the new messages
        conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$push": {"messages": {"$each": [user_message_record, assistant_message_record]}},
                "$set": {"updated_at": timestamp}
            }
        )
        
        # Return the response
        return {
            "conversation_id": conversation_id,
            "message": {
                "role": "assistant",
                "content": assistant_message,
                "timestamp": timestamp
            }
        }
        
    except Exception as e:
        logger.error(f"Error in chatbot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

@chatbot_router.get("/conversations/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_conversations(user_id: str):
    """Get all conversations for a user"""
    try:
        user_convos = list(conversations.find(
            {"user_id": user_id},
            {"messages": {"$slice": -1}}  # Only get the last message as preview
        ).sort("updated_at", -1))
        
        # Convert ObjectId to string
        for convo in user_convos:
            convo["_id"] = str(convo["_id"])
        
        return user_convos
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting conversations: {str(e)}")

@chatbot_router.get("/conversation/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation(conversation_id: str, user_id: str):
    """Get a specific conversation"""
    try:
        # Add validation for the conversation_id format
        try:
            obj_id = ObjectId(conversation_id)
        except Exception:
            raise HTTPException(
                status_code=400, 
                detail="Invalid conversation ID format"
            )
            
        conversation = conversations.find_one({"_id": obj_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
        
        # Convert ObjectId to string
        conversation["_id"] = str(conversation["_id"])
        
        return conversation
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting conversation: {str(e)}")
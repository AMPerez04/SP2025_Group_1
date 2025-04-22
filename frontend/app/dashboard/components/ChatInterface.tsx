"use client";

import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, SendIcon, XIcon, HistoryIcon, MessageCircleIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { useStore, Conversation } from "@/zustand/store";
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use state from Zustand store
  const { 
    user, 
    activeConversation, 
    conversations, 
    chatLoading,
    sendMessage: storeSendMessage,
    getConversations,
    getConversation,
    setActiveConversation
  } = useStore();

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeConversation]);

  // Load conversations when opening chat
  useEffect(() => {
    if (isOpen && user.ID && conversations.length === 0) {
      getConversations();
    }
  }, [isOpen, user.ID, conversations.length, getConversations]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user.ID) return;
    
    try {
      await storeSendMessage(message);
      setMessage('');
    } catch (error) {
      toast.error(`Failed to send message: ${error}`);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    getConversation(conversation._id);
  };

  const handleNewChat = () => {
    setActiveConversation(null);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
        timestamp = format(new Date(timestamp), 'MMM d, h:mm a');
        if (!timestamp) {
          throw new Error('Invalid date');
        }
      return format(new Date(timestamp), 'MMM d, h:mm a');
    } catch (error) {
      console.error(`Error formatting timestamp: ${error}`);
      return 'Invalid date';
    }
  };
  return (
    <>
      {/* Chat button */}
      <Button
        className="fixed bottom-4 right-4 rounded-full p-3 h-14 w-14 shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <BotIcon size={24} />
      </Button>
      
      {/* Chat dialog */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <CardTitle className="text-md font-medium">FinanceBuddy</CardTitle>
              
              {/* Conversation history button */}
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2">
                    <HistoryIcon size={16} />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-w-sm mx-auto">
                  <DrawerHeader>
                    <DrawerTitle>Conversation History</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4">
                    <Button 
                      variant="outline" 
                      className="w-full mb-4 justify-start"
                      onClick={handleNewChat}
                    >
                      <MessageCircleIcon size={16} className="mr-2" />
                      New Conversation
                    </Button>
                    
                    {conversations.map((convo) => (
                      <DrawerClose key={convo._id} asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full mb-2 justify-start"
                          onClick={() => handleSelectConversation(convo)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm">
                              {convo.messages[0]?.content.substring(0, 30)}...
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(convo.updated_at)}
                            </span>
                          </div>
                        </Button>
                      </DrawerClose>
                    ))}
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsOpen(false)}>
              <XIcon size={18} />
            </Button>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            {!activeConversation || activeConversation.messages?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <BotIcon size={40} className="mb-2 opacity-50" />
                <p>Hi! I&aposm FinanceBuddy, your finance assistant.</p>
                <p className="text-sm mt-1">Ask me about stocks, options, or finance concepts!</p>
              </div>
            ) : (
              activeConversation.messages?.map((msg, i) => (
                <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted max-w-[80%] rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-75" />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <CardFooter className="pt-2">
            <form 
              className="flex w-full items-center space-x-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <Input
                ref={inputRef}
                placeholder="Ask a finance question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={chatLoading}
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={chatLoading || !message.trim()}
              >
                <SendIcon size={16} />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, XIcon, HistoryIcon, MessageCircleIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { useStore, Conversation } from "@/zustand/store";
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import Image from "next/image";


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
    setActiveConversation,
    selectedAsset,
    quoteData,
    technicalIndicators
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
      // Get current stock context if available
      let contextualMessage = message;
      
      // Add context about what user is viewing if they're looking at a stock
      if (selectedAsset) {
        const context = `I'm currently looking at ${selectedAsset.ticker} (${selectedAsset.companyName}) data.`;
        const enabledIndicators = Object.entries(technicalIndicators)
  .filter(([, enabled]) => enabled)  // Remove the underscore
  .map(([name]) => name.toUpperCase())
  .join(', ');

          
        let contextDetails = context;
        
        if (enabledIndicators) {
          contextDetails += ` I have these technical indicators enabled: ${enabledIndicators}.`;
        }
        
        if (quoteData) {
            contextDetails += ` Market data: Previous close: ${quoteData.previousClose}, ` +
                              `Open: ${quoteData.open}, ` +
                              `Bid: ${quoteData.bid}, ` + 
                              `Ask: ${quoteData.ask}`;
        }
        
        // Append context to user's message
        contextualMessage = `${message}\n\nContext: ${contextDetails}`;
      }
      
      await storeSendMessage(contextualMessage);
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
  <Image 
    src="/assets/ProfessorIt.png" // Update this path to your image location
    alt="Chat with Prof. It"
    width={28}
    height={28}
    priority
  />
</Button>
      
      {/* Chat dialog */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] shadow-xl flex flex-col z-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <CardTitle className="text-md font-medium">Professor It</CardTitle>
              
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
                <Image 
  src="/assets/ProfessorIt.png" 
  alt="Professor It" 
  width={50} 
  height={50} 
  className="mb-2" 
/>
                <p>Hi! I&apos;m Prof. It, your virtual finance professor.</p>
                <p className="text-sm mt-1">Ask me about data you see on Profit Prophet, stocks, options, or finance concepts!</p>
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
                    {msg.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                        // Style Markdown elements - remove "node" parameter since it's not used
                        p: ({...props}) => <p className="my-1" {...props} />,
                        h1: ({...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                        h2: ({...props}) => <h2 className="text-md font-bold my-2" {...props} />,
                        h3: ({...props}) => <h3 className="text-sm font-bold my-1" {...props} />,
                        strong: ({...props}) => <strong className="font-semibold" {...props} />,
                        ul: ({...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                        ol: ({...props}) => <ol className="list-decimal pl-4 my-2" {...props} />,
                        li: ({...props}) => <li className="my-1" {...props} />,
                        // Custom handling for stock insights badges
                        text: ({...props}) => {
                            /* eslint-disable react/prop-types */
                          const text = props.children || ''; 
                            // Detect insight indicators (🟢, 🔴, ⚪) and apply appropriate styling
                            if (typeof text === 'string' && /^(🟢|🔴|⚪)/.test(text)) {
                              const sentiment = text.startsWith('🟢') ? 'positive' : 
                                              text.startsWith('🔴') ? 'negative' : 'neutral';
                              const badgeVariant = sentiment === 'positive' ? 'default' : 
                                                  sentiment === 'negative' ? 'destructive' : 'secondary';
                              
                              return (
                                <div className="flex items-start gap-2 my-1">
                                  <Badge variant={badgeVariant} className="mt-0.5">
                                    {text.slice(0, 1)} {sentiment}
                                  </Badge>
                                  <span>{text.slice(1)}</span>
                                </div>
                              );
                            }
                            
                            return <span>{props.children}</span>;
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
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
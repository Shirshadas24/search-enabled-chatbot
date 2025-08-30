"use client"

import Header from '@/components/Header';
import InputBar from '@/components/InputBar';
import MessageArea from '@/components/MessageArea';
import React, { useState } from 'react';

interface SearchInfo {
  stages: string[];
  query: string;
  urls: string[];
}

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  type: string;
  isLoading?: boolean;
  searchInfo?: SearchInfo;
}

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: 'Hi there, how can I help you?',
      isUser: false,
      type: 'message'
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [checkpointId, setCheckpointId] = useState(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      // First add the user message to the chat
      const newMessageId = messages.length > 0 ? Math.max(...messages.map(msg => msg.id)) + 1 : 1;

      setMessages(prev => [
        ...prev,
        {
          id: newMessageId,
          content: currentMessage,
          isUser: true,
          type: 'message'
        }
      ]);

      const userInput = currentMessage;
      setCurrentMessage(""); // Clear input field immediately

      try {
        // Create AI response placeholder
        const aiResponseId = newMessageId + 1;
        setMessages(prev => [
          ...prev,
          {
            id: aiResponseId,
            content: "",
            isUser: false,
            type: 'message',
            isLoading: true,
            searchInfo: {
              stages: [],
              query: "",
              urls: []
            }
          }
        ]);

        // Create URL with checkpoint ID if it exists
        let url = `${process.env.NEXT_PUBLIC_API_URL}/chat_stream/${encodeURIComponent(userInput)}`;
        if (checkpointId) {
          url += `?checkpoint_id=${encodeURIComponent(checkpointId)}`;
        }

        console.log("Connecting to SSE endpoint:", url);

        // Validate environment variable
        if (!process.env.NEXT_PUBLIC_API_URL) {
          console.error("NEXT_PUBLIC_API_URL environment variable is not set");
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiResponseId
                ? { ...msg, content: "Configuration error: API URL not configured.", isLoading: false }
                : msg
            )
          );
          return;
        }

        // Test basic connectivity before creating EventSource
        try {
          const connectivityTest = await fetch(process.env.NEXT_PUBLIC_API_URL, { 
            method: 'HEAD',
            mode: 'no-cors' // Allows basic connectivity test even with CORS issues
          });
          console.log("Basic connectivity test completed");
        } catch (connectivityError) {
          console.error("Basic connectivity test failed:", connectivityError);
        }

        // Connect to SSE endpoint using EventSource
        const eventSource = new EventSource(url);
        let streamedContent = "";
        let searchData = null;
        let hasReceivedContent = false;

        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error("EventSource connection timeout");
          eventSource.close();
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiResponseId
                ? { ...msg, content: "Connection timeout. Please try again.", isLoading: false }
                : msg
            )
          );
        }, 30000); // 30 second timeout

        // Process incoming messages
        eventSource.onmessage = (event) => {
          clearTimeout(connectionTimeout); // Clear timeout on successful message
          
          try {
            const data = JSON.parse(event.data);
            console.log("Received SSE data:", data);

            if (data.type === 'checkpoint') {
              // Store the checkpoint ID for future requests
              setCheckpointId(data.checkpoint_id);
            }
            else if (data.type === 'content') {
              streamedContent += data.content;
              hasReceivedContent = true;

              // Update message with accumulated content
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiResponseId
                    ? { ...msg, content: streamedContent, isLoading: false }
                    : msg
                )
              );
            }
            else if (data.type === 'search_start') {
              // Create search info with 'searching' stage
              const newSearchInfo = {
                stages: ['searching'],
                query: data.query,
                urls: []
              };
              searchData = newSearchInfo;

              // Update the AI message with search info
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiResponseId
                    ? { ...msg, content: streamedContent, searchInfo: newSearchInfo, isLoading: false }
                    : msg
                )
              );
            }
            else if (data.type === 'search_results') {
              try {
                // Parse URLs from search results
                const urls = typeof data.urls === 'string' ? JSON.parse(data.urls) : data.urls;

                // Update search info to add 'reading' stage (don't replace 'searching')
                const newSearchInfo = {
                  stages: searchData ? [...searchData.stages, 'reading'] : ['reading'],
                  query: searchData?.query || "",
                  urls: urls
                };
                searchData = newSearchInfo;

                // Update the AI message with search info
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiResponseId
                      ? { ...msg, content: streamedContent, searchInfo: newSearchInfo, isLoading: false }
                      : msg
                  )
                );
              } catch (err) {
                console.error("Error parsing search results:", err);
              }
            }
            else if (data.type === 'search_error') {
              // Handle search error
              const newSearchInfo = {
                stages: searchData ? [...searchData.stages, 'error'] : ['error'],
                query: searchData?.query || "",
                error: data.error,
                urls: []
              };
              searchData = newSearchInfo;

              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiResponseId
                    ? { ...msg, content: streamedContent, searchInfo: newSearchInfo, isLoading: false }
                    : msg
                )
              );
            }
            else if (data.type === 'end') {
              // When stream ends, add 'writing' stage if we had search info
              if (searchData) {
                const finalSearchInfo = {
                  ...searchData,
                  stages: [...searchData.stages, 'writing']
                };

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiResponseId
                      ? { ...msg, searchInfo: finalSearchInfo, isLoading: false }
                      : msg
                  )
                );
              }

              clearTimeout(connectionTimeout);
              eventSource.close();
            }
          } catch (error) {
            console.error("Error parsing event data:", error, "Raw data:", event.data);
          }
        };

        // Handle connection opened
        eventSource.onopen = (event) => {
          console.log("EventSource connection opened", event);
          clearTimeout(connectionTimeout);
        };

        // Handle errors with more detailed logging
        eventSource.onerror = (error) => {
          console.error("EventSource error details:", {
            error,
            readyState: eventSource.readyState,
            url: eventSource.url,
            withCredentials: eventSource.withCredentials,
            timestamp: new Date().toISOString()
          });

          // Test if the server is reachable
          fetch(url.replace('/chat_stream/', '/health-check'), { method: 'HEAD' })
            .then(response => {
              console.log("Health check response:", response.status, response.statusText);
            })
            .catch(fetchError => {
              console.error("Server unreachable:", fetchError);
            });

          // Check ready state to understand the error
          let errorMessage = "Sorry, there was an error processing your request.";
          
          switch (eventSource.readyState) {
            case EventSource.CONNECTING:
              console.log("EventSource is connecting... (retrying)");
              // For CONNECTING state, wait a bit before giving up
              setTimeout(() => {
                if (eventSource.readyState === EventSource.CONNECTING) {
                  console.log("Still connecting after delay, closing connection");
                  eventSource.close();
                  errorMessage = "Unable to connect to server. Please check your connection and try again.";
                  updateErrorMessage();
                }
              }, 5000);
              return; // Don't immediately close
            case EventSource.OPEN:
              console.log("EventSource connection is open but received error event");
              errorMessage = "Connection interrupted. Please try again.";
              break;
            case EventSource.CLOSED:
              console.log("EventSource connection is closed");
              errorMessage = "Connection closed. Please check your server and try again.";
              break;
            default:
              console.log("EventSource in unknown state:", eventSource.readyState);
              errorMessage = `Connection error (state: ${eventSource.readyState}). Please try again.`;
          }

          function updateErrorMessage() {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === aiResponseId
                  ? { ...msg, content: errorMessage, isLoading: false }
                  : msg
              )
            );
          }

          clearTimeout(connectionTimeout);
          eventSource.close();

          // Only update with error if we don't have content yet
          if (!hasReceivedContent) {
            updateErrorMessage();
          }
        };

        // Listen for end event
        eventSource.addEventListener('end', () => {
          console.log("Received end event");
          clearTimeout(connectionTimeout);
          eventSource.close();
        });

      } catch (error) {
        console.error("Error setting up EventSource:", error);
        setMessages(prev => [
          ...prev,
          {
            id: newMessageId + 1,
            content: "Sorry, there was an error connecting to the server.",
            isUser: false,
            type: 'message',
            isLoading: false
          }
        ]);
      }
    }
  };

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen py-8 px-4">
      {/* Main container with refined shadow and border */}
      <div className="w-[70%] bg-white flex flex-col rounded-xl shadow-lg border border-gray-100 overflow-hidden h-[90vh]">
        <Header />
        <MessageArea messages={messages} />
        <InputBar currentMessage={currentMessage} setCurrentMessage={setCurrentMessage} onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default Home;
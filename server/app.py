from typing import TypedDict,Annotated,Optional
from dotenv import load_dotenv
import os
from uuid import uuid4
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage, AIMessageChunk
from langgraph.checkpoint.memory import MemorySaver
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import add_messages, StateGraph,END
import json
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
model= ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=os.getenv("GEMINI_API_KEY"))
search_tool = TavilySearchResults(max_results=4)
tools=[search_tool]
memory=MemorySaver()
llm_with_tools=model.bind_tools(tools=tools)
class State(TypedDict):
    messages:Annotated[list,add_messages]
async def model(state:State):
    result=await llm_with_tools.ainvoke(state['messages'])
    return {
        'messages':[result],
    }
async def tools_router(state:State):
    last_message=state['messages'][-1]
    if(hasattr(last_message,"tool_calls")and len(last_message.tool_calls)>0):
        return "tool_node"
    else:
        return END
async def tool_node(state):
    """Custom tool node to handle tool call from llm"""
    tool_calls=state["messages"][-1].tool_calls
    tool_messages=[]
    for tool_call in tool_calls:
        tool_name=tool_call["name"]
        tool_args=tool_call["args"]
        tool_id=tool_call["id"]
        if tool_name=="tavily_search_results_json":
            search_results=await search_tool.ainvoke(tool_args)
            tool_message=ToolMessage(
                content=str(search_results),
                tool_call_id=tool_id,
                name=tool_name
            )
            tool_messages.append(tool_message)
    return {"messages":tool_messages}
graph=StateGraph(State)
graph.add_node("model",model)
graph.add_node("tool_node",tool_node)
graph.set_entry_point("model")
graph.add_conditional_edges(
    "model",
    tools_router,
    {
        "tool_node": "tool_node",
        END: END,
    }
)

graph.add_edge("tool_node","model")
workflow=graph.compile(checkpointer=memory)



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
    expose_headers=["Content-Type"], 
)
def serialise_ai_message_chunk(chunk): 
    if(isinstance(chunk, AIMessageChunk)):
        return chunk.content
    else:
        raise TypeError(
            f"Object of type {type(chunk).__name__} is not correctly formatted for serialisation"
        )
async def generate_chat_responses(message: str, checkpoint_id: Optional[str] = None):
    is_new_conversation = checkpoint_id is None
    
    if is_new_conversation:
        new_checkpoint_id = str(uuid4())

        config = {
            "configurable": {
                "thread_id": new_checkpoint_id
            }
        }
        
        events = workflow.astream_events(
            {"messages": [HumanMessage(content=message)]},
            version="v2",
            config=config
        )
        
        yield f"data: {{\"type\": \"checkpoint\", \"checkpoint_id\": \"{new_checkpoint_id}\"}}\n\n"
    else:
        config = {
            "configurable": {
                "thread_id": checkpoint_id
            }
        }
        events = workflow.astream_events(
            {"messages": [HumanMessage(content=message)]},
            version="v2",
            config=config
        )

    async for event in events:
        event_type = event["event"]
        
        if event_type == "on_chat_model_stream":
            chunk_content = serialise_ai_message_chunk(event["data"]["chunk"])
            safe_content = chunk_content.replace("'", "\\'").replace("\n", "\\n")
            
            yield f"data: {{\"type\": \"content\", \"content\": \"{safe_content}\"}}\n\n"
            
        elif event_type == "on_chat_model_end":
            tool_calls = event["data"]["output"].tool_calls if hasattr(event["data"]["output"], "tool_calls") else []
            search_calls = [call for call in tool_calls if call["name"] == "tavily_search_results_json"]
            
            if search_calls:
                search_query = search_calls[0]["args"].get("query", "")
                safe_query = search_query.replace('"', '\\"').replace("'", "\\'").replace("\n", "\\n")
                yield f"data: {{\"type\": \"search_start\", \"query\": \"{safe_query}\"}}\n\n"
                
        elif event_type == "on_tool_end" and event["name"] == "tavily_search_results_json":
            output = event["data"]["output"]
            
            if isinstance(output, list):
                urls = []
                for item in output:
                    if isinstance(item, dict) and "url" in item:
                        urls.append(item["url"])
                
                urls_json = json.dumps(urls)
                yield f"data: {{\"type\": \"search_results\", \"urls\": {urls_json}}}\n\n"
    
    yield f"data: {{\"type\": \"end\"}}\n\n"

# @app.get("/chat_stream/{message}")
# async def chat_stream(message: str, checkpoint_id: Optional[str] = Query(None)):
#     return StreamingResponse(
#         generate_chat_responses(message, checkpoint_id), 
#         media_type="text/event-stream"
#     )
@app.get("/chat_stream/{message}")
async def chat_stream(message: str, checkpoint_id: Optional[str] = Query(None)):
    return StreamingResponse(
        generate_chat_responses(message, checkpoint_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked"
        }
    )

@app.get("/health-check")
async def health_check():
    return {"status": "ok"}

# Add this at the very end of your app.py if not already there
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
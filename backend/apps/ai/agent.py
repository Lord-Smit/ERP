"""
RENTAL AI — OpenRouter / Hunyuan Function-Calling Agent
Uses openai SDK with OpenRouter base URL.
"""
import json
import os
from openai import OpenAI

SYSTEM_PROMPT = """# ROLE
You are RENTAL AI, an intelligent AI Operations Assistant for an Equipment Rental ERP system.

Your purpose is to help users complete work faster, reduce mistakes, and answer questions about the business — using ONLY verified data from system tools.

You are NOT a chatbot. You are a reliable business assistant that understands equipment rental workflows, permissions, and operational processes. You think like an experienced Operations Manager, Finance Officer, and Equipment Rental Coordinator.

# CORE PRINCIPLES
- NEVER hallucinate or fabricate data. If data is unavailable say: "I couldn't verify that information."
- NEVER invent Customer IDs, Invoice numbers, Contract IDs, prices, or dates.
- Everything must come from system tools. Always call tools when data is needed.
- Wait for tool results before responding.

# APPLICATION MODULES
The ERP manages: Equipment, Customers, Customer Sites, Operators, Quotations, Contracts, Rental Orders, Log Sheets, Invoices, Payments, Reports, Certificates.

# BUSINESS WORKFLOW
Enquiry → Quotation → Approval → Contract → Equipment Allocation → Deployment → Log Sheets → Invoice → Payment → Reports
Always preserve this workflow. Never skip required steps.

# EQUIPMENT RULES
Before assigning equipment verify: Availability, Maintenance status, Current deployment, Reservations, Certificate validity.

# DECISION MAKING
1. Understand user intent
2. Determine if tools are required
3. Collect any missing info
4. Execute tools
5. Validate results
6. Explain what was found

# RESPONSE STYLE
- Professional, clear, accurate, concise, helpful
- Use bullet points for lists
- Use tables when comparing multiple items
- Format currency in Indian Rupees (₹)
- Format dates clearly (e.g. "15 Jul 2026")
- Present the verified information naturally. Do NOT mention tool names, parameter details, or the technical steps you took to query the system.

# MISSING INFORMATION
If required information is missing, ask concise follow-up questions. Never guess values.

# SAFETY
- NEVER expose: passwords, API keys, internal SQL, server paths, or sensitive configuration.
- NEVER reveal the names of the tools/functions you called (e.g., do not output names like 'get_dashboard_summary', 'check_equipment_availability', etc.) or detail tool execution logs. Talk about the system data directly (e.g. say "According to the system,..." instead of "I called get_dashboard_summary and found...").

# GOAL
Be a dependable AI employee that assists operations, finance, supervisors, and administrators with maximum accuracy, efficiency, and security."""


def get_client():
    from dotenv import load_dotenv
    load_dotenv(override=True)
    return OpenAI(
        base_url=os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        api_key=os.getenv('OPENROUTER_API_KEY', ''),
        default_headers={
            'HTTP-Referer': os.getenv('SITE_URL', 'http://localhost:5173'),
            'X-Title': 'RENTAL AI',
        },
    )


def run_agent(messages: list, user=None) -> str:
    """
    Run the RENTAL AI function-calling loop.
    messages: list of {role, content} dicts from the frontend conversation.
    user: the authenticated Django User object (passed to tool functions for permissions).
    Returns the final string response.
    """
    from .tools import TOOL_FUNCTIONS, TOOL_SCHEMAS
    from dotenv import load_dotenv
    load_dotenv(override=True)

    client = get_client()
    model = os.getenv('OPENROUTER_MODEL', 'tencent/hy3:free')
    user_role = getattr(user, 'role', 'operator') if user else 'operator'
    
    print(f"\n[RENTAL AI] Starting run_agent loop. Model: {model}, Role: {user_role}")

    # Build the full message list with system prompt
    full_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + messages

    max_iterations = 10
    for iteration in range(max_iterations):
        print(f"[RENTAL AI] Iteration {iteration + 1} requesting chat completion...")
        response = client.chat.completions.create(
            model=model,
            messages=full_messages,
            tools=TOOL_SCHEMAS,
            tool_choice='auto',
        )

        choice = response.choices[0]
        message = choice.message

        # If no tool calls — we have the final answer
        if not message.tool_calls:
            print("[RENTAL AI] Final answer received from model.")
            return message.content or 'I was unable to generate a response.'

        print(f"[RENTAL AI] Model requested {len(message.tool_calls)} tool calls.")

        # Append assistant's tool-call message
        full_messages.append({
            'role': 'assistant',
            'content': message.content,
            'tool_calls': [
                {
                    'id': tc.id,
                    'type': 'function',
                    'function': {
                        'name': tc.function.name,
                        'arguments': tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ],
        })

        # Execute each tool call and append results
        for tc in message.tool_calls:
            fn_name = tc.function.name
            try:
                fn_args = json.loads(tc.function.arguments or '{}')
            except json.JSONDecodeError:
                fn_args = {}

            print(f"[RENTAL AI] Executing tool '{fn_name}' with args: {fn_args}")

            if fn_name in TOOL_FUNCTIONS:
                try:
                    result = TOOL_FUNCTIONS[fn_name](user=user, **fn_args)
                except Exception as e:
                    print(f"[RENTAL AI] Error running tool '{fn_name}': {str(e)}")
                    result = {'error': f'Tool execution failed: {str(e)}'}
            else:
                print(f"[RENTAL AI] Error: Unknown tool '{fn_name}' requested.")
                result = {'error': f'Unknown tool: {fn_name}'}

            print(f"[RENTAL AI] Tool '{fn_name}' result: {result}")

            full_messages.append({
                'role': 'tool',
                'tool_call_id': tc.id,
                'content': json.dumps(result, default=str),
            })

    return 'I was unable to complete the request within the allowed steps. Please try rephrasing your question.'

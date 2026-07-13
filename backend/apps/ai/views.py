from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        messages = request.data.get('messages', [])
        new_message = request.data.get('message', '').strip()

        if not new_message:
            return Response({'error': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Sanitize incoming messages to only allowed roles
        safe_messages = []
        for msg in messages:
            if isinstance(msg, dict) and msg.get('role') in ('user', 'assistant'):
                safe_messages.append({
                    'role': msg['role'],
                    'content': str(msg.get('content', '')),
                })

        # Append the new user message
        safe_messages.append({'role': 'user', 'content': new_message})

        try:
            from .agent import run_agent
            user_role = getattr(request.user, 'role', 'operator')
            reply = run_agent(safe_messages, user_role=user_role)
            return Response({'reply': reply})
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

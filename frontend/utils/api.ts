import { Platform } from 'react-native';

const API_BASE_URL =
    Platform.OS === 'android'
        ? 'http://10.0.2.2:8000'
        : 'http://localhost:8000';

export interface ChatApiResponse {
    response: string;
    route: string | null;
    is_high_risk: boolean;
}

export async function sendChatMessage(
    message: string,
    sessionId?: string,
    userId?: string
): Promise<ChatApiResponse | null> {
    try {
        console.log('[API] Sending message to:', `${API_BASE_URL}/chat`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        // Add session_id and user_id to body
        const body: Record<string, string> = { message };
        if (sessionId) body.session_id = sessionId;
        if (userId) body.user_id = userId;

        console.log('[API] Request body:', JSON.stringify(body));
        
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        console.log('[API] Response status:', res.status);

        if (!res.ok) {
            const errText = await res.text();
            console.warn(`[API] /chat returned ${res.status}:`, errText);
            return null;
        }

        const data = (await res.json()) as ChatApiResponse;
        console.log('[API] Response data:', data);
        return data;
    } catch (err) {
        console.warn('[API] Backend unreachable, falling back to local response:', err);
        return null;
    }
}

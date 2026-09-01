export interface SuggestedActivity {
    dateId: string;
    time: string;
    location: string;
    description: string;
}

export interface SuggestedTrip {
    name: string;
    startDate: string;
    endDate: string;
    baseCurrency: string;
}

export interface AiMessage {
    id: string;
    threadId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    suggestedActivities?: SuggestedActivity[] | null;
    suggestedTrip?: SuggestedTrip | null;
}

export interface AiThread {
    id: string;
    userId: string;
    tripId: string | null;
    title: string;
    lastMessagePreview?: string;
    archived?: boolean;
}

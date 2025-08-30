// Shared interfaces for components
export interface SearchInfo {
  stages: string[];
  query: string;
  urls: string | string[];
  error?: string; // optional for error cases
}

export interface Message {
  id: number;
  content: string;
  isUser: boolean;
  type: string;
  isLoading?: boolean;
  searchInfo?: SearchInfo;
}

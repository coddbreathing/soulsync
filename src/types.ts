export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  type: 'text' | 'love-note' | 'audio-note' | 'video-note';
  customStyle?: string; // for decorative love notes
  duration?: string; // for audio/video notes
}

export interface Story {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  date: string;
  likes: number;
}

export interface Countdown {
  id: string;
  title: string;
  targetDate: string;
  category: string;
}

export interface PartnerMood {
  userId: string;
  userName: string;
  mood: string; // 'happy' | 'stressed' | 'missing-you' | 'loving' | 'tired'
  customText?: string;
  updatedAt: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  partnerAnswer?: string; // partner's correct answer or response
  userAnswer?: string;
}

export interface TriviaGame {
  isActive: boolean;
  quizIndex: number;
  questions: TriviaQuestion[];
  scores: Record<string, number>; // userId -> score
  currentTurn: string; // userId
}

export interface TicTacToeState {
  board: (string | null)[];
  isXNext: boolean;
  scoreX: number;
  scoreO: number;
  winner: string | null;
}

export interface CoBrowsingState {
  activeUrl: string;
  tabTitle: string;
  scrollY: number;
  clicks: { x: number; y: number }[];
}

export interface SyncPlayState {
  isPlaying: boolean;
  currentTime: number;
  mediaUrl: string;
  mediaType: 'youtube' | 'audio';
  trackTitle: string;
}

export interface VirtualPet {
  name: string;
  type: 'watering-can' | 'sunlight' | 'fertilizer' | 'love';
  growth: number; // 0 to 100
  stage: 'Seed' | 'Sprout' | 'Buddin' | 'Blossomed Rose';
  happiness: number; // 0 to 100
  lastInteracted: string;
}

export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface CouplePair {
  id: string; // Combined ID
  codeA: string;
  codeB: string;
  userA: { id: string; name: string } | null;
  userB: { id: string; name: string } | null;
  isPaired: boolean;
  messages: Message[];
  stories: Story[];
  countdowns: Countdown[];
  moods: PartnerMood[];
  trivia: TriviaGame;
  ticTacToe: TicTacToeState;
  coBrowsing: CoBrowsingState;
  syncPlay: SyncPlayState;
  pet: VirtualPet;
  drawing: DrawingStroke[];
  locketPhotoUrl?: string;
  locketPhotoTime?: string;
  virtualTouch?: {
    type: 'hug' | 'heartbeat' | 'kiss' | 'nudge';
    senderId: string;
    senderName: string;
    timestamp: string;
  } | null;
  videoCall?: {
    isActive: boolean;
    senderId?: string;
    senderName?: string;
    senderRole?: 'A' | 'B';
    isAccepted?: boolean;
    isDeclined?: boolean;
    roomToken?: string;
    sdpOffer?: string;
    sdpAnswer?: string;
    iceCandidates?: { senderRole: 'A' | 'B'; candidate: string }[];
  } | null;
  notifications?: {
    id: string;
    type: 'chat' | 'video_call' | 'recording_start' | 'recording_end' | 'recording_upload' | 'mood_change' | 'love_express' | 'locket_change' | 'music_invite' | 'trip_invite' | 'game_invite';
    text: string;
    timestamp: string;
    senderId: string;
    senderName: string;
  }[];
}

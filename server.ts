import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { CouplePair, Message, Story, Countdown, PartnerMood, DrawingStroke } from "./src/types";
import defaultFirebaseConfig from "./firebase-applet-config.json";

// Firebase Applet DB SDK
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import fs from "fs";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Vercel serverless rewrite compatibility: normalize incoming routes
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api') && (req.url.startsWith('/couple') || req.url.startsWith('/gemini'))) {
    req.url = '/api' + req.url;
  }
  next();
});

// Safe body extractor that handles Vercel serverless parsed bodies, strings, and standard Express JSON
function getSafeBody(req: express.Request): any {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

// In-memory fallback repository to ensure chamber operations never fail even if cloud DB is transiently unreachable
const memoryRooms = new Map<string, CouplePair>();

// Read Firebase configuration
let db: any = null;
try {
  let firebaseConfig: any = defaultFirebaseConfig;
  if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch {
      console.error("Invalid JSON provided in FIREBASE_CONFIG environment variable.");
    }
  } else {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch {
        // use defaultFirebaseConfig
      }
    }
  }

  if (firebaseConfig) {
    const firebaseApp = initializeApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID || "ai-studio-69df5db0-b7eb-44b2-809f-5b1c2edc5428";
    db = getFirestore(firebaseApp, dbId);
    console.log("Firestore successfully initialized on the server-side with dbId:", dbId);
  } else {
    console.warn("firebaseConfig not available; operating with memory cache fallback.");
  }
} catch (err) {
  console.error("Failed to initialize Firestore on the server-side:", err);
}

// Error handling defined in skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: "server-session"
    }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to generate a 6-letter random code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // human-readable, no confusing O or 0, I or 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initial default blank couple structure
function createInitialPair(id: string, codeA: string, codeB: string): CouplePair {
  return {
    id,
    codeA,
    codeB,
    userA: null,
    userB: null,
    isPaired: false,
    messages: [
      {
        id: 'system-1',
        senderId: 'system',
        senderName: 'SoulSync',
        text: 'Welcome to your private Sanctuary! Start by sharing your feelings, setting countdowns, or playing trivia together.',
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    ],
    stories: [
      {
        id: 'first-kiss',
        title: 'Where It All Began',
        caption: 'Our very first digital keepsake story. Add your polaroids and milestones above!',
        imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80',
        date: new Date().toISOString().split('T')[0],
        likes: 1
      }
    ],
    countdowns: [
      {
        id: 'first-meet',
        title: 'Our Next Secret Getaway ✈️',
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Travel'
      }
    ],
    moods: [],
    trivia: {
      isActive: false,
      quizIndex: 0,
      questions: [],
      scores: {},
      currentTurn: ''
    },
    ticTacToe: {
      board: Array(9).fill(null),
      isXNext: true,
      scoreX: 0,
      scoreO: 0,
      winner: null
    },
    coBrowsing: {
      activeUrl: 'https://en.wikipedia.org/wiki/Romanticism',
      tabTitle: 'Romantic Guidebook',
      scrollY: 0,
      clicks: []
    },
    syncPlay: {
      isPlaying: false,
      currentTime: 0,
      mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      mediaType: 'audio',
      trackTitle: 'Sunset Serenades Mix - Volume I'
    },
    pet: {
      name: 'Heartblossom Tulip',
      type: 'watering-can',
      growth: 15,
      stage: 'Sprout',
      happiness: 80,
      lastInteracted: new Date().toISOString()
    },
    drawing: [],
    videoCall: { isActive: false, senderId: '', senderName: '', isAccepted: false, isDeclined: false },
    notifications: []
  };
}

function pushNotification(pair: any, type: string, text: string, senderId: string, senderName: string) {
  if (!pair.notifications) {
    pair.notifications = [];
  }
  pair.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    text,
    timestamp: new Date().toISOString(),
    senderId,
    senderName
  });
  if (pair.notifications.length > 50) {
    pair.notifications = pair.notifications.slice(0, 50);
  }
}

const DUMMY_PAIR_ID = "SIMULATE-COUPLE-TEST-ROOM";

async function getCoupleFromDb(pairId: string): Promise<CouplePair | null> {
  if (db) {
    try {
      const docRef = doc(db, "couples", pairId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const pairData = docSnap.data() as CouplePair;
        memoryRooms.set(pairId, pairData);
        return pairData;
      }
    } catch (error) {
      console.warn("Firestore read warning (falling back to memory):", error);
    }
  }
  return memoryRooms.get(pairId) || null;
}

function sanitizeDbData(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDbData);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeDbData(val);
      }
    }
    return cleaned;
  }
  return obj;
}

async function saveCoupleToDb(pairId: string, pair: CouplePair): Promise<void> {
  memoryRooms.set(pairId, pair);
  if (!db) return;
  try {
    const docRef = doc(db, "couples", pairId);
    const sanitized = sanitizeDbData(pair);
    await setDoc(docRef, sanitized);
  } catch (error) {
    console.warn("Firestore write warning (retained safely in chamber memory):", error);
  }
}

async function findPairByInviteCode(inviteCode: string, isA: boolean): Promise<CouplePair | null> {
  if (db) {
    try {
      const couplesRef = collection(db, "couples");
      const fieldToCheck = isA ? "codeA" : "codeB";
      const q = query(couplesRef, where(fieldToCheck, "==", inviteCode), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as CouplePair;
        memoryRooms.set(data.id, data);
        return data;
      }
    } catch (error) {
      console.warn("Firestore list query warning (searching memory):", error);
    }
  }
  for (const pair of memoryRooms.values()) {
    if ((isA && pair.codeA === inviteCode) || (!isA && pair.codeB === inviteCode)) {
      return pair;
    }
  }
  return null;
}

async function ensureDummyPairExists() {
  const existing = await getCoupleFromDb(DUMMY_PAIR_ID);
  if (!existing) {
    const dummy = createInitialPair(DUMMY_PAIR_ID, "PARTA1", "PARTB2");
    dummy.userA = { id: "user-a-123", name: "Alex" };
    dummy.userB = { id: "user-b-456", name: "Jordan" };
    dummy.isPaired = true;
    dummy.messages.push(
      {
        id: 'msg-rec-1',
        senderId: 'user-a-123',
        senderName: 'Alex',
        text: "Hey J, did you check out our Virtual Pet today? It grew more leaves! Let's do a Trivia challenge later ❤️",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg-rec-2',
        senderId: 'user-b-456',
        senderName: 'Jordan',
        text: "Aww! Yes, I just watered it! Love the design. Getting ready for our synced session now.",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'text'
      }
    );
    await saveCoupleToDb(DUMMY_PAIR_ID, dummy);
  }
}

// Lazy initialize Gemini clients safely
let isGeminiConfigured = false;
let aiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    isGeminiConfigured = true;
  }
} catch (err) {
  console.error("Failed to initialize GoogleGenAI:", err);
}

// REST API Endpoints

// Get status config
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dateTime: new Date().toISOString(),
    geminiActive: isGeminiConfigured
  });
});

// Generate a brand new partner link/code
app.post("/api/couple/create-code", async (req, res) => {
  try {
    const body = getSafeBody(req);
    const rawName = body.userName || req.query.userName;
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({ error: "Your name is required to create a sanctuary." });
    }
    const userName = rawName.trim();

    const codeA = generateCode();
    const codeB = generateCode();
    const pairId = `ROOM-${codeA}-${codeB}`;

    const newPair = createInitialPair(pairId, codeA, codeB);
    newPair.userA = { id: `user-a-${Date.now()}`, name: userName };
    
    await saveCoupleToDb(pairId, newPair);

    res.json({
      pairId,
      myCode: codeA,
      inviteCode: codeB,
      role: "A",
      pair: newPair
    });
  } catch (error: any) {
    console.error("Error in create-code:", error);
    res.status(500).json({ error: error.message || "Failed to create room code" });
  }
});

// Join an existing couple pair using an invite code
app.post("/api/couple/join-code", async (req, res) => {
  try {
    const body = getSafeBody(req);
    const inviteCode = (body.inviteCode || req.query.inviteCode || "") as string;
    const userName = (body.userName || req.query.userName || "Jordan") as string;
    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return res.status(400).json({ error: "Invite code is required." });
    }

    const codeUpper = inviteCode.trim().toUpperCase();

    // Find a pair where inviteCode matches codeB (meaning user enters B's code)
    // or matches codeA (meaning joining as partner A, but normally they enter codeB)
    let foundPair = await findPairByInviteCode(codeUpper, false);

    if (foundPair && foundPair.userB === null) {
      foundPair.userB = { id: `user-b-${Date.now()}`, name: userName.trim() };
      foundPair.isPaired = true;
      await saveCoupleToDb(foundPair.id, foundPair);
      return res.json({
        pairId: foundPair.id,
        myCode: foundPair.codeB,
        inviteCode: foundPair.codeA,
        role: "B",
        pair: foundPair
      });
    }

    // Fallback check if user is entering A's code to link
    const foundPairAsA = await findPairByInviteCode(codeUpper, true);

    if (foundPairAsA && foundPairAsA.userA === null) {
      foundPairAsA.userA = { id: `user-a-${Date.now()}`, name: userName.trim() };
      foundPairAsA.isPaired = true;
      await saveCoupleToDb(foundPairAsA.id, foundPairAsA);
      return res.json({
        pairId: foundPairAsA.id,
        myCode: foundPairAsA.codeA,
        inviteCode: foundPairAsA.codeB,
        role: "A",
        pair: foundPairAsA
      });
    }

    return res.status(404).json({ error: "Invite code not found. Please review the code or ask your partner to send a brand new invitation code." });
  } catch (error: any) {
    console.error("Error in join-code:", error);
    res.status(500).json({ error: error.message || "Failed to join room" });
  }
});

// Fetch full synchronized state for a room
app.get("/api/couple/state/:pairId", async (req, res) => {
  try {
    const { pairId } = req.params;
    if (pairId === DUMMY_PAIR_ID) {
      await ensureDummyPairExists();
    }
    const pair = await getCoupleFromDb(pairId);
    if (!pair) {
      return res.status(404).json({ error: "Couple chamber not found." });
    }
    res.json(pair);
  } catch (error: any) {
    console.error("Error in get state:", error);
    res.status(500).json({ error: error.message || "Failed to fetch room state" });
  }
});

// Make state updates (chat, game, pet growth, doodle, locket)
app.post("/api/couple/action/:pairId", async (req, res) => {
  try {
    const { pairId } = req.params;
    const body = getSafeBody(req);
    const { actionType, payload, senderId } = body;

    const pair = await getCoupleFromDb(pairId);
  if (!pair) {
    return res.status(404).json({ error: "Chamber not found" });
  }

  // Handle all core micro-interactions state updates
  switch (actionType) {
    case 'RESTORE_CACHE': {
      if (payload) {
        if (payload.messages) pair.messages = payload.messages;
        if (payload.stories) pair.stories = payload.stories;
        if (payload.countdowns) pair.countdowns = payload.countdowns;
        if (payload.moods) pair.moods = payload.moods;
        if (payload.trivia) pair.trivia = payload.trivia;
        if (payload.ticTacToe) pair.ticTacToe = payload.ticTacToe;
        if (payload.coBrowsing) pair.coBrowsing = payload.coBrowsing;
        if (payload.syncPlay) pair.syncPlay = payload.syncPlay;
        if (payload.pet) pair.pet = payload.pet;
        if (payload.drawing) pair.drawing = payload.drawing;
        if (payload.locketPhotoUrl !== undefined) pair.locketPhotoUrl = payload.locketPhotoUrl;
        if (payload.locketPhotoTime !== undefined) pair.locketPhotoTime = payload.locketPhotoTime;
        if (payload.virtualTouch !== undefined) pair.virtualTouch = payload.virtualTouch;

        pair.messages.push({
          id: `msg-system-${Date.now()}`,
          senderId: 'system',
          senderName: 'SoulSync System',
          text: `Chamber synced & restored successfully from Google Drive cache backup.`,
          timestamp: new Date().toISOString(),
          type: 'text'
        });
      }
      break;
    }
    case 'SEND_MESSAGE': {
      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderId: payload.senderId,
        senderName: payload.senderName,
        text: payload.text,
        timestamp: new Date().toISOString(),
        type: payload.type || 'text',
        customStyle: payload.customStyle,
        duration: payload.duration
      };
      pair.messages.push(newMsg);
      // Auto-grow pet slightly when a relationship love note is sent
      if (payload.type === 'love-note') {
        pair.pet.growth = Math.min(100, Math.round(pair.pet.growth + 2));
        pair.pet.happiness = Math.min(100, pair.pet.happiness + 5);
      }
      if (newMsg.senderId !== 'system') {
        const cleanedText = newMsg.text.length > 50 ? newMsg.text.substring(0, 50) + "..." : newMsg.text;
        if (newMsg.type === 'love-note') {
          pushNotification(pair, 'love_express', `sent a heartfelt love note: "${cleanedText}"`, newMsg.senderId, newMsg.senderName);
        } else if (newMsg.type === 'audio-note') {
          pushNotification(pair, 'chat', `sent a voice memo recording`, newMsg.senderId, newMsg.senderName);
        } else {
          pushNotification(pair, 'chat', `sent a message: "${cleanedText}"`, newMsg.senderId, newMsg.senderName);
        }
      }
      break;
    }

    case 'UPDATE_MOOD': {
      // Remove any prior mood for this user
      pair.moods = pair.moods.filter(m => m.userId !== senderId);
      // Add new mood
      const newMood: PartnerMood = {
        userId: senderId,
        userName: payload.userName,
        mood: payload.mood,
        customText: payload.customText,
        updatedAt: new Date().toISOString()
      };
      pair.moods.push(newMood);
      pushNotification(pair, 'mood_change', `updated their partner mood to: ${payload.mood}${payload.customText ? ` ("${payload.customText}")` : ''}`, senderId, payload.userName);
      break;
    }

    case 'ADD_STORY': {
      const newStory: Story = {
        id: `story-${Date.now()}`,
        title: payload.title,
        caption: payload.caption,
        imageUrl: payload.imageUrl || 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=400&q=80',
        date: payload.date || new Date().toISOString().split('T')[0],
        likes: 0
      };
      pair.stories.unshift(newStory);
      pair.pet.growth = Math.min(100, pair.pet.growth + 5); // milestones grow pet significantly!
      break;
    }

    case 'ADD_COUNTDOWN': {
      const newCd: Countdown = {
        id: `cd-${Date.now()}`,
        title: payload.title,
        targetDate: payload.targetDate,
        category: payload.category || 'Anniversary'
      };
      pair.countdowns.push(newCd);
      break;
    }

    case 'DELETE_COUNTDOWN': {
      pair.countdowns = pair.countdowns.filter(c => c.id !== payload.id);
      break;
    }

    case 'DRAW_STROKE': {
      // Append coordinates stroke or replace drawing
      if (payload.clear) {
        pair.drawing = [];
      } else if (payload.stroke) {
        pair.drawing.push(payload.stroke);
      }
      break;
    }

    case 'SYNC_PLAY': {
      // Synchronized music / watch playback
      const wasPlaying = pair.syncPlay?.isPlaying;
      pair.syncPlay = {
        isPlaying: payload.isPlaying,
        currentTime: payload.currentTime,
        mediaUrl: payload.mediaUrl || pair.syncPlay.mediaUrl,
        mediaType: payload.mediaType || pair.syncPlay.mediaType,
        trackTitle: payload.trackTitle || pair.syncPlay.trackTitle
      };
      if (payload.isInvite) {
        pushNotification(pair, 'music_invite', `invited you to listen to a song: "${payload.trackTitle || pair.syncPlay.trackTitle}"`, senderId, payload.senderName || 'Your partner');
      } else if (payload.isPlaying && !wasPlaying) {
        pushNotification(pair, 'music_invite', `is now listening to: "${payload.trackTitle || pair.syncPlay.trackTitle}"`, senderId, payload.senderName || 'Your partner');
      }
      break;
    }

    case 'VIRTUAL_TOUCH': {
      // Sends micro-interaction "haptic pulse" trigger
      pair.virtualTouch = {
        type: payload.type, // 'hug' | 'heartbeat' | 'kiss' | 'nudge'
        senderId: senderId,
        senderName: payload.senderName,
        timestamp: new Date().toISOString()
      };
      pair.pet.happiness = Math.min(100, pair.pet.happiness + 10);
      pushNotification(pair, 'love_express', `expressed their love with a real-time ${payload.type}!`, senderId, payload.senderName);
      break;
    }

    case 'DISMISS_VIRTUAL_TOUCH': {
      pair.virtualTouch = null;
      break;
    }

    case 'WATER_PET': {
      // Pet feeding / plant watering
      pair.pet.growth = Math.min(100, pair.pet.growth + 3);
      pair.pet.happiness = Math.min(100, pair.pet.happiness + 8);
      pair.pet.lastInteracted = new Date().toISOString();
      const currentGrowth = pair.pet.growth;
      if (currentGrowth > 80) {
        pair.pet.stage = "Blossomed Rose";
      } else if (currentGrowth > 45) {
        pair.pet.stage = "Buddin";
      } else if (currentGrowth > 15) {
        pair.pet.stage = "Sprout";
      } else {
        pair.pet.stage = "Seed";
      }
      break;
    }

    case 'LOCKET_PHOTO': {
      // Quick snap widget payload
      pair.locketPhotoUrl = payload.photoUrl;
      pair.locketPhotoTime = new Date().toISOString();
      pushNotification(pair, 'locket_change', `updated their shared locket widget with a new polaroid photo`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'PLAY_TICTACTOE': {
      // Play a round of tic-tac-toe
      const { index, symbol } = payload;
      if (pair.ticTacToe.board[index] === null && !pair.ticTacToe.winner) {
        pair.ticTacToe.board[index] = symbol;
        
        // Calculate winner
        const winLines = [
          [0,1,2], [3,4,5], [6,7,8], // rows
          [0,3,6], [1,4,7], [2,5,8], // cols
          [0,4,8], [2,4,6]          // diagonals
        ];
        
        let foundWinner = null;
        for (const line of winLines) {
          const [a, b, c] = line;
          if (pair.ticTacToe.board[a] && pair.ticTacToe.board[a] === pair.ticTacToe.board[b] && pair.ticTacToe.board[a] === pair.ticTacToe.board[c]) {
            foundWinner = pair.ticTacToe.board[a];
            break;
          }
        }

        pair.ticTacToe.winner = foundWinner;
        if (foundWinner) {
          if (foundWinner === 'X') pair.ticTacToe.scoreX++;
          else pair.ticTacToe.scoreO++;
          pair.pet.growth = Math.min(100, pair.pet.growth + 4); // Game rewards!
        } else if (!pair.ticTacToe.board.includes(null)) {
          pair.ticTacToe.winner = 'Draw';
        }

        pair.ticTacToe.isXNext = !pair.ticTacToe.isXNext;
      }
      break;
    }

    case 'RESET_TICTACTOE': {
      pair.ticTacToe.board = Array(9).fill(null);
      pair.ticTacToe.winner = null;
      pair.ticTacToe.isXNext = true;
      break;
    }

    case 'SET_TRIVIA_ACTIVE': {
      pair.trivia = {
        isActive: payload.isActive,
        quizIndex: 0,
        scores: {},
        currentTurn: pair.userA?.id || '',
        questions: payload.questions || [
          {
            question: "Where was our very first physical date together?",
            options: ["The cozy downtown cafe", "A rainy walk in the city park", "Cinema of vintage movies", "The seaside food court"],
          },
          {
            question: "What is your partner's all-time ultimate comfort snack?",
            options: ["Salted caramel ice cream", "Hot sour chili chips", "Double espresso with cookie", "Midnight delivery ramen"],
          },
          {
            question: "What is our absolute favorite shared dream getaway?",
            options: ["A glowing cabin under the Aurora Borealis", "Renting an ancient street flat in Kyoto", "Beach surf villa in Costa Rica", "An Alpine valley backpack camping"],
          }
        ]
      };
      if (payload.isActive) {
        pushNotification(pair, 'game_invite', `invited you to play a round of Trivia! Check the Games tab`, senderId, payload.senderName || 'Your partner');
      }
      break;
    }

    case 'SUBMIT_TRIVIA_ANSWER': {
      const { qIndex, answer, isUserA } = payload;
      const question = pair.trivia.questions[qIndex];
      if (question) {
        if (isUserA) {
          question.userAnswer = answer;
        } else {
          question.partnerAnswer = answer;
        }

        // Check if both answered to calculate score increments
        if (question.userAnswer && question.partnerAnswer) {
          // If they match answers, they earn points together!
          const userKey = pair.userA?.id || 'A';
          const partnerKey = pair.userB?.id || 'B';
          if (!pair.trivia.scores[userKey]) pair.trivia.scores[userKey] = 0;
          if (!pair.trivia.scores[partnerKey]) pair.trivia.scores[partnerKey] = 0;

          if (question.userAnswer === question.partnerAnswer) {
            pair.trivia.scores[userKey] += 10;
            pair.trivia.scores[partnerKey] += 10;
            pair.pet.growth = Math.min(100, pair.pet.growth + 5); // Match boost!
          } else {
            // Divergent answers
            pair.trivia.scores[userKey] += 5;
            pair.trivia.scores[partnerKey] += 5;
          }
          
          // Advance question indexes
          if (qIndex < pair.trivia.questions.length - 1) {
            pair.trivia.quizIndex += 1;
          } else {
            // End quiz
            pair.trivia.isActive = true; // Still show result
          }
        }
      }
      break;
    }

    case 'CO_BROWSE_CLICK': {
      pair.coBrowsing = {
        activeUrl: payload.activeUrl,
        tabTitle: payload.tabTitle,
        scrollY: payload.scrollY || 0,
        clicks: payload.clicks || []
      };
      if (payload.isInvite) {
        pushNotification(pair, 'trip_invite', `invited you to live-plan a route on the trip planner: "${payload.tabTitle}"`, senderId, payload.senderName || 'Your partner');
      }
      break;
    }

    case 'START_VIDEO_CALL': {
      pair.videoCall = {
        isActive: true,
        senderId: senderId,
        senderName: payload.senderName || 'Your partner',
        senderRole: payload.senderRole,
        isAccepted: false,
        isDeclined: false,
        roomToken: `room-${Date.now()}`,
        sdpOffer: undefined,
        sdpAnswer: undefined,
        iceCandidates: []
      };
      pushNotification(pair, 'video_call', `is inviting you to a private video call`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'ACCEPT_VIDEO_CALL': {
      if (!pair.videoCall) {
        pair.videoCall = { isActive: true, senderId: '', senderName: '', isAccepted: false, isDeclined: false, roomToken: '' };
      }
      pair.videoCall.isActive = true;
      pair.videoCall.isAccepted = true;
      pair.videoCall.isDeclined = false;
      pushNotification(pair, 'video_call', `accepted the video call!`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'REJECT_VIDEO_CALL':
    case 'DECLINE_VIDEO_CALL': {
      if (!pair.videoCall) {
        pair.videoCall = { isActive: false, senderId: '', senderName: '', isAccepted: false, isDeclined: false, roomToken: '' };
      }
      pair.videoCall.isActive = false;
      pair.videoCall.isAccepted = false;
      pair.videoCall.isDeclined = true;
      pair.videoCall.sdpOffer = undefined;
      pair.videoCall.sdpAnswer = undefined;
      pair.videoCall.iceCandidates = [];
      pushNotification(pair, 'video_call', `declined the video call`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'END_VIDEO_CALL': {
      pair.videoCall = {
        isActive: false,
        senderId: '',
        senderName: '',
        senderRole: undefined,
        isAccepted: false,
        isDeclined: false,
        roomToken: '',
        sdpOffer: undefined,
        sdpAnswer: undefined,
        iceCandidates: []
      };
      pushNotification(pair, 'video_call', `ended the video call.`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'UPDATE_WEBRTC_SIGNAL': {
      if (pair.videoCall) {
        if (payload.sdpOffer !== undefined) pair.videoCall.sdpOffer = payload.sdpOffer;
        if (payload.sdpAnswer !== undefined) pair.videoCall.sdpAnswer = payload.sdpAnswer;
        if (payload.iceCandidates !== undefined) {
          if (!pair.videoCall.iceCandidates) pair.videoCall.iceCandidates = [];
          pair.videoCall.iceCandidates.push(...payload.iceCandidates);
        }
      }
      break;
    }

    case 'START_RECORDING': {
      pushNotification(pair, 'recording_start', `started recording the video call to Google Drive`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'END_RECORDING': {
      pushNotification(pair, 'recording_end', `stopped call recording.`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'RECORDING_UPLOADED': {
      pushNotification(pair, 'recording_upload', `uploaded video call recording to Google Drive app vault!`, senderId, payload.senderName || 'Your partner');
      break;
    }

    case 'GAME_INVITE': {
      pushNotification(pair, 'game_invite', `invited you to play: ${payload.gameType || 'Trivia'}!`, senderId, payload.senderName || 'Your partner');
      break;
    }

    default:
      console.warn("Unrecognized action type:", actionType);
  }

    await saveCoupleToDb(pairId, pair);
    res.json({ success: true, pair });
  } catch (error: any) {
    console.error("Error in action endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to process chamber action" });
  }
});

// Gemini AI creative assistant proxy
// Generates relationship prompts, games, love letters, and mood remedies using gemini-3.5-flash
app.post("/api/gemini/romantic-start", async (req, res) => {
  const body = getSafeBody(req);
  const { category, senderName, partnerName, currentMood } = body;
  
  if (!aiClient) {
    // Elegant fallback prompt index if API Key was not set up yet
    const fallbacks: Record<string, string[]> = {
      'prompts': [
        "If our relationship was an animated fantasy film, what mythical quest would we be on right now?",
        "What is a tiny, unsung thing I did recently that quietly made you feel deeply adored?",
        "If we could freeze time and spend an entire year together in a secluded lighthouse, what routines would we build?"
      ],
      'deep': [
        "In what ways has loving you changed how I look at my own vulnerability and fears?",
        "If you could whisper a single, comforting truth to my childhood self, what would you say to them?",
        "What is a boundary you are currently exploring or working on, and how can I support you in guarding it?"
      ],
      'love-notes': [
        `Dearest ${partnerName},\n\nI was just thinking about the quiet architecture of us. Meeting you feels less like an accident and more like a gentle homecoming. I carry your laughter in my pocket so that the world feels lighter when you aren't near.\n\nAlways Yours,\n${senderName}`,
        `Hey ${partnerName},\n\nYou are my absolute favorite harbor in this noisy world. Even when we are miles apart, the thought of your smile is like a soft warm ray of sun cutting through a grey afternoon sky.\n\nWith all my heart,\n${senderName}`
      ],
      'advice': [
        "Communication is the oxygen of distance. Try choosing a 'Word of the Day' that summarizes your emotional weight, and let your partner carry half.",
        "When moods don't align, remember it is never You vs. Them. It is always both of you versus the friction."
      ]
    };

    const list = fallbacks[category] || fallbacks['prompts'];
    const text = list[Math.floor(Math.random() * list.length)];
    return res.json({ text, isMock: true });
  }

  try {
    let promptSubject = "";
    if (category === 'prompts') {
      promptSubject = `Generate a cozy, imaginative conversation starter prompt or light-hearted question suitable for a deeply attached couple to ask each other. Limit response to 2 sentences. Make it romantic, sweet, and unique.`;
    } else if (category === 'deep') {
      promptSubject = `Generate one deep, vulnerable relationship question to spark a meaningful, emotional dialogue between two long-distance partners. Focus on trust, healing, shared futures, or emotional intimacy. Limit to 2 sentences.`;
    } else if (category === 'love-notes') {
      promptSubject = `Write a brief, exceptionally poetic and heartwarming Love Letter from a person named ${senderName} to their partner named ${partnerName}. The mood of the partner is ${currentMood || 'cozy'}. Max 4 elegant, lyrical sentences. Do not use generic cliches. Make it feel authentic, editorial, and deeply sincere.`;
    } else {
      promptSubject = `Give 2 actionable, warm relationship advises or simple romantic activities for a couple where one person is feeling '${currentMood || "missing-you"}' and the other is '${senderName}'. Max 3 sentences, very cozy.`;
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptSubject,
      config: {
        systemInstruction: "You are SoulSync, an expert relationship therapist and lyrical poet dedicated to crafting sweet, sophisticated micro-moments of emotional connections for romantic couples."
      }
    });

    const outputText = response.text || "Love knows no bounds. Try asking your partner what song reminds them of you today.";
    res.json({ text: outputText, isMock: false });
  } catch (error: any) {
    console.error("Gemini invocation error:", error);
    res.status(500).json({ error: "Chamber AI could not generate prompt at this moment.", msg: error.message });
  }
});


// Serve static Vite assets and integrate Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Hook Vite development server dynamically
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SoulSync chamber server is vibrating beautifully on port ${PORT}`);
  });
}

// Only listen if not running inside a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;

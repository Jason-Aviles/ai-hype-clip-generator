🎬 AI Hype Clip Auto-Generator — Backend
This is the backend service for the AI Hype Clip Auto-Generator app. It:

Listens for chat spikes (via Twitch)

Records video/audio

Detects hype moments using:

💬 Chat spikes

🗣 Voice emotion (via Whisper + Emotion AI)

😲 Facial emotion (via webcam + DeepFace)

Generates viral-ready clips

Syncs with frontend via Socket.io

🧱 Tech Stack
Node.js (Express)

Socket.io (real-time updates)

Python (DeepFace, OpenCV for face emotion)

MongoDB (clip metadata)

FFmpeg + SoX (video/audio recording)

Whisper API (for transcription)

DeepFace + TensorFlow (emotion detection)

🚀 Features
Feature	Description
📡 Twitch Chat Spike Detection	Live monitoring via OAuth
🎥 Screen Video + Clean Mic Audio	Captures separately, merges via FFmpeg
🧠 Emotion Logic	Transcription, voice sentiment, face emotion
🧠 2-of-3 Trigger Rule	Requires 2 of: hype chat, voice emotion, face emotion
⚙️ GPU Support	Optimized with tensorflow-metal on macOS
📡 Socket.io Events	Sends live progress and clips to frontend

🔧 Setup
1. Clone + Install (Node)
bash
Copy
git clone https://github.com/yourname/ai-hype-clip-generator
cd backend
npm install
2. Install Python + DeepFace
bash
Copy
pip install deepface opencv-python tensorflow-macos tensorflow-metal tf-keras
3. FFmpeg + SoX
macOS:

bash
Copy
brew install ffmpeg sox
4. Environment
Create config/settings.json:

json
Copy
{
  "clipDuration": 5
}
💻 Run Backend
bash
Copy
node index.js
📡 API Endpoints
Method	Route	Description
GET	/start-monitoring	Start Twitch chat tracking
GET	/health	Uptime check
GET	/api/clip/:id	Get a specific clip by ID

🔄 Socket.io Events
Event	Payload
clipProgress	{ status, percent }
new_spike	{ ...spike }
new_clip	{ ...clip }

🧠 Emotion Pipeline
Signal	Description
💬 Chat spike	Burst in chat users/messages
🗣 Voice Emotion	Via Whisper transcription + analysis
😲 Face Emotion	Live webcam with DeepFace
✅ Rule	2 of 3 triggers = record a clip<br/>All 3 triggers = instant clip

✅ GPU Check (Optional)
python
Copy
import tensorflow as tf
print("Num GPUs Available:", len(tf.config.list_physical_devices('GPU')))
🧪 Testing Face Emotion
bash
Copy
cd backend/src/services
python3 test_webcam_face_emotion.py
🧼 Cleanup
Recorded files auto-deleted after clip is saved.
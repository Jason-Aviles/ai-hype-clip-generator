🔥 AI Hype Clip Auto-Generator — Backend
Automatically detects hype moments on Twitch and clips them in real-time.

✅ Features
🔍 Real-time Twitch chat spike detection (configurable)

🎙️ Voice emotion analysis via Whisper + GPT-4

📸 Face emotion detection via webcam (DeepFace + Mediapipe)

🎞️ Auto-records and uploads viral clips to S3

📊 Admin dashboard with spikes, stats, and charts

🛡️ FFmpeg + Streamlink failure fallback detection

🪟 Windows launch support via .bat script

⚙️ Requirements
Node.js (v18+ recommended)

Python (3.8+)

FFmpeg installed & in your system PATH

Streamlink installed globally

Webcam access (optional but recommended for face emotion)

OpenAI API Key (.env)

MongoDB (local or remote)

AWS credentials for S3 uploads

📦 Installation
bash
Copy
git clone https://github.com/yourusername/hypeclip-backend
cd hypeclip-backend
npm install
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
🧠 Environment Variables (.env)
env
Copy
OPENAI_API_KEY=your_openai_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=your_bucket
ENABLE_KEYWORD_TRIGGER=true
🚀 Start Backend (Unix/macOS)
bash
Copy
node index.js
🪟 Start Backend (Windows via .bat)
Create a start-backend.bat:

bat
Copy
@echo off
echo Starting HypeClip Backend...
call backend\.venv\Scripts\activate
node backend\index.js
pause
Double-click to run.

📊 API Endpoints
Method	Route	Description
GET	/api/stats	Returns clip/spike analytics
GET	/api/clips	All saved clips
GET	/start-monitoring	Begin Twitch monitoring
GET	/stop-monitoring	Stop Twitch monitoring

🧪 Troubleshooting
FFmpeg/Streamlink fails?
Make sure they are globally installed and in your system path.

Webcam errors?
DeepFace may fail silently on headless servers or permission issues. Logs will warn you.

No stats/graph data?
Ensure clips and spikes are being recorded and MongoDB is running.


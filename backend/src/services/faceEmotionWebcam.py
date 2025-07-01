# backend/src/services/faceEmotionWebcam.py

import cv2
from deepface import DeepFace
from collections import Counter
import json
import time

# Settings
FRAME_LIMIT = 30  # number of frames to analyze before summarizing
DELAY_BETWEEN_FRAMES = 0.5  # seconds between frame analysis

# Init
emotion_log = []
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print(json.dumps({"error": "Webcam not accessible"}))
    exit()

print("🎥 Capturing emotion data... Press 'q' to quit early.")

try:
    frame_count = 0
    while frame_count < FRAME_LIMIT:
        ret, frame = cap.read()
        if not ret:
            print(json.dumps({"error": "Failed to capture frame"}))
            break

        try:
            analysis = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
            emotion_data = analysis[0] if isinstance(analysis, list) else analysis
            emotion = emotion_data["dominant_emotion"]
            emotion_log.append(emotion)

            # Optional: display frame with emotion
            cv2.putText(frame, f"Emotion: {emotion}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow("Emotion Detection", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            frame_count += 1
            time.sleep(DELAY_BETWEEN_FRAMES)

        except Exception as e:
            print(json.dumps({"error": f"DeepFace error: {str(e)}"}))
            break

finally:
    cap.release()
    cv2.destroyAllWindows()

# Emotion summary
if emotion_log:
    most_common = Counter(emotion_log).most_common(1)[0]
    result = {
        "emotion_summary": {
            "dominant_emotion": most_common[0],
            "count": most_common[1],
            "log": emotion_log
        }
    }
    print(json.dumps(result, indent=2))

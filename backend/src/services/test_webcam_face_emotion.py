# test_webcam_face_emotion.py
import cv2
from deepface import DeepFace

cap = cv2.VideoCapture(0)  # 0 = default webcam

if not cap.isOpened():
    print("❌ Could not open webcam.")
    exit()

ret, frame = cap.read()
cap.release()

if not ret:
    print("❌ Failed to grab frame.")
    exit()

try:
    result = DeepFace.analyze(
        frame,
        actions=["emotion"],
        enforce_detection=False,
        detector_backend="mediapipe",
    
    )
    print("🧠 Detected Emotion:", result[0]['dominant_emotion'])
except Exception as e:
    print("❌ Error:", e)

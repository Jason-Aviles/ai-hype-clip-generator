# faceEmotionVideo.py
import cv2
import sys
import json
import mediapipe as mp

if len(sys.argv) < 2:
    print(json.dumps({"error": "Missing video path"}))
    sys.exit(1)

video_path = sys.argv[1]

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(json.dumps({"error": "Failed to open video"}))
    sys.exit(1)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh()

frame_count = 0
face_count = 0

while True:
    success, frame = cap.read()
    if not success:
        break

    frame_count += 1
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        face_count += 1

cap.release()

# Basic dummy logic: more than 10% of frames with face = "happy"
if face_count / max(frame_count, 1) > 0.1:
    emotion = "happy"
else:
    emotion = "neutral"

print(json.dumps({"emotion": emotion}))


import sys
import cv2
from deepface import DeepFace

video_path = sys.argv[1]
output_path = sys.argv[2]

cap = cv2.VideoCapture(video_path)
success, frame = cap.read()

emotions = []

frame_count = 0
while success and frame_count < 30:
    try:
        result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
        if isinstance(result, list):
            result = result[0]
        emotions.append(result["dominant_emotion"])
    except:
        pass
    frame_count += 1
    success, frame = cap.read()

cap.release()

# Majority vote
if emotions:
    dominant = max(set(emotions), key=emotions.count)
else:
    dominant = ""

with open(output_path, "w") as f:
    f.write(dominant)

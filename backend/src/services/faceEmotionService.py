import cv2
import sys
from deepface import DeepFace

backend = sys.argv[1] if len(sys.argv) > 1 else "mediapipe"

# Open webcam
cap = cv2.VideoCapture(0)
success, frame = cap.read()
cap.release()

if not success or frame is None:
    print("unknown")
    sys.exit(1)

try:
    # Analyze the first frame only
    result = DeepFace.analyze(
        img_path=frame,
        actions=["emotion"],
        detector_backend=backend,
        enforce_detection=False
    )
    dominant_emotion = result[0]["dominant_emotion"] if isinstance(result, list) else result["dominant_emotion"]
    print(dominant_emotion)
except Exception as e:
    print("unknown")
    sys.exit(1)

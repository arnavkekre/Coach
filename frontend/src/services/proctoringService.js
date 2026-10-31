import { FaceLandmarker, ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker = null;
let objectDetector = null;

// Independent consecutive tracking counters
let noFaceStreak = 0;
let multipleFaceStreak = 0;
let headGazeStreak = 0;
let talkingScore = 0;
let phoneStreak = 0;

export async function initFaceLandmarker() {
  if (faceLandmarker) return { faceLandmarker, objectDetector };

  try {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 1. Face, Lips & Eye Landmarker (confidence 0.5 prevents losing face when looking down)
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      outputFaceBlendshapes: true,
    });

    // 2. Object Detector for Mobile Phone
    try {
      objectDetector = await ObjectDetector.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        scoreThreshold: 0.40,
      });
    } catch (objErr) {
      console.warn("Object detector init warning:", objErr);
    }

    console.log("Proctoring Engine initialized.");
    return { faceLandmarker, objectDetector };
  } catch (err) {
    console.error("Proctoring load error:", err);
    return null;
  }
}

export function analyzeFrame(videoElement, isRecording = false) {
  if (!faceLandmarker || !videoElement || videoElement.readyState < 2) {
    return { status: "INITIALIZING", warning: null, facesCount: 0 };
  }

  const timestamp = performance.now();

  try {
    // ----------------- 1. DETECT MOBILE PHONE (2-frame streak) -----------------
    let phoneDetected = false;
    if (objectDetector) {
      const objResults = objectDetector.detectForVideo(videoElement, timestamp);
      if (objResults.detections && objResults.detections.length > 0) {
        for (const detection of objResults.detections) {
          const category = detection.categories[0];
          const label = category ? category.categoryName.toLowerCase() : "";
          if (
            label.includes("phone") ||
            label.includes("cell") ||
            label.includes("mobile")
          ) {
            phoneDetected = true;
            break;
          }
        }
      }
    }

    if (phoneDetected) {
      phoneStreak++;
      if (phoneStreak >= 2) {
        return {
          status: "VIOLATION",
          warning: "🚨 Mobile Phone detected in camera frame!",
          facesCount: 1,
        };
      }
    } else {
      phoneStreak = 0;
    }

    // ----------------- 2. DETECT FACES (No face & Multiple faces) -----------------
    const faceResults = faceLandmarker.detectForVideo(videoElement, timestamp);
    const rawFaces = faceResults.faceLandmarks || [];

    // Absence check: requires ~3s (5 frames) continuous absence before flagging
    if (rawFaces.length === 0) {
      noFaceStreak++;
      if (noFaceStreak >= 5) {
        return {
          status: "VIOLATION",
          warning: "No face detected in camera frame!",
          facesCount: 0,
        };
      }
      return { status: "OK", warning: null, facesCount: 0 };
    } else {
      noFaceStreak = 0;
    }

    // Multiple people check with neck/chin shadow rejection
    if (rawFaces.length > 1) {
      const face1 = rawFaces[0];
      const face2 = rawFaces[1];

      const face1Width = Math.abs(face1[454].x - face1[234].x);
      const face2Width = Math.abs(face2[454].x - face2[234].x);

      const face1CenterX = (face1[234].x + face1[454].x) / 2;
      const face2CenterX = (face2[234].x + face2[454].x) / 2;
      const face1CenterY = (face1[10].y + face1[152].y) / 2;
      const face2CenterY = (face2[10].y + face2[152].y) / 2;

      // Filter out neck folds/shirt collar shadow when tilting head down:
      // (neck shadows sit vertically right below the face with almost no horizontal offset)
      const isNeckShadow =
        Math.abs(face1CenterX - face2CenterX) < face1Width * 0.35 &&
        face2CenterY > face1CenterY;

      const isSubstantialFace = face2Width > face1Width * 0.45;

      if (isSubstantialFace && !isNeckShadow) {
        multipleFaceStreak++;
        if (multipleFaceStreak >= 3) {
          return {
            status: "VIOLATION",
            warning: "Multiple people detected in frame!",
            facesCount: 2,
          };
        }
      } else {
        multipleFaceStreak = 0;
      }
    } else {
      multipleFaceStreak = 0;
    }

    const landmarks = rawFaces[0];

    // ----------------- 3. LIP MOVEMENT / TALKING (When NOT recording answer) -----------------
    // Landmark 13 = Inner Upper Lip, Landmark 14 = Inner Lower Lip
    // Landmark 10 = Forehead Top, Landmark 152 = Chin Bottom
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    const mouthAperture = Math.abs(upperLip.y - lowerLip.y);
    const faceHeight = Math.abs(chin.y - forehead.y) || 0.3;
    const mouthRatio = mouthAperture / faceHeight;

    if (!isRecording) {
      // Natural talking aperture ratio > 0.055 or raw aperture > 0.018
      const isMouthOpen = mouthAperture > 0.018 || mouthRatio > 0.055;

      if (isMouthOpen) {
        talkingScore += 2; // Rapidly accumulate when talking
      } else {
        talkingScore = Math.max(0, talkingScore - 1); // Decay gently so consonants don't kill streak
      }

      if (talkingScore >= 4) {
        return {
          status: "WARNING",
          warning: "Talking / Whispering detected!",
          facesCount: 1,
        };
      }
    } else {
      talkingScore = 0;
    }

    // ----------------- 4. HEAD POSE & LOOKING DOWN (Yaw & Pitch) -----------------
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 0.001;
    const horizontalDisplacement = (nose.x - faceCenterX) / faceWidth;

    // Head turned sideways
    const isHeadTurned = Math.abs(horizontalDisplacement) > 0.40;

    // Head tilted down toward desk or mobile (nose moves down towards chin)
    const verticalPosition = (nose.y - forehead.y) / faceHeight;
    const isHeadTiltedDown = verticalPosition > 0.63;

    // ----------------- 5. EYE GAZE (Blendshapes) -----------------
    let isEyeGlance = false;
    let isLookingDownEye = false;

    if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
      const blendshapes = faceResults.faceBlendshapes[0].categories;
      const getScore = (name) => {
        const item = blendshapes.find((b) => b.categoryName === name);
        return item ? item.score : 0;
      };

      const lookDownLeft = getScore("eyeLookDownLeft");
      const lookDownRight = getScore("eyeLookDownRight");
      const lookOutLeft = getScore("eyeLookOutLeft");
      const lookOutRight = getScore("eyeLookOutRight");

      if (lookDownLeft > 0.72 && lookDownRight > 0.72) {
        isLookingDownEye = true;
      }
      if (lookOutLeft > 0.72 || lookOutRight > 0.72) {
        isEyeGlance = true;
      }
    }

    // ----------------- 6. TEMPORAL STREAK FOR LOOKING AWAY / DOWN -----------------
    const isLookingDown = isHeadTiltedDown || isLookingDownEye;
    const isLookingAway = isHeadTurned || isEyeGlance;

    if (isLookingDown || isLookingAway) {
      headGazeStreak++;
      if (headGazeStreak >= 3) {
        return {
          status: "WARNING",
          warning: isLookingDown
            ? "Looking down at desk or mobile!"
            : "Looking away from screen!",
          facesCount: 1,
        };
      }
    } else {
      headGazeStreak = 0;
    }

    return {
      status: "OK",
      warning: null,
      facesCount: 1,
    };
  } catch (err) {
    return { status: "OK", warning: null, facesCount: 1 };
  }
}

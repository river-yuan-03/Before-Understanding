# Before Understanding

## Short Description

Before Understanding is an interactive gesture-classification project built with p5.js and ml5.js. The system reads hand gestures through a webcam and assigns them to simple behavioural categories such as social, emotional, or threat. The work explores how AI systems can judge human behaviour before truly understanding it.

## Concept / Intent

The project compares AI training to the growth of a child. Like a child learning about the world through imitation, the system observes human gestures and tries to learn from them.  However, the machine does not understand the meaning of gestures. Instead, it simply classifies actions based on predefined rules and training data.

In the system, four gestures are interpreted as behavioural signals:
Open Palm → SOCIAL
Fist → THREAT
Thumbs Up → EMOTIONAL
Pointing → THREAT

The interface simulates a fictional Subject Classification System that evaluates behaviour through indicators such as Threat Level and Profile Score. Through this interaction, the work asks whether machine learning truly understands human behaviour, or simply reproduces existing social classifications and biases.

## Technology Used

JavaScript
p5.js
ml5.js (Handpose model)
Webcam input
Visual Studio Code

## How to Run / Install

(1). Open the project folder in Visual Studio Code.
(2). Run the project using a local server (for example Live Server).
(3). Open the webpage in a browser.
(4). Allow webcam access when prompted.
(5). Place your hand clearly in front of the camera and hold a gesture.

## Requirements

JavaScript environment
p5.js
ml5.js
Webcam
Browser with camera access

Notes:
(1). The first load may take a few seconds.
(2). ml5 needs to download the Handpose TensorFlow model.
(3). Recognition starts only after the debug panel shows MODEL: READY.
(4). The hand should be clearly visible in the camera. If the debug panel shows HANDS: DETECTED, the hand has been found successfully. RAW GESTURE displays the gesture currently detected by the system.

## Credits / Acknowledgements

Project by Yufei Hu, Yi Pan.
Built using p5.js and ml5.js.
References and AI-assisted parts are indicated in the code comments.

## Contact / Links


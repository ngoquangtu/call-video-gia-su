const { initializeApp  } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const wrtc = require('wrtc');
const NodeWebcam = require('node-webcam');
class Connect {
    constructor() {
        
        const firebaseConfig = {
            apiKey: "AIzaSyCJHduAcGwyItRltuzWuDhDTMKo8XduvsQ",
            authDomain: "web-video-chat-ea7f4.firebaseapp.com",
            databaseURL: "https://web-video-chat-ea7f4-default-rtdb.firebaseio.com",
            projectId: "web-video-chat-ea7f4",
            storageBucket: "web-video-chat-ea7f4.appspot.com",
            messagingSenderId: "236341330399",
            appId: "1:236341330399:web:40b0dfbf0bd64c579b846a"
          };
        if (!firebaseConfig || typeof firebaseConfig !== 'object') {
            throw new Error('Invalid firebaseConfig provided. Please provide a valid object.');
        }
        this.firebaseConfig = firebaseConfig;
        
        this.initializeFirebase();  
        this.servers={
            iceServers: [
              {
                urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
              },
            ],
            iceCandidatePoolSize: 10,
          };
        this.pc=new wrtc.RTCPeerConnection(this.servers);
        this.localStream=null;
        this.remoteStream=null;
        this.webcam = NodeWebcam.create({
          width: 1280,
          height: 720,
          quality: 100,
          delay: 0,
          saveShots: false,
          output: "jpeg",
          device: false,
          callbackReturn: "location",
          verbose: false
      });
    }

    initializeFirebase() {
        try {
            this.app = initializeApp(this.firebaseConfig);
            // const app = initializeApp(this.firebaseConfig);
            this.db = getFirestore(this.app);

        } catch (error) {
            console.error('Error initializing Firebase:', error);
        }
    }
    async getCamera(webcamVideo, remoteVideo) {
      try {
          const imageData = await this.captureWebcamImage();
          // Tạo một luồng video giả lập từ ảnh chụp
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          const image = new Image();
          image.src = imageData;
          image.onload = () => {
              canvas.width = image.width;
              canvas.height = image.height;
              context.drawImage(image, 0, 0, image.width, image.height);
              const stream = canvas.captureStream();
              this.localStream = stream;
              this.remoteStream = new MediaStream(); // Xóa dòng này vì không cần tạo một MediaStream trống
              this.localStream.getTracks().forEach((track) => {
                  this.pc.addTrack(track, this.localStream);
              });
              this.pc.ontrack = (event) => {
                  event.streams[0].getTracks().forEach((track) => {
                      this.remoteStream.addTrack(track);
                  });
              };
              webcamVideo.srcObject = this.localStream;
              remoteVideo.srcObject = this.remoteStream;
          };
      } catch (error) {
          console.error('Error getting webcam image:', error);
      }
  }
    async callVideo(callInput)
    {
        const callDoc=this.db.collection('calls').doc();
        const offerCandidates=callDoc.collection('offerCandidates');
        const answerCandidates=callDoc.collection('answerCandidates');
        callInput.value = callDoc.id;
        this.pc.onicecandidate=(event)=>
            {
                event.candidate && offerCandidates.add(event.candidate.toJSON());
            }
        const offerDescription=await this.pc.createOffer();
        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
          };
        await callDoc.set({ offer });
        
    // listen for remote answer
    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!this.pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new wrtc.RTCSessionDescription(data.answer);
          this.pc.setRemoteDescription(answerDescription);
        }
      });

      // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        this.pc.addIceCandidate(candidate);
      }
    });
  });
    }
  
    async connectRoom(callInput)
    {
        const callId=callInput.value;
        const callDoc=this.db.collection('calls').doc(callId);
        const answerCandidates=callDoc.collection('answerCandidates');
        const offerCandidates=callDoc.collection('offerCandidates');

        this.pc.onicecandidate=(event)=>
            {
                event.candidate && answerCandidates.add(event.candidate.toJSON());
            }
        const callData = (await callDoc.get()).data();

        const offerDescription = callData.offer;
        await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
          };

          await callDoc.update({ answer });

        offerCandidates.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
              console.log(change);
              if (change.type === 'added') {
                let data = change.doc.data();
                this.pc.addIceCandidate(new RTCIceCandidate(data));
              }
            });
          });
    }
    getWebcamStream() {
      return new Promise((resolve, reject) => {
          this.webcam.capture('webcam', (err, data) => {
              if (err) {
                  reject(err);
              } else {
                  resolve(data);
              }
          });
      });
  }
}
module.exports=Connect;
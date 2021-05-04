import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

// const pcConfig = null;
const pcConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'turn:numb.viagenie.ca',
      username: 'sukagame25@gmail.com',
      credential: '1641720184',
    },
  ],
};
const pc = new RTCPeerConnection(pcConfig);
let socket = null;

const App = () => {
  const [textRef, SetTextRef] = useState();
  // const [candidates, setCandidates] = useState([]);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    socket = io('/webrtcPeer');

    socket.on('connection-success', (succes) => {
      console.log(succes);
    });

    socket.on('offerOrAnswer', (sdp) => {
      SetTextRef(JSON.stringify(sdp));
      pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('candidate', (candidate) => {
      // setCandidates((candidates) => [...candidates, candidate]);
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('ICE Candidate');
        // console.log(JSON.stringify(e.candidate));
        sendToPeer('candidate', e.candidate);
      }
    };

    pc.oniceconnectionstatechange = (e) => {
      console.log('ICE Connection Change');
      console.log(e);
    };

    pc.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      // let video = localVideo.current;
      // video.srcObject = stream;
      // video.play();
      // window.localStream = stream;
      localVideo.current.srcObject = stream;
      pc.addStream(stream);
    });
  }, []);

  const sendToPeer = (messageType, payload) => {
    socket.emit(messageType, {
      socketID: socket.id,
      payload,
    });
  };

  const createOffer = () => {
    console.log('Offer');
    pc.createOffer({ iceRestart: true }).then((sdp) => {
      // console.log(JSON.stringify(sdp));
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  const createAnswer = () => {
    console.log('Answer');
    pc.createAnswer({ iceRestart: true }).then((sdp) => {
      // console.log(JSON.stringify(sdp));
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  // const setRemoteDescription = () => {
  //   const desc = JSON.parse(textRef);
  //   pc.setRemoteDescription(new RTCSessionDescription(desc));
  // };

  // const addCandidate = () => {
  //   // const candidate = JSON.parse(textRef);
  //   // console.log('Adding candidate:', candidate);
  //   // pc.addIceCandidate(new RTCIceCandidate(candidate));
  //   candidates.forEach((candidate) => {
  //     console.log(JSON.stringify(candidate));
  //     pc.addIceCandidate(new RTCIceCandidate(candidate));
  //   });
  // };

  return (
    <div>
      <video style={{ width: 240, height: '240' }} ref={localVideo} autoPlay />
      <video style={{ width: 240, height: '240' }} ref={remoteVideo} autoPlay />
      <br />
      <button onClick={createOffer}>Offer</button>
      <button onClick={createAnswer}>Answer</button>
      <br />
      <textarea value={textRef} onChange={(e) => SetTextRef(e.target.value)} />
      <br />
      {/* <button onClick={setRemoteDescription}>Set Remote Desc</button>
      <button onClick={addCandidate}>Add Candidate</button> */}
    </div>
  );
};

export default App;

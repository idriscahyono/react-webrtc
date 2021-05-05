import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Video from './components/video';
import Videos from './components/videos';

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

const sdpConstraints = {
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true,
  },
};

const pc = new RTCPeerConnection(pcConfig);
let socket = null;
let serviceIp = '';

const App = () => {
  const [textRef, SetTextRef] = useState();
  // const [candidates, setCandidates] = useState([]);
  // const localVideo = useRef(null);
  // const remoteVideo = useRef(null);
  const [localStream, SetLocalStream] = useState(null);
  const [remoteStream, SetRemoteStream] = useState(null);
  const [remoteStreams, SetRemoteStreams] = useState([]);
  const [peerConnections, SetPeerConnection] = useState({});
  const [selectedVideo, SetSelectedVideo] = useState(null);
  const [status, setStatus] = useState('Please Wait..');

  useEffect(() => {
    socket = io(serviceIp);

    socket.on('connection-success', (data) => {
      console.log(data.succes);
      getLocalStream();
      const statusValue = data.peerCount > 1 ? `User Terkoneksi: ${data.peerCount}` : 'Waiting User Connect';

      setStatus(statusValue);
    });

    socket.on('peer-disconnected', (data) => {
      console.log('peer-disconnected', data);
      const remoteStreamsValue = remoteStreams.filter((stream) => stream.id !== data.socketID);
      const selectedVideoValue = selectedVideo.id === data.socketID && remoteStreamsValue.length ? { selectedVideo: remoteStreamsValue[0] } : null;
      SetRemoteStream(selectedVideoValue);
      SetSelectedVideo(selectedVideoValue);
    });

    socket.on('online-peer', (socketID) => {
      console.log('connected peers ... ', socketID);

      createPeerConnection(socketID, (pc) => {
        if (pc) {
          pc.createOffer(sdpConstraints).then((sdp) => {
            pc.setLocalDescription(sdp);
            sendToPeer('offer', sdp, {
              local: socket.id,
              remote: socketID,
            });
          });
        }
      });
    });

    socket.on('offer', (data) => {
      createPeerConnection(data.socketID, (pce) => {
        pce.addStream(localStream);
        pce.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          pce.createAnswer(sdpConstraints).then((sdp) => {
            pce.setLocalDescription(sdp);
            sendToPeer('answer', sdp, {
              local: socket.id,
              remote: data.socketID,
            });
          });
        });
      });
    });

    socket.on('answer', (data) => {
      const pce = peerConnections[data.socket.id];
      console.log('DATA SDP'.data.sdp);
      pce.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });

    socket.on('candidate', (data) => {
      const pce = peerConnections[data.socketID];
      if (pce) {
        pce.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // socket.on('offerOrAnswer', (sdp) => {
    //   SetTextRef(JSON.stringify(sdp));
    //   pc.setRemoteDescription(new RTCSessionDescription(sdp));
    // });

    // socket.on('candidate', (candidate) => {
    //   // setCandidates((candidates) => [...candidates, candidate]);
    //   pc.addIceCandidate(new RTCIceCandidate(candidate));
    // });

    // pc.onicecandidate = (e) => {
    //   if (e.candidate) {
    //     console.log('ICE Candidate');
    //     // console.log(JSON.stringify(e.candidate));
    //     sendToPeer('candidate', e.candidate);
    //   }
    // };

    // pc.oniceconnectionstatechange = (e) => {
    //   console.log('ICE Connection Change');
    //   console.log(e);
    // };

    // pc.ontrack = (e) => {
    //   remoteVideo.current.srcObject = e.streams[0];
    // };

    // navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    //   // let video = localVideo.current;
    //   // video.srcObject = stream;
    //   // video.play();
    //   // window.localStream = stream;
    //   localVideo.current.srcObject = stream;
    //   pc.addStream(stream);
    // });
  }, []);

  const getLocalStream = () => {
    const success = (stream) => {
      window.localStream = stream;
      SetLocalStream(stream);
      whoisOnline();
    };

    const failure = (e) => {
      console.log('GET USER MEDIA ERROR', e);
    };

    const constraints = {
      video: true,

      options: {
        mirror: true,
      },
    };

    navigator.mediaDevices.getUserMedia(constraints).then(success).catch(failure);
  };

  const whoisOnline = () => {
    sendToPeer('onlinePeers', null, { local: socket.id });
  };

  const sendToPeer = (messageType, payload, socketID) => {
    socket.emit(messageType, {
      socketID,
      payload,
    });
  };

  const createPeerConnection = (socketID, callback) => {
    try {
      const peerConnectionsObject = { peerConnections, [socketID]: pc };
      SetPeerConnection(peerConnectionsObject);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendToPeer('candidate', e.candidate, {
            local: socket.id,
            remote: socketID,
          });
        }
      };

      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0],
        };

        const remoteStreamValue = remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] };
        let selectedVideoValue = remoteStreams.filter((stream) => stream.id === selectedVideo.id);
        selectedVideoValue = selectedVideoValue.length ? {} : { selectedVideo: remoteVideo };

        SetSelectedVideo(selectedVideoValue);
        SetRemoteStream(remoteStreamValue);
        SetRemoteStreams((remoteStreams) => [...remoteStreams, remoteVideo]);

        if (localStream) {
          pc.addStream(localStream);
        }
        callback(pc);
      };
    } catch (e) {
      console.log('Terjadi Kesalahan Pada PEER CONNECTION', e);
      callback(null);
    }
  };

  // const createOffer = () => {
  //   console.log('Offer');
  //   pc.createOffer({ iceRestart: true }).then((sdp) => {
  //     // console.log(JSON.stringify(sdp));
  //     pc.setLocalDescription(sdp);
  //     sendToPeer('offerOrAnswer', sdp);
  //   });
  // };

  // const createAnswer = () => {
  //   console.log('Answer');
  //   pc.createAnswer({ iceRestart: true }).then((sdp) => {
  //     // console.log(JSON.stringify(sdp));
  //     pc.setLocalDescription(sdp);
  //     sendToPeer('offerOrAnswer', sdp);
  //   });
  // };

  const switchVideo = (_video) => {
    console.log('INI VIDEO', _video);
    SetSelectedVideo(_video);
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
  const StatusText = () => <div style={{ color: 'yellow', padding: 5 }}>{status}</div>;
  return (
    <div>
      <Video
        videoStyles={{
          zIndex: 2,
          position: 'absolute',
          right: 0,
          width: 200,
          height: 200,
          margin: 5,
          backgroundColor: 'black',
        }}
        // ref={this.localVideoref}
        videoStream={localStream}
        autoPlay
        muted
      ></Video>
      <Video
        videoStyles={{
          zIndex: 1,
          position: 'fixed',
          bottom: 0,
          minWidth: '100%',
          minHeight: '100%',
          backgroundColor: 'black',
        }}
        // ref={ this.remoteVideoref }
        videoStream={selectedVideo && selectedVideo.stream}
        autoPlay
      ></Video>
      <br />
      <div
        style={{
          zIndex: 3,
          position: 'absolute',
          margin: 10,
          backgroundColor: '#cdc4ff4f',
          padding: 10,
          borderRadius: 5,
        }}
      >
        <StatusText />
      </div>
      <div>
        <Videos switchVideo={switchVideo} remoteStreams={remoteStreams}></Videos>
      </div>
      <br />
    </div>
  );
};

export default App;

// <div>
//   <video style={{ width: 240, height: '240' }} ref={localVideo} autoPlay />
//   <video style={{ width: 240, height: '240' }} ref={remoteVideo} autoPlay />
//   <br />
//   <button onClick={createOffer}>Offer</button>
//   <button onClick={createAnswer}>Answer</button>
//   <br />
//   <textarea value={textRef} onChange={(e) => SetTextRef(e.target.value)} />
//   <br />
//   {/* <button onClick={setRemoteDescription}>Set Remote Desc</button>
//   <button onClick={addCandidate}>Add Candidate</button> */}
// </div>

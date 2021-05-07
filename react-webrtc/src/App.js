import React, { Component } from 'react';

import io from 'socket.io-client';

import Video from './components/video';
import Videos from './components/videos';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      localStream: null,
      remoteStream: null,

      remoteStreams: [],
      peerConnections: {},
      selectedVideo: null,

      status: 'Please wait...',

      pc_config: {
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
      },

      sdpConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true,
        },
      },
    };
    this.serviceIP = 'https://0595eaafa078.ngrok.io/webrtcPeer';

    this.socket = null;
  }

  getLocalStream = () => {
    const success = (stream) => {
      window.localStream = stream;
      this.setState({
        localStream: stream,
      });

      this.whoisOnline();
    };

    const failure = (e) => {
      console.log('getUserMedia Error: ', e);
    };

    const constraints = {
      audio: true,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,
      },
    };

    navigator.mediaDevices.getUserMedia(constraints).then(success).catch(failure);
    console.log('run');
  };

  whoisOnline = () => {
    this.sendToPeer('onlinePeers', null, { local: this.socket.id });
  };

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload,
    });
  };

  createPeerConnection = (socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(this.state.pc_config);
      const peerConnections = { ...this.state.peerConnections, [socketID]: pc };
      this.setState({
        peerConnections,
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID,
          });
        }
      };

      pc.oniceconnectionstatechange = (e) => {
        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)
        //   this.setState({
        //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
        //   })
        // }
      };

      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0],
        };

        this.setState((prevState) => {
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.streams[0] };
          let selectedVideo = prevState.remoteStreams.filter((stream) => stream.id === prevState.selectedVideo.id);
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo };

          return {
            ...selectedVideo,

            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo],
          };
        });
      };

      pc.close = () => {
        console.log('Close');
      };

      if (this.state.localStream) pc.addStream(this.state.localStream);

      callback(pc);
    } catch (e) {
      console.log('Something went wrong! pc not created!!', e);

      callback(null);
    }
  };

  componentDidMount = () => {
    this.socket = io(this.serviceIP, {
      query: {
        room: window.location.pathname,
      },
    });

    this.socket.on('connection-success', (data) => {
      this.getLocalStream();

      console.log(data.success);
      const status =
        data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect';

      this.setState({
        status: status,
      });
    });

    this.socket.on('joined-peers', (data) => {
      this.setState({
        status:
          data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect',
      });
    });

    this.socket.on('peer-disconnected', (data) => {
      console.log('peer-disconnected', data);

      const remoteStreams = this.state.remoteStreams.filter((stream) => stream.id !== data.socketID);

      this.setState((prevState) => {
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0] } : null;

        return {
          remoteStreams,
          ...selectedVideo,
          status:
            data.peerCount > 1
              ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}`
              : 'Waiting for other peers to connect',
        };
      });
    });

    this.socket.on('online-peer', (socketID) => {
      console.log('connected peers ...', socketID);

      this.createPeerConnection(socketID, (pc) => {
        if (pc)
          pc.createOffer(this.state.sdpConstraints).then((sdp) => {
            pc.setLocalDescription(sdp);

            this.sendToPeer('offer', sdp, {
              local: this.socket.id,
              remote: socketID,
            });
          });
      });
    });

    this.socket.on('offer', (data) => {
      this.createPeerConnection(data.socketID, (pc) => {
        pc.addStream(this.state.localStream);

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          pc.createAnswer(this.state.sdpConstraints).then((sdp) => {
            pc.setLocalDescription(sdp);

            this.sendToPeer('answer', sdp, {
              local: this.socket.id,
              remote: data.socketID,
            });
          });
        });
      });
    });

    this.socket.on('answer', (data) => {
      const pc = this.state.peerConnections[data.socketID];
      console.log(data.sdp);
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {});
    });

    this.socket.on('candidate', (data) => {
      const pc = this.state.peerConnections[data.socketID];

      if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
  };

  switchVideo = (_video) => {
    console.log(_video);
    this.setState({
      selectedVideo: _video,
    });
  };

  render() {
    console.log(this.state.localStream);

    const statusText = <div style={{ color: 'yellow', padding: 5 }}>{this.state.status}</div>;

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
          videoStream={this.state.localStream}
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
          videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
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
          {statusText}
        </div>
        <div>
          <Videos switchVideo={this.switchVideo} remoteStreams={this.state.remoteStreams}></Videos>
        </div>
        <br />
      </div>
    );
  }
}

export default App;

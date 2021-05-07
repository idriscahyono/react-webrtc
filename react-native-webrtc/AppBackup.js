import React, {useEffect, useState} from 'react';
import {
  Button,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import io from 'socket.io-client';
import Video from './src/components/Video';

const dimensions = Dimensions.get('window');

const pc_config = {
  iceServers: [
    {
      url: 'stun:stun.l.google.com:19302',
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
const serviceIP = 'https://0595eaafa078.ngrok.io/webrtcPeer';
const socket = null;

const AppBackup = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [peerConnections, setPeerConnections] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [status, setStatus] = useState('Please wait...');
  const [messages, setMessages] = useState([]);
  const [sendChannels, setSendChannels] = useState([]);
  const [disconnected, setDisconnected] = useState(false);
  const [room, setRoom] = useState(false);
  const [connect, setConnect] = useState(false);
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);

  const getLocalStream = () => {
    const success = stream => {
      console.log('localStream... ', stream.toURL());
      setLocalStream(stream);

      whoisOnline();
    };

    const failure = e => {
      console.log('getUserMedia Error: ', e);
    };

    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind === 'videoinput' &&
          sourceInfo.facing === (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }

      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: isFront ? 'user' : 'environment',
          optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
        },
      };

      mediaDevices.getUserMedia(constraints).then(success).catch(failure);
    });
  };

  const whoisOnline = () => {
    sendToPeer('onlinePeers', null, {local: this.socket.id});
  };

  const sendToPeer = (messageType, payload, socketID) => {
    socket.emit(messageType, {
      socketID,
      payload,
    });
  };

  const createPeerConnection = (socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(pc_config);
      const _peerConnections = {...peerConnections, [socketID]: pc};
      setPeerConnections(_peerConnections);

      pc.onicecandidate = e => {
        if (e.candidate) {
          sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID,
          });
        }
      };

      pc.oniceconnectionstatechange = e => {
        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)
        //   this.setState({
        //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
        //   })
        // }
      };

      pc.onaddstream = e => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.stream,
        };

        setRemoteStreams(prevState => [...prevState, remoteVideo]);

        const _remoteStream =
          remoteStreams.length > 0 ? {} : {remoteStream: e.stream};

        setLocalStream(_remoteStream);

        const _selectedVideo = remoteStream.filter(
          stream => stream.id === selectedVideo.id,
        );
        if (_selectedVideo.length) {
          setSelectedVideo({});
        } else {
          setSelectedVideo({selectedVideo: remoteVideo});
        }
      };

      pc.close = () => {
        // alert('GONE')
      };

      if (localStream) {
        pc.addStream(localStream);
      }
      // return pc
      callback(pc);
    } catch (e) {
      console.log('Something went wrong! pc not created!!', e);
      // return;
      callback(null);
    }
  };

  return (
    <View>
      <Text></Text>
    </View>
  );
};

export default AppBackup;

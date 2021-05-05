import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import io from 'socket.io-client';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';
const dimensions = Dimensions.get('window');

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
  const [localStream, SetLocalStream] = useState(null);
  const [remoteStream, SetRemoteStream] = useState(null);
  // const [sdp, SetSdp] = useState();
  // const localStream = useRef(null);
  // const remoteStream = useRef(null);

  useEffect(() => {
    socket = io('https://a5f4fe38bbf7.ngrok.io/webrtcPeer');

    socket.on('connection-success', succes => {
      console.log(succes);
    });

    socket.on('offerOrAnswer', sdp => {
      // SetSdp(JSON.stringify(esdp));
      pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('candidate', candidate => {
      // setCandidates((candidates) => [...candidates, candidate]);
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    pc.onicecandidate = e => {
      if (e.candidate) {
        console.log('ICE Candidate');
        // console.log(JSON.stringify(e.candidate));
        sendToPeer('candidate', e.candidate);
      }
    };

    pc.oniceconnectionstatechange = e => {
      console.log('ICE Connection Change');
      console.log(e);
    };

    pc.onaddstream = e => {
      SetRemoteStream(e.stream);
      // remoteStream.current = e.stream;
    };

    mediaDevices.enumerateDevices().then(infoSource => {
      let isFront = true;
      let videoSourceId;
      // console.log(infoSource);
      for (let i = 0; i < infoSource.length; i++) {
        const sourceInfo = infoSource[i];
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
            minWidth: 500,
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: isFront ? 'user' : 'environment',
          optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
        },
      };
      mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
          // console.log(stream);
          // localStream.current = stream;
          SetLocalStream(stream);
          pc.addStream(stream);
        })
        .catch(error => console.log('GET USER MEDIA ERROR', error));
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
    pc.createOffer({iceRestart: true}).then(sdp => {
      // console.log(JSON.stringify(sdp));
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  const createAnswer = () => {
    console.log('Answer');
    pc.createAnswer({iceRestart: true}).then(sdp => {
      // console.log(JSON.stringify(sdp));
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  const RemoteVideo = () => {
    return remoteStream ? (
      <RTCView
        key={2}
        mirror={true}
        style={styles.rtcViewRemote}
        objectFit="contain"
        streamURL={remoteStream && remoteStream.toURL()}
      />
    ) : (
      <View style={{padding: 15}}>
        <Text style={{fontSize: 22, textAlign: 'center', color: 'white'}}>
          Waiting user join...
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.buttonsContainer}>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createOffer}>
            <View style={styles.button}>
              <Text style={styles.textContent}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createAnswer}>
            <View style={styles.button}>
              <Text style={styles.textContent}>Answer</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.videosContainer}>
        <ScrollView style={styles.scrollView}>
          <View
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <RemoteVideo />
          </View>
          {/* <View style={{width: 100}}>
            <TouchableOpacity
              onPress={() => localStream._tracks[1]._switchCamera()}>
              <View>
                <RTCView
                  key={1}
                  zOrder={0}
                  objectFit="cover"
                  style={styles.rtcView}
                  streamURL={localStream && localStream.toURL()}
                />
              </View>
            </TouchableOpacity>
          </View> */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rtcView: {
    width: 100,
    height: 200,
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
    // flexDirection: 'row',
    backgroundColor: 'teal',
    padding: 15,
  },
  rtcViewRemote: {
    width: dimensions.width - 30,
    height: 200,
    backgroundColor: 'black',
  },
});

export default App;

import React from 'react';
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

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      localStream: null, // used to hold local stream object to avoid recreating the stream everytime a new offer comes
      remoteStream: null, // used to hold remote stream object that is displayed in the main screen

      remoteStreams: [], // holds all Video Streams (all remote streams)
      peerConnections: {}, // holds all Peer Connections
      selectedVideo: null,

      status: 'Please wait...',

      pc_config: {
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
      },

      sdpConstraints: {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true,
        },
      },

      messages: [],
      sendChannels: [],
      disconnected: false,
      room: null,
      connect: false,
      camera: true,
      mic: true,
    };

    // DONT FORGET TO CHANGE TO YOUR URL
    this.serviceIP = 'https://0595eaafa078.ngrok.io/webrtcPeer';

    // this.sdp
    this.socket = null;
    // this.candidates = []
  }

  getLocalStream = () => {
    const success = stream => {
      console.log('localStream... ', stream.toURL());
      this.setState({
        localStream: stream,
      });

      this.whoisOnline();
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
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
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

  whoisOnline = () => {
    // let all peers know I am joining
    this.sendToPeer('onlinePeers', null, {local: this.socket.id});
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

      // add pc to peerConnections object
      const peerConnections = {...this.state.peerConnections, [socketID]: pc};
      this.setState({
        peerConnections,
      });

      pc.onicecandidate = e => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
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
        let _remoteStream = null;
        let remoteStreams = this.state.remoteStreams;
        let remoteVideo = {};

        remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.stream,
        };
        remoteStreams = [...this.state.remoteStreams, remoteVideo];

        this.setState(prevState => {
          const remoteStream =
            prevState.remoteStreams.length > 0 ? {} : {remoteStream: e.stream};
          let selectedVideo = prevState.remoteStreams.filter(
            stream => stream.id === prevState.selectedVideo.id,
          );
          selectedVideo = selectedVideo.length
            ? {}
            : {selectedVideo: remoteVideo};

          return {
            ...selectedVideo,

            ...remoteStream,
            remoteStreams,
          };
        });
      };

      pc.close = () => {
        // alert('GONE')
      };

      if (this.state.localStream) {
        pc.addStream(this.state.localStream);
      }
      // return pc
      callback(pc);
    } catch (e) {
      console.log('Something went wrong! pc not created!!', e);
      // return;
      callback(null);
    }
  };

  componentDidMount = () => {};

  joinRoom = () => {
    this.setState({
      connect: true,
    });

    const room = this.state.room || '';

    this.socket = io.connect(this.serviceIP, {
      query: {
        room: `/${room}`,
      },
    });

    this.socket.on('connection-success', data => {
      this.getLocalStream();

      console.log(data.success);
      const status =
        data.peerCount > 1
          ? `Total Connected Peers to room ${this.state.room}: ${data.peerCount}`
          : this.state.status;

      this.setState({
        status,
        messages: data.messages,
      });
    });

    this.socket.on('joined-peers', data => {
      this.setState({
        status:
          data.peerCount > 1
            ? `Total Connected Peers to room ${this.state.room}: ${data.peerCount}`
            : 'Waiting for other peers to connect',
      });
    });

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data);

      const remoteStreams = this.state.remoteStreams.filter(
        stream => stream.id !== data.socketID,
      );

      this.setState(prevState => {
        const selectedVideo =
          prevState.selectedVideo.id === data.socketID && remoteStreams.length
            ? {selectedVideo: remoteStreams[0]}
            : null;

        console.log('PEER DISCONNECTED', ...selectedVideo);

        return {
          remoteStreams,
          ...selectedVideo,
          status:
            data.peerCount > 1
              ? `Total Connected Peers to room ${this.state.room}: ${data.peerCount}`
              : 'Waiting for other peers to connect',
        };
      });
    });

    this.socket.on('online-peer', socketID => {
      console.log('connected peers ...', socketID);
      this.createPeerConnection(socketID, pc => {
        if (pc) {
          const handleSendChannelStatusChange = event => {
            console.log(
              'send channel status: ' + this.state.sendChannels[0].readyState,
            );
          };

          const sendChannel = pc.createDataChannel('sendChannel');
          sendChannel.onopen = handleSendChannelStatusChange;
          sendChannel.onclose = handleSendChannelStatusChange;

          this.setState(prevState => {
            return {
              sendChannels: [...prevState.sendChannels, sendChannel],
            };
          });

          const handleReceiveMessage = event => {
            const message = JSON.parse(event.data);
            console.log(message);
            this.setState(prevState => {
              return {
                messages: [...prevState.messages, message],
              };
            });
          };

          const handleReceiveChannelStatusChange = event => {
            if (this.receiveChannel) {
              console.log(
                "receive channel's status has changed to " +
                  this.receiveChannel.readyState,
              );
            }
          };

          const receiveChannelCallback = event => {
            const receiveChannel = event.channel;
            receiveChannel.onmessage = handleReceiveMessage;
            receiveChannel.onopen = handleReceiveChannelStatusChange;
            receiveChannel.onclose = handleReceiveChannelStatusChange;
          };

          pc.ondatachannel = receiveChannelCallback;

          pc.createOffer(this.state.sdpConstraints).then(sdp => {
            pc.setLocalDescription(sdp);

            this.sendToPeer('offer', sdp, {
              local: this.socket.id,
              remote: socketID,
            });
          });
        }
      });
    });

    this.socket.on('offer', data => {
      this.createPeerConnection(data.socketID, pc => {
        pc.addStream(this.state.localStream);
        const handleSendChannelStatusChange = event => {
          console.log(
            'send channel status: ' + this.state.sendChannels[0].readyState,
          );
        };

        const sendChannel = pc.createDataChannel('sendChannel');
        sendChannel.onopen = handleSendChannelStatusChange;
        sendChannel.onclose = handleSendChannelStatusChange;

        this.setState(prevState => {
          return {
            sendChannels: [...prevState.sendChannels, sendChannel],
          };
        });
        const handleReceiveMessage = event => {
          const message = JSON.parse(event.data);
          console.log(message);
          this.setState(prevState => {
            return {
              messages: [...prevState.messages, message],
            };
          });
        };

        const handleReceiveChannelStatusChange = event => {
          if (this.receiveChannel) {
            console.log(
              "receive channel's status has changed to " +
                this.receiveChannel.readyState,
            );
          }
        };

        const receiveChannelCallback = event => {
          const receiveChannel = event.channel;
          receiveChannel.onmessage = handleReceiveMessage;
          receiveChannel.onopen = handleReceiveChannelStatusChange;
          receiveChannel.onclose = handleReceiveChannelStatusChange;
        };

        pc.ondatachannel = receiveChannelCallback;
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(
          () => {
            pc.createAnswer(this.state.sdpConstraints).then(sdp => {
              pc.setLocalDescription(sdp);

              this.sendToPeer('answer', sdp, {
                local: this.socket.id,
                remote: data.socketID,
              });
            });
          },
        );
      });
    });

    this.socket.on('answer', data => {
      const pc = this.state.peerConnections[data.socketID];
      pc.setRemoteDescription(
        new RTCSessionDescription(data.sdp),
      ).then(() => {});
    });

    this.socket.on('candidate', data => {
      const pc = this.state.peerConnections[data.socketID];

      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  };

  switchVideo = _video => {
    this.setState({
      selectedVideo: _video,
    });
  };

  stopTracks = stream => {
    console.log(stream);
    stream.getTracks().forEach(track => track.stop());
  };

  disconnect = () => {
    this.socket.close();
    this.stopTracks(this.state.localStream);
    this.state.remoteStreams.forEach(rVideo => this.stopTracks(rVideo.stream));
    this.peerConnections &&
      Object.values(this.state.peerConnections).forEach(pc => pc.close());

    this.setState({
      connect: false,
      peerConnections: {},
      remoteStreams: [],
      localStream: null,
      remoteStream: null,
      selectedVideo: null,
    });
  };

  cameraBtn = () => {
    const videoTrack = this.state.localStream
      .getTracks()
      .filter(track => track.kind === 'video');
    videoTrack[0].enabled = !videoTrack[0].enabled;
    this.setState({
      camera: videoTrack[0].enabled,
    });
  };

  audioBtn = () => {
    const audioTrack = this.state.localStream
      .getTracks()
      .filter(track => track.kind === 'audio');
    audioTrack[0].enabled = !audioTrack[0].enabled;
    this.setState({
      mic: audioTrack[0].enabled,
    });
  };

  render() {
    const {
      localStream,
      remoteStreams,
      peerConnections,
      room,
      connect,
    } = this.state;

    const RemoteVideos = () => {
      return remoteStreams.map(rStream => {
        <TouchableOpacity onPress={() => this.switchVideo(rStream)}>
          <View
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 2,
            }}>
            <Video
              keys={2}
              mirror={true}
              style={{...styles.rtcViewRemote}}
              objectFit="contain"
              streamURL={rStream.stream}
              type="remote"
            />
          </View>
        </TouchableOpacity>;
      });
    };

    const RemoteVideo = () => {
      return this.state.selectedVideo ? (
        <Video
          keys={2}
          mirror={true}
          style={{width: dimensions.width, height: dimensions.height / 2}}
          objectFit="cover"
          streamURL={
            this.state.selectedVideo && this.state.selectedVideo.stream
          }
          type="remote"
        />
      ) : (
        <View style={{padding: 15}}>
          <Text style={{fontSize: 22, textAlign: 'center', color: 'white'}}>
            Waiting for Peer connection ...
          </Text>
        </View>
      );
    };

    if (!connect) {
      return (
        <SafeAreaView style={{flex: 1}}>
          <StatusBar backgroundColor="blue" barStyle={'dark-content'} />
          <View
            style={{
              ...styles.buttonsContainer,
              paddingHorizontal: 15,
            }}>
            <TextInput
              maxLength={10}
              slectionColor={'green'}
              placeholderTextColor="lightgrey"
              placeholder="e.g. room1"
              style={{
                width: 200,
                color: 'black',
                fontSize: 18,
                backgroundColor: 'white',
                borderColor: '#000000',
                borderWidth: 1,
                paddingHorizontal: 10,
              }}
              value={room}
              onChangeText={text => this.setState({room: text})}
            />
            <Button onPress={this.joinRoom} title="Join Room" color="black" />
          </View>
        </SafeAreaView>
      );
    }

    const VideoActionButtons = () => (
      <View
        style={{
          ...styles.buttonsContainer,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 15,
        }}>
        <Button
          onPress={this.cameraBtn}
          title={`camera ${(this.state.camera && '(on)') || '(off)'}`}
          color={`${(this.state.camera && 'black') || 'red'}`}
        />
        <Button
          onPress={this.audioBtn}
          title={`mic ${(this.state.mic && '(on)') || '(off)'}`}
          color={`${(this.state.mic && 'black') || 'red'}`}
        />
        <Button onPress={this.disconnect} title="X DISCONNECT" color="red" />
      </View>
    );

    return (
      <SafeAreaView style={{flex: 1}}>
        <VideoActionButtons />
        <View style={{...styles.videosContainer}}>
          <View
            style={{
              position: 'absolute',
              zIndex: 1,
              top: 10,
              right: 10,
              width: 100,
              backgroundColor: 'black',
            }}>
            <View style={{flex: 1}}>
              <TouchableOpacity
                onPress={() => localStream._tracks[1]._switchCamera()}>
                <View>
                  <Video
                    key={1}
                    zOrder={0}
                    objectFit="cover"
                    style={{...styles.rtcView}}
                    streamURL={localStream}
                    type="local"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <View
            onPress={() => alert('hello')}
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <RemoteVideo />
          </View>
          <ScrollView horizontal={true} style={{...styles.scrollView}}>
            <RemoteVideos />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
    height: 150,
    backgroundColor: 'black',
    borderRadius: 5,
  },
  scrollView: {
    position: 'absolute',
    zIndex: 0,
    bottom: 10,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  rtcViewRemote: {
    width: 110,
    height: 110,
    borderRadius: 5,
  },
});

export default App;

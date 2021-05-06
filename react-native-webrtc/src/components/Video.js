import React, {Component} from 'react';
import {View} from 'react-native';
import {mediaDevices, registerGlobals, RTCView} from 'react-native-webrtc';

class Video extends Component {
  constructor(props) {
    super(props);
    // this.state = {}
  }

  render() {
    const {keys, zOrder, objectFit, style, streamURL} = this.props;
    const _streamURL = streamURL && streamURL.toURL();
    return (
      <View>
        <RTCView
          key={keys}
          zOrder={zOrder}
          objectFit={objectFit}
          style={{...style}}
          streamURL={_streamURL}
        />
      </View>
    );
  }
}

export default Video;

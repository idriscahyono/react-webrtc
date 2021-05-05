import React, { Component } from 'react';

class Video extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    if (this.props.videoStream) {
      this.video.srcObject = this.props.videoStream;
    }
  }

  componentWillReceiveProps(nextProps) {
    console.log(nextProps.videoStream);

    if (nextProps.videoStream && nextProps.videoStream !== this.props.videoStream) {
      this.video.srcObject = nextProps.videoStream;
    }
  }

  render() {
    return (
      <div style={{ ...this.props.frameStyle }}>
        <video
          id={this.props.id}
          muted={this.props.muted}
          autoPlay
          style={{ ...this.props.videoStyles }}
          ref={(ref) => {
            this.video = ref;
          }}
        ></video>
      </div>
    );
  }
}

export default Video;

// import React, { useEffect, useRef } from 'react';

// const Video = (props) => {
//   const { id, muted, videoStyles, videoStream } = props;
//   //   const [video, setVideo] = useState();
//   const video = useRef(null);

//   useEffect(() => {
//     if (videoStream) {
//       video.current.srcObject = videoStream;
//     }
//   }, []);

//   useEffect(()=>{

//     console.log(videoStream)

//   }, [videoStream])

//   return (
//     <div>
//       <video id={id} muted={muted} autoPlay style={videoStyles} ref={(ref) => (video.current.srcObject = ref)} />
//     </div>
//   );
// };

// export default Video;

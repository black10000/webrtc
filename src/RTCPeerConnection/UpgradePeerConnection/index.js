import React from 'react'

export default class UpgradePeerConnection extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            startButton: undefined,
            callButton: undefined,
            upgradeButton: undefined,
            hangupButton: undefined,
            localVideo: undefined,
            remoteVideo: undefined,
            localStream: undefined,
            pc1: undefined,
            pc2: undefined
        }
        this.start = this.start.bind(this)
        this.call = this.call.bind(this)
        this.upgrade = this.upgrade.bind(this)
        this.hangup=this.hangup.bind(this)
        this.onCreateOfferSuccess = this.onCreateOfferSuccess.bind(this)
        this.gotRemoteStream = this.gotRemoteStream.bind(this)
        this.onCreateAnswerSuccess = this.onCreateAnswerSuccess.bind(this)
    }
    componentDidMount() {
        const startButton = document.getElementById('startButton');
        const callButton = document.getElementById('callButton');
        const upgradeButton = document.getElementById('upgradeButton');
        const hangupButton = document.getElementById('hangupButton');

        callButton.disabled = true;
        hangupButton.disabled = true;
        upgradeButton.disabled = true;
        startButton.onclick = this.start;
        callButton.onclick = this.call;
        upgradeButton.onclick = this.upgrade;
        hangupButton.onclick = this.hangup;

        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        this.setState({
            localVideo: localVideo, remoteVideo: remoteVideo, startButton: startButton,
            callButton: callButton, upgradeButton: upgradeButton, hangupButton: hangupButton
        })

    }
    async start() {
        console.log('Requesting local stream');
        this.state.startButton.disabled = true;
        var stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        })
        console.log('Received local stream');
        this.state.localVideo.srcObject = stream;
        this.setState({ localStream: stream })
        this.state.callButton.disabled = false;
    }
    call() {
        this.state.callButton.disabled = true;
        this.state.upgradeButton.disabled = false;
        this.state.hangupButton.disabled = false;
        console.log('Starting call');
        //let startTime = window.performance.now();
        const audioTracks = this.state.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}`);
        }
        const servers = null;
        var pc1 = new RTCPeerConnection(servers);
        console.log('Created local peer connection object pc1');
        pc1.onicecandidate = e => this.onIceCandidate(pc1, e);
        var pc2 = new RTCPeerConnection(servers);
        console.log('Created remote peer connection object pc2');
        pc2.onicecandidate = e => this.onIceCandidate(pc2, e);
        //pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
        //pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);
        pc2.ontrack = this.gotRemoteStream;

        this.state.localStream.getTracks().forEach(track => pc1.addTrack(track, this.state.localStream));
        console.log('Added local stream to pc1');

        console.log('pc1 createOffer start');
        const offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 0
        }
        pc1.createOffer(offerOptions).then(this.onCreateOfferSuccess, this.onCreateSessionDescriptionError);
        this.setState({ pc1: pc1, pc2: pc2 })
    }
    upgrade() {
        this.state.upgradeButton.disabled = true;
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(stream => {
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    console.log(`Using video device: ${videoTracks[0].label}`);
                }
                this.state.localStream.addTrack(videoTracks[0]);
                this.state.localVideo.srcObject = null;
                this.state.localVideo.srcObject = this.state.localStream;
                this.state.pc1.addTrack(videoTracks[0], this.state.localStream);
                return this.state.pc1.createOffer();
            })
            .then(offer => this.state.pc1.setLocalDescription(offer))
            .then(() => this.state.pc2.setRemoteDescription(this.state.pc1.localDescription))
            .then(() => this.state.pc2.createAnswer())
            .then(answer => this.state.pc2.setLocalDescription(answer))
            .then(() => this.state.pc1.setRemoteDescription(this.state.pc2.localDescription));
    }
    onCreateSessionDescriptionError(error) {
        console.log(`Failed to create session description: ${error.toString()}`);
    }
    onCreateOfferSuccess(desc) {
        console.log(`Offer from pc1\n${desc.sdp}`);
        console.log('pc1 setLocalDescription start');
        this.state.pc1.setLocalDescription(desc)//.then(() => onSetLocalSuccess(htis.state.pc1), onSetSessionDescriptionError);
        console.log('pc2 setRemoteDescription start');
        this.state.pc2.setRemoteDescription(desc)//.then(() => onSetRemoteSuccess(this.state.pc2), onSetSessionDescriptionError);
        console.log('pc2 createAnswer start');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        this.state.pc2.createAnswer().then(this.onCreateAnswerSuccess, this.onCreateSessionDescriptionError);
    }
    onCreateAnswerSuccess(desc) {
        console.log(`Answer from pc2:
      ${desc.sdp}`);
        console.log('pc2 setLocalDescription start');
        this.state.pc2.setLocalDescription(desc)//.then(() => onSetLocalSuccess(pc2), onSetSessionDescriptionError);
        console.log('pc1 setRemoteDescription start');
        this.state.pc1.setRemoteDescription(desc)//.then(() => onSetRemoteSuccess(pc1), onSetSessionDescriptionError);
    }
    onCreateSessionDescriptionError(error) {
        console.log(`Failed to create session description: ${error.toString()}`);
    }
    gotRemoteStream(e) {
        console.log('gotRemoteStream', e.track, e.streams[0]);

        // reset srcObject to work around minor bugs in Chrome and Edge.
        this.state.remoteVideo.srcObject = null;
        this.state.remoteVideo.srcObject = e.streams[0];
    }
    onIceCandidate(pc, event) {
        this.getOtherPc(pc)
            .addIceCandidate(event.candidate)
            .then(() => this.onAddIceCandidateSuccess(pc), err => this.onAddIceCandidateError(pc, err));
        console.log(`${this.getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    }
    onAddIceCandidateSuccess(pc) {
        console.log(`${this.getName(pc)} addIceCandidate success`);
    }
    onAddIceCandidateError(pc, error) {
        console.log(`${this.getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
    }
    getOtherPc(pc) {
        return (pc === this.state.pc1) ? this.state.pc2 : this.state.pc1;
    }
    getName(pc) {
        return (pc === this.state.pc1) ? 'pc1' : 'pc2';
    }
    hangup() {
        console.log('Ending call');
        this.state.pc1.close();
        this.state.pc2.close();
        this.setState({pc1:undefined,pc2:undefined})

        const videoTracks = this.state.localStream.getVideoTracks();
        videoTracks.forEach(videoTrack => {
            videoTrack.stop();
            this.state.localStream.removeTrack(videoTrack);
        });
        this.state.localVideo.srcObject = null;
        this.state.localVideo.srcObject = this.state.localStream;

        this.state.hangupButton.disabled = true;
        this.state.callButton.disabled = false;
    }
    render() {
        return (
            <div>
                <video id="localVideo" playsInline autoPlay muted></video>
                <video id="remoteVideo" playsInline autoPlay></video>

                <div>
                    <button id="startButton">Start</button>
                    <button id="callButton">Call</button>
                    <button id="upgradeButton">Turn on video</button>
                    <button id="hangupButton">Hang Up</button>
                </div>
            </div>
        )
    }
}
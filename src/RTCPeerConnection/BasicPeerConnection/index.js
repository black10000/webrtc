import React from 'react'

export default class BasicPeerConnection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startButton: undefined,
            callButton: undefined,
            hangupButton: undefined,
            localStream: undefined,
            localVideo: undefined,
            remoteVideo: undefined,
            pc1: undefined,
            pc2: undefined
        }
        this.start = this.start.bind(this);
        this.call = this.call.bind(this);
        this.onIceCandidate = this.onIceCandidate.bind(this);
        this.gotRemoteStream = this.gotRemoteStream.bind(this);
        this.hangup = this.hangup.bind(this);
    }
    componentDidMount() {
        const startButton = document.getElementById('startButton');
        const callButton = document.getElementById('callButton');
        const hangupButton = document.getElementById('hangupButton');

        startButton.addEventListener('click', this.start);
        callButton.addEventListener('click', this.call);
        hangupButton.addEventListener('click', this.hangup);

        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');

        this.setState({
            startButton: startButton, callButton: callButton, hangupButton: hangupButton,
            localVideo: localVideo, remoteVideo: remoteVideo
        })
    }
    hangup() {
        console.log('Ending call');
        this.state.pc1.close();
        this.state.pc2.close();
        this.state.pc1 = undefined;
        this.state.pc2 = undefined;
        this.state.hangupButton.disabled = true;
        this.state.callButton.disabled = false;
    }
    async start() {
        console.log('Requesting local stream');
        this.state.startButton.disabled = true;
        const localVideo = document.getElementById('localVideo');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            console.log('Received local stream');
            localVideo.srcObject = stream;
            this.setState({ localStream: stream })
            this.state.callButton.disabled = false;
        } catch (e) {
            alert(`getUserMedia() error: ${e.name}`);
        }
    }
    async call() {
        this.state.callButton.disabled = true;
        this.state.hangupButton.disabled = false;
        console.log('Starting call');
        const videoTracks = this.state.localStream.getVideoTracks();
        const audioTracks = this.state.localStream.getAudioTracks();
        if (videoTracks.length > 0) {
            console.log(`Using video device: ${videoTracks[0].label}`);
        }
        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}`);
        }
        const configuration = this.getSelectedSdpSemantics();
        console.log('RTCPeerConnection configuration:', configuration);
        var pc1 = new RTCPeerConnection(configuration);
        console.log('Created local peer connection object pc1');
        pc1.addEventListener('icecandidate', e => this.onIceCandidate(pc1, e));
        var pc2 = new RTCPeerConnection(configuration);
        console.log('Created remote peer connection object pc2');
        pc2.addEventListener('icecandidate', e => this.onIceCandidate(pc2, e));
        pc1.addEventListener('iceconnectionstatechange', e => this.onIceStateChange(pc1, e));
        pc2.addEventListener('iceconnectionstatechange', e => this.onIceStateChange(pc2, e));
        pc2.addEventListener('track', this.gotRemoteStream);
        this.setState({ pc1: pc1, pc2: pc2 })
        this.state.localStream.getTracks().forEach(track => pc1.addTrack(track, this.state.localStream));
        console.log('Added local stream to pc1');

        try {
            const offerOptions = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            };
            console.log('pc1 createOffer start');
            const offer = await pc1.createOffer(offerOptions);
            await this.onCreateOfferSuccess(offer);
        } catch (e) {
            this.onCreateSessionDescriptionError(e);
        }
    }
    getSelectedSdpSemantics() {
        const sdpSemanticsSelect = document.querySelector('#sdpSemantics');
        const option = sdpSemanticsSelect.options[sdpSemanticsSelect.selectedIndex];
        return option.value === '' ? {} : { sdpSemantics: option.value };
    }
    async onIceCandidate(pc, event) {
        try {
            await (this.getOtherPc(pc).addIceCandidate(event.candidate));
            this.onAddIceCandidateSuccess(pc);
        } catch (e) {
            this.onAddIceCandidateError(pc, e);
        }
        //console.log(`${this.getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    }
    onIceStateChange(pc, event) {
        if (pc) {
            console.log(`${this.getName(pc)} ICE state: ${pc.iceConnectionState}`);
            console.log('ICE state change event: ', event);
        }
    }
    gotRemoteStream(e) {
        console.log('got remote stream')
        console.log(this.state.remoteVideo)
        if (this.state.remoteVideo.srcObject !== e.streams[0]) {
            this.state.remoteVideo.srcObject = e.streams[0];
            console.log('pc2 received remote stream');
        }
    }
    onAddIceCandidateSuccess(pc) {
        console.log(`${this.getName(pc)} addIceCandidate success`);
    }
    onAddIceCandidateError(pc, error) {
        console.log(`${this.getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
    }
    async onCreateOfferSuccess(desc) {
        console.log(`Offer from pc1\n${desc.sdp}`);
        console.log('pc1 setLocalDescription start');
        try {
            await this.state.pc1.setLocalDescription(desc);
            this.onSetLocalSuccess(this.state.pc1);
        } catch (e) {
            this.onSetSessionDescriptionError();
        }

        console.log('pc2 setRemoteDescription start');
        try {
            await this.state.pc2.setRemoteDescription(desc);
            this.onSetRemoteSuccess(this.state.pc2);
        } catch (e) {
            this.onSetSessionDescriptionError();
        }

        console.log('pc2 createAnswer start');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        try {
            const answer = await this.state.pc2.createAnswer();
            await this.onCreateAnswerSuccess(answer);
        } catch (e) {
            this.onCreateSessionDescriptionError(e);
        }
    }
    onSetSessionDescriptionError(error) {
        console.log(`Failed to set session description: ${error.toString()}`);
    }
    onSetLocalSuccess(pc) {
        console.log(`${this.getName(pc)} setLocalDescription complete`);
    }
    onSetRemoteSuccess(pc) {
        console.log(`${this.getName(pc)} setRemoteDescription complete`);
    }
    onCreateSessionDescriptionError(error) {
        console.log(`Failed to create session description: ${error.toString()}`);
    }
    getOtherPc(pc) {
        return (pc === this.state.pc1) ? this.state.pc2 : this.state.pc1;
    }
    getName(pc) {
        return (pc === this.state.pc1) ? 'pc1' : 'pc2';
    }
    async onCreateAnswerSuccess(desc) {
        console.log(`Answer from pc2:\n${desc.sdp}`);
        console.log('pc2 setLocalDescription start');
        try {
            await this.state.pc2.setLocalDescription(desc);
            this.onSetLocalSuccess(this.state.pc2);
        } catch (e) {
            this.onSetSessionDescriptionError(e);
        }
        console.log('pc1 setRemoteDescription start');
        try {
            await this.state.pc1.setRemoteDescription(desc);
            this.onSetRemoteSuccess(this.state.pc1);
        } catch (e) {
            this.onSetSessionDescriptionError(e);
        }
    }
    render() {
        return (
            <div>
                <video id="localVideo" playsInline autoPlay muted></video>
                <video id="remoteVideo" playsInline autoPlay></video>

                <div className="box">
                    <button id="startButton">Start</button>
                    <button id="callButton">Call</button>
                    <button id="hangupButton">Hang Up</button>
                </div>

                <div className="box">
                    <span>SDP Semantics:</span>
                    <select defaultValue="" id="sdpSemantics">
                        <option value="">Default</option>
                        <option value="unified-plan">Unified Plan</option>
                        <option value="plan-b">Plan B</option>
                    </select>
                </div>
            </div>
        )
    }
}
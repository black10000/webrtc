import React from 'react'

export default class AutoPeer extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            pc1: undefined,
            pc2: undefined,
            //localStream: undefined
        }
        this.gotRemoteStream = this.gotRemoteStream.bind(this);
    }
    componentDidMount() {
        this.setLocalVideo();

    }
    async setLocalVideo() {
        var localVideo = document.getElementById("localVideo");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = stream;
        var localStream = stream;
        const configuration = {};
        var pc1 = new RTCPeerConnection(configuration);
        pc1.addEventListener('icecandidate', e => this.onIceCandidate(pc1, e));
        var pc2 = new RTCPeerConnection(configuration);
        this.setState({ pc1: pc1, pc2: pc2 })
        pc2.addEventListener('icecandidate', e => this.onIceCandidate(pc2, e));
        pc1.addEventListener('iceconnectionstatechange', e => this.onIceStateChange(pc1, e));
        pc2.addEventListener('iceconnectionstatechange', e => this.onIceStateChange(pc2, e));
        pc2.addEventListener('track', this.gotRemoteStream);
        localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));

        try {
            const offerOptions = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            };
            console.log('pc1 createOffer start');
            const offer = await pc1.createOffer(offerOptions);
            await this.onCreateOfferSuccess(offer,pc1,pc2);
        } catch (e) {
            //this.onCreateSessionDescriptionError(e);
        }
        //this.setState({ localStream: stream })
    }
    async onCreateOfferSuccess(desc,pc1,pc2) {
        try {
            await pc1.setLocalDescription(desc);
            //this.onSetLocalSuccess(pc1);
        } catch (e) {
            //this.onSetSessionDescriptionError();
        }

        console.log('pc2 setRemoteDescription start');
        try {
            await pc2.setRemoteDescription(desc);
            //this.onSetRemoteSuccess(pc2);
        } catch (e) {
            //this.onSetSessionDescriptionError();
        }

        console.log('pc2 createAnswer start');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        try {
            const answer = await pc2.createAnswer();
            await this.onCreateAnswerSuccess(answer,pc1,pc2);
        } catch (e) {
            //this.onCreateSessionDescriptionError(e);
        }
    }
    onIceStateChange(pc, event) {
        if (pc) {
            //console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
            console.log('ICE state change event: ', event);
        }
    }
    async onIceCandidate(pc, event) {
        try {
            await (this.getOtherPc(pc).addIceCandidate(event.candidate));
            //onAddIceCandidateSuccess(pc);
        } catch (e) {
            //onAddIceCandidateError(pc, e);
        }
        //console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
    }
    getOtherPc(pc) {
        return (pc === this.state.pc1) ? this.state.pc2 : this.state.pc1;
    }
    gotRemoteStream(e) {
        var remoteVideo = document.getElementById("remoteVideo");
        if (remoteVideo.srcObject !== e.streams[0]) {
            remoteVideo.srcObject = e.streams[0];
            console.log('pc2 received remote stream');
        }
    }
    async onCreateAnswerSuccess(desc,pc1,pc2) {
        console.log(`Answer from pc2:\n${desc.sdp}`);
        console.log('pc2 setLocalDescription start');
        try {
            await pc2.setLocalDescription(desc);
            //this.onSetLocalSuccess(this.state.pc2);
        } catch (e) {
            //this.onSetSessionDescriptionError(e);
        }
        console.log('pc1 setRemoteDescription start');
        try {
            await pc1.setRemoteDescription(desc);
            //this.onSetRemoteSuccess(this.state.pc1);
        } catch (e) {
            //this.onSetSessionDescriptionError(e);
        }
    }
    render() {
        return (
            <div>
                <video id="localVideo" playsInline autoPlay muted></video>
                <video id="remoteVideo" playsInline autoPlay></video>
            </div>
        )
    }
}
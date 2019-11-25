import React from 'react'
export default class BasicDemo extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            constraints: undefined
        }
    }
    componentDidMount() {
        const constraints = window.constraints = {
            audio: false,
            video: true
        }
        this.setState({ constraints: constraints })

        document.querySelector('#showVideo').addEventListener('click', e => this.init(e))
    }
    handleSuccess(stream) {
        const video = document.querySelector('video')
        const videoTracks = stream.getVideoTracks()
        console.log('Got stream with constraints:', this.state.constraints)
        console.log(`Using video device: ${videoTracks[0].label}`)
        window.stream = stream
        video.srcObject = stream
    }

    handleError(error) {
        if (error.name === 'ConstraintNotSatisfiedError') {
            let v = this.state.constraints.video
            this.errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`)
        } else if (error.name === 'PermissionDeniedError') {
            this.errorMsg('Permissions have not been granted to use your camera and ' +
                'microphone, you need to allow the page access to your devices in ' +
                'order for the demo to work.')
        }
        this.errorMsg(`getUserMedia error: ${error.name}`, error)
    }

    errorMsg(msg, error) {
        const errorElement = document.querySelector('#errorMsg')
        errorElement.innerHTML += `<p>${msg}</p>`
        if (typeof error !== 'undefined') {
            console.error(error)
        }
    }

    async init(e) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(this.state.constraints)
            this.handleSuccess(stream)
            e.target.disabled = true
        } catch (e) {
            this.handleError(e)
        }
    }
    render() {
        return (
            <div>
                <video id="gum-local" autoPlay playsInline></video><br />
                <button id="showVideo">Open camera</button>
                <div id="errorMsg"></div>
            </div>
        )
    }
}
import React from 'react'
import Wfs from './wfs'

export default class Player extends React.Component {
    componentDidMount() {
        console.log('nhn')
        if (Wfs.isSupported()) {
            var video1 = document.getElementById("video1")
            var wfs = new Wfs()
            wfs.attachMedia(video1, 'ch1')
        }
    }
    render() {
        return (
            <div>
                <h1>Player</h1>
                <video id="video1" width="640" height="480" controls></video>
            </div>
        )
    }
}
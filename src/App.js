import React from 'react';
import logo from './logo.svg';
import './App.css';
import BasicDemo from './GetUserMedia/BasicDemo';
import RecordStream from './GetUserMedia/RecordStream';
import BasicPeerConnection from './RTCPeerConnection/BasicPeerConnection';
import AutoPeer from './RTCPeerConnection/BasicPeerConnection/AutoPeer';
import UpgradePeerConnection from './RTCPeerConnection/UpgradePeerConnection';
import Player from './WFSPlayer/player';

function App() {
  return (
    <div className="App">
     <Player />
    </div>
  );
}

export default App;

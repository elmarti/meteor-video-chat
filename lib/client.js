const streamHandlers = {
    handleStreamCallSessionRemoved() {
        this.callLog = null;
        this.terminateCall();
    },
    handleStreamReceivingPhoneCall(msg) {
        msg.fields._id = msg.id;
        this.setCallLog(msg.fields);
        this.stream = new this.Streamer(msg.id);
        this.stream.on('video_message', this.handleTargetStream.bind(this));
        this.setState({
            localMuted: false,
            remoteMuted: false,
            inProgress: false,
            ringing: true
        });
        this.onReceiveCall(this.callLog.caller);
    },
    handleStreamCallOwnCallSessionInitialized(msg) {
        msg.fields._id = msg.id;
        this.setCallLog(msg.fields);
        this.stream = new this.Streamer(msg.id);
        this.stream.on('video_message', this.handleCallerStream.bind(this));
    },
    handleStreamCalleeAccept(msg) {

        if (msg.fields.status === 'ACCEPTED' &&
            this.callLog.caller === this.meteor.userId()) {
            this.setCallLog(msg.fields);
            this.core.handleTargetAccept();
            this.setState({
                localMuted: false,
                remoteMuted: false,
                inProgress: true,
                ringing: false
            });
            this.onTargetAccept();
        }
    },
    handleStreamCalleeRejected(msg) {
        if (msg.fields.status === 'REJECTED' && this.callLog.caller === this.meteor.userId()) {
            this.setCallLog(msg.fields);
            this.onCallRejected();
            this.meteor.call("VideoCallServices/ackReject", msg.id);
        }
    },
    handleStreamCallFinished(msg) {
        if (msg.fields.status === 'FINISHED') {
            if (this.callLog.caller !== this.meteor.userId() || this.callLog.status !== "REJECTED") {
                this.terminateCall();
            }
            this.callLog = null;
        }
    },
    handleStreamUpdates(msg) {
        if (msg.fields !== undefined) {
            streamHandlers.handleStreamCalleeAccept.call(this, msg);
            streamHandlers.handleStreamCalleeRejected.call(this, msg);
            streamHandlers.handleStreamCallFinished.call(this, msg);
        }
    }
};


//jshint esversion: 6
class VideoCallServices {

    constructor(args) {

        let { meteor, tracker, core, reactiveVar, ddp, Streamer } = args;
        this.meteor = meteor;
        this.core = core;
        this.ddp = ddp;
        this.Streamer = Streamer;
        this.state = new reactiveVar({
            localMuted: false,
            remoteMuted: false,
            ringing: false,
            inProgress: false
        });


        this.callLog = null;
        tracker.autorun(() => {
            this.sub = this.meteor.subscribe('VideoChatPublication');
        });
        this.ddp.on('message', this.handleStream.bind(this));


    }
    setCallLog(fields) {
        this.callLog = Object.assign({}, this.callLog, fields);
    }

    /**
     * Handle the Video chat specific data in the DDP stream
     * @param msg {string}
     */
    handleStream(msg) {

        msg = JSON.parse(msg);
        if (msg.collection === 'VideoChatCallLog' &&
            msg.msg === 'removed' && this.callLog !== null) {
            streamHandlers.handleStreamCallSessionRemoved.call(this);
        }
        else if (msg.collection === 'VideoChatCallLog' &&
            msg.msg === 'added' &&
            msg.fields.target === this.meteor.userId() &&
            msg.fields.status === "NEW") {
            streamHandlers.handleStreamReceivingPhoneCall.call(this, msg);
        }
        else if (msg.collection === 'VideoChatCallLog' &&
            msg.msg === 'added' &&
            msg.fields.caller === this.meteor.userId() &&
            msg.fields.status === 'NEW') {
            streamHandlers.handleStreamCallOwnCallSessionInitialized.call(this, msg);
        }
        else if (msg.msg === 'changed' &&
            msg.collection === 'VideoChatCallLog' &&
            msg.fields !== undefined) {
            streamHandlers.handleStreamUpdates.call(this, msg);
        }
    }

    /**
     * Handle the stream data for the target user
     * @param streamData {string}
     */
    handleTargetStream(streamData) {
        if (typeof streamData === "string") {
            streamData = JSON.parse(streamData);
        }
        if (streamData.offer) {
            this.core.handleTargetStream({
                Direction: "Target",
                Type: 1,
                data: streamData.offer
            });
        }
        if (streamData.candidate) {
            if (typeof streamData.candidate === "string") {
                streamData.candidate = JSON.parse(streamData.candidate);
            }
            this.core.handleTargetStream({
                Direction: "Target",
                Type: 0,
                data: streamData.candidate
            });

        }
    }


    //I am aware that there is some repetition in the below 2 methods, 
    //Upon RTCFly v1 there will be a cleaner way of doing this and it will correctly return null


    /**
     * get the local video HTMLMediaElement
     * @returns HTMLMediaElement | null
     */
    getLocalVideo() {
        const localVideoWrapper = this.core.getLocalVideo();
        if (localVideoWrapper !== undefined) {
            const element = localVideoWrapper.getElement();
            return element || null;
        }
        else {
            return null;
        }
    }
    /**
     * Set a value on the application State
     * @param state object, a key and value ie {localMuted:true}
     */
    setState(stateObject) {
        const oldState = this.state.get();
        this.state.set(Object.assign({}, oldState, stateObject));
    }

    /**
     * Get a state value by key 
     * @param key :string
     * @returns any
     */
    getState(key) {
        const state = this.state.get();
        return state[key];
    }
    /**
     * get the remote video HTMLMediaElement
     * @returns HTMLMediaElement | null
     */
    getRemoteVideo() {
        const remoteVideoWrapper = this.core.getRemoteVideo();
        if (remoteVideoWrapper !== undefined) {
            const element = remoteVideoWrapper.getElement();
            return element || null;
        }
        else {
            return null;
        }
    }

    toggleLocalAudio() {
        const video = this.getLocalVideo();
        if (video) {
            video.srcObject.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
                this.setState({
                    localMuted: !track.enabled
                });
            });
        }
    }

    toggleRemoteAudio() {
        const video = this.getRemoteVideo();
        if (video) {
            video.srcObject.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
                this.setState({
                    remoteMuted: !track.enabled
                });
            });
        }
    }


    /**
     * Call allows you to call a remote user using their userId
     * @param params {ICallParams}
     */
    call(params) {
        this.core.call(params);
    }

    /**
     * Handle the data stream for the caller
     * @param streamData {string}
     */
    handleCallerStream(streamData) {
        if (typeof streamData === 'string') {
            streamData = JSON.parse(streamData);
        }

        if (streamData.candidate) {
            if (typeof streamData.candidate === 'string') {
                streamData.candidate = JSON.parse(streamData.candidate);
            }
            this.core.handleSenderStream({
                Direction: "Sender",
                Type: 0,
                data: streamData.candidate
            });

        }

        if (streamData.answer) {
            const message = {
                data: streamData.answer,
                Direction: "Sender",
                Type: 1

            };
            this.core.handleSenderStream(message);
        }
    }

    /**
     * Answer the call
     * @param params {ICallParams}
     */
    answerCall(params) {
        this.core.answerCall(params);
        this.setState({
            localMuted: false,
            remoteMuted: false,
            inProgress: true,
            ringing: false
        });
    }
    /**
     * Reject the phone call
     */
    rejectCall() {
        this.meteor.call("VideoCallServices/reject", err => {
            if (err) {
                this.onError(err);
            }
            this.core.rejectCall();
            this.setState({
                localMuted: false,
                remoteMuted: false,
                inProgress: false,
                ringing: false
            });
        });
    }
    /**
     * End the call
     */
    endCall() {
        this.meteor.call("VideoCallServices/end", err => {
            if (err) {
                this.onError(err);
            }
            this.terminateCall();
        });
    }
    /**
     * Initialize the local video chat client
     * @param rtcConfiguration {RTCConfiguration}
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
     */
    init(rtcConfiguration) {
        this.core.init(rtcConfiguration);
    }
    terminateCall() {
        this.setState({
            localMuted: false,
            remoteMuted: false,
            inProgress: false,
            ringing: false
        });
        this.core.endCall();
    }

    onTargetAccept() {

    }

    onReceiveCall(fields) {

    }

    onTerminateCall() {

    }
    onPeerConnectionCreated() {

    }
    onCallRejected() {

    }
    setOnError(callback) {
        this.core.on('error', callback);
    }
    onError(err) {
        this.core.events.callEvent("error")(err);
    }
    onReceiveCall() {

    }


}

export {
    VideoCallServices
};

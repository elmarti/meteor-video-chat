//jshint esversion: 6
class Client {

	constructor( args ) {
		this.RTCConfiguration = {};
		this.RetryLimit = 5;
		this.RetryCount = 0;
		let { meteor, tracker,  core } = args;
		this.meteor = meteor;
		this.core = core;

		tracker.autorun( () => {
			this.sub = this.meteor.subscribe( 'VideoChatPublication' );
		} );
		this.meteor.connection._stream.on( 'message', this.handleStream.bind(this) );

	}

	/**
	 * Handle the Video chat specific data in the DDP stream
	 * @param msg {string}
	 */
	handleStream( msg ) {

		msg = JSON.parse( msg );
		if ( msg.collection === 'VideoChatCallLog'
			&& msg.msg === 'removed' ) {
			this.core.onTerminateCall();
		}
		else if ( msg.collection === 'VideoChatCallLog'
			&& msg.msg === 'added'
			&& msg.fields.target === this.meteor.userId()
			&& msg.fields.status === "NEW" ) {
            this.callLog = msg.fields;
			this.core.onReceivePhoneCall();
			this.stream = new this.meteor.Streamer( msg.id );
			this.stream.on( 'video_message', this.handleTargetStream.bind(this) );
			this.onReceivePhoneCall( this.callLog.caller );
		}
		else if ( msg.collection === 'VideoChatCallLog'
			&& msg.msg === 'added'
			&& msg.fields.caller === this.meteor.userId()
			&& msg.fields.status === 'NEW' ) {
			this.callLog = msg.fields;
		}
		else if ( msg.msg === 'changed'
			&& msg.collection === 'VideoChatCallLog'
			&& msg.fields !== undefined ) {
			const { fields } = msg;
			if ( fields.status === 'ACCEPTED' && this.callLog.caller === this.meteor.userId() ) {
				this.onTargetAccept();
				this.core.handleTargetAccept();
			}
		}
	}

	/**
	 * Handle the stream data for the target user
	 * @param streamData {string}
	 */
	 handleTargetStream( streamData ) {
		if ( typeof streamData === "string" ) {
			streamData = JSON.parse( streamData );
		}
		if ( streamData.offer ) {
			const dave = Promise.await(navigator.mediaDevices.getUserMedia( { audio: true, video: true } ));
			navigator.mediaDevices.getUserMedia( { audio: true, video: true } ).then( stream => {
				if ( this.localVideo ) {
					this.localVideo.setStream( stream, true );
					Promise.await(this.localVideo.play());
				}
				this.setupPeerConnection( stream, streamData.offer );
			} ).catch( err => {
				this.onError( err, streamData );
			} );
		}
		if ( streamData.candidate ) {
			if ( typeof streamData.candidate === "string" ){
				streamData.candidate = JSON.parse( streamData.candidate );
			}
			const candidate = streamData.candidate === {}
			|| streamData.candidate === null ? null : new RTCIceCandidate( streamData.candidate );
			if ( this.peerConnection )
				this.peerConnection.addIceCandidate( candidate ).catch( err => {
					this.onError( err, streamData );
				} );
		}
	}
	/**
	 * Set up the peer connection
	 * @param stream {MediaStream}
	 * @param remoteDescription {RTCPeerConnection}
	 */
	setupPeerConnection( stream, remoteDescription ) {
		this.peerConnection = new RTCPeerConnection( this.RTCConfiguration, { "optional": [ { 'googIPv6': false } ] } );
		this.onPeerConnectionCreated();
		this.setPeerConnectionCallbacks();
		this.peerConnection.addStream( stream );
		if ( remoteDescription )
			this.createTargetSession( remoteDescription );
		else
			this.createCallSession();
	}

	/**
	 * Set callback for RTCPeerConnection
	 */
	setPeerConnectionCallbacks() {
		this.peerConnection.onicecandidate = ( event ) => {

			if ( event.candidate === undefined ) {
				event.candidate = {};
			}

		};
		this.peerConnection.oniceconnectionstatechange = ( event ) => {
			if ( event.target.iceConnectionState === "failed" ) {
				this.peerConnection = undefined;
				if ( this.RetryCount < this.RetryLimit ) {
					navigator.mediaDevices.getUserMedia( { audio: true, video: true } ).then( stream => {
						this.RetryCount++;
						if ( this.localVideo ) {
							this.localVideo.pause();
							this.localVideo.setStream( stream, true );
							Promise.await(this.localVideo.play());

						}
						this.setupPeerConnection( stream );
					} ).catch( err => {
						this.onError( err );
					} );
				} else {
					const error = new Error( 408, "Could not establish connection" );
					this.onError( error );
				}

			}
		};
		this.peerConnection.onaddstream = function ( stream ) {
			if ( this.remoteVideo ) {
				this.remoteVideo.pause();
				this.remoteVideo.setStream( stream.stream );
				Promise.await(this.remoteVideo.play());

			}
		}.bind( this );
	}

	/**
	 * Create the RTCPeerConnection for the person being called
	 * @param remoteDescription {RemoteDescription}
	 */
	createTargetSession( remoteDescription ) {


		this.peerConnection.setRemoteDescription( remoteDescription ).then( () => {

			this.peerConnection.createAnswer().then( answer => {
				this.peerConnection.setLocalDescription( answer ).catch( err => {
					this.onError( err, answer );
				} );
				this.stream.emit( 'video_message', JSON.stringify( { answer } ) );
			} ).catch( err => {
				this.onError( err, remoteDescription );
			} );
		} ).catch( err => {
			this.onError( err, remoteDescription );
		} );

	}

	createCallSession() {
		this.peerConnection.createOffer().then( offer => {

			this.peerConnection.setLocalDescription( offer ).catch( err => {
				this.onError( err, offer );
			} );

		} ).catch( err => this.onError( err ) );
	}

	/**
	 * Call allows you to call a remote user using their userId
	 * @param _id {string}
	 * @param local {HTMLElement}
	 * @remote remote {HTMLElement}
	 */
	call( _id, local, remote ) {
		this.core.call(_id, local, remote);
	}

	/**
	 * Handle the data stream for the caller
	 * @param streamData {string}
	 */
	handleCallerStream( streamData ){
			if ( typeof streamData === 'string' ){
				streamData = JSON.parse( streamData );
			}
			if ( streamData.answer ) {
				this.peerConnection.setRemoteDescription( streamData.answer ).catch( err => {
					this.onError( err, streamData )
				} );
			}

			if ( streamData.candidate ) {
				if ( typeof streamData.candidate === 'string' )
					streamData.candidate = JSON.parse( streamData.candidate );
				const candidate = streamData.candidate === {}
				|| streamData.candidate === null ? null : new RTCIceCandidate( streamData.candidate );
				if ( this.peerConnection ){
					this.peerConnection.addIceCandidate( streamData.candidate ).catch( err => {
						this.onError( err, streamData );
					} );
				}

			}

	}
	/**
	 * Answer the phone call
	 * @param local {HTMLElement}
	 * @param remote {HTMLElement}
	 */
	answerPhoneCall( local, remote ) {
		this.core.answerPhoneCall(local,remote);
	}

	/**
	 * End the phone call
	 */
	endPhoneCall() {
		Meteor.call( "VideoCallServices/end", err => {
			if ( err ){
				this.onError( err );
			}
		} );
	}


	onTargetAccept() {

	}

	onReceivePhoneCall( fields ) {

	}

	onTerminateCall() {

	}

	onPeerConnectionCreated() {

	}

	onError( err ) {

	}

	updateCallback(callbacks){
		const updatableMethods = ["onError", "onPeerConnectionCreated", "onTerminateCall", "onReceivePhoneCall", "onTargetAccept"];
		for(const callback in callbacks){
			if ( updatableMethods.indexOf( callback ) > -1 ) {
				this._handler[ callback ] = callbacks[ callback ];
			} else {
				throw new Error( "Cannot update method", callback );
			}
		}
	}
}

export {
	Client
};
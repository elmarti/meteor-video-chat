export const MeteorVideoChat = ({
    Meteor,
    MeteorClient,
    Tracker,
    CoreClient,
    ReactiveVar,
    ddp,
    Streamer
}) => {


        const core = new CoreClient({});
        core.on('emitIceCandidate', iceCandidate =>
            Meteor.VideoCallServices.stream.emit('video_message', JSON.stringify({ candidate: iceCandidate }))
        );
        core.on('emitTargetAnswer', answer =>
            Meteor.VideoCallServices.stream.emit('video_message', JSON.stringify({ answer }))
        );
        core.on('callInitialized', (params) =>
            Meteor.call('VideoCallServices/call', params.id,
                (err, _id) => {})
        );
        core.on('endCall', () => {
            Meteor.VideoCallServices.onTerminateCall();
        });
        core.on('answerCall', () => {
            Meteor.call('VideoCallServices/answer', err => {
                if (err) {
                    core.events.callEvent("error")(err);
                }
                Meteor.VideoCallServices.setState({
                    localMuted: false,
                    remoteMuted: false,
                    inProgress: true,
                    ringing: false
                });
            });
        });
        core.on('emitSenderDescription', sessionDescription =>
            Meteor.VideoCallServices.stream.emit('video_message', JSON.stringify({ offer: sessionDescription }))
        );
        core.on('error', err => console.log("error", err));

        const VideoCallServices = new MeteorClient({
            meteor: Meteor,
            tracker: Tracker,
            core,
            reactiveVar: ReactiveVar,
            ddp,
            Streamer
        });
        Meteor.VideoCallServices = VideoCallServices;
        core.on('recieveCall', VideoCallServices.onReceiveCall);
        core.on('peerConnectionCreated', VideoCallServices.onPeerConnectionCreated);
        Meteor.VideoCallServices.setOnError = function(onError) {
            CoreClient.prototype.onError = onError;
        };
   
        return VideoCallServices
        
    
};

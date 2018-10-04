# Meteor Video Chat
This extension allows you to implement user-to-user video calling in React, Angular and Blaze.
This package now uses [RTCFly](https://github.com/rtcfly/rtcfly)


[Example with React](https://meteorvideochat.herokuapp.com)

[Click here for the React example source code.](https://github.com/elmarti/meteor-video-chat-example)


[Example with Blaze](https://blazevideochat.herokuapp.com)

[Click here for the Blaze example source code.](https://github.com/elmarti/blaze-video-chat)

[![Stories in Ready](https://badge.waffle.io/elmarti/meteor-video-chat.svg?label=ready&title=Ready)](http://waffle.io/elmarti/meteor-video-chat)
[![Travis CI](https://travis-ci.org/elmarti/meteor-video-chat.svg?branch=master)](https://travis-ci.org/elmarti/meteor-video-chat)
[![Maintainability](https://api.codeclimate.com/v1/badges/1ac37840becd7f729338/maintainability)](https://codeclimate.com/github/elmarti/meteor-video-chat/maintainability)

## A note on previous versions
Meteor Video Chat used to use `Meteor.VideoCallServices`, however we have moved to a more modular system, opting for ES6 imports like so: 

`import { VideoCallServices } from 'meteor/elmarti:video-chat';`
Old style code will be supported for the forseeable future, but we suggest moving over to the new format.

## Usage with asteroid
The Meteor Video Chat client can be used by first running `npm install meteor-video-chat`, and then using the following mixin import
```

import { AsteroidVideoChatMixin } from 'meteor-video-chat';

```
After including this as an Asteroid mixin, as per the Asteroid page, you can access it like so:
```
    Asteroid.VideoCallServices;

```

## init
Here you can set the [RTCConfiguration](https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration). If you are testing outside of a LAN, you'll need to procure some [STUN & TURN](https://gist.github.com/yetithefoot/7592580) servers.

```
VideoCallServices.init({'iceServers': [{
    'urls': 'stun:stun.example.org'
  }]
});
```
#### Calling a user
To call a user, use the following method. 
```
VideoCallServices.call(ICallParams);

```
These are the parameters that can be used: 
```
interface ICallParams {
    id:string; //ID of the callee
    localElement: IHTMLMediaElement; //local HTMLElement
    remoteElement: IHTMLMediaElement; //remote HTMLElement
    video:boolean; //Do you want to show video?
    audio:boolean; //Do you want to show audio?
}
```


#### Deciding who can connect to whom
The follow method can be overridden on the server side to implement some kind of filtering. Returning `false` will cancel the call, and `true` will allow it to go ahead.

```
VideoCallServices.checkConnect = function(caller, target){
return *can caller and target call each other"
};
```



#### Answering a call
The first step is to handle the onReceiveCall callback and then to accept the call. The answerCall method accepts the ICallParams interfaces, just like the "call" method above
```
 VideoCallServices.onReceiveCall = (userId) => {
        VideoCallServices.answerCall(ICallParams);
 };

```


#### Muting local or remote videos
```
VideoCallServices.toggleLocalAudio();
VideoCallServices.toggleRemoteAudio();
```


#### Application state
The following values are stored in a reactive var 
```
localMuted:boolean, 
remoteMuted:boolean, 
ringing:boolean,
inProgress:boolean

```
#### Getting the state 
```
VideoCallServices.getState("localMuted");

```
#### Accessing the video (HTMLMediaElement) elements

```
const localVideo = VideoCallServices.getLocalVideo();
const remoteVideo = VideoCallServices.getRemoteVideo();

```

#### Ending call
Simply call
```
VideoCallServices.endCall();
```
#### Other events
The following method is invoked when the callee accepts the call.
```
VideoCallServices.onTargetAccept = () => {
}
```
The following method is invoked when either user ends the call
```
VideoCallServices.onTerminateCall = () => {
}
```
The following method invoked when the RTCPeerConnection instance has been created, making it possible to consitently mutate it or add a data channel
```
VideoCallServices.onPeerConnectionCreated = () => {
}

``` 
The following method is invoked on the caller browser when the callee rejects the call 
```
VideoCallServices.onCallRejected = () => {
    
}

```


The following method is invoked on both the client and server whenever an error is caught.
User is only passed on the server

```
VideoCallServices.setOnError(callback);
```
The onError section can also be used for handling errors thrown when obtaining the user media (Webcam/audio).
[See here for more info](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Exceptions), or checkout the example.


This project is sponsored by the following:

[![BrowserStack](https://www.browserstack.com/images/layout/browserstack-logo-600x315.png)](https://www.browserstack.com/)

[![Sentry.io](https://sentry.io/_assets/branding/png/sentry-horizontal-black-6aaf82e66456a21249eb5bef3d3e65754cadfd498f31469002bc603d966d08ef.png)](https://sentry.io/)
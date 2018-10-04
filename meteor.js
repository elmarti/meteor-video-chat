//jshint esversion: 6
import { Meteor } from 'meteor/meteor';
import { VideoCallServices as MeteorClient } from './lib/client';
import { Tracker } from "meteor/tracker";
import { ReactiveVar } from 'meteor/reactive-var'
import { client as CoreClient } from 'rtcfly';
import { MeteorVideoChat } from './lib';


const VideoCallServices = MeteorVideoChat({
    Meteor,
    MeteorClient,
    Tracker,
    CoreClient,
    ReactiveVar,
    ddp:Meteor.connection._stream,
    Streamer:Meteor.Streamer
});

export {
    VideoCallServices
}

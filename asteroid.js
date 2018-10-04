import { VideoCallServices as MeteorClient } from './lib/client';
import { MeteorVideoChat } from './lib';
import { client as CoreClient } from 'rtcfly';
import { AsteroidMeteorStreamerMixin } from './lib/streamer/asteroid';

const AsteroidVideoChatMixin = {
        init: function() {
            const Meteor = {
                call: this.call.bind(this),
                subscribe: this.subscribe.bind(this),
                userId: () => this.userId
            };
            const Tracker = {
                autorun:callback => callback()
            };
            class ReactiveVar {
                constructor(value){
                    this.value = value;
                }
                set(state){
                    this.state = state; 
                }
                get(){
                    return this.state;
                }
            }
            AsteroidMeteorStreamerMixin(this, this.ddp);
            this.VideoCallServices = MeteorVideoChat({
                Meteor,
                MeteorClient,
                CoreClient, 
                Tracker,
                ReactiveVar,
                ddp:this.ddp,
                Streamer:this.Streamer
            });
        }
    
};



export {
  AsteroidVideoChatMixin  
};
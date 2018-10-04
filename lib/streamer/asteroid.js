import { streamerClient } from './client';

const AsteroidMeteorStreamerMixin = (Meteor, ddp) => {

    streamerClient({
        Meteor,
        ddp: ddp
    });


};

export {
    AsteroidMeteorStreamerMixin
};

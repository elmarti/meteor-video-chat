//jshint esversion: 6
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import CallLog from './call_log';

const streams = {};
const Services = {
    setOnError(callback){
        this.onError = callback; 
    },
    onError(){
        
    },
    destroyOldCalls(meteorUser) {
        CallLog.update({
            $or: [{
                status: {
                    $ne: "FINISHED"
                },
                caller: meteorUser._id
            }, {
                status: {
                    $ne: "FINISHED"
                },
                target: meteorUser._id
            }]

        }, {
            $set: {
                status: "FINISHED"
            }
        });
    },
    initializeCallSession(_id, meteorUser) {
        Services.destroyOldCalls(meteorUser);
        const logId = CallLog.insert({
            status: "NEW",
            target: _id,
            caller: meteorUser._id,
            callerConnectionId: this.connection.id
        });
        streams[logId] = new Meteor.Streamer(logId);
        streams[logId].allowRead('all');
        streams[logId].allowWrite('all');
        return logId;
    },
    getUser(){
        const meteorUser = Meteor.user();
        if (!meteorUser) {
            const err = new Meteor.Error(403, "USER_NOT_LOGGED_IN");
            this.onError(err);
            throw err;
        }
        return meteorUser;
    },
    /**
     * Call allows you to call a remote user using their userId
     * @param _id {string}
     */
    call(_id, idk) {
        check(_id, String);
        //Asteroid sends null as a second param
        check(idk, Match.Maybe(null));
        const meteorUser = Services.getUser();
        if (Services.checkConnect(meteorUser._id, _id)) {
            const inCall = CallLog.findOne({
                status: "CONNECTED",
                target: _id
            });
            if (inCall) {
                const err = new Meteor.Error(500, "TARGET_IN_CALL", inCall);
                this.onError(err, inCall, Meteor.userId());
                throw err;
            }
            else {
                return Services.initializeCallSession.call(this, _id, meteorUser);
            }
        }
        else {
            Services.connectionNotAllowed(_id, meteorUser);
        }

    },
    connectionNotAllowed(_id, meteorUser) {
        throw new Meteor.Error(403, "CONNECTION_NOT_ALLOWED", {
            target: meteorUser._id,
            caller: _id
        });
    },
    setCheckConnect(callback){
        this.checkConnect = callback; 
    },
    /**
     * Check if call connection should be permitted
     * @param _id {caller}
     * @param _id {target}
     * @returns boolean
     */
    checkConnect(caller, target) {
        return true;
    },
    /**
     * Answer current phone call
     */
    answer() {
        const user = Services.getUser();
        const session = CallLog.findOne({
            target: user._id,
            status: 'NEW'
        });
        if (!session) {
            const err = new Meteor.Error(500, 'SESSION_NOT_FOUND', {
                target: user._id
            });
            this.onError(err, undefined, user);
            throw err;
        }

        else {
            CallLog.update({
                _id: session._id
            }, {
                $set: {
                    targetConnectionId: this.connection.id,
                    status: 'ACCEPTED'
                }
            });
        }
    },
    /**
     * End current phone call
     */
    end() {
        const _id = Meteor.userId();
        CallLog.find({
            $or: [{
                status: {
                    $ne: 'FINISHED'
                },
                target: _id
            }, {
                status: {
                    $ne: 'FINISHED'
                },
                caller: _id
            }]
        }).forEach(call =>
            CallLog.update({
                _id: call._id
            }, {
                $set: {
                    status: 'FINISHED'
                }
            }));
    },
    ackReject(id){
        check(id, String)
        CallLog.update({
            _id: id,
            caller: Meteor.userId()
        }, {
            $set: {
                status: "FINISHED"
            }
        });
    },
    reject() {
        const user = Meteor.user();
        if (user) {
            CallLog.update({
                target: user._id,
                status: 'NEW'
            }, {
                $set: {
                    status: "REJECTED"
                }
            });
        }
        else {
            const newErr = new Meteor.Error(403, "Could not find user");
            this.onError(newErr);
            throw newErr;
        }
    }
};

export {
    Services
};

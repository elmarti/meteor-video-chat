import { Meteor } from 'meteor/meteor';
import {Services} from './server';

import CallLog from './call_log';


Meteor.users.find({"status.online": true}).observe({
    removed: function ({_id}) {
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
    }
});
Meteor.methods({
    'VideoCallServices/call': Services.call,
    'VideoCallServices/answer': Services.answer,
    'VideoCallServices/end': Services.end
});
Meteor.VideoCallServices = {
    /**
     * Callback envoked on error
     * @param err {Error}
     * @param data {Object}
     * @param user {Object}
     */
    onError(err, data, user){
    }
};
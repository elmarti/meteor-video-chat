//jshint esversion: 6
Package.describe({
    name: 'elmarti:video-chat',
    version: '2.3.1',
    summary: 'Simple WebRTC Video Chat for your app.',
    git: 'https://github.com/elmarti/meteor-video-chat',
    documentation: 'README.md'
});

Package.onUse(api => {

    Npm.depends({
        "rtcfly": "0.1.8"
    });


    api.versionsFrom('1.5');
    api.use('ecmascript');
    api.use('reactive-var');
    api.use("rocketchat:streamer@0.6.2");
    api.use("mizzao:user-status@0.6.7");
    api.addFiles(['lib/publish.js'], "server");
    api.addFiles(['lib/index.server.js'], 'server');
    api.mainModule('meteor.js', 'client');
    api.mainModule('lib/server.interface.js', 'server');
});

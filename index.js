/**
 * A Bot for Slack!
 */

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here! Let's get fit.")
});

controller.hears(['hello', 'hi', 'greetings'], ['direct_mention', 'mention', 'direct_message'], function(bot,message) {
    bot.reply(message, 'Hello, welcome to the fitness bot! Type ``` info @fitnessbot ``` for more information.');
});

controller.hears(['Should I have pasta'], ['direct_mention', 'mention', 'direct_message'], function(bot,message) {
    bot.reply(message, 'No, because we are getting fit. Have a gin and soda instead?');
});

controller.hears(['info'], ['direct_mention', 'mention', 'direct_message'], function(bot,message) {
    bot.reply(message, 'More information goes here');
});

controller.on('direct_mention, mention, direct_message', function(bot,message) {
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'heart',
    });
 });

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.hears(['Fitness time' , 't'],['direct_mention', 'mention', 'direct_message'], function (bot, message) {
    bot.say(
        {
          text: 'EVERYBODY EXERCISE! Also, leave any emote when you are done. We will track attendance here.',
          channel: message.channel
        }
    );

    setTimeout(function(){
        bot.api.channels.history({channel: message.channel, count: 1}, function(err, response){
            controller.storage.users.save({id:"LastMessage", ts:response.messages[0].ts})
        });
    },100);
    
});

controller.on('reaction_added',function(bot, event) {
    controller.storage.users.get("LastMessage",function(error,myData){
        if (event.item.ts === myData.ts) {
            storeUserData(event);
        }
    });
});

// need a reaction to get reactions then tally them in firebase based on user
function storeUserData(event) {
    var user = event.user;

    // when user reacts give them +1
    controller.storage.users.save({id:user, points: 1});
    controller.storage.users.get(user, function(error, data){
        console.log(data, error);
    });

    // if user already exists and reacted twice do nothing.. they got the point for the day
    // if user doesn't already exist in firebase then add a plus one to score

    // what happens when people remove emotes? make sure to recalc
        //if only one 
    // And remove point from firebase
}

// make function for configs in slack for when to show the tally
// then clear score and start fresh?

// slack.api("channels.history", {
//     channel: channel,
//     latest: ts,
//     count: 1,
//     inclusive: 1
// }, function(err, response) {
//     bot.say(response);
// });
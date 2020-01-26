const botSettings = require("./bot-settings.json");
const Discord = require("discord.js")
const client = new Discord.Client();

let fs = require('fs');
let readline = require('readline');
let {google} = require('googleapis');
let OAuth2 = google.auth.OAuth2;

let SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'discord-yt-likecount-bot.json';

client.on('ready', () => {
  console.log(`${client.user.tag} is ready to roll!`);
});

client.on('message', msg => {
  function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  function printBoth(string) {
    console.log(string);
    msg.reply(string);
  }

  if (!msg.content.startsWith(botSettings.prefix)) return;

  const args = msg.content.slice(1).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command == 'notifyme') {
    if (!args.length) {
      msg.reply('You forgot to type the video ID!')
    }

    let videoID = args.join(' ');

    fs.readFile('client_secret.json', async function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }

      while (true) {
        await sleep(5000);
        authorize(JSON.parse(content), getLikes);
      }
    });

    function authorize(credentials, callback) {
      var clientSecret = credentials.installed.client_secret;
      var clientId = credentials.installed.client_id;
      var redirectUrl = credentials.installed.redirect_uris[0];
      var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  
      fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
          getNewToken(oauth2Client, callback);
        } else {
          oauth2Client.credentials = JSON.parse(token);
          callback(oauth2Client);
        }
      });
    }
  
    function getNewToken(oauth2Client, callback) {
      var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
      });
      console.log('Authorize this app by visiting this url: ', authUrl);
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
          if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
          }
          oauth2Client.credentials = token;
          storeToken(token);
          callback(oauth2Client);
        });
      });
    }
  
    function storeToken(token) {
      try {
        fs.mkdirSync(TOKEN_DIR);
      } catch (err) {
        if (err.code != 'EEXIST') throw err;
      }
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
      });
    }
  
    function getLikes(auth) {
      var service = google.youtube('v3');
        service.videos.list({
          auth: auth,
          part: 'snippet,statistics,liveStreamingDetails',
          id: videoID 
        }, function(err, response) {
          if (err) {
            printBoth('The API returned an error: ' + err);
            return;
          }
          var video = response.data.items;
          if (video.length == 0) {
            printBoth('No video found.');
          } else { 
            if (video[0].liveStreamingDetails.actualEndTime == null) { // If the livestream is still active
              console.log(video[0].snippet.channelTitle + "'s livestream has " + video[0].statistics.likeCount + " likes!");
              if (video[0].statistics.likeCount % 10 == 0) {
                printBoth(video[0].snippet.channelTitle + "'s livestream reached " + video[0].statistics.likeCount + " likes!");
              }
            } else { // If the livestream is not active
              printBoth("The live stream has ended!")
              delete video[0]; // Clear out the video in the array
            }
          }
        });
    }
  } else if (command == 'help') {
    msg.reply("Type '!notifyme' followed by the livestream's ID to recieve\nnotifications when the livestream's likes reach a multiple of 10.")
  }
})

client.login(botSettings.token);

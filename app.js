const token = '[token]';
const Discord = require('discord.js');
const client = new Discord.Client();

// Ready bot
client.on('ready', () => {
    console.log('Bot is ready');
    client.channels.find(x => x.name === 'general').send('Hello, im single and ready to mingle')
});

// Login
client.login(token);


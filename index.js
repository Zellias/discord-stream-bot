const { Client, StageChannel } = require("discord.js-selfbot-v13");
const { Streamer, streamLivestreamVideo } = require("@dank074/discord-video-stream");
const yts = require('play-dl');
const ytdl = require('ytdl-core');
const config = require("./config.json");

const videoStreamer = new Streamer(new Client());
let disconnectTimer = null;


videoStreamer.client.on("ready", () => {
    console.log('🎬 Video bot is online!');
});

videoStreamer.client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot || !message.content) return;
        
        if (message.content.startsWith("n.stopstream")) {    
            videoStreamer.stopStream();
            videoStreamer.leaveVoice();
            message.reply('🛑 Stream has been stopped.');
            clearDisconnectTimer();
        }

        if (message.content.startsWith("n.search")) {
            const query = message.content.slice('n.search'.length).trim();
            if (!query) {
                message.reply('❓ Please provide a query to search for.');
                return;
            }
            const searchResults = await yts.search(query, { limit: 1 });
            if (searchResults.length > 0) {
                const videoInfo = searchResults[0];
                const videoId = videoInfo.id;
                if (videoId) {
                    const voiceChannel = message.member.voice.channel;
                    if (!voiceChannel) return message.reply('❗ You need to be in a voice channel to play a video.');
        
                    await videoStreamer.joinVoice(message.guildId, voiceChannel.id);
                    if (voiceChannel instanceof StageChannel) await videoStreamer.client.user.voice.setSuppressed(false);
        
                    const videoDetails = await ytdl.getInfo(videoId);
                    const videoFormats = videoDetails.formats.filter(format => format.hasVideo && format.hasAudio && format.container === 'mp4');
                    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                    const resultMessage = `🎥 **${videoDetails.videoDetails.title}**\n\n⏱️ Duration: ${videoDetails.videoDetails.lengthSeconds} seconds\n🔗 [Link](${videoFormats[0].url})\n\n-----------------------------------------------\n🌟 If you're loving this custom bot experience, feel free to DM @x8x3 (<@1212424436209426484>) to get one for yourself! 🌟`;
        
                    message.reply({ content: resultMessage, files: [thumbnailUrl] });
        
                    // Initiate the stream with the found video's URL
                    const streamConnection = await videoStreamer.createStream();
                    console.log("📽️ Stream started");
                    streamConnection.mediaConnection.setSpeaking(true);
                    streamConnection.mediaConnection.setVideoStatus(true);
                    await streamLivestreamVideo(videoFormats[0].url, streamConnection, true);
                    console.log("🎬 Stream finished");
                    streamConnection.mediaConnection.setSpeaking(false);
                    streamConnection.mediaConnection.setVideoStatus(false);

                }
            } else {
                message.reply('❌ No results found.');
            }
        }
        
        

        if (message.content.startsWith("n.stream")) {
            const streamLink = message.content.slice('n.stream'.length).trim();
            if (!streamLink) {
                message.reply('❗ You need to provide a stream link.');
                return;
            }
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel) return message.reply('❗ You need to be in a voice channel.');

            await videoStreamer.joinVoice(message.guildId, voiceChannel.id);
            if (voiceChannel instanceof StageChannel) await videoStreamer.client.user.voice.setSuppressed(false);

            const isYouTubeLink = streamLink.includes('youtube.com') || streamLink.includes('youtu.be');
            if (isYouTubeLink) {
                const videoId = getYouTubeVideoId(streamLink);
                if (videoId) {
                    const videoDetails = await ytdl.getInfo(videoId);
                    const videoFormats = videoDetails.formats.filter(format => format.hasVideo && format.hasAudio && format.container === 'mp4');
                    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                    const resultMessage = `🎥 **${videoDetails.videoDetails.title}**\n\n⏱️ Duration: ${videoDetails.videoDetails.lengthSeconds} seconds\n🔗 [Link](${streamLink})\n\n-----------------------------------------------\n🌟 If you're loving this custom bot experience, feel free to DM @x8x3 (<@1212424436209426484>) to get one for yourself! 🌟`;
                    message.reply({ content: resultMessage, files: [thumbnailUrl] });
                } else {
                    message.reply('❌ Invalid YouTube video link.');
                }
            } else {
                message.reply('▶️ Playing custom video\n\n-----------------------------------------------\n🌟 If you\'re loving this custom bot experience, feel free to DM @x8x3 (<@1212424436209426484>) to get one for yourself! 🌟');
            }

            const videoUrl = isYouTubeLink ? await getYouTubeVideoUrl(streamLink) : streamLink;

            const streamConnection = await videoStreamer.createStream();
            console.log("📽️ Stream started");
            streamConnection.mediaConnection.setSpeaking(true);
            streamConnection.mediaConnection.setVideoStatus(true);
            await streamLivestreamVideo(videoUrl, streamConnection, true); 
            console.log("🎬 Stream finished");
            streamConnection.mediaConnection.setSpeaking(false);
            streamConnection.mediaConnection.setVideoStatus(false);
            

        }

        if (message.content.startsWith("n.help")) {
            
            const helpMessage = `
**🔍 Available Commands:**
- \`n.search <query>\`: Search for a video on YouTube.
- \`n.stream <stream_link>\`: Start streaming a video from a direct link or YouTube in the voice channel you're in.
- \`n.stopstream\`: Stop the current stream.
            `;
            message.reply({ content: helpMessage });
        }
    } catch (error) {
        console.error('❌ Error in messageCreate:', error);
    }
});



videoStreamer.client.login(config.token);

async function getYouTubeVideoUrl(url) {
    try {
        const videoInfo = await ytdl.getInfo(url);
        const videoFormats = videoInfo.formats.filter(format => format.hasVideo && format.hasAudio && format.container === 'mp4');
        return videoFormats[0].url;
    } catch (error) {
        console.error('❌ Error getting YouTube video URL:', error);
        throw error;
    }
}

function startDisconnectTimer(channel) {
    disconnectTimer = setTimeout(() => {
        if (channel && channel.size > 0) return;
        videoStreamer.stopStream();
        videoStreamer.leaveVoice();
        console.log('⏰ Disconnected due to inactivity.');
    }, 10 * 1000);
}

function clearDisconnectTimer() {
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }
}

function getYouTubeVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\?v=|[^\/]+\/(?:[^\/]+\/)?)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match && match[1];
}

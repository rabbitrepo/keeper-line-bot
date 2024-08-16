const express = require('express');
const bodyParser = require('body-parser');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const dotenv = require('dotenv');
const line = require('@line/bot-sdk');
const axios = require('axios');

// Load environment variables from .env file
dotenv.config();

const app = express();

// AWS SQS setup
const sqs = new SQSClient({
    region: 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const queueURL = process.env.SQS_QUEUE_URL;

// LINE Bot setup
const lineConfig = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
};
const bot = new line.Client(lineConfig);

// Middleware
app.use(bodyParser.json());

// LINE webhook handler
app.post('/callback', (req, res) => {
    const events = req.body.events;

    events.forEach(event => {
        console.log("Event:", JSON.stringify(event, null, 2));

        const lineId = event.source.userId;

        if (event.type === 'message') {
            const message = event.message;
            switch (message.type) {
                case 'text':

                    axios.post('https://api.line.me/v2/bot/chat/loading/start', {
                        chatId: lineId,
                        loadingSeconds: 60
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineConfig.channelAccessToken}`
                        }
                    })
                    // .then(response => {
                    //     console.log('Response:', response.data);
                    // })
                    // .catch(error => {
                    //     console.error('Error:', error);
                    // });
                    // bot.replyMessage(event.replyToken, {
                    //     type: 'text',
                    //     text: message.text,
                    // }).catch(err => console.error('Failed to send reply:', err));
                    break;

                case 'image':
                case 'video':
                case 'audio':
                case 'file':
                    handleFiles(event);
                    break;

                default:
                    console.log('Unsupported message content:', message.type);
            }
        } else {
            console.log('Unsupported event type:', event.type);
        }
    });

    res.sendStatus(200);
});

// Function to handle files
async function handleFiles(event) {
    const lineId = event.source.userId;
    const replyToken = event.replyToken;
    const { id: messageId } = event.message;

    const body = {
        lineId,
        replyToken,
        messageId
    }

    const params = {
        MessageBody: JSON.stringify(body), // Serialize the object
        QueueUrl: queueURL,
        MessageGroupId: 'default' // FIFO queue requires a MessageGroupId
    };

    try {
        const command = new SendMessageCommand(params);
        const data = await sqs.send(command);
        console.log('SQS Data:', data)
    } catch (err) {
        console.error('Failed to send message to SQS:', err);
    }
}

// Route to test sending messages to SQS
app.post('/uploaded', async (req, res) => {
    const { lineId, replyToken, fileName } = req.body

    console.log('lineId:', lineId, 'replyToken:', replyToken, 'fileName:', fileName);

    if (!lineId || !replyToken || !fileName) {
        return res.status(400).send('Missing lineId, replyToken, or fileName');
    }

    try {
        // TASKS: Reply with flex message | link to file-access service with correct credentials
        bot.replyMessage(replyToken, {
            type: 'text',
            text: `userId: ${lineId} | fileName: ${fileName}`,
        }).catch(err => console.error('Failed to send reply:', err));

        res.send(`Upload confirmation message send successfully`);
    } catch (err) {
        console.error('Fail to send upload confirmation message:', err);
        res.status(500).send('Fail to send upload confirmation message:', err);
    }
});

// Set the PORT environment variable or default to 3001
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
});

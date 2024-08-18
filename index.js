const express = require('express');
const bodyParser = require('body-parser');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const dotenv = require('dotenv');
const line = require('@line/bot-sdk');
const axios = require('axios');
const { createConfirmMessage } = require('./messages/confirmMessage');

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

function sendLoading(lineId) {
    axios.post('https://api.line.me/v2/bot/chat/loading/start', {
        chatId: lineId,
        loadingSeconds: 60
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineConfig.channelAccessToken}`
        }
    })
}

// LINE webhook handler
app.post('/callback', async (req, res) => {
    const events = req.body.events;

    events.forEach(event => {
        console.log("Event:", JSON.stringify(event, null, 2));

        const lineId = event.source.userId;

        switch (event.type) {
            case 'follow':
                try {
                    console.log('Follow event:', event);
                    bot.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `Keeper เป็นผู้ช่วยเก็บไฟล์ของคุณ ส่งไฟล์มาให้ Keeper เก็บได้เลยนะครับ 😊`,
                    })
                } catch (err) {
                    console.error('Error handleFollow:', err);
                }
                break;

            case 'unfollow':
                break;

            case 'message':
                const message = event.message;
                switch (message.type) {

                    case 'image':
                    case 'video':
                    case 'audio':
                    case 'file':
                        try {
                            sendLoading(lineId)
                            handleFiles(event)
                        } catch (err) {
                            console.error('Error handleFiles:', err);
                        }
                        break;

                    case 'text':
                        try {
                            bot.replyMessage(event.replyToken, {
                                type: 'text',
                                text: `ขออภัยครับ Keeper ยังไม่รองรับการเก็บ 'ข้อความ' นะครับ 🙏`,
                            }).catch(err => console.error('Failed to send reply:', err));
                        } catch (err) {
                            console.error('Error handleText:', err);
                        }
                        break;

                    default:
                        try {
                            bot.replyMessage(event.replyToken, {
                                type: 'text',
                                text: `ขออภัยครับ Keeper ยังไม่รองรับการเก็บข้อความประเภทนี้นะครับ 🙏`,
                            }).catch(err => console.error('Failed to send reply:', err));
                        } catch (err) {
                            console.error('Error handleDefault:', err);
                        }
                        break;

                }
                break;

            default:
                try {
                    bot.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `ขออภัยครับ Keeper ยังไม่รองรับการเก็บข้อความประเภทนี้นะครับ 🙏`,
                    }).catch(err => console.error('Failed to send reply:', err));
                } catch (err) {
                    console.error('Error handleDefault:', err);
                }
                console.log('Unsupported event type:', event.type);
                break;
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
        // bot.replyMessage(replyToken, {
        //     type: 'text',
        //     text: `userId: ${lineId} | fileName: ${fileName}`,
        // }).catch(err => console.error('Failed to send reply:', err));

        bot.replyMessage(
            replyToken, 
            createConfirmMessage(lineId, fileName)
        )

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

const { formatThaiDate } = require('../utils/dateUtils');
const dotenv = require('dotenv');
dotenv.config();

function createConfirmMessage(lineId, fileName) {

    const now = new Date();
    const thaiDate = formatThaiDate(now);

    const fileId = fileName.substring(fileName.indexOf('/') + 1);

    return {
        "type": "flex",
        "altText": "เก็บไฟล์สำเร็จ",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "เก็บไฟล์สำเร็จ",
                        "weight": "bold",
                        "size": "xl"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "เวลา:",
                                        "color": "#aaaaaa",
                                        "size": "sm",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": thaiDate,
                                        "wrap": true,
                                        "color": "#aaaaaa",
                                        "size": "sm",
                                        "flex": 5
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            "footer": { // Moving the button to the footer section
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "uri",
                            "label": "ดูไฟล์",
                            "uri": `${process.env.FILE_ACCESS_SERVICE}/${fileId}?owner=${lineId}&user=${lineId}`
                        },
                        "style": "primary",
                        "color": "#F29F05",
                        "height": "sm"
                    }
                ],
                "flex": 0
            }
        }
    };
}

module.exports = {
    createConfirmMessage
};

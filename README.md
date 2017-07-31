# nci-telegram-notification
[![Build Status](https://travis-ci.org/node-ci/nci-telegram-notification.svg?branch=master)](https://travis-ci.org/node-ci/nci-telegram-notification)

Telegram notification plugin for [nci](https://github.com/node-ci/nci)

## Installation

```sh
npm install nci-telegram-notification
```

## Usage

Register telegram bot, just start conversation with `@BotFather`.
Add this plugin to the `plugins` section at server config, set
parameters for telegram bot at `notify.telegram`
```yml
plugins:
    - nci-telegram-notification

notify:
    telegram:
        token: 123:xyz

```
after that you can set telegram notification at project config
```yml
notify:
    on: [done, change, error]
    to:
        telegram:
            - 1111 # this is id of the group chat, read next section
```

### How to get the group chat id

_Information from [stackoverflow question](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id)_

* Add the Telegram BOT to the group.

* Get the list of updates for your BOT: `curl https://api.telegram.org/123:xyz/getUpdates`

* Look for the "chat" object:
```json
{"update_id":8393,"message":{"message_id":3,"from":{"id":7474,"first_name":"AAA"},"chat":{"id":123,"title":""},"date":25497,"new_chat_participant":{"id":71,"first_name":"NAME","username":"YOUR_BOT_NAME"}}}
```

* Use the `id` of the `chat` object to send your messages.


## License

[The MIT License](https://raw.githubusercontent.com/fleg/nci-telegram-notification/master/LICENSE)

# Matrix reMarkable Bot
A Matrix chat bot that can send files and webpages to reMarkable tablet, using reMarkable cloud.

# How to use
Currently, since the only way to use this is to clone or download this repo. After you do it, follow the following instructions:

1. Create a new Matrix user for your bot on any matrix homeserver.

1. Run this project's setup:
 
    `$ npm run setup` 
    
    This will generate an `out` folder.

1. Copy the `config-example.yaml` file to the `out` folder, name it `config.yaml`. 
1. Edit the `out/config.yaml` and set the correct homeserver url and Matrix user access token (see https://t2bot.io/docs/access_tokens/ on how to get an access token).
1. Run the bot:

    `$ npm run bot`

From this point on the bot should be running. Invite it to an unencripted room on Matrix (e2e encryption is not supported yet), write the `help` command to it and follow its instructions.

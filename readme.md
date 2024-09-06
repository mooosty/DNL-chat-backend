## Setting up socketIO client
we need to install socket-io client on frontend to make sure we are able to make connection with socket-io server {`npm install socket.io-client`}

Be mindful while adjusting connection URL with socket-server so we have our frontend URL variable in our env file unless the frontend URL from where you are acessing the socket server is not whitelisted it will not establish the connection.

## Usage
# Chat Functionality: 
Users can send and receive messages in real time.
# Group Chats: 
Create and manage group chats.
# Typing Indicator: 
See when other users are typing.

## Setting Connection
You need to pass the below emit/on to work accordingly. 

{`setup`}
{`connected`}
{`join chat`}
{`typing`}
{`stop typing`}
{`new message`}
{`message recieved`}

## Disconnect the user from socket server

## Upload image API

# Upload image
The endpoint to upload the image is mentioned in swagger documentation `http://localhost:4500/api-docs`.
The image is stored in `images` folder with the name you pass from api params. only png/jpg/jpeg are supported.
Please note, when uploading the image you need to keep the name unique for every image to ensure identity and the `name` needs to be passed in to `send message` api. Like the body below,
{
    chatId:chatId,
    content:ImageIdenticalName,
    isImage:true
}

# Upload Videos
The same process needs to be performed for uploading videos too. Currently video greater than 10MB is not supported to reduce the storage abuse on the server and keeping maximum storage available to levereage.

# Upload documents
To upload documents same process is required for the services to be uploaded in to the server. Document of any type is currently supported but limit size is 10MB maximum. 

## Redis 
we need to install redis-cli to manage our caching system to depreciate from storing messages on client local storage. Please check their website for downloading redis.

## How to run
1- Install all the necessary packages in root directory by running `npm install` or `yarn install`
2- Open another CMD and run `redis-server --port 6380`
3- Now you need to run `npm run dev`




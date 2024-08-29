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





## Setting up socketIO client
we need to install socket-io client on frontend to make sure we are able to make connection with socket-io server {`npm install socket.io-client`}

Be mindful while adjusting connection URL with socket-server so we have our frontend URL variable in our env file unless the frontend URL from where you are acessing the socket server is not whitelisted it will not establish the connection.

# Usage
## Chat Functionality: 
Users can send and receive messages in real time.
## Group Chats: 
Create and manage group chats.
## Typing Indicator: 
See when other users are typing.

## Setting Connection
You need to pass the below socket paramaters emit/on to work accordingly. 

- {`setup`}
- {`connected`}
- {`join chat`}
- {`typing`}
- {`stop typing`}
- {`new message`}
- {`message recieved`}
- {`joinRequest`}
- {`newJoinRequest`}
- {`leavegroup`}
- {`userleavegroup`}


## Using `useEffect` to handle Socket.IO events and notifications in React

The following React code snippet shows how to use the `useEffect` hook to listen for real-time events from a Socket.IO connection, specifically handling join requests for a chat group. Notifications are displayed using Chakra UI's `toast` component.

### Code Example

```javascript
import { useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import socket from "../path-to-socket"; // Import the socket instance

const GroupChatComponent = () => {
  const toast = useToast();

  // Effect to handle the "newJoinRequest" event and display a notification
  useEffect(() => {
    // Listen for the "newJoinRequest" event from the server
    socket.on("newJoinRequest", (data) => {
      // Display a notification when a new join request is received
      toast({
        title: "New Join Request",
        description: data.message,
        status: "info",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    });

    // Cleanup the socket event listener when the component unmounts
    return () => {
      socket.off("newJoinRequest");
    };
  }, [socket, toast]); // Re-run the effect when socket or toast changes

  // Another effect to handle the "joinRequest" event
  useEffect(() => {
    // Listen for the "joinRequest" event from the server
    socket.on("joinRequest", (message) => {
      // Display a notification when a join request is triggered
      toast({
        title: "New Group Join Request",
        description: message, // e.g., "User requested to join the group"
        status: "info",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    });

    // Cleanup the socket event listener when the component unmounts
    return () => {
      socket.off("joinRequest");
    };
  }, [socket, toast]); // Re-run the effect when socket or toast changes

  // Function to emit a join request to the server
  const requestToJoinGroup = (groupId, adminId) => {
    socket.emit("joinRequest", groupId, adminId);
  };

  return (
    // JSX for the component
    <div>
      {/* UI elements like buttons or chat groups */}
      <button onClick={()=> requestToJoinGroup(groupId,groupAdminId)} >Join the group</button>
    </div>
  );
};

export default GroupChatComponent;
```


## Disconnect the user from socket server

# Upload image API

## Upload image
The endpoint to upload the image is mentioned in swagger documentation `http://localhost:4500/api-docs`.
The image is stored in `images` folder with the name you pass from api params. only png/jpg/jpeg are supported.
Please note, when uploading the image you need to keep the name unique for every image to ensure identity and the `name` needs to be passed in to `send message` api. Like the body below,
\n{
  \n  chatId:chatId,
    \ncontent:ImageIdenticalName,
    \nisImage:true
\n}

## Upload Videos
The same process needs to be performed for uploading videos too. Currently video greater than 10MB is not supported to prevent the storage abuse on the server and keeping maximum storage available to levereage.

## Upload documents
To upload documents same process is required for the services to be uploaded in to the server. Document of any type is currently supported but limit size is 10MB maximum. 

# Redis 
we need to install `redis-cli` to manage our caching system to depreciate from storing messages on client local storage. Please check their website for downloading redis.

Or use this link
https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.msi

## How to run
1- Install all the necessary packages in root directory by running `npm install` or `yarn install`
2- Open another CMD and run `redis-server --port 6380`
3- Now you need to run `npm run dev`




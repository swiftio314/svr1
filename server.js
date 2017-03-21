var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//pair of user's name and user's socket
var currentUsers = [];
var currentSockets = [];
var currentUsersIp = [];
var currentUsersRoom = [];

var typingUsers = [];

var currentRooms = [];
var currentRoomsUsers = [];


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    currentUsers.push('');
    currentSockets.push(socket);
    currentUsersIp.push(socket.request.connection.remoteAddress);
    socket.on('chat message', function(userName, receiveName, msg, currentdate){
        if(receiveName == 'all'){
            //send message to all client without self
            socket.broadcast.emit('chat message', userName, receiveName, msg, currentdate);
        }
        else{
            currentSockets[currentUsers.indexOf(receiveName)].emit('chat message', userName, receiveName, msg, currentdate);
        }
    });

    socket.on('creat room', function(msg){
        if(currentRooms.indexOf(msg[0])==-1){
            var userArr = [];
            console.log('create room ' + msg[0]);
            currentRooms.push(msg[0]);
            userArr.push(msg[1]);
            currentRoomsUsers.push(userArr);
        } else {
            console.log('error create room');
            socket.emit('return error', '');
        }
    });

    socket.on('join room', function(msg){
        var index = currentRooms.indexOf(msg[0]);
        if(index!=-1){
            if (currentRoomsUsers[index].indexOf(msg[1])==-1) {
                currentRoomsUsers[index].push(msg[1]);
            }
        } else {
            socket.emit('return error', '');
        }
    });

      
    socket.on('list room', function(msg){
        console.log('list room');
        sendEventArray(socket, 'add room', currentRooms);
              
        var clientIp = socket.request.connection.remoteAddress;
        console.log(clientIp);
        socketSend(socket, 'add room', clientIp)
    });
    
    socket.on('view room', function(msg){
        var index = currentRooms.indexOf(msg);
        if(index!=-1){
            sendEventArray(socket, 'add room', currentRoomsUsers[index]);
        }
    });

    socket.on('timer sync', function(msg){
        socket.emit('send echo', '');
    });
      
    socket.on('passmsgsvr', function(msg){
        //check user's name exist or not
        var j = currentSockets.indexOf(socket);
        for (var i = 0; i < currentUsers.length; i++) {
            if (socket != currentSockets[j]) {
                currentSockets[i].emit('passmsgclient', currentUsers[j], msg)
            }
        }
    });

    socket.on('new user', function(userName){
        //check user's name exist or not
        console.log(userName + ', ' + currentUsersIp);
        if(currentUsers.indexOf(userName)==-1){
            if(currentUsers[currentSockets.indexOf(socket)] != null){
              currentUsers[currentSockets.indexOf(socket)] = userName;
            }
            io.emit('user join', userName);
            io.emit('add userList', userName);
        }
        else{
            socket.emit('userName exist', userName);
        }
    });
  
    socket.on('start typing', function(name){
        console.log('start typing');
        if(typingUsers.indexOf(name)==-1){
            typingUsers.push(name);
        }
        io.emit('typing message', typingUsers);
    });
  
    socket.on('stop typing', function(name){
        console.log('new user');
        if(typingUsers.indexOf(name)!=-1){
            typingUsers.splice(typingUsers.indexOf(name),1);
        }
        io.emit('typing message', typingUsers);
    });  
  
    socket.on('disconnect', function(){
        console.log('receive disconnect');
        if(currentSockets.indexOf(socket)!=-1){
            //when disconnect username doesn't null, show user left message
            //problem: sometimes client receive null left message, and nobody was disconnect.
            if(currentUsers[currentSockets.indexOf(socket)] != null){
                io.emit('user left', currentUsers[currentSockets.indexOf(socket)]);
            }
            //if disconnect user was typing, remove the name from typing list
            if(typingUsers.indexOf(currentUsers[currentSockets.indexOf(socket)])!=-1){
                typingUsers.splice(typingUsers.indexOf(currentUsers[currentSockets.indexOf(socket)]),1);
                io.emit('typing message', typingUsers);
            }
            //remove leaved user's name and socket
            currentUsers.splice(currentSockets.indexOf(socket),1);
            currentSockets.splice(currentSockets.indexOf(socket),1);
        }
    });
  
    //when a new client connected add current users to client selector
    for (var i = 0; i < currentUsers.length; i++) {
        socket.emit('add userList', currentUsers[i]);
    }
  
});

var socketSend = function(socket, event, msg) {
    socket.emit(event, msg);
}

var disconnectUser = function(index) {
    currentSockets[index].disconnect();
}

var removeUser = function(index) {
    currentUsers.splice(index,1);
    currentSockets.splice(index,1);
    currentUsersRoom.splice(index,1);
    currentUsersIp.splice(index,1);
}

var removeRoomUsers = function(index) {
    var roomUsers = currentRoomsUsers[index];
    for (var i = currentRoomsUsers - 1; i >= 0  ; i--) {
        roomUsers[i].splice(i,1);
    }
    currentRoomsUsers.splice(index,1);
}

var removeRoom = function(index) {
    currentUsersList(removeRoomUsers, currentRooms.length);
    currentRooms.splice(index,1);
}

var sendEventArray = function(socket, event, arr) {
    console.log('list room = ' + arr.length);
    for (var i = 0; i < arr.length ; i++) {
        console.log(arr[i]);
        socketSend(socket, event, arr[i]);
    }
}

var currentUsersList = function(callback, length) {
    for (var i = length - 1; i >= 0 ; i--) {
        callback(i);
    }
}

var myCallback = function(data) {
    console.log('got data: '+data);
};

var usingItNow = function(callback) {
    callback('get it?');
};

http.listen(process.env.PORT || 8080, function(){
  console.log('listening on *:8080');
  console.log('listening on *:8080'.substring(0,5));
});

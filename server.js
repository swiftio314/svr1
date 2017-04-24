var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var typingUsers = [];

//User Data
var currentUsers = [];
var currentSockets = [];
var currentUsersIp = [];

//Room Data
var currentRooms = [];
var currentRoomsUsers = [];
//Room SyncVar
var currentRoomsSync = [];

var developerEventDefault = 'developerMsg';

var errorMsg = ['join room', 'delete room', 'msg room', 'listUser room', 'timer sync', 'passmsgsvr', 'deleteUser room', 'msg user'];

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

    socket.on('join room', function(msg){
	    sendDeveloper(developerEventDefault, msg[1] + ' want to join room = ' + msg[0]);
		if (joinRoom(msg[0], msg[1]) != -1){
			socketSend(socket, 'success', errorMsg.indexOf('join room'));
		} else {
			socketSend(socket, 'error', errorMsg.indexOf('join room'));
		}
    });

    socket.on('delete room', function(msg){
		deleteRoom(msg[0]);
		socketSend(socket, 'success', errorMsg.indexOf('delete room'));
    });
    
    socket.on('list room', function(msg){
        console.log('list room');
        socketSend(socket, 'list room', currentRooms);
              
        var clientIp = socket.request.connection.remoteAddress;
        console.log(clientIp);
        socketSend(socket, 'passmsgclient', clientIp);
    });
	
	socket.on('msg room', function(msg){
		msgRoom(msg[0], msg[1]);
	});
    
    socket.on('listUser room', function(msg){
        var index = currentRooms.indexOf(msg[0]);
        if(index!=-1){
            socketSend(socket, 'listUser room', currentRoomsUsers[index]);
        }
    });
	
    socket.on('deleteUser room', function(msg){
        delUserRoom(msg[0], msg[1]);
    });
    
    socket.on('msg user', function(msg){
		//send receive msg
        var index = currentUsers.indexOf(msg[0]);
		
        if(index!=-1){
			currentSockets[index].emit('msg user', msg);
        }
    });

    socket.on('timer sync', function(msg){
        socket.emit('timersync echo', '');
    });
      
    socket.on('passmsgsvr', function(msg){
        var j = currentSockets.indexOf(socket);
        sendDeveloper(developerEventDefault, 'passmsgclient from ' + currentUsers[j] + ', msg = ' + msg);
        for (var i = 0; i < currentUsers.length; i++) {
            if (i != j) {
                socketSend(currentSockets[i], 'passmsgclient', msg);
            }
        }
    });

    socket.on('new user', function(userName){
        //check user's name exist or not
        console.log(userName + ', ' + currentUsersIp[currentSockets.indexOf(socket)]);
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
			
			var userName = currentUsers[currentSockets.indexOf(socket)];
			for (var i = 0; i < currentRoomsUsers.length; i++) {
				delUserRoom(currentRooms[i], userName);
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

var createRoom = function(roomName, userName) {
	sendDeveloper(developerEventDefault, 'ceate room = ' + roomName);
	if(currentRooms.indexOf(roomName)==-1){
		var userArr = [];
		console.log('create room ' + roomName);
		currentRooms.push(roomName);
		userArr.push(userName);
		currentRoomsUsers.push(userArr);
		currentRoomsSync.push(0);
	} else {
		console.log('error create room');
		sendDeveloper(developerEventDefault, 'Error create room = ' + roomName);
		
		return -1;
	}
}

var joinRoom = function(roomName, userName) {
	var index = currentRooms.indexOf(roomName);
	if(index!=-1){
		if (currentRoomsUsers[index].indexOf(userName)==-1) {
			currentRoomsUsers[index].push(userName);
			
			return 1;
		}
	} else {
		createRoom(roomName, userName);
	}
}

var socketSend = function(socket, event, msg) {
    socket.emit(event, msg);
}

var disconnectUser = function(index) {
    currentSockets[index].disconnect();
}

var removeUser = function(index) {
    currentUsers.splice(index,1);
    currentSockets.splice(index,1);
    currentUsersIp.splice(index,1);
}

var displayUser = function(index) {
    console.log(currentUsers[index]);
    console.log(currentSockets[index]);
    console.log(currentUsersIp.splice[index]);
}

var deleteRoom = function(roomName) {
	var index = currentRooms.indexOf(roomName);
	
	if(index!=-1){
		var currentRoom = currentRooms[index];

		var roomUsers = currentRoomsUsers[index];
		for (var i = currentRoomsUsers - 1; i >= 0  ; i--) {
			roomUsers[i].splice(i,1);
		}
		currentRoomsUsers.splice(index,1);
		currentRooms.splice(index,1);
		currentRoomsSync.splice(index,1);
	}
}

var sendEventArray = function(socket, event, arr) {
    console.log('arr len = ' + arr.length);
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

var sendDeveloper = function(event, msg) {
    io.emit(event, msg);
}

var delUserRoom = function(roomName, userName) {
	var index = currentRooms.indexOf(roomName);
	
	if(index!=-1){
		var roomUsers = currentRoomsUsers[index];
		var delUserIndex = roomUsers.indexOf(userName);
		if(delUserIndex!=-1){
			roomUsers.splice(delUserIndex,1);
			for (var i = 0; i < roomUsers.length; i++) {
				var userIndex = currentUsers.indexOf(roomUsers[i]);
				socketSend(currentSockets[userIndex], 'deleteUser room',  userName);
			}

			currentRoomsSync[index] = currentRoomsSync[index] + 1;
			
			if(roomUsers.length==0) {
				deleteRoom(roomName);
			}
		}
	}
}

var msgRoom = function(roomName, msg) {
	var index = currentRooms.indexOf(roomName);
	
	if(index!=-1){
		var roomUsers = currentRoomsUsers[index];
		for (var i = 0; i < roomUsers.length; i++) {
			var userIndex = currentUsers.indexOf(roomUsers[i]);
			msg[0] = numStr6(currentRoomsSync[index]) + msg[0];
			socketSend(currentSockets[userIndex], 'msg room', msg);
		}
		
		currentRoomsSync[index] = currentRoomsSync[index] + 1;
	}
}

var numStr6 = function(num) {
	var str = String(num);
	var len = str.length;
	
	while(len < 6){
		str = '0' + str;
		len = str.length;
	}
	return str;
}

http.listen(process.env.PORT || 8080, function(){
    console.log('listening on *:8080');
});

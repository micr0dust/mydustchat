var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io'); // 加入 Socket.IO

var server = http.createServer(function (request, response) {
  console.log('Connection');
  var path = url.parse(request.url).pathname;

  switch (path) {
    case '/':
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.write('Wrong page.');
      response.end();
      break;
    case '/socket.html':
      fs.readFile(__dirname + path, function (error, data) {
        if (error) {
          response.writeHead(404);
          response.write("opps this doesn't exist - 404");
        } else {
          response.writeHead(200, { "Content-Type": "text/html" });
          response.write(data, "utf8");
        }
        response.end();
      });
      break;
    default:
      response.writeHead(404);
      response.write("opps this doesn't exist - 404");
      response.end();
      break;
  }
});

server.listen(process.env.PORT || 3000);

var serv_io = io.listen(server);
serv_io.set('log level', 1); // 關閉 debug 訊息

let content = [];
let user_num = 0;
content.push({ "name": "[伺服器]", "text": "歡迎來到此聊天室!" });

serv_io.sockets.on('connection', function (socket) {
  setInterval(() => {
    socket.emit('chat', content);
  }, 500);
  // 接收來自於瀏覽器的資料
  socket.on('client_data', function (data) {
    let txt=data.text;
    content.push({ "name": data.name, "text": txt });
    if(content.length>10) content.shift();
    socket.emit('chat', content);
  });
  user_num++;
  socket.emit('user', user_num);
});
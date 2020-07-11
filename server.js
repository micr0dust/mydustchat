var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io'); // 加入 Socket.IO

var server = http.createServer(function (request, response) {
  //console.log('Connection');
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
let userlist = [];
let iplist = [];
let ipnum = 0;
let news = false;
let reapet = false;
const random = Math.floor(Math.random() * (2 ^ 64 - 2 + 1) + 2);
content.push({ "name": "伺服器", "text": "歡迎來到此聊天室!" });

serv_io.sockets.on('connection', function (socket) {
  setInterval(() => {
    socket.emit('chat', { "chat": content, "user": false });
  }, 500);
  // 接收來自於瀏覽器的資料
  socket.on('client_data', function (data) {
    let realuser = false;
    let ip = data.ip.replace(/\./g, "");
    for (i = 0; i < iplist.length+1; i++) if (iplist[i] === ip) realuser = true;
    if (data.text === "" || !realuser || data.text.length > 300) return console.log("阻止了一個不法請求");
    news = true;
    let txt = data.text;
    content.push({ "name": userlist[ip], "text": txt });
    //if(content.length>50) content.shift();
    socket.emit('chat', { "chat": content, "user": false, "news": news });
    console.log({ "name": userlist[ip], "text": txt, "ip": ip })
    news = false;
  });
  socket.on('ip', function (data) {
    if (!data.ip) return;
    let txt = data.ip;
    txt = txt.replace(/\./g, "");
    for (i = 0; i < iplist.length; i++) if (iplist[i] === txt) reapet=true;
    if(reapet){
      socket.emit('chat', { "chat": content, "user": userlist[txt] });
      reapet=false;
      console.log("A");
      return;
    }
    iplist[ipnum] = txt;
    ipnum++;
    userlist[txt] = (parseInt(txt) + random).toString(35);
    console.log(userlist[txt] + "加入了聊天室");
    content.push({ "name": "伺服器", "text": userlist[txt] + "加入了聊天室" });
    socket.emit('chat', { "chat": content, "user": userlist[txt], "news": news });
    //if(content.length>50) content.shift();
  });
});
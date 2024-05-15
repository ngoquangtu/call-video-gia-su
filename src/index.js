const express = require('express');
const http = require('http');
const path = require('path'); 
const bodyParser = require('body-parser');
const socketIO=require('socket.io');
const app = express();

const server = http.createServer(app);
const io=socketIO(server);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Serve static files
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
  });

  // Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle incoming messages
  socket.on('message', (msg) => {
    console.log('Message received:', msg);
    // Broadcast the message to all connected clients
    io.emit('message', msg);
  });
    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const path = require('path');
const express = require('express');
const { ExpressPeerServer } = require('peer');
const app = express();
const FE_ROOT_DIR = path.resolve(__dirname, 'dist', 'connect-the-dots-game');

const server = app.listen(4000, () => {

  console.log('Server started on port 4000...');

});

const peerServer = ExpressPeerServer(server, {
  path: '/broker'
});

app.use('/peerjs', peerServer);
app.use(express.static(FE_ROOT_DIR));
app.get('*', (req, res) => res.sendFile(
  'index.html',
  { root: FE_ROOT_DIR },
  error => {
    if ( error ) console.error(error);
  }
));
const http = require('http');

async function triggerReprocess() {
  const cookie = 'ucon_session=6accf0eecb14a50ba7814982b9d1d875f52a871f59fc223119b3e1357da89de6';
  const reqData = JSON.stringify({
    id: '4d9522e0-8ce1-48b7-b01b-1ea103f332b8',
    action: 'reprocess',
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/documents',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'Content-Length': Buffer.byteLength(reqData),
    },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', body);
    });
  });

  req.on('error', (e) => console.error(e));
  req.write(reqData);
  req.end();
}

triggerReprocess();

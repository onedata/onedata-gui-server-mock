const express = require('express');
const subdomain = require('express-subdomain');
const https = require('https');
const fs = require('fs');

const staticRootDir = `${__dirname}/static/onedata-gui-static`;
const onezoneId = 'onezone';

const clusters = [
  {
    id: onezoneId,
    type: 'onezone',
  },
  {
    id: 'oneprovider-1',
    type: 'oneprovider',
  },
  {
    id: 'oneprovider-2',
    type: 'oneprovider',
  },
];

const oneproviderFaviconData = fs.readFileSync(`${__dirname}/favicon.ico`);

const serviceApp = express();
const serviceRouter = express.Router();
serviceApp.use(subdomain(onezoneId, serviceRouter));

const onepanelApp = express();

const privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

const credentials = { key: privateKey, cert: certificate };

serviceRouter.get('/', (req, res) => {
  res.redirect(`/ozw/${onezoneId}`);
});

clusters.forEach((cluster) => {
  const typeLetter = cluster.type[3];
  const servicePath = `o${typeLetter}w/${cluster.id}`;
  const panelPath = `o${typeLetter}p/${cluster.id}`;

  [servicePath, panelPath].forEach((path) => {
    const absPath = `/${path}`;
    serviceRouter.get(absPath, (req, res) => {
      res.redirect(`${absPath}/i`);
    });
    serviceRouter.get(`${absPath}/i`, (req, res) => {
      res.sendFile(`${staticRootDir}/${path}/index.html`);
    });
    serviceRouter.use(absPath, express.static(`${staticRootDir}/${path}`));
  });

  const onepanelRouter = express.Router();
  onepanelApp.use(subdomain(cluster.id, onepanelRouter));
  onepanelRouter.use(express.static(`${staticRootDir}/${panelPath}`));

  if (typeLetter === 'p') {
    const oneproviderRouter = express.Router();
    serviceApp.use(subdomain(cluster.id, oneproviderRouter));

    serviceApp.get('/favicon.ico', (req, res) => {
      res.contentType('image/x-icon');
      res.end(oneproviderFaviconData);
    });
    serviceApp.get('/shares/:id', (req, res) => {
      const onezoneDomain = req.hostname.replace(cluster.id, onezoneId);
      res.redirect(`https://${onezoneDomain}/opw/${cluster.id}/i#/public/shares/${req.params.id}`);
    });
    serviceApp.get('/', (req, res) => {
      const onezoneDomain = req.hostname.replace(cluster.id, onezoneId);
      res.redirect(`https://${onezoneDomain}/opw/${cluster.id}`);
    });
  }
});

const logout = (req, res) => {
  res.cookie('is-authenticated', 'false', { path: '/' });
  res.send();
};

serviceApp.post('/logout', logout);
onepanelApp.post('/logout', logout);

const serviceServer = https.createServer(credentials, serviceApp);
serviceServer.listen(443);

const onepanelServer = https.createServer(credentials, onepanelApp);
onepanelServer.listen(9443);

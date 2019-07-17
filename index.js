/**
 * Serves frontend static files like Onezone server and emergency Onepanels.
 * See README.md for details.
 *
 * @author Jakub Liput
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

const express = require('express');
const subdomain = require('express-subdomain');
const https = require('https');
const fs = require('fs');

const staticRootDir = `${__dirname}/static/onedata-gui-static`;
const onezoneId = 'onezone';
const hostnameRegex = /(.*?)\.(.*)/;
const pathRegex = /\/(.*?)\/(.*?)\/(.*)/;
const onepanelAbbrev = 'onp';
const oneproviderAbbrev = 'opw';
const guiContextMethodName = 'gui-context';

const clusters = [
  {
    id: onezoneId,
    type: 'onezone',
    onepanelProxy: true,
  },
  {
    id: 'oneprovider-1',
    type: 'oneprovider',
    onepanelProxy: true,
  },
  {
    id: 'oneprovider-2',
    type: 'oneprovider',
  },
  {
    id: 'oneprovider-3',
    type: 'oneprovider',
  },
];

const testImageData = fs.readFileSync(`${__dirname}/favicon.ico`);

function getTestImagePath(type) {
  return `/api/v3/${type}/test_image`;
}

function addTestImageServing(server, type, prefix = '') {
  server.get(prefix + getTestImagePath(type), (req, res) => {
    res.contentType('image/x-icon');
    res.end(testImageData);
  });
}

/**
 * @param {Express.Request} req
 * @param {Express.Reponse} res
 */
const handleEmergencyContext = (req, res) => {
  const { hostname } = req;
  const parsedHostname = hostnameRegex.exec(hostname);
  if (parsedHostname) {
    const clusterId = parsedHostname[1];
    const suffix = (req.url.startsWith('/onepanel') ? '/onepanel' : ':9443');
    res.send({
      guiMode: 'emergency',
      serviceType: 'onepanel',
      clusterType: clusters.find(c => c.id === clusterId).type,
      clusterId,
      apiOrigin: `${hostname}${suffix}`,
    });
  } else {
    res.sendStatus(404).send();
  }
};

const handleHostedContext = (req, res) => {
  const parsedHostname = hostnameRegex.exec(req.hostname);
  const parsedPath = pathRegex.exec(req.url);
  if (parsedHostname && parsedPath) {
    const clusterId = parsedPath[2];
    const onezoneDomainWithPort = parsedHostname[2];
    const isOnepanel = (parsedPath[1] === onepanelAbbrev);
    const cluster = clusters.find(c => c.id === clusterId);
    const { type: clusterType } = cluster;
    res.send({
      guiMode: 'unified',
      serviceType: isOnepanel ? 'onepanel' : 'worker',
      clusterType,
      clusterId,
      apiOrigin: `${clusterId}.${onezoneDomainWithPort}`,
    });
  } else {
    res.sendStatus(404).send();
  }
};

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
  const panelPath = `${onepanelAbbrev}/${cluster.id}`;

  const onepanelRouter = express.Router();
  onepanelApp.use(subdomain(cluster.id, onepanelRouter));
  onepanelRouter.use(express.static(`${staticRootDir}/${panelPath}`));

  // ./gui-context method handling eg. https://onezone.local-onedata.org/ozw/onezone/gui-context
  serviceRouter.get(`/${servicePath}/${guiContextMethodName}`, handleHostedContext);
  serviceRouter.get(`/${panelPath}/${guiContextMethodName}`, handleHostedContext);
  if (cluster.onepanelProxy) {
    serviceRouter.get(`/onepanel/${guiContextMethodName}`, handleEmergencyContext);
    addTestImageServing(serviceRouter, 'onepanel', '/onepanel');
  }
  onepanelRouter.get(`/${guiContextMethodName}`, handleEmergencyContext);
  addTestImageServing(onepanelRouter, 'onepanel');
  [
    servicePath,
    panelPath,
    ...(cluster.onepanelProxy ? ['onepanel'] : []),
  ].forEach((path) => {
    const absPath = `/${path}`;
    serviceRouter.get(absPath, (req, res) => {
      res.redirect(`${absPath}/i`);
    });
    serviceRouter.get(`${absPath}/i`, (req, res) => {
      res.sendFile(`${staticRootDir}/${path}/index.html`);
    });
    serviceRouter.use(absPath, express.static(`${staticRootDir}/${path}`));
  });

  if (typeLetter === 'p') {
    const oneproviderRouter = express.Router();
    serviceApp.use(subdomain(cluster.id, oneproviderRouter));
    // Onepanel served from Oneprovider subdomain with proxy prefix
    if (cluster.onepanelProxy) {
      oneproviderRouter.get('/onepanel', (req, res) => {
        res.redirect('/onepanel/i');
      });
      oneproviderRouter.get('/onepanel/i', (req, res) => {
        res.sendFile(`${staticRootDir}/onepanel/index.html`);
      });
      oneproviderRouter.use('/onepanel', express.static(`${staticRootDir}/onepanel`));
      oneproviderRouter.get(`/onepanel/${guiContextMethodName}`, handleEmergencyContext);
      addTestImageServing(oneproviderRouter, 'onepanel', '/onepanel');
    }
    addTestImageServing(serviceApp, 'oneprovider');
    serviceApp.get('/shares/:id', (req, res) => {
      const onezoneDomain = req.hostname.replace(cluster.id, onezoneId);
      res.redirect(`https://${onezoneDomain}/${oneproviderAbbrev}/${cluster.id}/i#/public/shares/${req.params.id}`);
    });
    serviceApp.get('/', (req, res) => {
      const onezoneDomain = req.hostname.replace(cluster.id, onezoneId);
      res.redirect(`https://${onezoneDomain}/${oneproviderAbbrev}/${cluster.id}`);
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

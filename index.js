/**
 * Serves frontend static files like Onezone server and emergency Onepanels.
 * See README.md for details.
 *
 * @author Jakub Liput
 * @copyright (C) 2019-2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

const express = require('express');
const subdomain = require('express-subdomain');
const https = require('https');
const fs = require('fs');

const staticDir = `${__dirname}/static`;
const staticRootDir = `${staticDir}/onedata-gui-static`;
const onezoneId = 'onezone';
const hostnameRegex = /(.*?)\.(.*)/;
const pathRegex = /\/(.*?)\/(.*?)\/(.*)/;
const onezoneAbbrev = 'ozw';
const onepanelAbbrev = 'onp';
const oneproviderAbbrev = 'opw';
const guiContextMethodName = 'gui-context';
const browserDebugLogs = true;
const publicDevelopment = true;
const generalDomain = 'local-onedata.org';
const onezoneDomain = `${onezoneId}.${generalDomain}`;
const onezoneName = 'My Onezone';
const servicePort = 9192;
const emergencyPanelPort = 9443;

const clusters = [
  {
    id: onezoneId,
    type: 'onezone',
    onepanelProxy: true,
  },
  {
    id: 'oneprovider1',
    type: 'oneprovider',
    onepanelProxy: true,
  },
  {
    id: 'oneprovider2',
    type: 'oneprovider',
  },
  {
    id: 'oneprovider3',
    type: 'oneprovider',
  },
];

const testImageData = fs.readFileSync(`${__dirname}/favicon.ico`);

function getTestImagePath(type) {
  return `/api/v3/${type}/test_image`;
}

function addClusterConfigurationServing(server) {
  const path = '/api/v3/onepanel/configuration';
  server.get(path, (req, res) => {
    const clusterId = hostnameRegex.exec(req.connection.servername)[1];
    const isOneprovider = clusterId !== onezoneId;
    res.setHeader('Access-Control-Allow-Origin', `https://${onezoneDomain}`);
    res.send({
      zoneName: isOneprovider ? undefined : onezoneName,
      zoneDomain: onezoneDomain,
      version: '20.02.6',
      serviceType: isOneprovider ? 'oneprovider' : 'onezone',
      deployed: true,
      isRegistered: isOneprovider ? true : undefined,
      clusterId,
      build: '0-g35594fbc',
    });
  });
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
      browserDebugLogs,
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
      browserDebugLogs,
      apiOrigin: `${clusterId}.${onezoneDomainWithPort}`,
    });
  } else {
    res.sendStatus(404).send();
  }
};

const serviceApp = express();
const serviceRouter = express.Router();
// support for serving Onezone on pure IP
serviceApp.use(serviceRouter);
// support for serving Onezone on "onezone" subdomain
serviceApp.use(subdomain(onezoneId, serviceRouter));

const onepanelApp = express();

const privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

const credentials = { key: privateKey, cert: certificate };

serviceRouter.get('/', (req, res) => {
  res.redirect(`/${onezoneAbbrev}/${onezoneId}`);
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
    addTestImageServing(serviceRouter, 'onepanel');
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
    if (cluster.onepanelProxy) {
      addTestImageServing(oneproviderRouter, 'onepanel');
    }
    addTestImageServing(serviceApp, 'oneprovider');
    serviceApp.get('/shares/:id', (req, res) => {
      res.redirect(
        `https://${onezoneDomain}:${servicePort}/${onezoneAbbrev}/${onezoneId}/i#/public/shares/${req.params.id}`,
      );
    });
    serviceApp.get('/', (req, res) => {
      res.redirect(
        `https://${onezoneDomain}:${servicePort}/${oneproviderAbbrev}/${cluster.id}`,
      );
    });

    ['txt', 'bin', 'zip', 'json', 'xls', 'docx', 'xlsx', 'tar.gz'].forEach((extension) => {
      const path = `/download/test-file.${extension}`;
      serviceApp.get(path, (req, res) => {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.download(`${staticDir}${path}`);
      });
    });
  } else {
    addClusterConfigurationServing(serviceApp);
  }
});

serviceApp.get('/shares/:id', (req, res) => {
  res.redirect(
    `https://${req.hostname}:${servicePort}/${onezoneAbbrev}/${onezoneId}/i#/public/shares/${req.params.id}`,
  );
});

const logout = (req, res) => {
  res.cookie('is-authenticated', 'false', { path: '/' });
  res.send();
};

serviceApp.post('/logout', logout);
onepanelApp.post('/logout', logout);

const serviceServer = https.createServer(credentials, serviceApp);
serviceServer.listen(servicePort, publicDevelopment ? '0.0.0.0' : undefined);

const onepanelServer = https.createServer(credentials, onepanelApp);
onepanelServer.listen(emergencyPanelPort, publicDevelopment ? '0.0.0.0' : undefined);

# Prepare

## Install dependencies

As usual: `npm install`

## Create dirs in onedata-gui-static

See `reset-public.sh` script which will make dirs in `static` or make your own directory structure.


## Add local subdomains

Add these to `/etc/hosts`:

```
127.0.0.1 onezone.local-onedata.org
127.0.0.1 oneprovider1.local-onedata.org
127.0.0.1 oneprovider2.local-onedata.org
127.0.0.1 oneprovider3.local-onedata.org
```

## Build GUIs

Build:

- `onezone-gui` -> `onedata-gui-static/oz/onezone/`
- `op-gui-default` -> `onedata-gui-static/oneprovider-common
- `onepanel-gui` -> `onedata-gui-static/onepanel-common` (oz-panel and op-panel)

You can make symlink to one `onepanel-gui` build for `oz-panel` and `op-panel`,
as described in start of this readme.

## Install and use

For example use:

```
npm start
```

You will have:

- https://onezone.local-onedata.org/ozw/onezone
- https://onezone.local-onedata.org/onp/onezone
- https://onezone.local-onedata.org:9443
- https://onezone.local-onedata.org/opw/oneprovider1
- https://onezone.local-onedata.org/opw/oneprovider2
- https://onezone.local-onedata.org/opw/oneprovider3
- https://onezone.local-onedata.org/onp/oneprovider1
- https://onezone.local-onedata.org/onp/oneprovider2
- https://onezone.local-onedata.org/onp/oneprovider3
- https://oneprovider1.local-onedata.org:9443
- https://oneprovider2.local-onedata.org:9443
- https://oneprovider3.local-onedata.org:9443

# Development

## Development with auto-reload server

Install `nodemon` package with: `npm install -g nodemon`

Then serve:

```
DEBUG=express:* nodemon index.js
```

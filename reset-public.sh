cd static
rm -rf onedata-gui-static
mkdir onedata-gui-static
cd onedata-gui-static

mkdir -p ozw/onezone opw onp onepanel onepanel-common oneprovider-common
pushd onp
  ln -s ../onepanel-common onezone
  ln -s ../onepanel-common oneprovider-1
  ln -s ../onepanel-common oneprovider-2
  ln -s ../onepanel-common oneprovider-3
popd
pushd opw
  ln -s ../oneprovider-common oneprovider-1
  ln -s ../oneprovider-common oneprovider-2
  ln -s ../oneprovider-common oneprovider-3
popd
# proxied onepanel
ln -s onepanel-common onepanel
echo "oz-worker" > ozw/onezone/index.html
echo "op-worker common" > oneprovider-common/index.html
echo "onepanel common" > onepanel-common/index.html

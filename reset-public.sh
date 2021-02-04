cd static
rm -rf onedata-gui-static
mkdir onedata-gui-static
cd onedata-gui-static

mkdir -p ozw/onezone opw onp onepanel-common oneprovider-common
pushd onp
  ln -s ../onepanel-common onezone
  ln -s ../onepanel-common oneprovider1
  ln -s ../onepanel-common oneprovider2
  ln -s ../onepanel-common oneprovider3
popd
pushd opw
  ln -s ../oneprovider-common oneprovider1
  ln -s ../oneprovider-common oneprovider2
  ln -s ../oneprovider-common oneprovider3
popd
# proxied onepanel
ln -s onepanel-common onepanel
echo "oz-worker" > ozw/onezone/index.html
echo "op-worker common" > oneprovider-common/index.html
echo "onepanel common" > onepanel-common/index.html

cd static
rm -rf onedata-gui-static
mkdir onedata-gui-static
cd onedata-gui-static

mkdir -p ozw/onezone opw/oneprovider-1 opw/oneprovider-2 onp onepanel
pushd onp
  ln -s ../onepanel onezone
  ln -s ../onepanel oneprovider-1
  ln -s ../onepanel oneprovider-2
popd
echo "oz-worker" > ozw/onezone/index.html
echo "op-worker 1" > opw/oneprovider-1/index.html
echo "op-worker 2" > opw/oneprovider-2/index.html
echo "onepanel common" > onepanel/index.html

# Please set Onedata Gui Utils Dir first using in shell:
export OGU_DIR=/Users/kliput/Onedata/onedata-gui-utils
export OG_MOCK_DIR=/Users/kliput/Onedata/onedata-gui-server-mock
export OD_DIR=/Users/kliput/Onedata

alias eb-panel-mock="cd ${OD_DIR}/onepanel-gui/src && ember build --environment=development --output-path=${OG_MOCK_DIR}/static/onedata-gui-static/onepanel-common --watch"
alias eb-zone-mock="cd ${OD_DIR}/onezone-gui/src && ember build --environment=development --output-path=${OG_MOCK_DIR}/static/onedata-gui-static/ozw/onezone --watch"
alias eb-provider-mock="cd ${OD_DIR}/oneprovider-gui/src && ember build --environment=development --output-path=${OG_MOCK_DIR}/static/onedata-gui-static/oneprovider-common --watch"

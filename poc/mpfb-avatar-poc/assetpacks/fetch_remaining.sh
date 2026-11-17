#!/bin/bash
set -e
echo "waiting for system_assets.zip to finish..."
while kill -0 568 2>/dev/null; do sleep 3; done
echo "system_assets done, downloading suits01..."
curl -sL "https://files.makehumancommunity.org/asset_packs/suits01/suits01_cc0.zip" -o suits01.zip
echo "suits01 done ($(stat -c%s suits01.zip 2>/dev/null || wc -c < suits01.zip) bytes), downloading skins01..."
curl -sL "https://files.makehumancommunity.org/asset_packs/skins01/skins01_cc0.zip" -o skins01.zip
echo "skins01 done, downloading hair01..."
curl -sL "https://files.makehumancommunity.org/asset_packs/hair01/hair01_cc0.zip" -o hair01.zip
echo "ALL DONE"
ls -la

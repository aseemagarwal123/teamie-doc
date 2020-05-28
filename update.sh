echo "updating viewer-assets"
cd prizmdoc-viewer
git pull origin master
bash build.sh
cd ..
rm -rf viewer-assets/
mkdir viewer-assets
rsync -a prizmdoc-viewer/dist/viewer-assets/ viewer-assets/
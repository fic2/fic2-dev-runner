#! /bin/bash -e

#-p '9000:9000' -p '35729:35729'
docker run -it -u "$(id -u):$(id -u)" -e 'HOME=/tmp' --rm=true -v "$(pwd):/tmp/dev" -w '/tmp/dev' --name 'dhub' 'fic2-dhub-dev'